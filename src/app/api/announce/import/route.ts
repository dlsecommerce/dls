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
  // Canais específicos desta linha. Se vazio/ausente, usa o array `channels` global.
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
 * Aceita apenas array de strings não vazias, remove duplicadas
 * e limita o tamanho (proteção contra payload gigante).
 */
function sanitizeChannels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .filter((c): c is string => typeof c === "string" && c.trim() !== "")
    .map((c) => c.trim());

  return Array.from(new Set(cleaned)).slice(0, MAX_CHANNELS);
}

/**
 * Chave canônica de um conjunto de canais, usada para agrupar
 * anúncios que recebem exatamente os mesmos canais.
 */
function channelsSignature(channels: string[]): string {
  return [...channels].sort().join("\u0000");
}

function keyOfInclusao(store: string, reference: string): string {
  return `${store}::ref::${reference}`;
}

// A constraint unq_announce_id_bling_active é sobre id_bling GLOBAL
// (sem considerar store), com WHERE deleted_at IS NULL.
function keyOfIdBling(idBling: string | null): string {
  return `bling::${idBling ?? ""}`;
}

function keyOfAlteracao(store: string, idBling: string | null): string {
  return `${store}::bling::${idBling ?? ""}`;
}

// -----------------------------------------------------------------------
// PRÉ-CHECAGEM (inclusão): verifica quais (store, reference) já existem ativos
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
// PRÉ-CHECAGEM (inclusão): verifica id_bling ATIVOS em QUALQUER loja,
// vinculados a uma referência diferente da enviada.
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
// PRÉ-CHECAGEM (alteração): só aceita anúncios ATIVOS localizados por
// (store, id_bling). Nunca reativa excluídos. A nova referência não pode
// pertencer a outro anúncio ativo da mesma loja.
// -----------------------------------------------------------------------
async function validarAlteracao(
  transaction: any,
  registros: RegistroInput[],
  erros: RegistroResultado[]
): Promise<RegistroInput[]> {
  // store::bling::idBling -> referência atual do anúncio ativo
  const ativosPorBling = new Map<string, string>();
  // store::ref::reference -> id_bling do anúncio ativo que ocupa a referência
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

    for (const r of ativos) {
      ativosPorBling.set(keyOfAlteracao(r.store, r.id_bling), r.reference);
    }

    const ocupantes: any[] = await transaction`
      select a.store, a.id_bling, a.reference
      from newsystem.announce a
      join unnest(${stores}::text[], ${references}::text[]) as s(store, reference)
        on a.store = s.store and a.reference = s.reference
      where a.deleted_at is null
    `;

    for (const r of ocupantes) {
      donoDaRef.set(keyOfInclusao(r.store, r.reference), r.id_bling);
    }
  }

  const idsVistos = new Set<string>();
  const refsNoArquivo = new Map<string, string>();
  const validos: RegistroInput[] = [];

  for (const r of registros) {
    const kId = keyOfAlteracao(r.store, r.id_bling);
    const kRef = keyOfInclusao(r.store, r.reference);

    const rejeitar = (message: string) =>
      erros.push({ store: r.store, reference: r.reference, status: "erro", message });

    if (!ativosPorBling.has(kId)) {
      rejeitar(
        "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração."
      );
    } else if (idsVistos.has(kId)) {
      rejeitar("ID Bling repetido no arquivo.");
    } else if (donoDaRef.has(kRef) && donoDaRef.get(kRef) !== r.id_bling) {
      rejeitar("Referência já pertence a outro anúncio ativo desta loja.");
    } else if (refsNoArquivo.has(kRef) && refsNoArquivo.get(kRef) !== r.id_bling) {
      rejeitar("Referência repetida no arquivo para outro ID Bling.");
    } else {
      idsVistos.add(kId);
      refsNoArquivo.set(kRef, r.id_bling ?? "");
      validos.push(r);
    }
  }

  return validos;
}

// -----------------------------------------------------------------------
// Detecta id_bling duplicado DENTRO do payload, vinculado a referências
// diferentes. A constraint é global, então vale entre lojas também.
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
// INCLUSÃO (apenas registros já filtrados como novos e sem conflito)
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
// ALTERAÇÃO: só atualiza anúncios ATIVOS. Não reativa excluídos.
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
      updated_at = now()
    from unnest(
      ${stores}::text[],
      ${idBlings}::text[],
      ${references}::text[],
      ${products}::text[],
      ${marks}::text[]
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
// Vincula os canais de marketplace aos anúncios afetados.
// O trigger trg_marketplace_apply_rules calcula preço/margem normalmente.
// ON CONFLICT DO NOTHING cobre os índices únicos parciais de marketplace.
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
 * Agrupa os anúncios afetados pelo conjunto de canais efetivo de cada
 * registro, e chama linkChannelsToAnnounces uma vez por grupo.
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
            updated_at = now()
          where store = ${registro.store}
            and id_bling = ${registro.id_bling}
            and deleted_at is null
          returning id
        `;

        if (result.length === 0) {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message:
              "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração.",
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
                : "ID Bling não encontrado entre os anúncios ativos desta loja. Registros excluídos não são reativados por alteração.",
          });
        }
      }
    } catch {
      await transaction.unsafe(`rollback to savepoint ${savepointName}`);
      await transaction.unsafe(`release savepoint ${savepointName}`);

      const processados = await processRowByRow(transaction, batch, modo, erros);
      importados += processados.length;

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

  // ID Bling é obrigatório em AMBOS os modos.
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

  registrosParaProcessar = filterIntraBatchIdBlingDuplicates(registrosParaProcessar, erros);

  if (registrosParaProcessar.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro válido foi encontrado no payload." },
      { status: 400 }
    );
  }

  const nenhumRegistroTemCanal = registrosParaProcessar.every((r) => r.channels.length === 0);

  if (nenhumRegistroTemCanal) {
    warnings.push(
      "Nenhum canal de marketplace foi selecionado. Os registros importados NÃO serão vinculados a nenhum canal."
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

      let registrosFinais: RegistroInput[] = registrosParaProcessar;

      // PRÉ-CHECAGEM DA INCLUSÃO
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

      // PRÉ-CHECAGEM DA ALTERAÇÃO
      if (modo === "alteracao") {
        registrosFinais = await validarAlteracao(transaction, registrosParaProcessar, erros);
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
