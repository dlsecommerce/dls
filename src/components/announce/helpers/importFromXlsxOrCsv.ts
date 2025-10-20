"use client"

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface RowShape {
  ID: string | number;
  Loja?: string;
  "ID Bling"?: string;
  "ID Tray"?: string;
  "Referência"?: string;
  "ID Var"?: string;
  "OD"?: string;
  "Nome"?: string;
  "Marca"?: string;
  "Categoria"?: string;
  "Peso"?: string;
  "Altura"?: string;
  "Largura"?: string;
  "Comprimento"?: string;
  "Código 1"?: string;
  "Quantidade 1"?: string;
  "Código 2"?: string;
  "Quantidade 2"?: string;
  "Código 3"?: string;
  "Quantidade 3"?: string;
  "Código 4"?: string;
  "Quantidade 4"?: string;
  "Código 5"?: string;
  "Quantidade 5"?: string;
  "Código 6"?: string;
  "Quantidade 6"?: string;
  "Código 7"?: string;
  "Quantidade 7"?: string;
  "Código 8"?: string;
  "Quantidade 8"?: string;
  "Código 9"?: string;
  "Quantidade 9"?: string;
  "Código 10"?: string;
  "Quantidade 10"?: string;
}

type ImportResult = {
  data: RowShape[];
  warnings: string[];
};

export async function importFromXlsxOrCsv(
  file: File,
  previewOnly = false
): Promise<ImportResult> {
  const requiredColumns = [
    "ID",
    "Nome",
    "Marca",
    "Categoria",
    "Referência",
    "ID Bling",
    "ID Tray",
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

  const normalized: RowShape[] = json.map((row) => {
    const findKey = (keys: string[]): any => {
      const key = Object.keys(row).find((k) =>
        keys.some((p) => k.trim().toLowerCase() === p.trim().toLowerCase())
      );
      return key ? row[key] : "";
    };

    const obj: RowShape = {
      ID: findKey(["ID", "ID Geral", "ID (Supabase)"]),
      Loja: findKey(["Loja", "loja"]),
      "ID Bling": findKey(["ID Bling", "bling"]),
      "ID Tray": findKey(["ID Tray", "tray"]),
      "Referência": findKey(["Referência", "referencia"]),
      "ID Var": findKey(["ID Var", "id var"]),
      "OD": findKey(["OD", "od"]),
      "Nome": findKey(["Nome", "name"]),
      "Marca": findKey(["Marca", "brand"]),
      "Categoria": findKey(["Categoria", "category"]),
      "Peso": findKey(["Peso", "weight"]),
      "Altura": findKey(["Altura", "height"]),
      "Largura": findKey(["Largura", "width"]),
      "Comprimento": findKey(["Comprimento", "length"]),
    };

    // Adiciona dinamicamente as colunas de Código e Quantidade 1–10
    for (let i = 1; i <= 10; i++) {
      obj[`Código ${i}` as keyof RowShape] = findKey([
        `Código ${i}`,
        `codigo ${i}`,
        `cod ${i}`,
      ]);
      obj[`Quantidade ${i}` as keyof RowShape] = findKey([
        `Quantidade ${i}`,
        `quantidade ${i}`,
        `quant ${i}`,
        `qtd ${i}`,
      ]);
    }

    return obj;
  });

  if (previewOnly) {
    return { data: normalized, warnings };
  }

  const { error } = await supabase.from("anuncios").upsert(normalized);
  if (error) throw error;

  return { data: normalized, warnings };
}
