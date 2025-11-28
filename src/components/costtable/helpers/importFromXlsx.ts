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

  // ======================================
  // ✅ FUNÇÃO ULTRA-ROBUSTA DE CONVERSÃO FINAL
  // ======================================
  const toNumber = (value: any): number => {
    if (value === undefined || value === null || value === "") return 0;

    // XLSX já trouxe número real
    if (typeof value === "number") return value;

    let raw = String(value).trim();

    // Remove caracteres não numéricos exceto . , -
    raw = raw.replace(/[^\d.,-]/g, "");

    // Caso tenha vírgula e ponto → detectar padrão
    if (raw.includes(",") && raw.includes(".")) {
      // Se o último separador for vírgula → vírgula é decimal
      if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
        raw = raw.replace(/\./g, ""); // remove pontos de milhar
        raw = raw.replace(",", "."); // vírgula vira decimal
      } else {
        // Último separador é ponto → ponto é decimal
        raw = raw.replace(/,/g, ""); // remove vírgulas de milhar
      }
    }
    // Caso tenha somente vírgula → vírgula é decimal
    else if (raw.includes(",") && !raw.includes(".")) {
      raw = raw.replace(",", ".");
    }
    // Caso tenha somente ponto
    else if (raw.includes(".") && !raw.includes(",")) {
      const parts = raw.split(".");
      const decimal = parts[parts.length - 1];

      // Se tiver 1 ou 2 dígitos depois → ponto é decimal
      if (decimal.length <= 2) {
        // nada a fazer
      } else {
        // mais de 2 dígitos → ponto era milhar
        raw = raw.replace(/\./g, "");
      }
    }

    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  };

  // ======================================
  // NORMALIZAÇÃO
  // ======================================
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
        "Custo Atual": toNumber(findKey(["Custo Atual", "custo atual"])),
        "Custo Antigo": toNumber(findKey(["Custo Antigo", "custo antigo"])),
        "NCM": findKey(["NCM", "ncm"]) || null,
      };
    })
    .filter((r) => r !== null);

  // ======================================
  // PREVIEW
  // ======================================
  if (previewOnly) {
    return { data: normalized, warnings };
  }

  // ======================================
  // INSERÇÃO NO SUPABASE
  // ======================================
  const { error } = await supabase.from("custos").insert(normalized, { upsert: true });
  if (error) throw error;

  return { data: normalized, warnings };
}
