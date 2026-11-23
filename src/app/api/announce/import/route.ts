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

type RegistroResultado = {
  posicao: number;
  store: string;
  reference: string;
  id_bling: string | null;
  status: "erro";
  etapa: string;
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

const MAX_REGISTROS = 100_000;
const BATCH_SIZE = 10_000;
const CHECK_BATCH_SIZE = 20_000;
const MAX_CHANNELS = 20;
const SAMPLE_LIMIT = 20;
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

function registrarErro(
  ctx: Ctx,
  r: Pick<RegistroInput, "posicao" | "store" | "reference" | "id_bling">,
  etapa: string,
  message: string,
  extra: Record<string, unknown> = {}
) {
  ctx.erros.push({
    posicao: r.posicao,
    store: r.store,
    reference: r.reference,
    id_bling: r.id_bling ?? null,
    status: "erro",
    etapa,
    message,
  });
  ctx.log.debug("erro_registrado", {
    posicao: r.posicao,
    etapa,
    store: r.store,
    reference: r.reference,
    id_bling: r.id_bling ?? null,
    message,
    ...extra,
  });
}

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------
async function getAuthenticatedUser(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  return getUserFromAccessToken(token);
}

function isValidRegistro(r: any): r is Omit<RegistroInput, "posicao" | "channels"> {
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

function keyOfIdBling(idBling: string | null): string {
  return `bling::${idBling ?? ""}`;
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
// AUDITORIA DO PAYLOAD: detecta duplicidades antes de tocar no banco
// -----------------------------------------------------------------------
function auditarPayload(ctx: Ctx, registros: RegistroInput[]) {
  const porRef = new Map<string, RegistroInput[]>();
  const porBling = new Map<string, RegistroInput[]>();

  for (const r of registros) {
    push(porRef, keyOfInclusao(r.store, r.reference), r);
    if (r.id_bling) push(porBling, keyOfIdBling(r.id_bling), r);
  }

  const refsDup = [...porRef.entries()].filter(([, v]) => v.length > 1);
  const blingDup = [...porBling.entries()].filter(([, v]) => v.length > 1);

  ctx.log.info("auditoria_payload", {
    registrosEntrada: registros.length,
    referenciasUnicas: porRef.size,
    idBlingUnicos: porBling.size,
    referenciasDuplicadas: refsDup.length,
    idBlingDuplicados: blingDup.length,
  });

  for (const [chave, grupo] of sample(refsDup)) {
    const mesmoIdBling = new Set(grupo.map((g) => g.id_bling)).size === 1;
    ctx.log.warn("referencia_duplicada_no_payload", {
      chave,
      store: grupo[0].store,
      reference: grupo[0].reference,
      ocorrencias: grupo.length,
      posicoes: grupo.map((g) => g.posicao),
      idBlings: grupo.map((g) => g.id_bling),
      mesmoIdBling,
      impacto:
        ctx.modo === "inclusao"
          ? "Pode gerar erro 21000 (ON CONFLICT DO UPDATE affects row twice) no lote e cair no fallback linha a linha."
          : "Repetição no UPDATE: o Postgres aplica uma das linhas e ignora a outra sem erro.",
    });
  }

  for (const [chave, grupo] of sample(blingDup)) {
    ctx.log.warn("id_bling_duplicado_no_payload", {
      chave,
      ocorrencias: grupo.length,
      posicoes: grupo.map((g) => g.posicao),
      stores: grupo.map((g) => g.store),
      references: grupo.map((g) => g.reference),
      mesmaReferencia: new Set(grupo.map((g) => g.reference)).size === 1,
    });
  }
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (inclusão): (store, reference) ativos já existentes
// -----------------------------------------------------------------------
async function findExistingReferences(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[]
): Promise<Set<string>> {
  const existentes = new Set<string>();
  const totalBatches = Math.ceil(registros.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const stores = batch.map((r) => r.store);
    const references = batch.map((r) => r.reference);

    const rows = await transaction`
      select a.store, a.reference
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

    for (const r of rows) existentes.add(keyOfInclusao(r.store, r.reference));
  }

  return existentes;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (inclusão): id_bling ativo em QUALQUER loja
// -----------------------------------------------------------------------
async function findConflictingIdBling(
  ctx: Ctx,
  registros: RegistroInput[]
): Promise<Map<string, { store: string; reference: string }>> {
  const conflitos = new Map<string, { store: string; reference: string }>();
  const comIdBling = registros.filter((r) => r.id_bling);
  if (comIdBling.length === 0) return conflitos;

  const totalBatches = Math.ceil(comIdBling.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = comIdBling.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const idBlings = batch.map((r) => r.id_bling);

    const rows = await transaction_placeholder(ctx, idBlings);
    for (const r of rows) {
      conflitos.set(keyOfIdBling(r.id_bling), { store: r.store, reference: r.reference });
    }
  }

  return conflitos;
}

// Placeholder de tipagem: substituído pelo corpo real abaixo (ver nota no final).
async function transaction_placeholder(_ctx: Ctx, _idBlings: (string | null)[]): Promise<any[]> {
  return [];
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (alteração): só anúncios ativos por (store, id_bling)
// -----------------------------------------------------------------------
async function validarAlteracao(
  ctx: Ctx,
  transaction: any,
  registros: RegistroInput[]
): Promise<RegistroInput[]> {
  const ativosPorBling = new Map<string, string>();
  const donoDaRef = new Map<string, string>();

  const totalBatches = Math.ceil(registros.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const stores = batch.map((r) => r.store);
    const idBlings = batch.map((r) => r.id_bling ?? "");
    const references = batch.map((r) => r.reference);

    const ativos: any[] = await transaction`
      select a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${stores}::text[], ${idBlings}::text[]) as s(store, id_bling)
        on a.store = s.store and a.id_bling = s.id_bling
      where a.deleted_at is null
    `;
    for (const r of ativos) ativosPorBling.set(keyOfAlteracao(r.store, r.id_bling), r.reference);

    const ocupantes: any[] = await transaction`
      select a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${stores}::text[], ${references}::text[]) as s(store, reference)
        on a.store = s.store and a.reference = s.reference
      where a.deleted_at is null
    `;
    for (const r of ocupantes) donoDaRef.set(keyOfInclusao(r.store, r.reference), r.id_bling);

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

  const idsVistos = new Set<string>();
  const refsNoArquivo = new Map<string, string>();
  const validos: RegistroInput[] = [];

  for (const r of registros) {
    const kId = keyOfAlteracao(r.store, r.id_bling);
    const kRef = keyOfInclusao(r.store, r.reference);

    if (!ativosPorBling.has(kId)) {
      registrarErro(
        ctx,
        r,
        "alteracao_bling_nao_encontrado",
        "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração.",
        { kId }
      );
    } else if (idsVistos.has(kId)) {
      registrarErro(ctx, r, "alteracao_bling_repetido_arquivo", "ID Bling repetido no arquivo.", { kId });
    } else if (donoDaRef.has(kRef) && donoDaRef.get(kRef) !== r.id_bling) {
      registrarErro(
        ctx,
        r,
        "alteracao_referencia_ocupada",
        "Referência já pertence a outro anúncio ativo desta loja.",
        { donoAtualDaReferencia: donoDaRef.get(kRef) }
      );
    } else if (refsNoArquivo.has(kRef) && refsNoArquivo.get(kRef) !== r.id_bling) {
      registrarErro(
        ctx,
        r,
        "alteracao_referencia_repetida_arquivo",
        "Referência repetida no arquivo para outro ID Bling.",
        { idBlingAnterior: refsNoArquivo.get(kRef) }
      );
    } else {
      idsVistos.add(kId);
      refsNoArquivo.set(kRef, r.id_bling ?? "");
      validos.push(r);
    }
  }

  ctx.log.info("validacao_alteracao_resultado", {
    entrada: registros.length,
    validos: validos.length,
    rejeitados: registros.length - validos.length,
  });

  return validos;
}

// -----------------------------------------------------------------------
// DUPLICADOS DE ID BLING NO PAYLOAD (filtro com erro)
// -----------------------------------------------------------------------
function filterIntraBatchIdBlingDuplicates(ctx: Ctx, registros: RegistroInput[]): RegistroInput[] {
  const primeiraOcorrencia = new Map<string, RegistroInput>();
  const validos: RegistroInput[] = [];

  for (const r of registros) {
    const key = keyOfIdBling(r.id_bling);
    const existente = primeiraOcorrencia.get(key);

    if (existente && existente.reference !== r.reference) {
      registrarErro(
        ctx,
        r,
        "duplicado_id_bling_arquivo",
        `O ID Bling "${r.id_bling}" está duplicado no arquivo importado (já usado pela referência "${existente.reference}" na loja "${existente.store}").`,
        { posicaoOriginal: existente.posicao }
      );
      continue;
    }

    if (!existente) primeiraOcorrencia.set(key, r);
    validos.push(r);
  }

  ctx.log.info("filtro_id_bling_arquivo", {
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
  const inserted = await transaction`
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
  const updated = await transaction`
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
// FALLBACK linha a linha
// -----------------------------------------------------------------------
async function processRowByRow(
  ctx: Ctx,
  transaction: any,
  batch: RegistroInput[],
  erros: RegistroResultado[]
): Promise<Processado[]> {
  const processados: Processado[] = [];
  const modo = ctx.modo;

  for (const registro of batch) {
    try {
      if (modo === "inclusao") {
        const result = await transaction`
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

        if (result.length === 0) {
          registrarErro(
            ctx,
            registro,
            "fallback_referencia_existente",
            "Referência já existe. Use o modo 'Alteração' para atualizá-la.",
            { causa: "ON CONFLICT WHERE deleted_at IS NOT NULL não casou" }
          );
          continue;
        }

        ctx.log.debug("fallback_ok", { posicao: registro.posicao, id: result[0].id, modo });
        processados.push({ posicao: registro.posicao, id: result[0].id, channels: registro.channels });
      } else {
        const result = await transaction`
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

        if (result.length === 0) {
          registrarErro(
            ctx,
            registro,
            "fallback_bling_nao_encontrado",
            "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração.",
            { causa: "UPDATE afetou 0 linhas" }
          );
          continue;
        }

        ctx.log.debug("fallback_ok", { posicao: registro.posicao, id: result[0].id, modo });
        processados.push({ posicao: registro.posicao, id: result[0].id, channels: registro.channels });
      }
    } catch (error: unknown) {
      const info = pgErrorInfo(error);

      ctx.log.error("fallback_erro_linha", {
        posicao: registro.posicao,
        store: registro.store,
        reference: registro.reference,
        id_bling: registro.id_bling,
        modo,
        pg: info,
        alerta:
          "Sem SAVEPOINT por linha: após este erro a transação pode estar abortada (25P02) e as próximas linhas falharão.",
      });

      if (info.code === "23505" && info.constraint === "unq_announce_id_bling_active") {
        registrarErro(
          ctx,
          registro,
          "fallback_unique_id_bling",
          `O ID Bling "${registro.id_bling}" já está em uso por outro anúncio ativo (em qualquer loja).`,
          { constraint: info.constraint }
        );
        continue;
      }

      registrarErro(
        ctx,
        registro,
        "fallback_erro_banco",
        info.message ?? "Erro desconhecido ao gravar o registro.",
        { pgCode: info.code, constraint: info.constraint }
      );
    }
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

      let naoAfetados = 0;
      for (const registro of batch) {
        const key = chaveDoRegistro(ctx.modo, registro);
        if (affectedKeys.has(key)) {
          importados++;
          ctx.importadasPosicoes.add(registro.posicao);
        } else {
          naoAfetados++;
          registrarErro(
            ctx,
            registro,
            "lote_nao_afetado",
            ctx.modo === "inclusao"
              ? "Referência já existe. Use o modo 'Alteração' para atualizá-la."
              : "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração.",
            { chave: key }
          );
        }
      }

      const chavesRepetidas = batch.length - new Set(batch.map((r) => chaveDoRegistro(ctx.modo, r))).size;

      ctx.log.info("lote_concluido", {
        ...loteInfo,
        anunciosAfetados: affected.length,
        linhasAfetadasNoLote: importados,
        naoAfetados,
        chavesRepetidasNoLote: chavesRepetidas,
      });

      if (chavesRepetidas > 0) {
        ctx.log.warn("lote_com_chaves_repetidas", {
          ...loteInfo,
          quantidade: chavesRepetidas,
          observacao:
            "Linhas com a mesma chave no mesmo lote. A contagem de importados pode estar inflada.",
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

      const processados = await processRowByRow(ctx, transaction, batch, ctx.erros);
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

  const porEtapa: Record<string, number> = {};
  for (const e of ctx.erros) porEtapa[e.etapa] = (porEtapa[e.etapa] ?? 0) + 1;

  if (comMultiplosErros.length > 0) {
    ctx.log.warn("linhas_com_multiplos_erros", {
      quantidade: comMultiplosErros.length,
      amostra: sample(comMultiplosErros).map(([posicao, errs]) => ({
        posicao,
        etapas: errs.map((e) => e.etapa),
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

  const unionCobertas =
    ctx.importadasPosicoes.size + errosPorPosicao.size - comErroEImportado.length;
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
    errosPorEtapa: porEtapa,
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

  const registros: RegistroInput[] = [];
  const warnings: string[] = [];
  const invalidos: number[] = [];

  // 1) Parse e validação de campos
  registrosRaw.forEach((raw, i) => {
    const posicao = i + 1;
    if (isValidRegistro(raw)) {
      const channelsLinha = sanitizeChannels((raw as any)?.channels);
      registros.push({
        posicao,
        store: raw.store,
        id_bling: (raw as any).id_bling ?? null,
        reference: raw.reference,
        product: (raw as any).product ?? null,
        mark: (raw as any).mark ?? null,
        channels: channelsLinha.length > 0 ? channelsLinha : channelsGlobal,
      });
    } else {
      invalidos.push(posicao);
      registrarErro(
        ctx,
        {
          posicao,
          store: (raw as any)?.store ?? "?",
          reference: (raw as any)?.reference ?? "?",
          id_bling: null,
        },
        "validacao_campos",
        "Registro inválido: campos obrigatórios ausentes."
      );
    }
  });

  if (invalidos.length > 0) {
    log.warn("registros_invalidos", {
      quantidade: invalidos.length,
      posicoes: sample(invalidos),
    });
  }

  // 2) ID Bling obrigatório
  const semIdBling = registros.filter((r) => !r.id_bling || String(r.id_bling).trim() === "");
  for (const r of semIdBling) {
    registrarErro(
      ctx,
      r,
      "validacao_id_bling",
      "ID Bling é obrigatório e não foi informado. O registro não foi criado."
    );
  }
  if (semIdBling.length > 0) {
    log.warn("id_bling_ausente", {
      quantidade: semIdBling.length,
      posicoes: sample(semIdBling.map((r) => r.posicao)),
    });
  }

  let registrosParaProcessar = registros.filter(
    (r) => r.id_bling && String(r.id_bling).trim() !== ""
  );

  // 3) Auditoria de duplicidades no payload
  auditarPayload(ctx, registrosParaProcessar);

  // 4) Filtro de id_bling duplicado com referências diferentes
  registrosParaProcessar = filterIntraBatchIdBlingDuplicates(ctx, registrosParaProcessar);

  if (registrosParaProcessar.length === 0) {
    log.warn("nenhum_registro_valido", { erros: ctx.erros.length });
    return NextResponse.json(
      {
        error: "Nenhum registro válido foi encontrado no payload.",
        requestId,
        erros: ctx.erros.slice(0, 50),
      },
      { status: 400 }
    );
  }

  const nenhumRegistroTemCanal = registrosParaProcessar.every((r) => r.channels.length === 0);
  if (nenhumRegistroTemCanal) {
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
          if (existentes.has(keyOfInclusao(r.store, r.reference))) {
            registrarErro(
              ctx,
              r,
              "pre_checagem_referencia_existente",
              "Referência já existe. Use o modo 'Alteração' para atualizá-la."
            );
          } else {
            semConflitoReferencia.push(r);
          }
        }
        log.info("pre_checagem_referencia_concluida", {
          entrada: registrosParaProcessar.length,
          existentes: registrosParaProcessar.length - semConflitoReferencia.length,
          restantes: semConflitoReferencia.length,
        });

        const conflitosIdBling = await findConflictingIdBling(ctx, semConflitoReferencia);

        const novos: RegistroInput[] = [];
        for (const r of semConflitoReferencia) {
          const conflito = conflitosIdBling.get(keyOfIdBling(r.id_bling));
          if (conflito && conflito.reference !== r.reference) {
            registrarErro(
              ctx,
              r,
              "pre_checagem_id_bling_em_uso",
              `O ID Bling "${r.id_bling}" já está em uso pela referência "${conflito.reference}" na loja "${conflito.store}".`,
              { donoAtual: conflito }
            );
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

      // 5b) Pré-checagem da alteração
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
      erros: ctx.erros.slice(0, 50),
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
