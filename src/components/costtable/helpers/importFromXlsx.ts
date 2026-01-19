// 📄 src/components/costtable/helpers/importFromXlsxOrCsv.ts
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

// =====================================================================
// ✅ Converte qualquer formato de custo/moeda em NUMBER
// Suporta:
// - PT-BR: 1.234,56 | 25,50 | R$ 1.234,56
// - US/Excel: 126.97 | 25.50
// - Milhar com ponto: 25.000 | 1.250.000  -> 25000 / 1250000
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  let str = String(value).trim();

  // Remove símbolo de moeda e espaços
  str = str.replace(/R\$/gi, "").replace(/\s/g, "");

  // Remove qualquer coisa que não seja número, ponto, vírgula ou sinal
  str = str.replace(/[^\d.,-]/g, "");
  if (!str) return null;

  // CASO 1: só ponto (sem vírgula)
  // Pode ser milhar (25.000) ou decimal US (126.97)
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

  // CASO 2: só vírgula => decimal BR
  if (str.includes(",") && !str.includes(".")) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // CASO 3: ponto + vírgula => milhar BR + decimal BR
  if (str.includes(".") && str.includes(",")) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // CASO 4: inteiro simples
  const n = Number(str);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
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
    "Custo Atual": parseCurrency(findKey(["Custo Atual", "custo atual"])),
    "Custo Antigo": parseCurrency(findKey(["Custo Antigo", "custo antigo"])),
    NCM: findKey(["NCM", "ncm"]) || null,
  };
}

// =====================================================================
// 🚚 UPSERT EM LOTES (evita statement timeout)
// =====================================================================
async function upsertInBatches(
  rows: any[],
  tipo: "inclusao" | "alteracao",
  batchSize = 300
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    if (tipo === "inclusao") {
      const { error } = await supabase.from("custos").upsert(batch, {
        onConflict: "Código",
        ignoreDuplicates: true,
        returning: "minimal",
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("custos").upsert(batch, {
        onConflict: "Código",
        returning: "minimal",
      });
      if (error) throw error;
    }

    // dá um respiro para evitar travas e picos
    // (e reduz chance de timeouts em ambientes mais lentos)
    await new Promise((r) => setTimeout(r, 20));
  }
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL
// - Preview
// - Inclusão
// - Alteração (atualização)
// + ✅ DEDUPE por "Código" (evita conflito duplo no mesmo upsert)
// + ✅ BATCH (evita timeout)
// + ✅ Avisos com contagens para você entender (6167 vs 5602)
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao"
): Promise<ImportResult> {
  const requiredColumns = [
    "Código",
    "Marca",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

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
      warnings.push(
        `As seguintes colunas estão ausentes: ${missing.join(", ")}.`
      );
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
  // Evita: ON CONFLICT DO UPDATE command cannot affect row a second time
  // =====================================================================
  const dedupeMap = new Map<string, any>();
  let duplicatedCount = 0;

  for (const row of normalizedAll) {
    const key = String(row["Código"] ?? "").trim();
    if (!key) continue;

    if (dedupeMap.has(key)) duplicatedCount += 1;
    dedupeMap.set(key, row); // última ocorrência vence
  }

  const deduped = Array.from(dedupeMap.values());

  if (duplicatedCount > 0) {
    warnings.push(
      `Detectei ${duplicatedCount} linhas com "Código" repetido. Mantive a última ocorrência de cada código (códigos únicos: ${deduped.length}).`
    );
  } else {
    warnings.push(`Códigos únicos detectados: ${deduped.length}.`);
  }

  // (Opcional) lista top duplicados no preview (para você achar no Excel)
  // Só gera essa lista se houver duplicados
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
      data: deduped,
      warnings,
      fileName,
    };
  }

  // =====================================================================
  // ✅ IMPORTAÇÃO REAL (em lotes) — evita TIMEOUT
  // =====================================================================
  // Dica: se ainda tiver timeout, reduza batchSize para 200 ou 150
  const BATCH_SIZE = 300;

  await upsertInBatches(deduped, tipo, BATCH_SIZE);

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
