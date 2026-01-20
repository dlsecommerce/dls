// 📄 src/components/costtable/helpers/importFromXlsxOrCsv.ts
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

const REQUIRED_COLUMNS = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

// =====================================================================
// ✅ Converte qualquer formato de custo/moeda em NUMBER
// Suporta:
// - PT-BR: 1.234,56 | 25,50 | R$ 1.234,56
// - US/Excel: 126.97 | 25.50
// - Milhar com ponto: 25.000 | 1.250.000  -> 25000 / 1250000
//
// ✅ GARANTIA GLOBAL:
// - Esta função SEMPRE retorna number | null.
// - Ela NUNCA retorna string.
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }

  let str = String(value).trim();

  // Remove símbolo e espaços
  str = str.replace(/R\$/gi, "").replace(/\s/g, "");

  // Remove qualquer coisa que não seja número, ponto, vírgula ou sinal
  str = str.replace(/[^\d.,-]/g, "");
  if (!str) return null;

  // CASO 1: ponto + vírgula => milhar BR + decimal BR (1.234,56)
  if (str.includes(".") && str.includes(",")) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // CASO 2: só vírgula => decimal BR (0,3 / 25,50)
  if (str.includes(",") && !str.includes(".")) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // CASO 3: só ponto (sem vírgula)
  // Pode ser milhar (25.000 / 1.250.000) OU decimal US (126.97)
  if (str.includes(".") && !str.includes(",")) {
    const parts = str.split(".");
    const last = parts[parts.length - 1];

    // termina com 3 dígitos => milhar
    if (/^\d{3}$/.test(last)) {
      const n = Number(str.replace(/\./g, ""));
      return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }

    // senão => decimal US
    const n = Number(str);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // CASO 4: inteiro simples
  const n = Number(str);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

// =====================================================================
// ✅ Normaliza NCM
// - NCM é CÓDIGO (ideal no banco: TEXT/VARCHAR)
// - Remove qualquer coisa que não seja dígito
// - Mantém como string (ex: "09011110")
// =====================================================================
function normalizeNcm(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel às vezes traz como number; converte para string sem notação científica
  // e remove decimais acidentais (ex: 1234.0)
  let s = String(value).trim();

  // Remove tudo que não for dígito
  const digits = s.replace(/\D/g, "");

  return digits ? digits : null;
}

// =====================================================================
// 🧾 Normaliza e valida 1 linha, buscando chaves com nomes diferentes
// =====================================================================
function normalizeRow(row: Record<string, any>) {
  const findKey = (keys: string[]) => {
    const key = Object.keys(row).find((k) =>
      keys.some((p) => k.trim().toLowerCase() === p.trim().toLowerCase())
    );
    return key ? row[key] : undefined;
  };

  const codigo = findKey(["Código", "codigo", "code"]);
  if (!codigo || String(codigo).trim() === "") return null;

  return {
    Código: String(codigo).trim(),
    Marca: findKey(["Marca", "marca", "brand"]) || null,

    // ✅ garante number | null
    "Custo Atual": parseCurrency(findKey(["Custo Atual", "custo atual"])),
    "Custo Antigo": parseCurrency(findKey(["Custo Antigo", "custo antigo"])),

    // ✅ NCM como TEXTO normalizado
    NCM: normalizeNcm(findKey(["NCM", "ncm"])),

    // Se (e somente se) seu banco estiver com NCM numeric e você não puder mudar agora,
    // use isto no lugar do NCM acima:
    // NCM: (() => {
    //   const digits = normalizeNcm(findKey(["NCM", "ncm"]));
    //   return digits ? Number(digits) : null;
    // })(),
  };
}

// =====================================================================
// 🧱 BLINDAGEM FINAL (ANTI STRING EM NUMERIC)
// - Garante que "Custo Atual" e "Custo Antigo" sejam number (ou 0)
// - NÃO força NCM para number (porque ideal é texto)
// =====================================================================
function sanitizePayloadRow(row: any) {
  const custoAtual = parseCurrency(row["Custo Atual"]);
  const custoAntigo = parseCurrency(row["Custo Antigo"]);

  return {
    ...row,
    "Custo Atual": typeof custoAtual === "number" ? custoAtual : 0,
    "Custo Antigo": typeof custoAntigo === "number" ? custoAntigo : 0,
    NCM: row["NCM"] ?? null,
  };
}

// =====================================================================
// 🔍 Debug: valida colunas numéricas antes do upsert
// - Impede que string tipo "0,3" chegue no Postgres
// - Mostra exatamente a linha problemática
// =====================================================================
function assertNoInvalidNumericStrings(
  rows: any[],
  numericColumns: string[] = ["Custo Atual", "Custo Antigo"]
) {
  const bad = rows.find((r) =>
    numericColumns.some((col) => {
      const v = r[col];
      // numérico deve ser number (ou null/undefined, mas aqui já vira 0)
      if (typeof v === "string") return true;
      if (typeof v === "number") return !Number.isFinite(v);
      if (v === null || v === undefined) return false;
      // qualquer outro tipo é suspeito
      return true;
    })
  );

  if (bad) {
    console.error("🚨 Linha com tipo inválido em coluna numérica:", bad);
    throw new Error(
      "Payload inválido: coluna numérica recebeu valor não-numérico. Verifique os dados do arquivo."
    );
  }
}

// =====================================================================
// 🚚 UPSERT EM LOTES (evita statement timeout)
// + ✅ Logs completos do erro do Supabase
// + ✅ Validação forte das colunas numéricas
// =====================================================================
async function upsertInBatches(
  rows: any[],
  tipo: "inclusao" | "alteracao",
  batchSize = 300
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    // ✅ Sanitiza antes de enviar ao Supabase
    const batch = rows.slice(i, i + batchSize).map(sanitizePayloadRow);

    // ✅ Trava se algo não-numérico escapar para colunas numéricas
    assertNoInvalidNumericStrings(batch, ["Custo Atual", "Custo Antigo"]);

    // ✅ (Opcional) se você TIVER NCM numeric no banco e quiser validar também:
    // assertNoInvalidNumericStrings(batch, ["Custo Atual", "Custo Antigo", "NCM"]);

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
      // ✅ ERRO COMPLETO
      console.error("❌ ERRO SUPABASE (OBJETO COMPLETO):", error);
      console.error("📛 message:", error.message);
      // @ts-expect-error supabase error shape
      console.error("📛 details:", (error as any).details);
      // @ts-expect-error supabase error shape
      console.error("📛 hint:", (error as any).hint);
      console.error("📛 code:", error.code);

      // ✅ Mostra amostra do batch que falhou
      console.error("📦 BATCH QUE FALHOU (amostra):", batch.slice(0, 5));

      throw error;
    }

    // pequeno respiro
    await new Promise((r) => setTimeout(r, 20));
  }
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL
// - Preview
// - Inclusão
// - Alteração
// + ✅ DEDUPE por "Código"
// + ✅ BATCH (evita timeout)
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao"
): Promise<ImportResult> {
  const requiredColumns = REQUIRED_COLUMNS;

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

  // =====================================================================
  // 📁 INPUT FILE
  // =====================================================================
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
  // =====================================================================
  // 📦 INPUT ARRAY
  // =====================================================================
  else if (Array.isArray(input)) {
    rawRows = input as Record<string, any>[];
  } else {
    throw new Error("Formato de importação inválido.");
  }

  // =====================================================================
  // 🔎 Validação de colunas (somente quando veio de arquivo)
  // =====================================================================
  if (rawRows.length > 0 && input instanceof File) {
    const headers = Object.keys(rawRows[0] || {});
    const missing = requiredColumns.filter(
      (col) =>
        !headers.some(
          (h) => h.trim().toLowerCase() === col.trim().toLowerCase()
        )
    );

    if (missing.length > 0) {
      warnings.push(`As seguintes colunas estão ausentes: ${missing.join(", ")}.`);
    }
  }

  // =====================================================================
  // 🔧 NORMALIZAÇÃO (remove linhas sem Código)
  // =====================================================================
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

  // =====================================================================
  // 🧹 DEDUPE POR "Código" (mantém a ÚLTIMA ocorrência)
  // =====================================================================
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

  // (Opcional) lista top duplicados no preview
  if (duplicatedCount > 0) {
    const counts = new Map<string, number>();
    for (const r of normalizedAll) {
      const k = String(r["Código"]).trim();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const duplicatedTop = Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    if (duplicatedTop.length) {
      warnings.push(
        `Códigos repetidos (top 30): ${duplicatedTop
          .map(([k, n]) => `${k}(${n}x)`)
          .join(", ")}`
      );
    }
  }

  // =====================================================================
  // 🔍 PREVIEW
  // =====================================================================
  if (previewOnly) {
    return {
      data: deduped.map(sanitizePayloadRow),
      warnings,
      fileName,
    };
  }

  // =====================================================================
  // ✅ IMPORTAÇÃO REAL (em lotes)
  // =====================================================================
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
