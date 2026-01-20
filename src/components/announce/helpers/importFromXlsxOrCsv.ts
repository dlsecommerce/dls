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

/** Normaliza string pra chave (dedupe / comparação) */
function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function isPlaceholderBling(v: any) {
  const s = norm(v);
  if (!s) return true;
  // placeholders comuns que quebram UNIQUE / causam duplicação
  if (s === "n bling" || s.includes("n bling") || s.includes("nº bling")) return true;
  if (s === "n/bling" || s === "na" || s === "n/a") return true;
  return false;
}

/** Remove duplicados do próprio arquivo (mantém a última ocorrência) */
function dedupeRows(rows: RowShape[]) {
  const map = new Map<string, RowShape>();

  for (const r of rows) {
    // prioridade de chave:
    // 1) ID Bling (se válido)
    // 2) OD
    // 3) ID Tray
    // 4) Referência + Loja
    const idBlingKey = !isPlaceholderBling(r["ID Bling"]) ? norm(r["ID Bling"]) : "";
    const odKey = norm(r.OD);
    const trayKey = norm(r["ID Tray"]);
    const refLojaKey = `${norm(r.Loja)}|${norm(r["Referência"])}`;

    const key =
      (idBlingKey && `bling:${idBlingKey}`) ||
      (odKey && `od:${odKey}`) ||
      (trayKey && `tray:${trayKey}`) ||
      (refLojaKey !== "|" && `refloja:${refLojaKey}`) ||
      // fallback extremo (não ideal)
      `row:${JSON.stringify(r)}`;

    map.set(key, r);
  }

  return [...map.values()];
}

/** Divide por loja do mesmo jeito que você já fazia */
function splitByStore(rows: RowShape[]) {
  const pikotRows = rows.filter(
    (r) =>
      norm(r.Loja).includes("pikot") ||
      norm(r.Loja).includes("pikot shop")
  );

  const sobaquetasRows = rows.filter((r) => norm(r.Loja).includes("sobaquetas"));

  const outrosRows = rows.filter((r) => !pikotRows.includes(r) && !sobaquetasRows.includes(r));

  return { pikotRows, sobaquetasRows, outrosRows };
}

/**
 * Preenche IDs automáticos só quando a gente PRECISAR usar conflito por ID.
 * Se formos upar por "ID Bling", não precisa inventar ID.
 */
async function preencherIdsAutomaticos(tabela: string, rows: RowShape[]) {
  if (rows.length === 0) return rows;

  const { data: ultimo, error } = await supabase
    .from(tabela)
    .select("ID")
    .order("ID", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar último ID em ${tabela}: ${error.message}`);

  let proximoId = ultimo?.ID ? parseInt(String(ultimo.ID), 10) + 1 : 1;

  return rows.map((r) => {
    if (r.ID === "" || r.ID === null || r.ID === undefined) {
      (r as any).ID = proximoId;
      proximoId++;
    }
    return r;
  });
}

/**
 * Faz upsert tentando por onConflict desejado.
 * Se der erro típico de "não existe constraint unique", faz fallback com outro onConflict.
 */
async function upsertWithFallback(
  table: string,
  rows: RowShape[],
  primaryOnConflict: string | null,
  fallbackOnConflict: string | null,
  needAutoIdsForFallback: boolean
) {
  if (rows.length === 0) return;

  // sempre filtra id bling placeholders antes de usar conflito por ID Bling
  const cleanedRows = rows.map((r) => ({
    ...r,
    "ID Bling": isPlaceholderBling(r["ID Bling"]) ? "" : String(r["ID Bling"] ?? "").trim(),
  }));

  // tenta primeiro
  if (primaryOnConflict) {
    const { error } = await supabase
      .from(table)
      .upsert(cleanedRows as any, { onConflict: primaryOnConflict });

    if (!error) return;

    // cai pro fallback
    // (isso pega casos tipo: constraint unique não existe no PK ainda)
    console.warn(`[${table}] upsert primary falhou, usando fallback.`, error.message);
  }

  if (!fallbackOnConflict) {
    throw new Error(
      `Não foi possível importar em ${table}: sem estratégia de fallback definida.`
    );
  }

  let payload = cleanedRows;

  if (needAutoIdsForFallback) {
    payload = await preencherIdsAutomaticos(table, payload);
  }

  const { error: error2 } = await supabase
    .from(table)
    .upsert(payload as any, { onConflict: fallbackOnConflict });

  if (error2) throw new Error(`Erro ao importar ${table}: ${error2.message}`);
}

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

  // Dedupe do arquivo (evita duplicar já na leitura)
  const deduped = dedupeRows(normalized);

  if (deduped.length !== normalized.length) {
    warnings.push(
      `Foram removidas ${normalized.length - deduped.length} linha(s) duplicada(s) dentro do arquivo.`
    );
  }

  if (previewOnly) return { data: deduped, warnings };

  // --- Separar registros por loja ---
  const { pikotRows, sobaquetasRows, outrosRows } = splitByStore(deduped);

  // --- Filtrar linhas sem ID Bling válido (pra evitar UNIQUE quebrar no SB) ---
  const sobaquetasValidas = sobaquetasRows.filter((r) => !isPlaceholderBling(r["ID Bling"]));
  const sobaquetasInvalidas = sobaquetasRows.length - sobaquetasValidas.length;

  if (sobaquetasInvalidas > 0) {
    warnings.push(
      `${sobaquetasInvalidas} registro(s) do Sóbaquetas foram ignorados: "ID Bling" vazio/placeholder (ex: N BLING).`
    );
  }

  // No PK você disse que vai mexer nos dados, então NÃO vamos bloquear import por falta de ID Bling.
  // Mas a gente avisa.
  const pikotSemBling = pikotRows.filter((r) => isPlaceholderBling(r["ID Bling"])).length;
  if (pikotSemBling > 0) {
    warnings.push(
      `${pikotSemBling} registro(s) do Pikot estão sem "ID Bling" válido. Sem UNIQUE no PK, isso pode facilitar duplicação.`
    );
  }

  // --- Inserção/Upsert no Supabase ---
  const inserts: Promise<void>[] = [];

  // ✅ anuncios_sb: você já tem UNIQUE em "ID Bling" → usar onConflict por ele sempre
  if (sobaquetasValidas.length > 0) {
    inserts.push(
      (async () => {
        await upsertWithFallback(
          "anuncios_sb",
          sobaquetasValidas,
          // primary
          '"ID Bling"',
          // fallback (se algo muito fora do padrão acontecer)
          "ID",
          // fallback por ID precisa de auto IDs
          true
        );
      })()
    );
  }

  // ⚠️ anuncios_pk: como você ainda vai mexer nos dados, talvez não tenha UNIQUE em "ID Bling" ainda.
  // Então: tenta "ID Bling" primeiro (se você já tiver criado o UNIQUE mais pra frente),
  // e se falhar, cai pra "ID" (e aí preenche ID automático quando faltar).
  if (pikotRows.length > 0) {
    inserts.push(
      (async () => {
        await upsertWithFallback(
          "anuncios_pk",
          pikotRows,
          // primary (vai funcionar quando você criar UNIQUE no PK)
          '"ID Bling"',
          // fallback (sempre existe, pois ID é PK)
          "ID",
          // fallback por ID precisa de auto IDs
          true
        );
      })()
    );
  }

  if (outrosRows.length > 0) {
    warnings.push(
      `${outrosRows.length} registro(s) ignorado(s): sem loja identificada (Pikot Shop ou Sóbaquetas).`
    );
  }

  await Promise.all(inserts);

  return { data: deduped, warnings };
}
