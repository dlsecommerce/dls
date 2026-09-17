// src/app/api/announce/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPostgresClient } from "@/lib/postgres";
import { getUserFromAccessToken, extractBearerToken } from "@/integrations/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModoImportacao = "inclusao" | "alteracao";

type RegistroInput = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  // ✅ Canais específicos desta linha (linha a linha). Se vazio/ausente,
  // usa o array `channels` global enviado no corpo da requisição.
  channels: string[];
};

type RegistroResultado = {
  store: string;
  reference: string;
  status: "erro";
  message: string;
};

const MAX_REGISTROS = 100_000;
const BATCH_SIZE = 10_000;
const CHECK_BATCH_SIZE = 20_000;
const MAX_CHANNELS = 20;

async function getAuthenticatedUser(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  return getUserFromAccessToken(token);
}

function isValidRegistro(r: any): r is Omit<RegistroInput, "channels"> {
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

/**
 * Sanitiza a lista de canais recebida do cliente: aceita apenas
 * array de strings não vazias, remove duplicadas e limita o
 * tamanho (proteção contra payload malicioso/gigante).
 */
function sanitizeChannels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .filter((c): c is string => typeof c === "string" && c.trim() !== "")
    .map((c) => c.trim());

  return Array.from(new Set(cleaned)).slice(0, MAX_CHANNELS);
}

/**
 * ✅ Retorna uma chave estável (canônica) para um array de canais,
 * usada para agrupar anúncios que recebem exatamente o mesmo
 * conjunto de canais (permite fazer um único INSERT em lote por
 * grupo, em vez de um INSERT por anúncio).
 */
function channelsSignature(channels: string[]): string {
  return [...channels].sort().join("\u0000");
}

function keyOfInclusao(store: string, reference: string): string {
  return `${store}::ref::${reference}`;
}

// ✅ A constraint unq_announce_id_bling_active é sobre id_bling GLOBAL
// (sem considerar store) — WHERE deleted_at IS NULL.
function keyOfIdBling(idBling: string | null): string {
  return `bling::${idBling ?? ""}`;
}

function keyOfAlteracao(store: string, idBling: string | null): string {
  return `${store}::bling::${idBling ?? ""}`;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM: verifica quais (store, reference) já existem e estão ativos
// -----------------------------------------------------------------------
async function findExistingReferences(
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

    for (const r of rows) {
      existentes.add(keyOfInclusao(r.store, r.reference));
    }
  }

  return existentes;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM: verifica quais id_bling já existem ATIVOS no banco,
// em QUALQUER loja, vinculados a uma referência diferente da enviada.
// A constraint unq_announce_id_bling_active é global (sem store).
// -----------------------------------------------------------------------
async function findConflictingIdBling(
  transaction: any,
  registros: RegistroInput[]
): Promise<Map<string, { store: string; reference: string }>> {
  const conflitos = new Map<string, { store: string; reference: string }>();
  const comIdBling = registros.filter((r) => r.id_bling);

  if (comIdBling.length === 0) return conflitos;

  const totalBatches = Math.ceil(comIdBling.length / CHECK_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = comIdBling.slice(i * CHECK_BATCH_SIZE, (i + 1) * CHECK_BATCH_SIZE);
    const idBlings = batch.map((r) => r.id_bling);

    const rows = await transaction`
      select a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${idBlings}::text[]) as s(id_bling)
        on a.id_bling = s.id_bling
      where a.deleted_at is null
    `;

    for (const r of rows) {
      conflitos.set(keyOfIdBling(r.id_bling), { store: r.store, reference: r.reference });
    }
  }

  return conflitos;
}

// -----------------------------------------------------------------------
// ✅ Detecta id_bling duplicado DENTRO do próprio payload, vinculado a
// referências diferentes. A constraint é global, então isso vale mesmo
// entre linhas de lojas diferentes no mesmo arquivo.
// -----------------------------------------------------------------------
function filterIntraBatchIdBlingDuplicates(
  registros: RegistroInput[],
  erros: RegistroResultado[]
): RegistroInput[] {
  const primeiraOcorrencia = new Map<string, RegistroInput>();
  const validos: RegistroInput[] = [];

  for (const r of registros) {
    const key = keyOfIdBling(r.id_bling);
    const existente = primeiraOcorrencia.get(key);

    if (existente && existente.reference !== r.reference) {
      erros.push({
        store: r.store,
        reference: r.reference,
        status: "erro",
        message: `O ID Bling "${r.id_bling}" está duplicado no arquivo importado (já usado pela referência "${existente.reference}" na loja "${existente.store}").`,
      });
      continue;
    }

    if (!existente) {
      primeiraOcorrencia.set(key, r);
    }

    validos.push(r);
  }

  return validos;
}

// -----------------------------------------------------------------------
// INCLUSÃO (apenas registros já filtrados como "novos" e sem conflito de id_bling)
// Retorna as linhas afetadas com sua chave de correspondência (key),
// usadas depois para localizar o registro original e seus `channels`.
// -----------------------------------------------------------------------
async function insertBatchOnlyNew(
  transaction: any,
  batch: RegistroInput[]
): Promise<{ affectedKeys: Set<string>; affected: { id: string; key: string }[] }> {
  const stores = batch.map((r) => r.store);
  const idBlings = batch.map((r) => r.id_bling);
  const references = batch.map((r) => r.reference);
  const products = batch.map((r) => r.product);
  const marks = batch.map((r) => r.mark);

  const inserted = await transaction`
    insert into newsystem.announce
      (store, id_bling, reference, product, mark, updated_at, deleted_at)
    select
      s.store, s.id_bling, s.reference, s.product, s.mark, now(), null
    from unnest(
      ${stores}::text[],
      ${idBlings}::text[],
      ${references}::text[],
      ${products}::text[],
      ${marks}::text[]
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
// ALTERAÇÃO — idem, retorna as linhas afetadas com sua chave de
// correspondência (key).
// -----------------------------------------------------------------------
async function updateBatchOnlyExisting(
  transaction: any,
  batch: RegistroInput[]
): Promise<{ affectedKeys: Set<string>; affected: { id: string; key: string }[] }> {
  const stores = batch.map((r) => r.store);
  const idBlings = batch.map((r) => r.id_bling);
  const references = batch.map((r) => r.reference);
  const products = batch.map((r) => r.product);
  const marks = batch.map((r) => r.mark);

  const updated = await transaction`
    update newsystem.announce as a
    set
      reference  = s.reference,
      product    = s.product,
      mark       = s.mark,
      updated_at = now(),
      deleted_at = null
    from unnest(
      ${stores}::text[],
      ${idBlings}::text[],
      ${references}::text[],
      ${products}::text[],
      ${marks}::text[]
    ) as s(store, id_bling, reference, product, mark)
    where a.store = s.store and a.id_bling = s.id_bling
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
// ✅ Vincula os canais de marketplace selecionados na UI aos anúncios
// afetados pela importação (inclusão ou alteração).
//
// Insere direto em `newsystem.marketplace` — o trigger
// `trg_marketplace_apply_rules` (BEFORE INSERT) calcula preço/margem
// normalmente, igual ao fluxo manual do ChannelSelector.
//
// `ON CONFLICT DO NOTHING` cobre AMBOS os índices únicos parciais:
//   - (store, channel, announce_id) WHERE deleted_at IS NULL → já
//     vinculado a este canal, não faz nada.
//   - (channel, id_bling) WHERE deleted_at IS NULL → id_bling já em
//     uso nesse canal por outro anúncio: ignora silenciosamente.
//
// Como id_bling agora é OBRIGATÓRIO para criar/alterar o anúncio
// (ver validação no POST), todo `announceId` passado aqui já tem
// id_bling preenchido — o vínculo sempre pode ser tentado.
// -----------------------------------------------------------------------
async function linkChannelsToAnnounces(
  transaction: any,
  announceIds: string[],
  channels: string[]
): Promise<void> {
  if (announceIds.length === 0 || channels.length === 0) return;

  await transaction`
    insert into newsystem.marketplace
      (store, channel, announce_id, id_bling, reference, product, mark)
    select
      a.store, c.channel, a.id, a.id_bling, a.reference, a.product, a.mark
    from newsystem.announce a
    cross join unnest(${channels}::text[]) as c(channel)
    where a.id = any(${announceIds}::uuid[])
      and a.deleted_at is null
      and a.id_bling is not null
    on conflict do nothing
  `;
}

/**
 * ✅ Agrupa uma lista de anúncios afetados (id + key de correspondência)
 * pelo conjunto de canais efetivo de cada registro original, e chama
 * `linkChannelsToAnnounces` uma vez por grupo — permitindo que cada
 * linha do arquivo tenha seus próprios canais, com o mínimo de
 * round-trips ao banco (agrupa quem tem exatamente o mesmo conjunto).
 */
async function linkChannelsPerRow(
  transaction: any,
  affected: { id: string; key: string }[],
  registrosPorKey: Map<string, RegistroInput>
): Promise<void> {
  if (affected.length === 0) return;

  const grupos = new Map<string, { channels: string[]; ids: string[] }>();

  for (const { id, key } of affected) {
    const registro = registrosPorKey.get(key);
    const efetivo = registro?.channels ?? [];

    if (efetivo.length === 0) continue;

    const signature = channelsSignature(efetivo);
    const grupo = grupos.get(signature);

    if (grupo) {
      grupo.ids.push(id);
    } else {
      grupos.set(signature, { channels: efetivo, ids: [id] });
    }
  }

  for (const { channels, ids } of grupos.values()) {
    await linkChannelsToAnnounces(transaction, ids, channels);
  }
}

// -----------------------------------------------------------------------
// Fallback linha a linha
// -----------------------------------------------------------------------
async function processRowByRow(
  transaction: any,
  batch: RegistroInput[],
  modo: ModoImportacao,
  erros: RegistroResultado[]
): Promise<{ id: string; channels: string[] }[]> {
  const processados: { id: string; channels: string[] }[] = [];

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
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message: "Referência já existe. Use o modo 'Alteração' para atualizá-la.",
          });
          continue;
        }

        processados.push({ id: result[0].id, channels: registro.channels });
      } else {
        const result = await transaction`
          update newsystem.announce
          set
            reference  = ${registro.reference},
            product    = ${registro.product},
            mark       = ${registro.mark},
            updated_at = now(),
            deleted_at = null
          where store = ${registro.store} and id_bling = ${registro.id_bling}
          returning id
        `;

        if (result.length === 0) {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message: "ID Bling não encontrado. Use o modo 'Inclusão' para criá-lo, ou verifique se o ID Bling está correto.",
          });
          continue;
        }

        processados.push({ id: result[0].id, channels: registro.channels });
      }
    } catch (error: unknown) {
      const dbError = error as { message?: string; code?: string; constraint?: string };

      if (dbError?.code === "23505" && dbError?.constraint === "unq_announce_id_bling_active") {
        erros.push({
          store: registro.store,
          reference: registro.reference,
          status: "erro",
          message: `O ID Bling "${registro.id_bling}" já está em uso por outro anúncio ativo (em qualquer loja).`,
        });
        continue;
      }

      erros.push({
        store: registro.store,
        reference: registro.reference,
        status: "erro",
        message: dbError?.message ?? "Erro desconhecido ao gravar o registro.",
      });
    }
  }

  return processados;
}

async function processAllBatches(
  transaction: any,
  registros: RegistroInput[],
  modo: ModoImportacao,
  channelsGlobal: string[],
  erros: RegistroResultado[]
): Promise<number> {
  let importados = 0;
  const totalBatches = Math.ceil(registros.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const savepointName = `sp_batch_${i}`;

    // ✅ Mapa key → registro do próprio batch, usado para localizar o
    // `channels` efetivo (por linha, com fallback ao global) de cada
    // anúncio afetado pelo INSERT/UPDATE em massa.
    const registrosPorKey = new Map<string, RegistroInput>();
    for (const registro of batch) {
      const key =
        modo === "inclusao"
          ? keyOfInclusao(registro.store, registro.reference)
          : keyOfAlteracao(registro.store, registro.id_bling);
      registrosPorKey.set(key, registro);
    }

    await transaction.unsafe(`savepoint ${savepointName}`);

    try {
      const { affectedKeys, affected } =
        modo === "inclusao"
          ? await insertBatchOnlyNew(transaction, batch)
          : await updateBatchOnlyExisting(transaction, batch);

      await linkChannelsPerRow(transaction, affected, registrosPorKey);

      await transaction.unsafe(`release savepoint ${savepointName}`);

      for (const registro of batch) {
        const key =
          modo === "inclusao"
            ? keyOfInclusao(registro.store, registro.reference)
            : keyOfAlteracao(registro.store, registro.id_bling);

        if (affectedKeys.has(key)) {
          importados++;
        } else {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message:
              modo === "inclusao"
                ? "Referência já existe. Use o modo 'Alteração' para atualizá-la."
                : "ID Bling não encontrado. Use o modo 'Inclusão' para criá-lo, ou verifique se o ID Bling está correto.",
          });
        }
      }
    } catch {
      await transaction.unsafe(`rollback to savepoint ${savepointName}`);
      await transaction.unsafe(`release savepoint ${savepointName}`);

      const processados = await processRowByRow(transaction, batch, modo, erros);
      importados += processados.length;

      // ✅ Fallback linha a linha também respeita canais por registro.
      const grupos = new Map<string, { channels: string[]; ids: string[] }>();
      for (const { id, channels } of processados) {
        const efetivo = channels.length > 0 ? channels : channelsGlobal;
        if (efetivo.length === 0) continue;
        const signature = channelsSignature(efetivo);
        const grupo = grupos.get(signature);
        if (grupo) grupo.ids.push(id);
        else grupos.set(signature, { channels: efetivo, ids: [id] });
      }
      for (const { channels: canaisGrupo, ids } of grupos.values()) {
        await linkChannelsToAnnounces(transaction, ids, canaisGrupo);
      }
    }
  }

  return importados;
}

export async function POST(request: NextRequest): Promise<Response> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Sua sessão não é válida ou expirou. Entre novamente no sistema." },
      { status: 401 }
    );
  }

  let body: { registros?: unknown; modo?: unknown; channels?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "O corpo da requisição não é um JSON válido." },
      { status: 400 }
    );
  }

  if (!isValidModo(body?.modo)) {
    return NextResponse.json(
      { error: "O campo 'modo' deve ser 'inclusao' ou 'alteracao'." },
      { status: 400 }
    );
  }

  const modo: ModoImportacao = body.modo;
  // ✅ Canais globais (fallback): usados por qualquer linha que não
  // defina o seu próprio `channels`.
  const channelsGlobal = sanitizeChannels(body?.channels);
  const registrosRaw = Array.isArray(body?.registros) ? body.registros : null;

  if (!registrosRaw || registrosRaw.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro foi enviado para importação." },
      { status: 400 }
    );
  }

  if (registrosRaw.length > MAX_REGISTROS) {
    return NextResponse.json(
      {
        error: `O limite máximo por importação é de ${MAX_REGISTROS} registros. Você enviou ${registrosRaw.length}.`,
      },
      { status: 400 }
    );
  }

  const registros: RegistroInput[] = [];
  const erros: RegistroResultado[] = [];
  const warnings: string[] = [];

  for (const raw of registrosRaw) {
    if (isValidRegistro(raw)) {
      // ✅ Prioriza `raw.channels` (canais específicos da linha). Se
      // ausente/vazio, usa o array global como fallback.
      const channelsLinha = sanitizeChannels((raw as any)?.channels);
      const channelsEfetivo = channelsLinha.length > 0 ? channelsLinha : channelsGlobal;

      registros.push({
        store: raw.store,
        id_bling: raw.id_bling ?? null,
        reference: raw.reference,
        product: raw.product ?? null,
        mark: raw.mark ?? null,
        channels: channelsEfetivo,
      });
    } else {
      erros.push({
        store: raw?.store ?? "?",
        reference: raw?.reference ?? "?",
        status: "erro",
        message: "Registro inválido: campos obrigatórios ausentes.",
      });
    }
  }

  // ✅ REGRA: ID Bling é obrigatório em AMBOS os modos. Sem ID Bling,
  // o registro não é criado nem alterado — só rejeitado com erro.
  const semIdBling = registros.filter((r) => !r.id_bling || String(r.id_bling).trim() === "");

  for (const r of semIdBling) {
    erros.push({
      store: r.store,
      reference: r.reference,
      status: "erro",
      message: "ID Bling é obrigatório e não foi informado. O registro não foi criado.",
    });
  }

  let registrosParaProcessar = registros.filter(
    (r) => r.id_bling && String(r.id_bling).trim() !== ""
  );

  // ✅ Remove duplicidade de id_bling dentro do próprio arquivo
  // (constraint é global, então aplica-se independente do modo)
  registrosParaProcessar = filterIntraBatchIdBlingDuplicates(registrosParaProcessar, erros);

  if (registrosParaProcessar.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro válido foi encontrado no payload." },
      { status: 400 }
    );
  }

  // ✅ Aviso: nenhum canal (nem por linha, nem global) foi definido —
  // os registros afetados serão importados/alterados, mas SEM vínculo
  // em nenhum marketplace.
  const nenhumRegistroTemCanal = registrosParaProcessar.every((r) => r.channels.length === 0);

  if (nenhumRegistroTemCanal) {
    warnings.push(
      `Nenhum canal de marketplace foi selecionado. Os registros importados NÃO serão vinculados a nenhum canal.`
    );
  }

  try {
    const sql = getPostgresClient();
    let importados = 0;

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

      let registrosFinais = registrosParaProcessar;

      // -----------------------------------------------------------------
      // PRÉ-CHECAGEM (somente no modo inclusão):
      // 1) Rejeita quem já existe por (store, reference)
      // 2) ✅ Rejeita quem tem id_bling já vinculado a OUTRA referência ativa
      //    em QUALQUER loja (constraint global)
      // -----------------------------------------------------------------
      if (modo === "inclusao") {
        const existentes = await findExistingReferences(transaction, registrosParaProcessar);

        const semConflitoReferencia: RegistroInput[] = [];

        for (const r of registrosParaProcessar) {
          const key = keyOfInclusao(r.store, r.reference);
          if (existentes.has(key)) {
            erros.push({
              store: r.store,
              reference: r.reference,
              status: "erro",
              message: "Referência já existe. Use o modo 'Alteração' para atualizá-la.",
            });
          } else {
            semConflitoReferencia.push(r);
          }
        }

        const conflitosIdBling = await findConflictingIdBling(transaction, semConflitoReferencia);

        const novos: RegistroInput[] = [];

        for (const r of semConflitoReferencia) {
          const conflito = conflitosIdBling.get(keyOfIdBling(r.id_bling));

          if (conflito && conflito.reference !== r.reference) {
            erros.push({
              store: r.store,
              reference: r.reference,
              status: "erro",
              message: `O ID Bling "${r.id_bling}" já está em uso pela referência "${conflito.reference}" na loja "${conflito.store}".`,
            });
          } else {
            novos.push(r);
          }
        }

        registrosFinais = novos;
      }

      if (registrosFinais.length > 0) {
        importados = await processAllBatches(
          transaction,
          registrosFinais,
          modo,
          channelsGlobal,
          erros
        );
      }
    });

    const total = registrosRaw.length;
    const rejeitados = total - importados;

    return NextResponse.json({
      total,
      importados,
      rejeitados,
      errosCount: erros.length,
      erros: erros.slice(0, 50),
      warnings,
    });
  } catch (error: unknown) {
    const dbError = error as {
      name?: string;
      message?: string;
      code?: string;
      detail?: string;
      hint?: string;
      where?: string;
    };

    console.error("Erro na importação de announce:", {
      name: dbError?.name ?? null,
      message: dbError?.message ?? null,
      code: dbError?.code ?? null,
      detail: dbError?.detail ?? null,
      hint: dbError?.hint ?? null,
      where: dbError?.where ?? null,
    });

    return NextResponse.json(
      {
        error: dbError?.message ?? "Não foi possível importar os anúncios.",
        code: dbError?.code ?? null,
      },
      { status: 500 }
    );
  }
}
