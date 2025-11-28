import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
};

export async function importFromXlsxOrCsv(
  file: File,
  previewOnly = false
): Promise<ImportResult> {
  const requiredColumns = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];
  const warnings: string[] = [];

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", codepage: 65001, cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  const headers = Object.keys(json[0] || {});
  const missing = requiredColumns.filter(
    (col) => !headers.some((h) => h.trim().toLowerCase() === col.trim().toLowerCase())
  );

  if (missing.length > 0) {
    warnings.push(`As seguintes colunas estão ausentes: ${missing.join(", ")}.`);
  }

  // ============================================================
  // 🔥 SUPER CONVERSOR FINAL — EXCEL (126.97), PT-BR (126,97), MILHAR
  // ============================================================
  const toNumber = (value: any): string => {
    if (!value) return "0,00";

    let raw = String(value).trim().replace(/[^\d.,-]/g, "");

    // CASO 1 — Excel: 126.97 (ponto decimal)
    if (/^\d+\.\d+$/.test(raw)) {
      return Number(raw).toFixed(2).replace(".", ",");
    }

    // CASO 2 — Formato brasileiro simples: 126,97
    if (raw.includes(",") && !raw.includes(".")) {
      const n = parseFloat(raw.replace(",", "."));
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    // CASO 3 — Milhar + decimal: 1.234,56
    if (raw.includes(".") && raw.includes(",")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(raw);
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    // CASO 4 — Número inteiro: 3100
    const n = parseFloat(raw);
    return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
  };

  // ============================================================
  // NORMALIZAÇÃO DOS DADOS
  // ============================================================
  const normalized = json
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
        "Código": String(codigo).trim(),
        "Marca": findKey(["Marca", "marca", "brand"]) || null,

        // custos convertidos corretamente
        "Custo Atual": toNumber(findKey(["Custo Atual", "custo atual"])),
        "Custo Antigo": toNumber(findKey(["Custo Antigo", "custo antigo"])),

        "NCM": findKey(["NCM", "ncm"]) || null,
      };
    })
    .filter((r) => r !== null);

  // ============================================================
  // PREVIEW
  // ============================================================
  if (previewOnly) {
    return { data: normalized, warnings };
  }

  // ============================================================
  // SUPABASE — AGORA COM UPSERT DE VERDADE (SEM DUPLICAÇÃO)
  // ============================================================
  const { error } = await supabase
    .from("custos")
    .insert(normalized, {
      upsert: true,
      onConflict: "Código", // <--- ESSENCIAL PARA NÃO DUPLICAR
    });

  if (error) throw error;

  return { data: normalized, warnings };
}
