import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

const REQUIRED_COLUMNS = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

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
 * Ex.: "Custo Atual " (com NBSP) vira "Custo Atual"
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
// 🧾 Normaliza e valida 1 linha, buscando chaves com nomes diferentes
// =====================================================================
function normalizeRow(rowRaw: Record<string, any>) {
  // ✅ normaliza headers do XLSX/CSV (remove NBSP etc.)
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

  return {
    Código: String(codigo).trim(),
    Marca: findKey(["Marca", "marca", "brand"]) || null,
    "Custo Atual": parseCurrency(findKey(["Custo Atual", "custo atual"])),
    "Custo Antigo": parseCurrency(findKey(["Custo Antigo", "custo antigo"])),
    NCM: normalizeNcm(findKey(["NCM", "ncm"])),
  };
}

// =====================================================================
// 🧱 PAYLOAD FINAL (SEM SPREAD)
// ✅ Só envia colunas reais do banco (evita chaves “quase iguais” escaparem)
// ✅ numeric vira number garantido
// =====================================================================
function sanitizePayloadRow(row: any) {
  const custoAtual = parseCurrency(row["Custo Atual"]);
  const custoAntigo = parseCurrency(row["Custo Antigo"]);

  const codigo = String(row["Código"] ?? "").trim();
  const marca =
    row["Marca"] === null || row["Marca"] === undefined || row["Marca"] === ""
      ? null
      : String(row["Marca"]).trim();

  const ncm =
    row["NCM"] === null || row["NCM"] === undefined || row["NCM"] === ""
      ? null
      : String(row["NCM"]).trim();

  return {
    Código: codigo,
    Marca: marca,
    "Custo Atual": typeof custoAtual === "number" ? custoAtual : 0,
    "Custo Antigo": typeof custoAntigo === "number" ? custoAntigo : 0,
    NCM: ncm,
  };
}

// =====================================================================
// ✅ Checagem forte: numeric NÃO pode ser string (nem NaN)
// + trava se QUALQUER string com vírgula aparecer no batch (debug)
// =====================================================================
function assertNumericOk(batch: any[]) {
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

    // ✅ debug extra: se alguma string com vírgula escapar (em qualquer campo), para e mostra
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
// 🚚 UPSERT EM LOTES
// + logs completos do erro do Supabase
// =====================================================================
async function upsertInBatches(
  rows: any[],
  tipo: "inclusao" | "alteracao",
  batchSize = 300
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(sanitizePayloadRow);

    // ✅ trava antes de bater no Supabase se algo estiver errado
    assertNumericOk(batch);

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

    const { error } = await supabase.from("custos").upsert(batch, upsertArgs);

    if (error) {
      console.error("❌ ERRO SUPABASE (OBJETO):", error);
      console.error("📛 message:", error.message);
      // @ts-expect-error (shape do supabase)
      console.error("📛 details:", (error as any).details);
      // @ts-expect-error (shape do supabase)
      console.error("📛 hint:", (error as any).hint);
      console.error("📛 code:", error.code);

      // ✅ batch sample ajuda MUITO a achar o valor que quebrou
      console.error("📦 Batch (amostra):", batch.slice(0, 5));
      console.error("📦 Batch[0] (primeiro item):", batch[0]);

      throw error;
    }

    await new Promise((r) => setTimeout(r, 20));
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
      warnings.push(`As seguintes colunas estão ausentes: ${missing.join(", ")}.`);
    }
  }

  // 🔧 NORMALIZAÇÃO
  const normalizedAll = rawRows
    .map((r) => normalizeRow(r))
    .filter(Boolean) as any[];

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
      data: deduped.map(sanitizePayloadRow),
      warnings,
      fileName,
    };
  }

  // ✅ IMPORTAÇÃO REAL
  const BATCH_SIZE = 300;
  await upsertInBatches(deduped, tipo, BATCH_SIZE);

  if (tipo === "inclusao") {
    warnings.push("Inclusão concluída. Códigos existentes foram ignorados.");
  } else {
    warnings.push("Alteração concluída. Registros atualizados por Código.");
  }

  return {
    data: deduped.map(sanitizePayloadRow),
    warnings,
    fileName,
  };
}
