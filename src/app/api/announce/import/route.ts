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
};

type RegistroResultado = {
  store: string;
  reference: string;
  status: "erro";
  message: string;
};

const MAX_REGISTROS = 100_000;

// Lote fixo para o upsert em massa via unnest.
// 5 colunas x 10.000 linhas = 50.000 parâmetros (limite do Postgres é 65.534).
// Rápido e seguro mesmo em arquivos de 100k+ linhas.
const BATCH_SIZE = 10_000;

// -----------------------------------------------------------------------
// Autenticação — valida o Bearer token via cliente admin do Supabase
// -----------------------------------------------------------------------
async function getAuthenticatedUser(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));
  return getUserFromAccessToken(token);
}

// -----------------------------------------------------------------------
// Validação
// -----------------------------------------------------------------------
function isValidRegistro(r: any): r is RegistroInput {
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

// -----------------------------------------------------------------------
// Chaves de correspondência — DIFERENTES por modo:
//  - Inclusão: casa por (store, reference), pois é a chave única da
//    tabela e o que o "on conflict" usa para detectar duplicidade.
//  - Alteração: casa por (store, id_bling), pois agora a "reference"
//    pode ser livremente reescrita nesse modo. id_bling é o
//    identificador estável e NUNCA é sobrescrito aqui.
// -----------------------------------------------------------------------
function keyOfInclusao(store: string, reference: string): string {
  return `${store}::ref::${reference}`;
}

function keyOfAlteracao(store: string, idBling: string | null): string {
  return `${store}::bling::${idBling ?? ""}`;
}

// -----------------------------------------------------------------------
// INCLUSÃO — insere apenas o que NÃO existe. "on conflict do nothing"
// garante que registros já existentes não sejam sobrescritos. O
// "returning" identifica exatamente quais linhas do lote foram de
// fato inseridas; as demais são rejeitadas por regra de negócio.
// -----------------------------------------------------------------------
async function insertBatchOnlyNew(transaction: any, batch: RegistroInput[]): Promise<Set<string>> {
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
    on conflict (store, reference) do nothing
    returning store, reference
  `;

  return new Set(inserted.map((r: any) => keyOfInclusao(r.store, r.reference)));
}

// -----------------------------------------------------------------------
// ALTERAÇÃO — atualiza apenas o que JÁ existe, casando por
// (store, id_bling). A "reference" agora É editável neste modo.
// O "id_bling" NUNCA é sobrescrito: é a chave de busca, não um campo
// de atualização. Sem cláusula "insert": linhas sem correspondência
// simplesmente não afetam nenhuma linha, detectado via "returning".
// -----------------------------------------------------------------------
async function updateBatchOnlyExisting(transaction: any, batch: RegistroInput[]): Promise<Set<string>> {
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
    returning a.store, a.id_bling
  `;

  return new Set(updated.map((r: any) => keyOfAlteracao(r.store, r.id_bling)));
}

// -----------------------------------------------------------------------
// Fallback linha a linha — mesma regra de rejeição do modo bulk,
// usado apenas quando o lote inteiro falha tecnicamente (erro de banco).
// -----------------------------------------------------------------------
async function processRowByRow(
  transaction: any,
  batch: RegistroInput[],
  modo: ModoImportacao,
  erros: RegistroResultado[]
): Promise<number> {
  let processados = 0;

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
          on conflict (store, reference) do nothing
          returning store
        `;

        if (result.length === 0) {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message: "Referência já existe. Use o modo 'Alteração' para atualizá-la.",
          });
        } else {
          processados++;
        }
      } else {
        // Modo alteração: id_bling é obrigatório e é a chave de busca.
        // reference É atualizável; id_bling NUNCA é sobrescrito.
        if (!registro.id_bling) {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message: "ID Bling é obrigatório no modo 'Alteração'.",
          });
          continue;
        }

        const result = await transaction`
          update newsystem.announce
          set
            reference  = ${registro.reference},
            product    = ${registro.product},
            mark       = ${registro.mark},
            updated_at = now(),
            deleted_at = null
          where store = ${registro.store} and id_bling = ${registro.id_bling}
          returning store
        `;

        if (result.length === 0) {
          erros.push({
            store: registro.store,
            reference: registro.reference,
            status: "erro",
            message: "ID Bling não encontrado. Use o modo 'Inclusão' para criá-lo, ou verifique se o ID Bling está correto.",
          });
        } else {
          processados++;
        }
      }
    } catch (error: unknown) {
      const dbError = error as { message?: string };
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

/**
 * Processa TODOS os registros em lotes fixos de BATCH_SIZE.
 * Cada lote roda em savepoint: se falhar tecnicamente (erro de banco),
 * cai para linha a linha SÓ naquele lote (isola o problema sem
 * penalizar os demais).
 *
 * Linhas rejeitadas por REGRA DE NEGÓCIO (já existe / não existe,
 * conforme o modo) são sempre detectadas via "returning" — mesmo no
 * caminho bulk, sem precisar de query extra de verificação.
 */
async function processAllBatches(
  transaction: any,
  registros: RegistroInput[],
  modo: ModoImportacao,
  erros: RegistroResultado[]
): Promise<number> {
  let importados = 0;
  const totalBatches = Math.ceil(registros.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = registros.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const savepointName = `sp_batch_${i}`;

    await transaction.unsafe(`savepoint ${savepointName}`);

    try {
      const affectedKeys =
        modo === "inclusao"
          ? await insertBatchOnlyNew(transaction, batch)
          : await updateBatchOnlyExisting(transaction, batch);

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
      importados += await processRowByRow(transaction, batch, modo, erros);
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

  let body: { registros?: unknown; modo?: unknown };

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

  for (const raw of registrosRaw) {
    if (isValidRegistro(raw)) {
      registros.push({
        store: raw.store,
        id_bling: raw.id_bling ?? null,
        reference: raw.reference,
        product: raw.product ?? null,
        mark: raw.mark ?? null,
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

  // No modo alteração, id_bling é obrigatório: é a chave de busca.
  // Registros sem id_bling são rejeitados aqui, antes de ir ao banco.
  let registrosParaProcessar = registros;

  if (modo === "alteracao") {
    const semIdBling = registros.filter((r) => !r.id_bling);

    for (const r of semIdBling) {
      erros.push({
        store: r.store,
        reference: r.reference,
        status: "erro",
        message: "ID Bling é obrigatório no modo 'Alteração'.",
      });
    }

    registrosParaProcessar = registros.filter((r) => Boolean(r.id_bling));
  }

  if (registrosParaProcessar.length === 0) {
    return NextResponse.json(
      { error: "Nenhum registro válido foi encontrado no payload." },
      { status: 400 }
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

      // Comando 1: os 3 set_config combinados em um único SELECT com
      // parâmetros — é 1 comando só, então funciona como prepared
      // statement normal (não viola a restrição de multi-comando).
      await transaction.unsafe(
        `select
           set_config('request.jwt.claims', $1, true),
           set_config('request.jwt.claim.sub', $2, true),
           set_config('request.jwt.claim.role', 'authenticated', true)`,
        [jwtClaims, user.id]
      );

      // Comando 2: os dois SET LOCAL combinados. Sem parâmetros, então
      // { prepare: false } permite múltiplos comandos na mesma chamada
      // (contorna a restrição "multiple commands into a prepared
      // statement" do driver, já que aqui não há bind de valores).
      await transaction.unsafe(
        `set local role authenticated; set local work_mem = '256MB';`,
        [],
        { prepare: false }
      );

      importados = await processAllBatches(transaction, registrosParaProcessar, modo, erros);
    });

    return NextResponse.json({
      total: registrosRaw.length,
      importados,
      errosCount: erros.length,
      erros: erros.slice(0, 50),
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
