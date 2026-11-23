import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPostgresClient } from "@/lib/postgres";
import { getUserFromAccessToken, extractBearerToken } from "@/integrations/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModoImportacao = "inclusao" | "alteracao";

type RegistroInput = {
  posicao: number; // posição 1-based no array "registros" enviado
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  channels: string[];
};

/** Anúncio com o qual a linha colidiu (do arquivo ou do banco). */
type ConflitoRef = {
  posicao: number | null;
  announceId: string | null;
  store: string | null;
  reference: string | null;
  id_bling: string | null;
};

type TipoErro =
  | "campos_obrigatorios_ausentes"
  | "id_bling_ausente"
  | "referencia_repetida_no_arquivo"
  | "id_bling_repetido_no_arquivo"
  | "referencia_ja_existe_no_banco"
  | "id_bling_em_uso_no_banco"
  | "alteracao_bling_nao_encontrado"
  | "alteracao_referencia_ocupada"
  | "lote_nao_gravado"
  | "erro_banco";

type CampoErro = "store" | "reference" | "id_bling";

/** Formato único de erro: vale para duplicidades e para qualquer outra rejeição. */
type RegistroResultado = {
  posicao: number;
  status: "erro";
  tipo: TipoErro;
  etapa: string;
  campo: CampoErro | null;
  valor: string | null;
  store: string | null;
  reference: string | null;
  id_bling: string | null;
  conflitaCom: ConflitoRef | null;
  pgCode: string | null;
  message: string;
};

/** Grupo de linhas do arquivo que colidem pela mesma chave. */
type Duplicidade = {
  tipo: "referencia" | "id_bling";
  valor: string;
  posicoes: number[];
  lojas: string[];
  references: string[];
  message: string;
};

type Ctx = {
  requestId: string;
  modo: ModoImportacao;
  log: ReturnType<typeof createLogger>;
  erros: RegistroResultado[];
  importadasPosicoes: Set<number>;
};

type Processado = { posicao: number; id: string; channels: string[] };

type AlvoErro = {
  posicao: number;
  store: string | null;
  reference: string | null;
  id_bling: string | null;
};

type ErroInput = {
  tipo: TipoErro;
  etapa: string;
  message: string;
  campo?: CampoErro | null;
  valor?: string | null;
  conflitaCom?: ConflitoRef | null;
  pgCode?: string | null;
};

const MAX_REGISTROS = 100_000;
const BATCH_SIZE = 10_000;
const CHECK_BATCH_SIZE = 20_000;
const MAX_CHANNELS = 20;
const SAMPLE_LIMIT = 20;
const MAX_ERROS_RESPOSTA = 5_000;
const MAX_DUPLICIDADES_RESPOSTA = 500;
const DEBUG_VERBOSE = process.env.IMPORT_ANNOUNCE_DEBUG === "1";

// -----------------------------------------------------------------------
// LOG
// -----------------------------------------------------------------------
function createLogger(requestId: string) {
  const emit = (
    level: "debug" | "info" | "warn" | "error",
    event: string,
    data: Record<string, unknown> = {}
  ) => {
    if (level === "debug" && !DEBUG_VERBOSE) return;
    const line = `[import-announce] ${JSON.stringify({
      ts: new Date().toISOString(),
      requestId,
      level,
      event,
      ...data,
    })}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  };

  return {
    debug: (event: string, data?: Record<string, unknown>) => emit("debug", event, data),
    info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
    error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
  };
}

/** Extrai os campos úteis de um erro do postgres.js (inclui constraint_name). */
function pgErrorInfo(error: unknown) {
  const e = error as any;
  return {
    name: e?.name ?? null,
    code: e?.code ?? null,
    message: e?.message ?? null,
    detail: e?.detail ?? null,
    hint: e?.hint ?? null,
    constraint: e?.constraint_name ?? e?.constraint ?? null,
    table: e?.table_name ?? null,
    column: e?.column_name ?? null,
    where: e?.where ?? null,
    position: e?.position ?? null,
  };
}

function sample<T>(arr: T[]): T[] {
  return arr.slice(0, SAMPLE_LIMIT);
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function registrarErro(ctx: Ctx, alvo: AlvoErro, erro: ErroInput) {
  const item: RegistroResultado = {
    posicao: alvo.posicao,
    status: "erro",
    tipo: erro.tipo,
    etapa: erro.etapa,
    campo: erro.campo ?? null,
    valor: erro.valor ?? null,
    store: alvo.store ?? null,
    reference: alvo.reference ?? null,
    id_bling: alvo.id_bling ?? null,
    conflitaCom: erro.conflitaCom ?? null,
    pgCode: erro.pgCode ?? null,
    message: erro.message,
  };
  ctx.erros.push(item);
  ctx.log.debug("erro_registrado", { ...item });
}

function conflitoDeRegistro(r: RegistroInput): ConflitoRef {
  return {
    posicao: r.posicao,
    announceId: null,
    store: r.store,
    reference: r.reference,
    id_bling: r.id_bling,
  };
}

function errosPorTipo(erros: RegistroResultado[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of erros) out[e.tipo] = (out[e.tipo] ?? 0) + 1;
  return out;
}

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------
async function getAuthenticatedUser(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  return getUserFromAccessToken(token);
}

function isValidRegistro(r: any): boolean {
  return (
    r &&
    typeof r === "object" &&
    typeof r.store === "string" &&
    r.store.trim() !== "" &&
    typeof r.reference === "string" &&
    r.reference.trim() !== ""
  );
}

function isValidModo(m: unknown): m is ModoImportacao {
  return m === "inclusao" || m === "alteracao";
}

function sanitizeChannels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .filter((c): c is string => typeof c === "string" && c.trim() !== "")
    .map((c) => c.trim());
  return Array.from(new Set(cleaned)).slice(0, MAX_CHANNELS);
}

function channelsSignature(channels: string[]): string {
  return [...channels].sort().join("\u0000");
}

function keyOfInclusao(store: string, reference: string): string {
  return `${store}::ref::${reference}`;
}

function keyOfIdBling(idBling: string): string {
  return `bling::${idBling}`;
}

function keyOfAlteracao(store: string, idBling: string | null): string {
  return `${store}::bling::${idBling ?? ""}`;
}

function chaveDoRegistro(modo: ModoImportacao, r: RegistroInput): string {
  return modo === "inclusao"
    ? keyOfInclusao(r.store, r.reference)
    : keyOfAlteracao(r.store, r.id_bling);
}

// -----------------------------------------------------------------------
// DUPLICIDADES NO ARQUIVO: agrupamento (para o relatório)
// -----------------------------------------------------------------------
function montarDuplicidades(registros: RegistroInput[]): Duplicidade[] {
  const porRef = new Map<string, RegistroInput[]>();
  const porBling = new Map<string, RegistroInput[]>();

  for (const r of registros) {
    push(porRef, keyOfInclusao(r.store, r.reference), r);
    if (r.id_bling) push(porBling, keyOfIdBling(r.id_bling), r);
  }

  const grupos: Duplicidade[] = [];
  const listar = (arr: RegistroInput[]) => arr.map((x) => `#${x.posicao}`).join(", ");

  for (const arr of porRef.values()) {
    if (arr.length < 2) continue;
    const ref = arr[0].reference;
    const loja = arr[0].store;
    grupos.push({
      tipo: "referencia",
      valor: ref,
      posicoes: arr.map((x) => x.posicao),
      lojas: [loja],
      references: [ref],
      message: `Referência "${ref}" (loja "${loja}") aparece nas linhas ${listar(arr)}.`,
    });
  }

  for (const arr of porBling.values()) {
    if (arr.length < 2) continue;
    const bling = arr[0].id_bling ?? "";
    const refs = Array.from(new Set(arr.map((x) => x.reference)));
    const lojas = Array.from(new Set(arr.map((x) => x.store)));
    grupos.push({
      tipo: "id_bling",
      valor: bling,
      posicoes: arr.map((x) => x.posicao),
      lojas,
      references: refs,
      message:
        `ID Bling "${bling}" aparece nas linhas ${listar(arr)}` +
        (refs.length > 1 ? ` com referências diferentes (${refs.join(", ")}).` : "."),
    });
  }

  return grupos;
}

// -----------------------------------------------------------------------
// DUPLICIDADES NO ARQUIVO: rejeição (mantém a primeira ocorrência)
// -----------------------------------------------------------------------
function detectarDuplicidadesNoArquivo(ctx: Ctx, registros: RegistroInput[]): RegistroInput[] {
  // 1) Referência repetida (store + reference)
  const primeiroPorRef = new Map<string, RegistroInput>();
  const aposRef: RegistroInput[] = [];

  for (const r of registros) {
    const k = keyOfInclusao(r.store, r.reference);
    const first = primeiroPorRef.get(k);

    if (first) {
      const mesmoBling = first.id_bling === r.id_bling;
      registrarErro(ctx, r, {
        tipo: "referencia_repetida_no_arquivo",
        etapa: "duplicidade_arquivo",
        campo: "reference",
        valor: r.reference,
        conflitaCom: conflitoDeRegistro(first),
        message:
          `Referência "${r.reference}" da loja "${r.store}" já está na linha #${first.posicao}` +
          (mesmoBling
            ? " (mesmo ID Bling). Esta linha foi ignorada."
            : ` (ID Bling ${first.id_bling ?? "-"} na linha #${first.posicao} e ${r.id_bling ?? "-"} nesta). Esta linha foi ignorada.`),
      });
      continue;
    }

    primeiroPorRef.set(k, r);
    aposRef.push(r);
  }

  // 2) ID Bling repetido (global, sem considerar a loja)
  const primeiroPorBling = new Map<string, RegistroInput>();
  const validos: RegistroInput[] = [];

  for (const r of aposRef) {
    if (!r.id_bling) {
      validos.push(r);
      continue;
    }

    const k = keyOfIdBling(r.id_bling);
    const first = primeiroPorBling.get(k);

    if (first) {
      registrarErro(ctx, r, {
        tipo: "id_bling_repetido_no_arquivo",
        etapa: "duplicidade_arquivo",
        campo: "id_bling",
        valor: r.id_bling,
        conflitaCom: conflitoDeRegistro(first),
        message: `O ID Bling "${r.id_bling}" já está na linha #${first.posicao} (loja "${first.store}", referência "${first.reference}"). ID Bling é único no sistema; esta linha foi ignorada.`,
      });
      continue;
    }

    primeiroPorBling.set(k, r);
    validos.push(r);
  }

  ctx.log.info("filtro_duplicidades_arquivo", {
    entrada: registros.length,
    validos: validos.length,
    rejeitados: registros.length - validos.length,
  });

  return validos;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (inclusão): (store, reference) ativos já existentes
// -----------------------------------------------------------------------
async function findExistingReferences(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[]
): Promise<Map<string, ConflitoRef>> {
  const existentes = new Map<string, ConflitoRef>();
  const totalBatches = Math.ceil(registros.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const stores = batch.map((r) => r.store);
    const references = batch.map((r) => r.reference);

    const rows: any[] = await transaction`
      select a.id, a.store, a.reference, a.id_bling
      from newsystem.announce a
      join unnest(${stores}::text[], ${references}::text[]) as s(store, reference)
        on a.store = s.store and a.reference = s.reference
      where a.deleted_at is null
    `;

    ctx.log.debug("pre_checagem_referencia_lote", {
      lote: i + 1,
      totalLotes: totalBatches,
      entrada: batch.length,
      encontrados: rows.length,
    });

    for (const r of rows) {
      existentes.set(keyOfInclusao(r.store, r.reference), {
        posicao: null,
        announceId: r.id,
        store: r.store,
        reference: r.reference,
        id_bling: r.id_bling,
      });
    }
  }

  return existentes;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (inclusão): id_bling ativo em QUALQUER loja
// A constraint unq_announce_id_bling_active é global, então qualquer
// anúncio ativo com o mesmo ID Bling é conflito.
// -----------------------------------------------------------------------
async function findConflictingIdBling(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[]
): Promise<Map<string, ConflitoRef>> {
  const conflitos = new Map<string, ConflitoRef>();
  const comIdBling = registros.filter((r) => r.id_bling !== null);
  if (comIdBling.length === 0) return conflitos;

  const totalBatches = Math.ceil(comIdBling.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = comIdBling.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const idBlings = batch.map((r) => r.id_bling);

    const rows: any[] = await transaction`
      select a.id, a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${idBlings}::text[]) as s(id_bling)
        on a.id_bling = s.id_bling
      where a.deleted_at is null
    `;

    ctx.log.debug("pre_checagem_bling_lote", {
      lote: i + 1,
      totalLotes: totalBatches,
      entrada: batch.length,
      encontrados: rows.length,
    });

    for (const r of rows) {
      conflitos.set(keyOfIdBling(r.id_bling), {
        posicao: null,
        announceId: r.id,
        store: r.store,
        reference: r.reference,
        id_bling: r.id_bling,
      });
    }
  }

  return conflitos;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (alteração): só anúncios ativos por (store, id_bling)
// -----------------------------------------------------------------------
async function validarAlteracao(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[]
): Promise<RegistroInput[]> {
  // store::bling::idBling -> anúncio ativo
  const ativosPorBling = new Map<string, ConflitoRef>();
  // store::ref::reference -> anúncio ativo que ocupa a referência
  const donoDaRef = new Map<string, ConflitoRef>();

  const totalBatches = Math.ceil(registros.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const stores = batch.map((r) => r.store);
    const idBlings = batch.map((r) => r.id_bling ?? "");
    const references = batch.map((r) => r.reference);

    const ativos: any[] = await transaction`
      select a.id, a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${stores}::text[], ${idBlings}::text[]) as s(store, id_bling)
        on a.store = s.store and a.id_bling = s.id_bling
      where a.deleted_at is null
    `;
    for (const r of ativos) {
      ativosPorBling.set(keyOfAlteracao(r.store, r.id_bling), {
        posicao: null,
        announceId: r.id,
        store: r.store,
        reference: r.reference,
        id_bling: r.id_bling,
      });
    }

    const ocupantes: any[] = await transaction`
      select a.id, a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${stores}::text[], ${references}::text[]) as s(store, reference)
        on a.store = s.store and a.reference = s.reference
      where a.deleted_at is null
    `;
    for (const r of ocupantes) {
      donoDaRef.set(keyOfInclusao(r.store, r.reference), {
        posicao: null,
        announceId: r.id,
        store: r.store,
        reference: r.reference,
        id_bling: r.id_bling,
      });
    }

    ctx.log.debug("pre_checagem_alteracao_lote", {
      lote: i + 1,
      totalLotes: totalBatches,
      ativosEncontrados: ativos.length,
      ocupantesEncontrados: ocupantes.length,
    });
  }

  ctx.log.info("pre_checagem_alteracao_concluida", {
    entrada: registros.length,
    ativosPorBling: ativosPorBling.size,
    referenciasOcupadas: donoDaRef.size,
  });

  const validos: RegistroInput[] = [];

  for (const r of registros) {
    const kId = keyOfAlteracao(r.store, r.id_bling);
    const kRef = keyOfInclusao(r.store, r.reference);
    const ativo = ativosPorBling.get(kId);
    const dono = donoDaRef.get(kRef);

    if (!ativo) {
      registrarErro(ctx, r, {
        tipo: "alteracao_bling_nao_encontrado",
        etapa: "pre_checagem_alteracao",
        campo: "id_bling",
        valor: r.id_bling,
        message: `O ID Bling "${r.id_bling}" não existe entre os anúncios ativos da loja "${r.store}". Anúncios excluídos não são reativados por alteração.`,
      });
      continue;
    }

    if (dono && dono.id_bling !== r.id_bling) {
      registrarErro(ctx, r, {
        tipo: "alteracao_referencia_ocupada",
        etapa: "pre_checagem_alteracao",
        campo: "reference",
        valor: r.reference,
        conflitaCom: dono,
        message: `A referência "${r.reference}" já pertence ao anúncio de ID Bling "${dono.id_bling}" nesta loja (id ${dono.announceId}). Esta linha não pode usar essa referência.`,
      });
      continue;
    }

    validos.push(r);
  }

  ctx.log.info("validacao_alteracao_resultado", {
    entrada: registros.length,
    validos: validos.length,
    rejeitados: registros.length - validos.length,
  });

  return validos;
}

// -----------------------------------------------------------------------
// INCLUSÃO em lote
// -----------------------------------------------------------------------
async function insertBatchOnlyNew(
  transaction: any,
  batch: RegistroInput[]
): Promise<{ affectedKeys: Set<string>; affected: { id: string; key: string }[] }> {
  const inserted: any[] = await transaction`
    insert into newsystem.announce
      (store, id_bling, reference, product, mark, updated_at, deleted_at)
    select
      s.store, s.id_bling, s.reference, s.product, s.mark, now(), null
    from unnest(
      ${batch.map((r) => r.store)}::text[],
      ${batch.map((r) => r.id_bling)}::text[],
      ${batch.map((r) => r.reference)}::text[],
      ${batch.map((r) => r.product)}::text[],
      ${batch.map((r) => r.mark)}::text[]
    ) as s(store, id_bling, reference, product, mark)
    on conflict (store, reference) do update set
      id_bling   = excluded.id_bling,
      product    = excluded.product,
      mark       = excluded.mark,
      updated_at = now(),
      deleted_at = null
    where newsystem.announce.deleted_at is not null
    returning id, store, reference
  `;

  const affectedKeys = new Set<string>();
  const affected: { id: string; key: string }[] = [];
  for (const r of inserted) {
    const key = keyOfInclusao(r.store, r.reference);
    affectedKeys.add(key);
    affected.push({ id: r.id, key });
  }
  return { affectedKeys, affected };
}

// -----------------------------------------------------------------------
// ALTERAÇÃO em lote
// -----------------------------------------------------------------------
async function updateBatchOnlyExisting(
  transaction: any,
  batch: RegistroInput[]
): Promise<{ affectedKeys: Set<string>; affected: { id: string; key: string }[] }> {
  const updated: any[] = await transaction`
    update newsystem.announce as a
    set
      reference  = s.reference,
      product    = s.product,
      mark       = s.mark,
      updated_at = now()
    from unnest(
      ${batch.map((r) => r.store)}::text[],
      ${batch.map((r) => r.id_bling)}::text[],
      ${batch.map((r) => r.reference)}::text[],
      ${batch.map((r) => r.product)}::text[],
      ${batch.map((r) => r.mark)}::text[]
    ) as s(store, id_bling, reference, product, mark)
    where a.store = s.store
      and a.id_bling = s.id_bling
      and a.deleted_at is null
    returning a.id, a.store, a.id_bling
  `;

  const affectedKeys = new Set<string>();
  const affected: { id: string; key: string }[] = [];
  for (const r of updated) {
    const key = keyOfAlteracao(r.store, r.id_bling);
    affectedKeys.add(key);
    affected.push({ id: r.id, key });
  }
  return { affectedKeys, affected };
}

// -----------------------------------------------------------------------
// VÍNCULO DE CANAIS (agrupado por assinatura de canais)
// -----------------------------------------------------------------------
async function vincularCanais(
  ctx: Ctx,
  transaction: any,
  itens: { id: string; channels: string[] }[],
  channelsGlobal: string[]
): Promise<void> {
  const grupos = new Map<string, { channels: string[]; ids: string[] }>();
  let semCanal = 0;

  for (const { id, channels } of itens) {
    const efetivo = channels.length > 0 ? channels : channelsGlobal;
    if (efetivo.length === 0) {
      semCanal++;
      continue;
    }
    const signature = channelsSignature(efetivo);
    const grupo = grupos.get(signature);
    if (grupo) grupo.ids.push(id);
    else grupos.set(signature, { channels: efetivo, ids: [id] });
  }

  ctx.log.debug("vinculo_canais_grupos", {
    anuncios: itens.length,
    semCanal,
    grupos: Array.from(grupos.values()).map((g) => ({
      canais: g.channels,
      anuncios: g.ids.length,
    })),
  });

  for (const { channels, ids } of grupos.values()) {
    if (ids.length === 0 || channels.length === 0) continue;
    await transaction`
      insert into newsystem.marketplace
        (store, channel, announce_id, id_bling, reference, product, mark)
      select
        a.store, c.channel, a.id, a.id_bling, a.reference, a.product, a.mark
      from newsystem.announce a
      cross join unnest(${channels}::text[]) as c(channel)
      where a.id = any(${ids}::uuid[])
        and a.deleted_at is null
        and a.id_bling is not null
      on conflict do nothing
    `;
  }
}

// -----------------------------------------------------------------------
// FALLBACK linha a linha (cada linha isolada em SAVEPOINT próprio)
// -----------------------------------------------------------------------
async function gravarUmaLinha(
  transaction: any,
  modo: ModoImportacao,
  registro: RegistroInput
): Promise<any[]> {
  if (modo === "inclusao") {
    return transaction`
      insert into newsystem.announce
        (store, id_bling, reference, product, mark, updated_at, deleted_at)
      values (
        ${registro.store}, ${registro.id_bling}, ${registro.reference},
        ${registro.product}, ${registro.mark}, now(), null
      )
      on conflict (store, reference) do update set
        id_bling   = excluded.id_bling,
        product    = excluded.product,
        mark       = excluded.mark,
        updated_at = now(),
        deleted_at = null
      where newsystem.announce.deleted_at is not null
      returning id
    `;
  }

  return transaction`
    update newsystem.announce
    set
      reference  = ${registro.reference},
      product    = ${registro.product},
      mark       = ${registro.mark},
      updated_at = now()
    where store = ${registro.store}
      and id_bling = ${registro.id_bling}
      and deleted_at is null
    returning id
  `;
}

async function processRowByRow(
  ctx: Ctx,
  transaction: any,
  batch: RegistroInput[]
): Promise<Processado[]> {
  const processados: Processado[] = [];
  const modo = ctx.modo;

  for (const registro of batch) {
    const sp = `sp_row_${registro.posicao}`;
    let result: any[] = [];

    await transaction.unsafe(`savepoint ${sp}`);
    try {
      result = await gravarUmaLinha(transaction, modo, registro);
      await transaction.unsafe(`release savepoint ${sp}`);
    } catch (error: unknown) {
      await transaction.unsafe(`rollback to savepoint ${sp}`);
      await transaction.unsafe(`release savepoint ${sp}`);

      const info = pgErrorInfo(error);
      ctx.log.error("fallback_erro_linha", {
        posicao: registro.posicao,
        store: registro.store,
        reference: registro.reference,
        id_bling: registro.id_bling,
        modo,
        pg: info,
        acao: "savepoint_da_linha_revertido; demais linhas seguem",
      });

      if (info.code === "23505" && info.constraint === "unq_announce_id_bling_active") {
        registrarErro(ctx, registro, {
          tipo: "id_bling_em_uso_no_banco",
          etapa: "fallback_linha",
          campo: "id_bling",
          valor: registro.id_bling,
          pgCode: info.code,
          message: `O ID Bling "${registro.id_bling}" já está em uso por outro anúncio ativo (em qualquer loja).`,
        });
      } else {
        registrarErro(ctx, registro, {
          tipo: "erro_banco",
          etapa: "fallback_linha",
          pgCode: info.code,
          message: info.message ?? "Erro desconhecido ao gravar o registro.",
        });
      }
      continue;
    }

    if (result.length === 0) {
      if (modo === "inclusao") {
        registrarErro(ctx, registro, {
          tipo: "referencia_ja_existe_no_banco",
          etapa: "fallback_linha",
          campo: "reference",
          valor: registro.reference,
          message: `A referência "${registro.reference}" já existe na loja "${registro.store}". Use o modo 'Alteração' para atualizá-la.`,
        });
      } else {
        registrarErro(ctx, registro, {
          tipo: "alteracao_bling_nao_encontrado",
          etapa: "fallback_linha",
          campo: "id_bling",
          valor: registro.id_bling,
          message: `O ID Bling "${registro.id_bling}" não existe entre os anúncios ativos da loja "${registro.store}". Anúncios excluídos não são reativados por alteração.`,
        });
      }
      continue;
    }

    ctx.log.debug("fallback_ok", { posicao: registro.posicao, id: result[0].id, modo });
    processados.push({ posicao: registro.posicao, id: result[0].id, channels: registro.channels });
  }

  return processados;
}

// -----------------------------------------------------------------------
// PROCESSAMENTO EM LOTES (com savepoint e fallback)
// -----------------------------------------------------------------------
async function processAllBatches(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[],
  channelsGlobal: string[]
): Promise<number> {
  let importados = 0;
  const totalBatches = Math.ceil(registros.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const savepointName = `sp_batch_${i}`;
    const loteInfo = {
      lote: i + 1,
      totalLotes: totalBatches,
      tamanho: batch.length,
      posicaoInicial: batch[0]?.posicao ?? null,
      posicaoFinal: batch[batch.length - 1]?.posicao ?? null,
    };

    const registrosPorKey = new Map<string, RegistroInput>();
    for (const registro of batch) registrosPorKey.set(chaveDoRegistro(ctx.modo, registro), registro);

    ctx.log.info("lote_iniciado", loteInfo);
    await transaction.unsafe(`savepoint ${savepointName}`);

    try {
      const { affectedKeys, affected } =
        ctx.modo === "inclusao"
          ? await insertBatchOnlyNew(transaction, batch)
          : await updateBatchOnlyExisting(transaction, batch);

      const itens = affected.map(({ id, key }) => ({
        id,
        channels: registrosPorKey.get(key)?.channels ?? [],
      }));
      await vincularCanais(ctx, transaction, itens, channelsGlobal);

      await transaction.unsafe(`release savepoint ${savepointName}`);

      let naoGravados = 0;
      let importadosNoLote = 0;
      for (const registro of batch) {
        const key = chaveDoRegistro(ctx.modo, registro);
        if (affectedKeys.has(key)) {
          importados++;
          importadosNoLote++;
          ctx.importadasPosicoes.add(registro.posicao);
        } else {
          naoGravados++;
          registrarErro(ctx, registro, {
            tipo: "lote_nao_gravado",
            etapa: "lote",
            campo: ctx.modo === "inclusao" ? "reference" : "id_bling",
            valor: ctx.modo === "inclusao" ? registro.reference : registro.id_bling,
            message:
              ctx.modo === "inclusao"
                ? `A referência "${registro.reference}" não foi gravada: já existe ativa na loja "${registro.store}" (possível inclusão concorrente).`
                : `O anúncio de ID Bling "${registro.id_bling}" não foi atualizado: não está ativo na loja "${registro.store}" (possível alteração concorrente).`,
          });
        }
      }

      const chavesRepetidas =
        batch.length - new Set(batch.map((r) => chaveDoRegistro(ctx.modo, r))).size;

      ctx.log.info("lote_concluido", {
        ...loteInfo,
        anunciosAfetados: affected.length,
        linhasAfetadasNoLote: importadosNoLote,
        naoGravados,
        chavesRepetidasNoLote: chavesRepetidas,
      });

      if (chavesRepetidas > 0) {
        ctx.log.warn("lote_com_chaves_repetidas", {
          ...loteInfo,
          quantidade: chavesRepetidas,
          observacao: "Deveria ter sido removido pela detecção de duplicidades; verificar o filtro.",
        });
      }
    } catch (error: unknown) {
      const info = pgErrorInfo(error);

      ctx.log.warn("lote_falhou_usando_fallback", {
        ...loteInfo,
        pg: info,
        dica:
          info.code === "21000"
            ? "ON CONFLICT DO UPDATE tentou afetar a mesma linha duas vezes: há chave repetida no lote."
            : null,
      });

      await transaction.unsafe(`rollback to savepoint ${savepointName}`);
      await transaction.unsafe(`release savepoint ${savepointName}`);

      const processados = await processRowByRow(ctx, transaction, batch);
      for (const p of processados) ctx.importadasPosicoes.add(p.posicao);
      importados += processados.length;

      await vincularCanais(ctx, transaction, processados, channelsGlobal);

      ctx.log.info("lote_fallback_concluido", {
        ...loteInfo,
        sucesso: processados.length,
        falha: batch.length - processados.length,
      });
    }
  }

  return importados;
}

// -----------------------------------------------------------------------
// RESUMO FINAL: conciliação linha a linha
// -----------------------------------------------------------------------
function resumoFinal(
  ctx: Ctx,
  totalRecebido: number,
  importados: number,
  tempos: Record<string, number>
) {
  const errosPorPosicao = new Map<number, RegistroResultado[]>();
  for (const e of ctx.erros) push(errosPorPosicao, e.posicao, e);

  const comMultiplosErros = [...errosPorPosicao.entries()].filter(([, v]) => v.length > 1);
  const comErroEImportado = [...errosPorPosicao.keys()].filter((p) => ctx.importadasPosicoes.has(p));

  const semDesfecho: number[] = [];
  for (let p = 1; p <= totalRecebido; p++) {
    if (!errosPorPosicao.has(p) && !ctx.importadasPosicoes.has(p)) semDesfecho.push(p);
  }

  if (comMultiplosErros.length > 0) {
    ctx.log.warn("linhas_com_multiplos_erros", {
      quantidade: comMultiplosErros.length,
      amostra: sample(comMultiplosErros).map(([posicao, errs]) => ({
        posicao,
        tipos: errs.map((e) => e.tipo),
        mensagens: errs.map((e) => e.message),
      })),
    });
  }

  if (comErroEImportado.length > 0) {
    ctx.log.warn("linhas_com_erro_e_importadas", {
      quantidade: comErroEImportado.length,
      posicoes: sample(comErroEImportado),
    });
  }

  if (semDesfecho.length > 0) {
    ctx.log.warn("linhas_sem_desfecho", {
      quantidade: semDesfecho.length,
      posicoes: sample(semDesfecho),
      observacao: "Linhas que não foram importadas nem registradas como erro.",
    });
  }

  if (ctx.importadasPosicoes.size !== importados) {
    ctx.log.warn("contador_importados_divergente", {
      contadorImportados: importados,
      posicoesUnicasImportadas: ctx.importadasPosicoes.size,
      observacao: "Contador e conjunto de posições divergem (possível dupla contagem).",
    });
  }

  const unionCobertas = ctx.importadasPosicoes.size + errosPorPosicao.size - comErroEImportado.length;
  const conciliado = unionCobertas + semDesfecho.length === totalRecebido;

  ctx.log.info("resumo_importacao", {
    modo: ctx.modo,
    totalRecebido,
    importados,
    rejeitados: totalRecebido - importados,
    errosTotal: ctx.erros.length,
    linhasComErroUnicas: errosPorPosicao.size,
    linhasComMultiplosErros: comMultiplosErros.length,
    linhasComErroEImportado: comErroEImportado.length,
    linhasSemDesfecho: semDesfecho.length,
    errosPorTipo: errosPorTipo(ctx.erros),
    conciliado,
    tempos,
  });
}

// -----------------------------------------------------------------------
// ROUTE
// -----------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const log = createLogger(requestId);
  const tInicio = Date.now();

  const user = await getAuthenticatedUser(request);
  if (!user) {
    log.warn("auth_invalida");
    return NextResponse.json(
      { error: "Sua sessão não é válida ou expirou. Entre novamente no sistema.", requestId },
      { status: 401 }
    );
  }

  let body: { registros?: unknown; modo?: unknown; channels?: unknown };
  try {
    body = await request.json();
  } catch {
    log.warn("json_invalido");
    return NextResponse.json(
      { error: "O corpo da requisição não é um JSON válido.", requestId },
      { status: 400 }
    );
  }

  if (!isValidModo(body?.modo)) {
    log.warn("modo_invalido", { modo: String(body?.modo) });
    return NextResponse.json(
      { error: "O campo 'modo' deve ser 'inclusao' ou 'alteracao'.", requestId },
      { status: 400 }
    );
  }

  const modo: ModoImportacao = body.modo;
  const channelsGlobal = sanitizeChannels(body?.channels);
  const registrosRaw = Array.isArray(body?.registros) ? body.registros : null;

  log.info("requisicao_iniciada", {
    userId: user.id,
    modo,
    totalRecebido: registrosRaw?.length ?? 0,
    channelsGlobal,
    limite: MAX_REGISTROS,
  });

  if (!registrosRaw || registrosRaw.length === 0) {
    log.warn("payload_vazio");
    return NextResponse.json(
      { error: "Nenhum registro foi enviado para importação.", requestId },
      { status: 400 }
    );
  }

  if (registrosRaw.length > MAX_REGISTROS) {
    log.warn("payload_acima_do_limite", { total: registrosRaw.length, limite: MAX_REGISTROS });
    return NextResponse.json(
      {
        error: `O limite máximo por importação é de ${MAX_REGISTROS} registros. Você enviou ${registrosRaw.length}.`,
        requestId,
      },
      { status: 400 }
    );
  }

  const ctx: Ctx = {
    requestId,
    modo,
    log,
    erros: [],
    importadasPosicoes: new Set<number>(),
  };

  const warnings: string[] = [];
  const registrosValidos: RegistroInput[] = [];

  // 1) Parse e validação de campos obrigatórios
  registrosRaw.forEach((raw: any, i: number) => {
    const posicao = i + 1;

    if (isValidRegistro(raw)) {
      const idBlingNormalizado = raw.id_bling != null ? String(raw.id_bling).trim() : "";
      const channelsLinha = sanitizeChannels(raw.channels);

      registrosValidos.push({
        posicao,
        store: raw.store,
        id_bling: idBlingNormalizado || null,
        reference: raw.reference,
        product: raw.product ?? null,
        mark: raw.mark ?? null,
        channels: channelsLinha.length > 0 ? channelsLinha : channelsGlobal,
      });
      return;
    }

    const lojaOk = typeof raw?.store === "string" && raw.store.trim() !== "";
    const campo: CampoErro = lojaOk ? "reference" : "store";
    const valorBruto = raw?.[campo];

    registrarErro(
      ctx,
      {
        posicao,
        store: typeof raw?.store === "string" ? raw.store : null,
        reference: typeof raw?.reference === "string" ? raw.reference : null,
        id_bling: null,
      },
      {
        tipo: "campos_obrigatorios_ausentes",
        etapa: "validacao_campos",
        campo,
        valor: valorBruto != null ? String(valorBruto) : null,
        message: `Linha #${posicao}: o campo "${campo === "store" ? "Loja" : "Referência"}" é obrigatório e não foi informado.`,
      }
    );
  });

  // 2) ID Bling obrigatório
  const semIdBling = registrosValidos.filter((r) => r.id_bling === null);
  for (const r of semIdBling) {
    registrarErro(ctx, r, {
      tipo: "id_bling_ausente",
      etapa: "validacao_id_bling",
      campo: "id_bling",
      valor: null,
      message: `Linha #${r.posicao}: ID Bling é obrigatório e não foi informado. O registro não foi criado.`,
    });
  }
  if (semIdBling.length > 0) {
    log.warn("id_bling_ausente", {
      quantidade: semIdBling.length,
      posicoes: sample(semIdBling.map((r) => r.posicao)),
    });
  }

  // 3) Duplicidades: agrupamento para o relatório (sobre todo o payload válido)
  const duplicidades = montarDuplicidades(registrosValidos);
  log.info("auditoria_payload", {
    registrosEntrada: registrosRaw.length,
    registrosValidos: registrosValidos.length,
    gruposDuplicados: duplicidades.length,
  });
  if (duplicidades.length > 0) {
    log.warn("duplicidades_no_arquivo", {
      grupos: duplicidades.length,
      amostra: sample(duplicidades),
    });
  }

  // 4) Rejeição das ocorrências repetidas (mantém a primeira) e filtro de ID Bling
  const registrosParaProcessar = detectarDuplicidadesNoArquivo(ctx, registrosValidos).filter(
    (r) => r.id_bling !== null
  );

  const respostaComErros = (status: number, error: string) =>
    NextResponse.json(
      {
        error,
        requestId,
        total: registrosRaw.length,
        importados: 0,
        rejeitados: registrosRaw.length,
        errosCount: ctx.erros.length,
        errosPorTipo: errosPorTipo(ctx.erros),
        erros: ctx.erros.slice(0, MAX_ERROS_RESPOSTA),
        errosOmitidos: Math.max(0, ctx.erros.length - MAX_ERROS_RESPOSTA),
        duplicidades: duplicidades.slice(0, MAX_DUPLICIDADES_RESPOSTA),
        duplicidadesCount: duplicidades.length,
        duplicidadesOmitidas: Math.max(0, duplicidades.length - MAX_DUPLICIDADES_RESPOSTA),
        warnings,
      },
      { status }
    );

  if (registrosParaProcessar.length === 0) {
    log.warn("nenhum_registro_valido", { erros: ctx.erros.length });
    return respostaComErros(400, "Nenhum registro válido foi encontrado no payload.");
  }

  if (registrosParaProcessar.every((r) => r.channels.length === 0)) {
    warnings.push(
      "Nenhum canal de marketplace foi selecionado. Os registros importados NÃO serão vinculados a nenhum canal."
    );
    log.warn("sem_canais_selecionados", { registros: registrosParaProcessar.length });
  }

  const tempos: Record<string, number> = {};
  let importados = 0;

  try {
    const sql = getPostgresClient();

    await sql.begin(async (transaction) => {
      const jwtClaims = JSON.stringify({
        sub: user.id,
        role: "authenticated",
        email: user.email ?? null,
      });

      await transaction.unsafe(
        `select
           set_config('request.jwt.claims', $1, true),
           set_config('request.jwt.claim.sub', $2, true),
           set_config('request.jwt.claim.role', 'authenticated', true)`,
        [jwtClaims, user.id]
      );

      await transaction.unsafe(
        `set local role authenticated; set local work_mem = '256MB';`,
        [],
        { prepare: false }
      );

      let registrosFinais: RegistroInput[] = registrosParaProcessar;

      // 5) Pré-checagem da inclusão
      if (modo === "inclusao") {
        const t = Date.now();
        const existentes = await findExistingReferences(ctx, transaction, registrosParaProcessar);

        const semConflitoReferencia: RegistroInput[] = [];
        for (const r of registrosParaProcessar) {
          const existente = existentes.get(keyOfInclusao(r.store, r.reference));
          if (existente) {
            registrarErro(ctx, r, {
              tipo: "referencia_ja_existe_no_banco",
              etapa: "pre_checagem_referencia",
              campo: "reference",
              valor: r.reference,
              conflitaCom: existente,
              message: `A referência "${r.reference}" já existe na loja "${r.store}" (anúncio id ${existente.announceId}, ID Bling ${existente.id_bling ?? "-"}). Use o modo 'Alteração' para atualizá-la.`,
            });
          } else {
            semConflitoReferencia.push(r);
          }
        }
        log.info("pre_checagem_referencia_concluida", {
          entrada: registrosParaProcessar.length,
          existentes: registrosParaProcessar.length - semConflitoReferencia.length,
          restantes: semConflitoReferencia.length,
        });

        // 5b) ID Bling em uso por qualquer anúncio ativo (constraint global)
        const conflitosIdBling = await findConflictingIdBling(ctx, transaction, semConflitoReferencia);

        const novos: RegistroInput[] = [];
        for (const r of semConflitoReferencia) {
          const conflito = r.id_bling ? conflitosIdBling.get(keyOfIdBling(r.id_bling)) : undefined;
          if (conflito) {
            registrarErro(ctx, r, {
              tipo: "id_bling_em_uso_no_banco",
              etapa: "pre_checagem_id_bling",
              campo: "id_bling",
              valor: r.id_bling,
              conflitaCom: conflito,
              message: `O ID Bling "${r.id_bling}" já está em uso pelo anúncio da referência "${conflito.reference}" na loja "${conflito.store}" (id ${conflito.announceId}).`,
            });
          } else {
            novos.push(r);
          }
        }
        log.info("pre_checagem_bling_concluida", {
          entrada: semConflitoReferencia.length,
          conflitos: semConflitoReferencia.length - novos.length,
          novos: novos.length,
        });

        registrosFinais = novos;
        tempos.preChecagemMs = Date.now() - t;
      }

      // 5c) Pré-checagem da alteração
      if (modo === "alteracao") {
        const t = Date.now();
        registrosFinais = await validarAlteracao(ctx, transaction, registrosParaProcessar);
        tempos.preChecagemMs = Date.now() - t;
      }

      // 6) Gravação em lotes
      if (registrosFinais.length > 0) {
        const t = Date.now();
        importados = await processAllBatches(ctx, transaction, registrosFinais, channelsGlobal);
        tempos.lotesMs = Date.now() - t;
      } else {
        log.info("nada_para_gravar", { modo });
      }
    });

    const totalRecebido = registrosRaw.length;
    tempos.totalMs = Date.now() - tInicio;
    resumoFinal(ctx, totalRecebido, importados, tempos);

    return NextResponse.json({
      requestId,
      total: totalRecebido,
      importados,
      rejeitados: totalRecebido - importados,
      errosCount: ctx.erros.length,
      errosPorTipo: errosPorTipo(ctx.erros),
      erros: ctx.erros.slice(0, MAX_ERROS_RESPOSTA),
      errosOmitidos: Math.max(0, ctx.erros.length - MAX_ERROS_RESPOSTA),
      duplicidades: duplicidades.slice(0, MAX_DUPLICIDADES_RESPOSTA),
      duplicidadesCount: duplicidades.length,
      duplicidadesOmitidas: Math.max(0, duplicidades.length - MAX_DUPLICIDADES_RESPOSTA),
      warnings,
    });
  } catch (error: unknown) {
    const info = pgErrorInfo(error);

    log.error("importacao_abortada", {
      modo,
      importadosAteAFalha: importados,
      pg: info,
      tempos: { ...tempos, totalMs: Date.now() - tInicio },
    });

    return NextResponse.json(
      {
        error: info.message ?? "Não foi possível importar os anúncios.",
        code: info.code,
        requestId,
      },
      { status: 500 }
    );
  }
}
