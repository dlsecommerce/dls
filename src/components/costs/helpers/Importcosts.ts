// ImportCosts.ts

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

export type ImportResult = {
  data: any[];
  warnings: string[];
  errors?: string[];
  fileName: string;
  skippedExistingCount?: number;
};

export type RenomeacaoCodigo = { codigo_antigo: string; codigo_novo: string; linha?: number };
export type RenomeacaoImportResult = {
  data: RenomeacaoCodigo[];
  warnings: string[];
  fileName: string;
  recalculosProcessados?: number;
};

export type ImportProgress = {
  processed: number;
  total: number;
  batchSize: number;
};

// Nomes das colunas exigidas NO ARQUIVO (planilha em português).
const REQUIRED_COLUMNS = ["Código", "Marca", "Produto", "Custo Atual", "Custo Antigo", "NCM"];

const MAX_ERRORS_SHOWN = 10;
const MAX_ROWS_ALLOWED = 60_000;

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
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }

  let str = String(value).trim().replace(/R\$/gi, "").replace(/\s/g, "");
  str = str.replace(/[^\d.,-]/g, "");
  if (!str) return null;

  if (str.includes(".") && str.includes(",")) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  if (str.includes(",") && !str.includes(".")) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  if (str.includes(".") && !str.includes(",")) {
    const parts = str.split(".");
    const lastPart = parts[parts.length - 1];
    if (/^\d{3}$/.test(lastPart)) {
      const n = Number(str.replace(/\./g, ""));
      return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }
    const n = Number(str);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  const n = Number(str);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function normalizeNcm(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const digits = String(value).trim().replace(/\D/g, "");
  return digits || null;
}

function normalizeText(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text || null;
}

/**
 * Código sempre em MAIÚSCULAS — evita duplicidade entre
 * "abc123" e "ABC123" na coluna `code`.
 */
function normalizeCodigo(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  const codigo = String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (!codigo || codigo.length < 2) return null;
  if (/[\u0000-\u001f\u007f]/.test(codigo)) return null;
  if (!/[a-zA-Z0-9À-ÿ]/.test(codigo)) return null;

  const lower = codigo.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "nan") return null;

  return codigo.toUpperCase();
}

const CODE_ALIASES = ["Código", "codigo", "code"];
const MARCA_ALIASES = ["Marca", "marca", "brand", "mark"];
const PRODUTO_ALIASES = ["Produto", "produto", "product"];
const CUSTO_ATUAL_ALIASES = ["Custo Atual", "custo atual", "current_cost"];
const CUSTO_ANTIGO_ALIASES = ["Custo Antigo", "custo antigo", "previous_cost"];
const NCM_ALIASES = ["NCM", "ncm"];

type NormalizeOutcome =
  | { ok: true; row: any; warning?: string }
  | { ok: false; skip: true }
  | { ok: false; error: string };

/**
 * Normaliza uma linha da planilha para o payload da tabela
 * `newsystem.costs`: code, mark, product, current_cost,
 * previous_cost, ncm.
 */
function normalizeRow(rowRaw: Record<string, any>, headerIndex: Map<string, string>, lineNumber: number): NormalizeOutcome {
  const codigo = normalizeCodigo(getByAliases(rowRaw, headerIndex, CODE_ALIASES));
  if (!codigo) return { ok: false, skip: true };

  const custoAtual = parseCurrency(getByAliases(rowRaw, headerIndex, CUSTO_ATUAL_ALIASES));
  const custoAntigo = parseCurrency(getByAliases(rowRaw, headerIndex, CUSTO_ANTIGO_ALIASES));

  if (custoAtual === null || custoAntigo === null) {
    return {
      ok: false,
      error: `Linha ${lineNumber} (código "${codigo}"): "Custo Atual" ou "Custo Antigo" vazio ou inválido.`,
    };
  }

  const produto = normalizeText(getByAliases(rowRaw, headerIndex, PRODUTO_ALIASES));

  if (!produto) {
    return {
      ok: false,
      error: `Linha ${lineNumber} (código "${codigo}"): "Produto" vazio ou inválido. Essa coluna é obrigatória.`,
    };
  }

  let warning: string | undefined;

  if (custoAtual < 0 || custoAntigo < 0) {
    warning = `Linha ${lineNumber} (código "${codigo}"): valor de custo negativo detectado. Verifique se está correto.`;
  }

  const ncm = normalizeNcm(getByAliases(rowRaw, headerIndex, NCM_ALIASES));

  if (ncm && ncm.length !== 8) {
    const ncmWarning = `Linha ${lineNumber} (código "${codigo}"): NCM "${ncm}" não possui 8 dígitos.`;
    warning = warning ? `${warning} ${ncmWarning}` : ncmWarning;
  }

  return {
    ok: true,
    warning,
    row: {
      code: codigo,
      mark: normalizeText(getByAliases(rowRaw, headerIndex, MARCA_ALIASES)),
      product: produto,
      current_cost: custoAtual,
      previous_cost: custoAntigo,
      packaging_cost: 0,
      ncm,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureValidSession(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema antes de importar.");
  }
  return data.session.access_token;
}

// ---------------------------------------------------------------------
// Chamada à API de importação (upsert consolidado no servidor)
// ---------------------------------------------------------------------
type ImportCustosApiResultado = {
  total_recebido: number;
  total_processado: number;
  ignorados_existentes: number;
};

async function callImportarCustosApi(
  registros: any[],
  tipo: "inclusao" | "alteracao",
  accessToken: string
): Promise<ImportCustosApiResultado> {
  const response = await fetch("/api/custos/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tipo, registros }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error ?? responseBody?.message ?? "Não foi possível importar os custos.");
  }

  return responseBody?.resultado ?? { total_recebido: 0, total_processado: 0, ignorados_existentes: 0 };
}

// ---------------------------------------------------------------------
// Notificação
// ---------------------------------------------------------------------
async function notifyCostImportResult(params: { tipo: "inclusao" | "alteracao"; total: number }): Promise<void> {
  const { tipo, total } = params;
  if (total <= 0) return;

  await createNotification({
    title: tipo === "inclusao" ? "Importação de custos concluída" : "Atualização de custos concluída",
    message:
      tipo === "inclusao"
        ? `${total} custo(s) foram processados. Códigos existentes foram ignorados.`
        : `${total} custo(s) foram atualizados por código.`,
    action: tipo === "inclusao" ? "create" : "update",
    entityType: "cost_import",
    link: "/dashboard/custos",
  });
}

function buildTimestampedFileName(prefix: string): string {
  const now = new Date();
  return `${prefix} - ${now.toLocaleDateString("pt-BR").replace(/\//g, "-")} ${now
    .toLocaleTimeString("pt-BR")
    .replace(/:/g, "-")}.xlsx`;
}

// ---------------------------------------------------------------------
// IMPORTAÇÃO PRINCIPAL DE CUSTOS (newsystem.costs, via API)
// ---------------------------------------------------------------------
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao",
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startedAt = performance.now();
  const warnings: string[] = [];

  const fileName = buildTimestampedFileName(tipo === "inclusao" ? "INCLUSÃO" : "ALTERAÇÃO");

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
    const missing = REQUIRED_COLUMNS.filter((col) => !headerIndex.has(cleanHeaderKey(col).toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`As seguintes colunas obrigatórias estão ausentes: ${missing.join(", ")}.`);
    }
  }

  const normalizedAll: any[] = [];
  const rowErrors: string[] = [];
  const rowWarnings: string[] = [];
  let totalIgnoradas = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const outcome = normalizeRow(rawRows[i], headerIndex, i + 2);

    if (outcome.ok) {
      normalizedAll.push(outcome.row);
      if (outcome.warning) rowWarnings.push(outcome.warning);
    } else if ("skip" in outcome) {
      totalIgnoradas++;
    } else {
      rowErrors.push(outcome.error);
    }
  }

  // Não aborta a importação inteira por linhas com erro.
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
      `Foram lidas ${totalLidas} linhas, mas ${totalIgnoradas} não possuíam "Código" e foram ignoradas.`
    );
  }

  if (!totalValidas) {
    throw new Error("Nenhuma linha válida foi encontrada para importação. Verifique os erros reportados.");
  }

  // Deduplicação por código, mantendo a última ocorrência.
  const dedupeMap = new Map<string, any>();
  let duplicatedCount = 0;

  for (const row of normalizedAll) {
    const key = String(row.code ?? "").trim();
    if (!key) continue;
    if (dedupeMap.has(key)) duplicatedCount++;
    dedupeMap.set(key, row);
  }

  const deduped = Array.from(dedupeMap.values());

  warnings.push(
    duplicatedCount > 0
      ? `Foram encontradas ${duplicatedCount} linha(s) com "Código" repetido. Foi mantida a última ocorrência. Total de códigos únicos: ${deduped.length}.`
      : `Códigos únicos detectados: ${deduped.length}.`
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

  onProgress?.({ processed: 0, total: deduped.length, batchSize: deduped.length });

  const resultado = await callImportarCustosApi(deduped, tipo, accessToken);

  onProgress?.({ processed: resultado.total_processado, total: deduped.length, batchSize: deduped.length });

  if (tipo === "inclusao" && resultado.ignorados_existentes > 0) {
    warnings.push(`${resultado.ignorados_existentes} código(s) já existiam e foram ignorados na inclusão.`);
  }

  warnings.push(
    tipo === "inclusao"
      ? `Inclusão concluída. ${resultado.total_processado} código(s) novo(s) inserido(s).`
      : `Alteração concluída. ${resultado.total_processado} registro(s) atualizado(s) por Código.`
  );

  try {
    await notifyCostImportResult({ tipo, total: resultado.total_processado });
  } catch (error) {
    console.error("Erro ao criar a notificação da importação:", error);
    warnings.push("Os custos foram processados, mas não foi possível criar a notificação.");
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.info(
    `[importFromXlsxOrCsv] ${deduped.length} registros processados em ${elapsedMs}ms (${(
      deduped.length / (elapsedMs / 1000)
    ).toFixed(1)} linhas/s).`
  );

  return {
    data: deduped,
    warnings,
    errors: rowErrors.length > 0 ? rowErrors : undefined,
    fileName,
    skippedExistingCount: tipo === "inclusao" ? resultado.ignorados_existentes : undefined,
  };
}

// ---------------------------------------------------------------------
// IMPORTAÇÃO DE RENOMEAÇÃO DE CÓDIGOS (newsystem.costs, via API)
// ---------------------------------------------------------------------
const SCHEMA_NAME = "newsystem";

function normalizeRenameHeader(value: any): string {
  return cleanHeaderKey(String(value ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findRenameValue(row: Record<string, any>, aliases: string[]): any {
  const normalizedAliases = new Set(aliases.map(normalizeRenameHeader));
  const key = Object.keys(row).find((k) => normalizedAliases.has(normalizeRenameHeader(k)));
  return key ? row[key] : undefined;
}

function normalizeRenameRows(rawRows: Record<string, any>[]): { data: RenomeacaoCodigo[]; warnings: string[] } {
  const data: RenomeacaoCodigo[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const oldCodes = new Map<string, number>();
  const newCodes = new Map<string, { oldCode: string; line: number }>();

  rawRows.forEach((row, index) => {
    const line = Number(row?.linha) || index + 2;

    const oldRaw =
      row?.codigo_antigo ??
      findRenameValue(row, [
        "Código",
        "Codigo",
        "Código Atual",
        "Codigo Atual",
        "Código Antigo",
        "Codigo Antigo",
        "codigo_antigo",
      ]);

    const newRaw =
      row?.codigo_novo ??
      findRenameValue(row, ["Novo Código", "Novo Codigo", "Código Novo", "Codigo Novo", "codigo_novo"]);

    const oldCode = normalizeCodigo(oldRaw);
    const newCode = normalizeCodigo(newRaw);

    if (!newCode) return;

    if (!oldCode) {
      errors.push(`Linha ${line}: a coluna "Código" está vazia ou inválida.`);
      return;
    }

    if (oldCode === newCode) {
      warnings.push(`Linha ${line}: ${oldCode} foi ignorado porque o novo código é igual ao código atual.`);
      return;
    }

    const previousOldLine = oldCodes.get(oldCode);
    if (previousOldLine !== undefined) {
      errors.push(`Código antigo duplicado: ${oldCode} nas linhas ${previousOldLine} e ${line}.`);
      return;
    }

    const previousNewOwner = newCodes.get(newCode);
    if (previousNewOwner && previousNewOwner.oldCode !== oldCode) {
      errors.push(
        `Código novo duplicado: ${newCode} será usado por ${previousNewOwner.oldCode} (linha ${previousNewOwner.line}) e por ${oldCode} (linha ${line}).`
      );
      return;
    }

    oldCodes.set(oldCode, line);
    newCodes.set(newCode, { oldCode, line });
    data.push({ codigo_antigo: oldCode, codigo_novo: newCode, linha: line });
  });

  if (errors.length) {
    const shown = errors.slice(0, MAX_ERRORS_SHOWN);
    const remaining = errors.length - shown.length;
    throw new Error(`${shown.join("\n")}${remaining > 0 ? `\n... e mais ${remaining} erro(s).` : ""}`);
  }

  if (!data.length) {
    throw new Error('Nenhuma renomeação foi encontrada. Preencha a coluna "Novo Código".');
  }

  return { data, warnings };
}

async function readRenameFile(file: File): Promise<Record<string, any>[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", codepage: 65001, cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) throw new Error("A planilha não possui nenhuma aba válida.");

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
  if (!rows.length) throw new Error("A planilha está vazia.");

  if (rows.length > MAX_ROWS_ALLOWED) {
    throw new Error(
      `O arquivo contém ${rows.length} linhas. O limite máximo por importação é de ${MAX_ROWS_ALLOWED} linhas.`
    );
  }

  const headers = Object.keys(rows[0] || {}).map(normalizeRenameHeader);
  const hasHeader = (aliases: string[]) => aliases.map(normalizeRenameHeader).some((a) => headers.includes(a));

  const hasOldCodeHeader = hasHeader([
    "Código",
    "Codigo",
    "Código Atual",
    "Codigo Atual",
    "Código Antigo",
    "Codigo Antigo",
    "codigo_antigo",
  ]);

  const hasNewCodeHeader = hasHeader(["Novo Código", "Novo Codigo", "Código Novo", "Codigo Novo", "codigo_novo"]);

  if (!hasOldCodeHeader) throw new Error('A planilha precisa conter a coluna "Código" ou "Código Antigo".');
  if (!hasNewCodeHeader) throw new Error('A planilha precisa conter a coluna "Novo Código" ou "Código Novo".');

  return rows;
}

async function processRenameQueue(): Promise<number> {
  let total = 0;

  for (let attempt = 0; attempt < 1000; attempt++) {
    const { data, error } = await (supabase as any)
      .schema(SCHEMA_NAME)
      .rpc("fn_processar_fila_recalculo_marketplace", { p_limite: 500 });

    if (error) throw error;

    const processed = Number(data ?? 0);
    if (!Number.isFinite(processed) || processed <= 0) break;

    total += processed;
  }

  return total;
}

export async function importRenomeacaoCodigosFromXlsxOrCsv(
  input: File | RenomeacaoCodigo[],
  previewOnly = false
): Promise<RenomeacaoImportResult> {
  const startedAt = performance.now();

  const rawRows = input instanceof File ? await readRenameFile(input) : input;

  if (!Array.isArray(rawRows)) throw new Error("Formato de importação de renomeação inválido.");

  const { data, warnings } = normalizeRenameRows(rawRows as Record<string, any>[]);

  const fileName = buildTimestampedFileName("RENOMEAÇÃO");

  if (previewOnly) {
    return { data, warnings, fileName };
  }

  const accessToken = await ensureValidSession();

  const payload = data.map(({ codigo_antigo, codigo_novo }) => ({ codigo_antigo, codigo_novo }));

  if (payload.length > 5000) {
    throw new Error(`A planilha contém ${payload.length} renomeações. O limite é de 5.000 por importação.`);
  }

  const response = await fetch("/api/custos/renomear-codigos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ alteracoes: payload }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error ?? responseBody?.message ?? "Não foi possível renomear os códigos.");
  }

  let recalculosProcessados = 0;

  try {
    recalculosProcessados = await processRenameQueue();
  } catch (error: any) {
    console.error("Erro ao processar a fila após a renomeação:", error);
    warnings.push(
      `Os códigos foram renomeados, mas a fila de recálculo apresentou erro: ${error?.message || "erro desconhecido"}.`
    );
  }

  try {
    await createNotification({
      title: "Renomeação de códigos concluída",
      message: `${data.length} código(s) foram processados.`,
      action: "update",
      entityType: "cost_code_rename",
      link: "/dashboard/custos",
    });
  } catch (error) {
    console.error("Erro ao criar a notificação da renomeação:", error);
    warnings.push("Os códigos foram renomeados, mas não foi possível criar a notificação.");
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.info(`[importRenomeacaoCodigosFromXlsxOrCsv] ${data.length} registros em ${elapsedMs}ms.`);

  return { data, warnings, fileName, recalculosProcessados };
}
