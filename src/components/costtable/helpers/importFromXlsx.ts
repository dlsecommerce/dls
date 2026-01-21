import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

const REQUIRED_COLUMNS = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

/**
 * Ajustes para grandes volumes (50k+)
 * - DEBUG_STRICT_COMMA_CHECK: validação bem pesada (desligada por padrão)
 * - INITIAL_BATCH_SIZE: tamanho inicial do lote (vai se adaptar pra baixo se der timeout)
 */
const DEBUG_STRICT_COMMA_CHECK = false;
const INITIAL_BATCH_SIZE = 800; // bom ponto de partida para 50k+ (auto reduz se necessário)
const MIN_BATCH_SIZE = 50;
const MAX_RETRIES = 6;

/**
 * Remove espaços invisíveis (NBSP) e normaliza espaços múltiplos
 */
function cleanHeaderKey(key: string) {
  return String(key)
    .replace(/\u00a0/g, " ") // NBSP -> espaço normal
    .replace(/\s+/g, " ") // múltiplos espaços
    .trim();
}

/**
 * Normaliza chaves do objeto (headers do XLSX/CSV)
 */
function normalizeRowKeys(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[cleanHeaderKey(k)] = v;
  }
  return out;
}

// =====================================================================
// ✅ Converte qualquer formato de custo/moeda em NUMBER (ou null)
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }

  let str = String(value).trim();

  str = str.replace(/R\$/gi, "").replace(/\s/g, "");
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
    const last = parts[parts.length - 1];

    if (/^\d{3}$/.test(last)) {
      const n = Number(str.replace(/\./g, ""));
      return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }

    const n = Number(str);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  const n = Number(str);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

// =====================================================================
// ✅ NCM como texto (só dígitos) — sua coluna no banco é TEXT
// =====================================================================
function normalizeNcm(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const digits = String(value).trim().replace(/\D/g, "");
  return digits ? digits : null;
}

// =====================================================================
// ✅ normalizeRow agora já devolve o PAYLOAD FINAL do banco (mais rápido)
// - evita parse duplicado e map(sanitizePayloadRow) pesado por lote
// =====================================================================
function normalizeRow(rowRaw: Record<string, any>) {
  const row = normalizeRowKeys(rowRaw);

  const findKey = (keys: string[]) => {
    const key = Object.keys(row).find((k) =>
      keys.some(
        (p) =>
          cleanHeaderKey(k).toLowerCase() === cleanHeaderKey(p).toLowerCase()
      )
    );
    return key ? row[key] : undefined;
  };

  const codigo = findKey(["Código", "codigo", "code"]);
  if (!codigo || String(codigo).trim() === "") return null;

  const marcaRaw = findKey(["Marca", "marca", "brand"]);
  const custoAtualRaw = findKey(["Custo Atual", "custo atual"]);
  const custoAntigoRaw = findKey(["Custo Antigo", "custo antigo"]);
  const ncmRaw = findKey(["NCM", "ncm"]);

  const custoAtual = parseCurrency(custoAtualRaw);
  const custoAntigo = parseCurrency(custoAntigoRaw);

  const marca =
    marcaRaw === null || marcaRaw === undefined || marcaRaw === ""
      ? null
      : String(marcaRaw).trim();

  return {
    Código: String(codigo).trim(),
    Marca: marca,
    "Custo Atual": typeof custoAtual === "number" ? custoAtual : 0,
    "Custo Antigo": typeof custoAntigo === "number" ? custoAntigo : 0,
    NCM: normalizeNcm(ncmRaw),
  };
}

// =====================================================================
// ✅ Validação rápida (barata) — boa para 50k+
// =====================================================================
function assertNumericOkFast(batch: any[]) {
  for (let idx = 0; idx < batch.length; idx++) {
    const r = batch[idx];
    const ca = r["Custo Atual"];
    const co = r["Custo Antigo"];

    const badNumeric =
      typeof ca !== "number" ||
      !Number.isFinite(ca) ||
      typeof co !== "number" ||
      !Number.isFinite(co);

    if (badNumeric) {
      console.error("🚨 Linha com numeric inválido (índice no batch):", idx, r);
      throw new Error(
        "Payload inválido: 'Custo Atual'/'Custo Antigo' precisa ser number finito. Verifique o arquivo de origem."
      );
    }
  }
}

// =====================================================================
// 🧪 Validação pesada opcional (debug)
// - custo alto; não recomendada para 50k+ em produção
// =====================================================================
function assertNoCommaStringsStrict(batch: any[]) {
  for (let idx = 0; idx < batch.length; idx++) {
    const r = batch[idx];
    const badCommaString = Object.entries(r).find(
      ([, v]) => typeof v === "string" && v.includes(",")
    );
    if (badCommaString) {
      console.error(
        "🚨 String com vírgula detectada no payload (índice no batch):",
        idx,
        "campo:",
        badCommaString[0],
        "valor:",
        badCommaString[1],
        "linha:",
        r
      );
      throw new Error(
        `Payload inválido: string com vírgula detectada no campo "${badCommaString[0]}".`
      );
    }
  }
}

// =====================================================================
// ✅ Heurística para detectar timeout / 504 / statement_timeout
// =====================================================================
function isLikelyTimeout(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  const code = String(err?.code ?? "").toLowerCase();
  const status = err?.status ?? err?.statusCode ?? err?.cause?.status;

  return (
    status === 504 ||
    msg.includes("timeout") ||
    msg.includes("time out") ||
    msg.includes("gateway") ||
    msg.includes("statement timeout") ||
    code.includes("57014")
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// =====================================================================
// 🚚 UPSERT EM LOTES (50k+)
// - retry com backoff
// - batch adaptativo (se der timeout, corta o lote pela metade)
// - não perde progresso
// =====================================================================
async function upsertInBatches(
  rows: any[],
  tipo: "inclusao" | "alteracao",
  options?: {
    initialBatchSize?: number;
    minBatchSize?: number;
    maxRetries?: number;
    validateNumeric?: boolean;
    strictCommaCheck?: boolean;
    pauseMsBetweenBatches?: number;
  }
) {
  let batchSize = options?.initialBatchSize ?? INITIAL_BATCH_SIZE;
  const minBatchSize = options?.minBatchSize ?? MIN_BATCH_SIZE;
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const validateNumeric = options?.validateNumeric ?? true;
  const strictCommaCheck =
    options?.strictCommaCheck ?? DEBUG_STRICT_COMMA_CHECK;
  const pauseMsBetweenBatches = options?.pauseMsBetweenBatches ?? 10;

  const upsertArgs =
    tipo === "inclusao"
      ? {
          onConflict: "Código",
          ignoreDuplicates: true,
          returning: "minimal" as const,
        }
      : {
          onConflict: "Código",
          returning: "minimal" as const,
        };

  for (let i = 0; i < rows.length; ) {
    const batch = rows.slice(i, i + batchSize);

    if (validateNumeric) assertNumericOkFast(batch);
    if (strictCommaCheck) assertNoCommaStringsStrict(batch);

    let attempt = 0;

    while (true) {
      const { error } = await supabase.from("custos").upsert(batch, upsertArgs);

      if (!error) {
        i += batch.length; // só avança se sucesso
        break;
      }

      attempt++;

      console.error("❌ ERRO SUPABASE:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        batchSize,
        attempt,
        progress: `${i}/${rows.length}`,
      });

      // Timeout -> reduz batch e tenta novamente
      if (isLikelyTimeout(error) && batchSize > minBatchSize) {
        batchSize = Math.max(minBatchSize, Math.floor(batchSize / 2));
        console.warn(
          `⏳ Timeout detectado. Reduzindo batch para ${batchSize} e tentando novamente...`
        );
        await sleep(250 * attempt);
        continue;
      }

      // Retry com backoff para erros de rede/5xx/intermitência
      if (attempt <= maxRetries) {
        const backoff = Math.min(8000, 400 * 2 ** (attempt - 1)); // 400, 800, 1600, 3200...
        await sleep(backoff);
        continue;
      }

      // estourou tentativas
      console.error("📦 Batch (amostra):", batch.slice(0, 5));
      console.error("📦 Batch[0] (primeiro item):", batch[0]);
      throw error;
    }

    if (pauseMsBetweenBatches > 0) {
      await sleep(pauseMsBetweenBatches);
    }
  }
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao"
): Promise<ImportResult> {
  const warnings: string[] = [];

  const now = new Date();
  const fileName = `${
    tipo === "inclusao" ? "INCLUSÃO" : "ALTERAÇÃO"
  } - ${now
    .toLocaleDateString("pt-BR")
    .replace(/\//g, "-")} ${now
    .toLocaleTimeString("pt-BR")
    .replace(/:/g, "-")}.xlsx`;

  let rawRows: Record<string, any>[] = [];

  // 📁 INPUT FILE
  if (input instanceof File) {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      codepage: 65001,
      cellDates: true,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
    });
  }
  // 📦 INPUT ARRAY
  else if (Array.isArray(input)) {
    rawRows = input as Record<string, any>[];
  } else {
    throw new Error("Formato de importação inválido.");
  }

  // 🔎 Validação de colunas (somente quando veio de arquivo)
  if (rawRows.length > 0 && input instanceof File) {
    const headers = Object.keys(normalizeRowKeys(rawRows[0] || {}));
    const missing = REQUIRED_COLUMNS.filter(
      (col) =>
        !headers.some(
          (h) =>
            cleanHeaderKey(h).toLowerCase() === cleanHeaderKey(col).toLowerCase()
        )
    );

    if (missing.length > 0) {
      warnings.push(
        `As seguintes colunas estão ausentes: ${missing.join(", ")}.`
      );
    }
  }

  // 🔧 NORMALIZAÇÃO (já no payload final)
  const normalizedAll = rawRows.map(normalizeRow).filter(Boolean) as any[];

  const totalLidas = rawRows.length;
  const totalValidas = normalizedAll.length;

  if (totalValidas < totalLidas) {
    warnings.push(
      `Foram lidas ${totalLidas} linhas do arquivo, mas apenas ${totalValidas} tinham "Código" válido (linhas sem Código foram ignoradas).`
    );
  }

  // 🧹 DEDUPE POR "Código" (mantém a última ocorrência)
  const dedupeMap = new Map<string, any>();
  let duplicatedCount = 0;

  for (const row of normalizedAll) {
    const key = String(row["Código"] ?? "").trim();
    if (!key) continue;

    if (dedupeMap.has(key)) duplicatedCount += 1;
    dedupeMap.set(key, row);
  }

  const deduped = Array.from(dedupeMap.values());

  if (duplicatedCount > 0) {
    warnings.push(
      `Detectei ${duplicatedCount} linhas com "Código" repetido. Mantive a última ocorrência de cada código (códigos únicos: ${deduped.length}).`
    );
  } else {
    warnings.push(`Códigos únicos detectados: ${deduped.length}.`);
  }

  // 🔍 PREVIEW
  if (previewOnly) {
    return {
      data: deduped,
      warnings,
      fileName,
    };
  }

  // ✅ IMPORTAÇÃO REAL (50k+)
  await upsertInBatches(deduped, tipo, {
    initialBatchSize: INITIAL_BATCH_SIZE,
    minBatchSize: MIN_BATCH_SIZE,
    maxRetries: MAX_RETRIES,
    validateNumeric: true,
    strictCommaCheck: DEBUG_STRICT_COMMA_CHECK,
    pauseMsBetweenBatches: 10,
  });

  if (tipo === "inclusao") {
    warnings.push("Inclusão concluída. Códigos existentes foram ignorados.");
  } else {
    warnings.push("Alteração concluída. Registros atualizados por Código.");
  }

  return {
    data: deduped,
    warnings,
    fileName,
  };
}
