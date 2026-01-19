// 📄 src/components/costtable/helpers/importFromXlsxOrCsv.ts
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

// =====================================================================
// ✅ FUNÇÃO UNIVERSAL PARA CONVERTER QUALQUER FORMATO DE MOEDA EM NUMBER
// (PT-BR, US/Excel e milhar com ponto: 25.000 -> 25000)
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  let str = String(value).trim();

  // Remove símbolo de moeda e espaços
  str = str.replace(/R\$/gi, "").replace(/\s/g, "");

  // Remove qualquer coisa que não seja número, ponto, vírgula ou sinal
  str = str.replace(/[^\d.,-]/g, "");
  if (!str) return null;

  // -------------------------------------------------------------
  // CASO 1: só ponto (sem vírgula)
  // - milhar pt-BR: 25.000 / 1.250.000
  // - decimal US: 126.97
  // -------------------------------------------------------------
  if (str.includes(".") && !str.includes(",")) {
    const parts = str.split(".");
    const last = parts[parts.length - 1];

    // Se termina com 3 dígitos → milhar
    if (/^\d{3}$/.test(last)) {
      const n = Number(str.replace(/\./g, ""));
      return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }

    // Senão → decimal
    const n = Number(str);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // -------------------------------------------------------------
  // CASO 2: só vírgula → decimal pt-BR (126,97)
  // -------------------------------------------------------------
  if (str.includes(",") && !str.includes(".")) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // -------------------------------------------------------------
  // CASO 3: ponto + vírgula → pt-BR milhar + decimal (1.234,56)
  // -------------------------------------------------------------
  if (str.includes(".") && str.includes(",")) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  // -------------------------------------------------------------
  // CASO 4: inteiro simples (2500)
  // -------------------------------------------------------------
  const n = Number(str);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// + ✅ DEDUPE por "Código" para evitar:
// "ON CONFLICT DO UPDATE command cannot affect row a second time"
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

  let rows: Record<string, any>[] = [];

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
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
    });
  }

  // =====================================================================
  // 📦 INPUT ARRAY
  // =====================================================================
  else if (Array.isArray(input)) {
    rows = input as Record<string, any>[];
  } else {
    throw new Error("Formato de importação inválido.");
  }

  // =====================================================================
  // 🔎 Validação de colunas (somente quando veio de arquivo)
  // =====================================================================
  if (rows.length > 0 && input instanceof File) {
    const headers = Object.keys(rows[0] || {});
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
  // 🔧 NORMALIZAÇÃO
  // =====================================================================
  const normalized = rows
    .map((row) => {
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
        "Custo Antigo": parseCurrency(
          findKey(["Custo Antigo", "custo antigo"])
        ),
        NCM: findKey(["NCM", "ncm"]) || null,
      };
    })
    .filter(Boolean) as any[];

  // =====================================================================
  // 🧹 DEDUPE POR "Código"
  // Mantém a ÚLTIMA ocorrência do mesmo Código (a última linha da planilha vence)
  // Evita erro do Postgres no UPSERT quando há códigos duplicados no payload.
  // =====================================================================
  const dedupeMap = new Map<string, any>();
  let duplicatedCount = 0;

  for (const row of normalized) {
    const key = String(row["Código"] ?? "").trim();
    if (!key) continue;

    if (dedupeMap.has(key)) duplicatedCount += 1;
    dedupeMap.set(key, row); // última ocorrência vence
  }

  const deduped = Array.from(dedupeMap.values());

  if (duplicatedCount > 0) {
    warnings.push(
      `Foram encontradas ${duplicatedCount} linhas com "Código" repetido. Mantive a última ocorrência de cada código para evitar erro no upsert.`
    );
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
  // 🟩 INCLUSÃO — UPSERT COM IGNORE DUPLICATES
  // =====================================================================
  if (tipo === "inclusao") {
    const { error } = await supabase.from("custos").upsert(deduped, {
      onConflict: "Código",
      ignoreDuplicates: true,
    });

    if (error) throw error;

    warnings.push("Códigos já existentes foram ignorados automaticamente.");

    return {
      data: deduped,
      warnings,
      fileName,
    };
  }

  // =====================================================================
  // 🟨 ALTERAÇÃO — UPSERT
  // =====================================================================
  const { error } = await supabase
    .from("custos")
    .upsert(deduped, { onConflict: "Código" });

  if (error) throw error;

  return {
    data: deduped,
    warnings,
    fileName,
  };
}
