"use client";

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
  const warnings: string[] = [];

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    warnings.push("Não foi possível ler a planilha. Verifique o formato do arquivo.");
    return { data: [], warnings };
  }

  // ⚙️ Pula apenas a primeira linha de grupos
  const range = XLSX.utils.decode_range(sheet["!ref"] as string);
  range.s.r = 1; // começa na segunda linha (índice 1)
  sheet["!ref"] = XLSX.utils.encode_range(range);

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  if (json.length === 0) {
    warnings.push("Nenhum dado encontrado após o cabeçalho.");
    return { data: [], warnings };
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

  if (previewOnly) return { data: normalized, warnings };

  // --- Separar registros por loja ---
  const pikotRows = normalized.filter(
    (r) =>
      (r.Loja || "").toLowerCase().includes("pikot") ||
      (r.Loja || "").toLowerCase().includes("pikot shop")
  );

  const sobaquetasRows = normalized.filter(
    (r) => (r.Loja || "").toLowerCase().includes("sobaquetas")
  );

  const outrosRows = normalized.filter(
    (r) => !pikotRows.includes(r) && !sobaquetasRows.includes(r)
  );

  // --- Gerar IDs automáticos ---
  async function preencherIdsAutomaticos(tabela: string, rows: RowShape[]) {
    if (rows.length === 0) return rows;

    const { data: ultimo } = await supabase
      .from(tabela)
      .select("ID")
      .order("ID", { ascending: false })
      .limit(1)
      .maybeSingle();

    let proximoId = ultimo?.ID ? parseInt(ultimo.ID) + 1 : 1;

    return rows.map((r) => {
      if (!r.ID || r.ID === "" || r.ID === null) {
        r.ID = proximoId;
        proximoId++;
      }
      return r;
    });
  }

  // --- Inserção automática no Supabase ---
  const inserts: Promise<any>[] = [];

  if (pikotRows.length > 0) {
    const withIds = await preencherIdsAutomaticos("anuncios_pk", pikotRows);
    inserts.push(
      supabase.from("anuncios_pk").upsert(withIds).then(({ error }) => {
        if (error)
          throw new Error(`Erro ao importar Pikot Shop: ${error.message}`);
      })
    );
  }

  if (sobaquetasRows.length > 0) {
    const withIds = await preencherIdsAutomaticos("anuncios_sb", sobaquetasRows);
    inserts.push(
      supabase.from("anuncios_sb").upsert(withIds).then(({ error }) => {
        if (error)
          throw new Error(`Erro ao importar Sóbaquetas: ${error.message}`);
      })
    );
  }

  if (outrosRows.length > 0) {
    warnings.push(
      `${outrosRows.length} registro(s) ignorado(s): sem loja identificada (Pikot Shop ou Sóbaquetas).`
    );
  }

  await Promise.all(inserts);

  return { data: normalized, warnings };
}
