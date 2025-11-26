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

  // Função completa de conversão numérica (aceita 12,61 / 1.000 / 1.000,50 / 10000 / etc)
  const toNumber = (value: any): number => {
    if (value === undefined || value === null || value === "") return 0;

    let raw = String(value).trim();

    // remove pontos de milhar (ex.: 1.234,56 → 1234,56)
    raw = raw.replace(/\./g, "");

    // troca vírgula por ponto para parseFloat funcionar corretamente
    raw = raw.replace(",", ".");

    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  };

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

  if (previewOnly) {
    return { data: normalized, warnings };
  }

  const { error } = await supabase.from("custos").insert(normalized, { upsert: true });
  if (error) throw error;

  return { data: normalized, warnings };
}
