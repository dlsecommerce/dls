// 📄 src/components/anunciotable/helpers/importFromXlsxOrCsv.ts
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
};

export async function importFromXlsxOrCsv(file: File, previewOnly = false): Promise<ImportResult> {
  const requiredColumns = [
    "ID (Supabase)",
    "ID Geral",
    "ID Bling",
    "Referência",
    "ID Tray",
    "ID Var",
    "OD",
    "Tipo Anúncio",
    "Nome",
    "Marca",
    "Status",
    "Categoria",
    "Marketplace",
  ];

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

  const normalized = json
    .map((row) => {
      const findKey = (keys: string[]) => {
        const key = Object.keys(row).find((k) =>
          keys.some((p) => k.trim().toLowerCase() === p.trim().toLowerCase())
        );
        return key ? row[key] : undefined;
      };

      const idSupabase = findKey(["ID (Supabase)", "id", "idsupabase"]);
      if (!idSupabase && previewOnly) return null;

      return {
        "ID (Supabase)": String(idSupabase || ""),
        "ID Geral": findKey(["ID Geral", "id geral"]) || "",
        "ID Bling": findKey(["ID Bling", "id bling"]) || "",
        "Referência": findKey(["Referência", "referencia"]) || "",
        "ID Tray": findKey(["ID Tray", "id tray"]) || "",
        "ID Var": findKey(["ID Var", "id var"]) || "",
        "OD": findKey(["OD"]) || "",
        "Tipo Anúncio": findKey(["Tipo Anúncio", "tipo anuncio"]) || "Simples",
        "Nome": findKey(["Nome"]) || "",
        "Marca": findKey(["Marca"]) || "",
        "Status": findKey(["Status"]) || "",
        "Categoria": findKey(["Categoria"]) || "",
        "Marketplace": findKey(["Marketplace"]) || "",
        "Peso": findKey(["Peso"]) || 0,
        "Altura": findKey(["Altura"]) || 0,
        "Largura": findKey(["Largura"]) || 0,
        "Comprimento": findKey(["Comprimento"]) || 0,
      };
    })
    .filter((r) => r !== null);

  if (previewOnly) return { data: normalized, warnings };

  const { error } = await supabase.from("anuncios").insert(normalized, { upsert: true });
  if (error) throw error;

  return { data: normalized, warnings };
}
