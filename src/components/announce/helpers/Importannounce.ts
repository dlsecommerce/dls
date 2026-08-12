// ImportAnnounce.ts

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

export type ImportResult = {
  data: any[];
  warnings: string[];
  errors?: string[];
  fileName: string;
};

export type ImportProgress = {
  processed: number;
  total: number;
  batchSize: number;
};

export type ModoImportacao = "inclusao" | "alteracao";

// Nomes das colunas exigidas NO ARQUIVO (planilha em português).
// "ID Bling" só é exigido no modo "alteracao" (chave de busca nesse modo).
const REQUIRED_COLUMNS_INCLUSAO = ["Loja", "Referência"];
const REQUIRED_COLUMNS_ALTERACAO = ["Loja", "Referência", "ID Bling"];

const MAX_ERRORS_SHOWN = 10;
const MAX_ROWS_ALLOWED = 60_000;

// Registros por request enviado à API. 8.000 linhas: menos requests
// que o valor anterior (2.000) = menos overhead fixo (auth + abertura
// de transação) repetido por chamada. Ainda bem abaixo do limite de
// body da Vercel (4.5MB) — 8.000 linhas x 5 campos gira em ~1.5-2MB.
const CHUNK_SIZE = 8_000;

// Requests simultâneos ao processar os lotes. Sobrepõe a latência de
// rede/servidor entre chunks (cada request não espera o anterior
// terminar). 4 é seguro: paraleliza sem sobrecarregar o pool de
// conexões do Postgres no servidor.
const CONCURRENCY = 4;

// ---------------------------------------------------------------------
// Helpers de header — índice construído UMA vez por arquivo
// ---------------------------------------------------------------------
function cleanHeaderKey(key: string): string {
  return String(key).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function buildHeaderIndex(sampleRow: Record<string, any>): Map<string, string> {
  const index = new Map<string, string>();
  for (const rawKey of Object.keys(sampleRow)) {
    index.set(cleanHeaderKey(rawKey).toLowerCase(), rawKey);
  }
  return index;
}

function getByAliases(row: Record<string, any>, headerIndex: Map<string, string>, aliases: string[]): any {
  for (const alias of aliases) {
    const realKey = headerIndex.get(cleanHeaderKey(alias).toLowerCase());
    if (realKey !== undefined) return row[realKey];
  }
  return undefined;
}

// ---------------------------------------------------------------------
// Normalizadores de valor
// ---------------------------------------------------------------------
function normalizeText(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function normalizeStore(value: any): string | null {
  return normalizeText(value);
}

function normalizeReference(value: any): string | null {
  const ref = normalizeText(value);
  if (!ref) return null;
  const lower = ref.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "nan") return null;
  return ref;
}

function normalizeIdBling(value: any): string | null {
  const idBling = normalizeText(value);
  if (!idBling) return null;
  const lower = idBling.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "nan") return null;
  return idBling;
}

const STORE_ALIASES = ["Loja", "loja", "store"];
const ID_BLING_ALIASES = ["ID Bling", "id bling", "id_bling", "idbling"];
const REFERENCE_ALIASES = ["Referência", "Referencia", "referência", "referencia", "reference"];
const PRODUTO_ALIASES = ["Produto", "produto", "product"];
const MARCA_ALIASES = ["Marca", "marca", "mark", "brand"];

type NormalizeOutcome =
  | { ok: true; row: any; warning?: string }
  | { ok: false; skip: true }
  | { ok: false; error: string };

/**
 * Normaliza uma linha da planilha para o payload de
 * `newsystem.announce`: store, id_bling, reference, product, mark.
 *
 * `code_id` NÃO é lido da planilha: é uma identity column
 * (gerada automaticamente pelo Postgres) e nunca deve vir do cliente.
 *
 * No modo "alteracao", "ID Bling" é a CHAVE DE BUSCA no servidor
 * (a referência agora É editável nesse modo) — por isso é exigido
 * aqui, antes mesmo de enviar a linha à API.
 */
function normalizeRow(
  rowRaw: Record<string, any>,
  headerIndex: Map<string, string>,
  lineNumber: number,
  modo: ModoImportacao
): NormalizeOutcome {
  const store = normalizeStore(getByAliases(rowRaw, headerIndex, STORE_ALIASES));
  const reference = normalizeReference(getByAliases(rowRaw, headerIndex, REFERENCE_ALIASES));
  const idBling = normalizeIdBling(getByAliases(rowRaw, headerIndex, ID_BLING_ALIASES));

  if (!store && !reference) return { ok: false, skip: true };

  if (!store) {
    return { ok: false, error: `Linha ${lineNumber}: "Loja" vazia ou inválida.` };
  }

  if (!reference) {
    return { ok: false, error: `Linha ${lineNumber} (loja "${store}"): "Referência" vazia ou inválida.` };
  }

  if (modo === "alteracao" && !idBling) {
    return {
      ok: false,
      error: `Linha ${lineNumber} (loja "${store}", referência "${reference}"): "ID Bling" é obrigatório no modo 'Alteração'.`,
    };
  }

  return {
    ok: true,
    row: {
      store,
      id_bling: idBling,
      reference,
      product: normalizeText(getByAliases(rowRaw, headerIndex, PRODUTO_ALIASES)),
      mark: normalizeText(getByAliases(rowRaw, headerIndex, MARCA_ALIASES)),
    },
  };
}

async function ensureValidSession(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema antes de importar.");
  }
  return data.session.access_token;
}

// ---------------------------------------------------------------------
// Chamada à API de importação (bulk insert/update no servidor,
// com rejeição por regra de negócio conforme o modo)
// ---------------------------------------------------------------------
type RegistroResultado = {
  store: string;
  reference: string;
  status: "ok" | "erro";
  message: string;
};

type ImportAnnounceApiResultado = {
  total: number;
  importados: number;
  errosCount: number;
  erros: RegistroResultado[];
};

async function callImportarAnnounceApi(
  registros: any[],
  accessToken: string,
  modo: ModoImportacao
): Promise<ImportAnnounceApiResultado> {
  const response = await fetch("/api/announce/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ registros, modo }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error ?? responseBody?.message ?? "Não foi possível importar os anúncios.");
  }

  return {
    total: responseBody?.total ?? 0,
    importados: responseBody?.importados ?? 0,
    errosCount: responseBody?.errosCount ?? 0,
    erros: responseBody?.erros ?? [],
  };
}

/**
 * Divide `registros` em lotes de CHUNK_SIZE e envia à API com
 * CONCURRENCY requests simultâneos (fila com workers), em vez de
 * sequencial. Isso sobrepõe a latência de rede/servidor entre
 * chunks — ganho real de tempo total, não apenas teórico.
 *
 * O progresso é reportado de forma cumulativa (cada worker soma sua
 * própria contagem processada ao total acumulado). O `modo` é
 * repassado em todos os lotes, garantindo que a regra de
 * inclusão/alteração seja aplicada de forma consistente no arquivo inteiro.
 */
async function callImportarAnnounceApiEmLotes(
  registros: any[],
  accessToken: string,
  modo: ModoImportacao,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportAnnounceApiResultado> {
  const acumulado: ImportAnnounceApiResultado = {
    total: registros.length,
    importados: 0,
    errosCount: 0,
    erros: [],
  };

  const chunks: any[][] = [];
  for (let i = 0; i < registros.length; i += CHUNK_SIZE) {
    chunks.push(registros.slice(i, i + CHUNK_SIZE));
  }

  let processedCount = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < chunks.length) {
      const index = cursor++;
      const chunk = chunks[index];

      const resultadoChunk = await callImportarAnnounceApi(chunk, accessToken, modo);

      acumulado.importados += resultadoChunk.importados;
      acumulado.errosCount += resultadoChunk.errosCount;
      acumulado.erros.push(...resultadoChunk.erros);

      processedCount += chunk.length;
      onProgress?.({
        processed: Math.min(processedCount, registros.length),
        total: registros.length,
        batchSize: CHUNK_SIZE,
      });
    }
  }

  const workerCount = Math.min(CONCURRENCY, chunks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return acumulado;
}

// ---------------------------------------------------------------------
// Notificação — disparada em background pelo chamador (fire-and-forget).
// ---------------------------------------------------------------------
async function notifyAnnounceImportResult(total: number): Promise<void> {
  if (total <= 0) return;

  await createNotification({
    title: "Importação de anúncios concluída",
    message: `${total} anúncio(s) foram processados.`,
    action: "update",
    entityType: "announce_import",
    link: "/dashboard/announce",
  });
}

function buildTimestampedFileName(prefix: string): string {
  const now = new Date();
  return `${prefix} - ${now.toLocaleDateString("pt-BR").replace(/\//g, "-")} ${now
    .toLocaleTimeString("pt-BR")
    .replace(/:/g, "-")}.xlsx`;
}

// ---------------------------------------------------------------------
// IMPORTAÇÃO PRINCIPAL DE ANÚNCIOS (newsystem.announce, via API)
//
// `modo`:
//  - "inclusao": insere apenas registros novos. Referências que já
//    existem são REJEITADAS (o servidor não as sobrescreve). Chave de
//    correspondência: (store, reference).
//  - "alteracao": atualiza apenas registros existentes, casando por
//    (store, id_bling) — a referência agora PODE ser alterada nesse
//    modo. "ID Bling" que não existir é REJEITADO. "id_bling" NUNCA é
//    sobrescrito: é a chave de busca, não um campo editável.
// ---------------------------------------------------------------------
export async function importAnnounceFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  onProgress?: (progress: ImportProgress) => void,
  modo: ModoImportacao = "inclusao"
): Promise<ImportResult> {
  const startedAt = performance.now();
  const warnings: string[] = [];

  const fileName = buildTimestampedFileName("ANÚNCIOS");

  let rawRows: Record<string, any>[] = [];

  if (input instanceof File) {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", codepage: 65001, cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) throw new Error("A planilha não possui nenhuma aba válida.");

    rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  } else if (Array.isArray(input)) {
    rawRows = input as Record<string, any>[];
  } else {
    throw new Error("Formato de importação inválido.");
  }

  if (!rawRows.length) throw new Error("Nenhum registro foi encontrado no arquivo.");

  if (rawRows.length > MAX_ROWS_ALLOWED) {
    throw new Error(
      `O arquivo contém ${rawRows.length} linhas. O limite máximo por importação é de ${MAX_ROWS_ALLOWED} linhas. Divida o arquivo em partes menores.`
    );
  }

  const headerIndex = buildHeaderIndex(rawRows[0]);

  if (input instanceof File) {
    const requiredColumns = modo === "alteracao" ? REQUIRED_COLUMNS_ALTERACAO : REQUIRED_COLUMNS_INCLUSAO;
    const missing = requiredColumns.filter((col) => !headerIndex.has(cleanHeaderKey(col).toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`As seguintes colunas obrigatórias estão ausentes: ${missing.join(", ")}.`);
    }
  }

  const normalizedAll: any[] = [];
  const rowErrors: string[] = [];
  const rowWarnings: string[] = [];
  let totalIgnoradas = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const outcome = normalizeRow(rawRows[i], headerIndex, i + 2, modo);

    if (outcome.ok) {
      normalizedAll.push(outcome.row);
      if (outcome.warning) rowWarnings.push(outcome.warning);
    } else if ("skip" in outcome) {
      totalIgnoradas++;
    } else {
      rowErrors.push(outcome.error);
    }
  }

  if (rowErrors.length > 0) {
    const shown = rowErrors.slice(0, MAX_ERRORS_SHOWN);
    const remaining = rowErrors.length - shown.length;

    warnings.push(
      `${rowErrors.length} linha(s) foram ignoradas por dado inválido:\n${shown.join("\n")}${
        remaining > 0 ? `\n... e mais ${remaining} linha(s) com erro.` : ""
      }`
    );
  }

  if (rowWarnings.length > 0) {
    const shown = rowWarnings.slice(0, MAX_ERRORS_SHOWN);
    const remaining = rowWarnings.length - shown.length;

    warnings.push(
      `${rowWarnings.length} linha(s) com aviso:\n${shown.join("\n")}${
        remaining > 0 ? `\n... e mais ${remaining} aviso(s).` : ""
      }`
    );
  }

  const totalLidas = rawRows.length;
  const totalValidas = normalizedAll.length;

  if (totalIgnoradas > 0) {
    warnings.push(
      `Foram lidas ${totalLidas} linhas, mas ${totalIgnoradas} não possuíam "Loja"/"Referência" e foram ignoradas.`
    );
  }

  if (!totalValidas) {
    throw new Error("Nenhuma linha válida foi encontrada para importação. Verifique os erros reportados.");
  }

  // Deduplicação — a chave depende do modo:
  //  - Inclusão: (store, reference), pois é a chave única real da tabela.
  //  - Alteração: (store, id_bling), pois é a chave de busca nesse modo
  //    (a referência pode se repetir/mudar durante a alteração).
  // Mantém a última ocorrência em ambos os casos.
  const dedupeMap = new Map<string, any>();
  let duplicatedCount = 0;

  for (const row of normalizedAll) {
    const key =
      modo === "alteracao" ? `${row.store}::bling::${row.id_bling}` : `${row.store}::ref::${row.reference}`;

    if (dedupeMap.has(key)) duplicatedCount++;
    dedupeMap.set(key, row);
  }

  const deduped = Array.from(dedupeMap.values());

  warnings.push(
    duplicatedCount > 0
      ? `Foram encontradas ${duplicatedCount} linha(s) com chave repetida (${
          modo === "alteracao" ? "Loja + ID Bling" : "Loja + Referência"
        }). Foi mantida a última ocorrência. Total de registros únicos: ${deduped.length}.`
      : `Registros únicos detectados: ${deduped.length}.`
  );

  if (previewOnly) {
    return {
      data: deduped,
      warnings,
      errors: rowErrors.length > 0 ? rowErrors : undefined,
      fileName,
    };
  }

  const accessToken = await ensureValidSession();

  onProgress?.({ processed: 0, total: deduped.length, batchSize: CHUNK_SIZE });

  const resultado = await callImportarAnnounceApiEmLotes(deduped, accessToken, modo, onProgress);

  if (resultado.errosCount > 0) {
    const shown = resultado.erros.slice(0, MAX_ERRORS_SHOWN);
    const remaining = resultado.errosCount - shown.length;

    warnings.push(
      `${resultado.errosCount} registro(s) falharam no servidor:\n${shown
        .map((e) => `[${e.store}] ${e.reference}: ${e.message}`)
        .join("\n")}${remaining > 0 ? `\n... e mais ${remaining} erro(s).` : ""}`
    );
  }

  warnings.push(`Importação concluída. ${resultado.importados} de ${resultado.total} registro(s) processado(s) com sucesso.`);

  // Notificação disparada em BACKGROUND (fire-and-forget) — o retorno
  // da função não espera esse round-trip extra ao Supabase. O erro,
  // se houver, é apenas logado: não afeta o resultado da importação.
  notifyAnnounceImportResult(resultado.importados).catch((error) => {
    console.error("Erro ao criar a notificação da importação:", error);
  });

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.info(
    `[importAnnounceFromXlsxOrCsv] ${deduped.length} registros processados em ${elapsedMs}ms (${(
      deduped.length / (elapsedMs / 1000)
    ).toFixed(1)} linhas/s).`
  );

  return {
    data: deduped,
    warnings,
    errors: rowErrors.length > 0 ? rowErrors : undefined,
    fileName,
  };
}

export default importAnnounceFromXlsxOrCsv;
