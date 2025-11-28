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
  // ✅ FUNÇÃO ULTRA-ROBUSTA DE CONVERSÃO
  // ======================================
  const toNumber = (value: any): number => {
    if (value === undefined || value === null || value === "") return 0;

    // 1. XLSX já trouxe número real
    if (typeof value === "number") {
      return value;
    }

    // 2. Converte para string limpa
    let raw = String(value).trim();

    // 3. Remove caracteres que não fazem parte de números
    // permite apenas dígitos, vírgula, ponto e "-"
    raw = raw.replace(/[^\d.,-]/g, "");

    // 4. Se houver múltiplas vírgulas, mantém apenas a última como decimal
    const commaCount = (raw.match(/,/g) || []).length;
    if (commaCount > 1) {
      const lastComma = raw.lastIndexOf(",");
      raw = raw.replace(/,/g, "");
      raw = raw.slice(0, lastComma) + "." + raw.slice(lastComma);
    }

    // 5. Remove pontos de milhar (todos pontos seguidos de 3 dígitos)
    raw = raw.replace(/\.(?=\d{3}(,|$))/g, "");

    // 6. Troca vírgula decimal final por ponto
    raw = raw.replace(",", ".");

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
