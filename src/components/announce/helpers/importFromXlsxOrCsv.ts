"use client";

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface RowShape {
  ID: string | number;
  Loja?: string;
  "ID Bling"?: string | null;
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

type ImportMode = "inclusao" | "alteracao";

type ImportResult = {
  data: RowShape[];
  warnings: string[];
  errors: string[]; // ✅ erros bloqueadores para o modal
};

/** ✅ AJUSTE: nomes dos índices UNIQUE reais no Postgres (conforme seu print) */
const PK_ID_BLING_UNIQUE_INDEX = "idx_anuncios_pk_id_bling_unique";
// (Se quiser, você pode criar/usar um índice unique no SB também, mas você não mostrou o print do SB)
// Mantive o SB com '"ID Bling"' como você já tinha.

/** Normaliza string pra chave (dedupe / comparação) */
function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeStore(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function toStoreCode(s: any): "PK" | "SB" | null {
  const v = normalizeStore(s);
  if (v === "pk") return "PK";
  if (v === "sb") return "SB";
  if (v.includes("pikot")) return "PK";
  if (v.includes("sobaquetas")) return "SB";
  return null;
}

function isPlaceholderBling(v: any) {
  const s = norm(v);
  if (!s) return true;
  if (s === "n bling" || s.includes("n bling") || s.includes("nº bling"))
    return true;
  if (s === "n/bling" || s === "na" || s === "n/a") return true;
  return false;
}

/** Remove duplicados do próprio arquivo (mantém a última ocorrência) */
function dedupeRows(rows: RowShape[]) {
  const map = new Map<string, RowShape>();

  for (const r of rows) {
    const idBlingKey = !isPlaceholderBling(r["ID Bling"])
      ? norm(r["ID Bling"])
      : "";
    const odKey = norm(r.OD);
    const trayKey = norm(r["ID Tray"]);
    const refLojaKey = `${norm(r.Loja)}|${norm(r["Referência"])}`;

    const key =
      (idBlingKey && `bling:${idBlingKey}`) ||
      (odKey && `od:${odKey}`) ||
      (trayKey && `tray:${trayKey}`) ||
      (refLojaKey !== "|" && `refloja:${refLojaKey}`) ||
      `row:${JSON.stringify(r)}`;

    map.set(key, r);
  }

  return [...map.values()];
}

/** Reconhece Loja PK/SB e também nomes (Pikot/Sóbaquetas) e padroniza */
function splitByStore(rows: RowShape[]) {
  const pikotRows: RowShape[] = [];
  const sobaquetasRows: RowShape[] = [];
  const outrosRows: RowShape[] = [];

  for (const r of rows) {
    const code = toStoreCode(r.Loja);

    if (code === "PK") {
      pikotRows.push({ ...r, Loja: "PK" });
    } else if (code === "SB") {
      sobaquetasRows.push({ ...r, Loja: "SB" });
    } else {
      outrosRows.push(r);
    }
  }

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

  if (error)
    throw new Error(`Erro ao buscar último ID em ${tabela}: ${error.message}`);

  let proximoId = ultimo?.ID ? parseInt(String(ultimo.ID), 10) + 1 : 1;

  return rows.map((r) => {
    if (r.ID === "" || r.ID === null || r.ID === undefined) {
      (r as any).ID = proximoId;
      proximoId++;
    }
    return r;
  });
}

/** Detecta o erro específico de falta de UNIQUE/EXCLUDE para ON CONFLICT */
function isMissingUniqueConstraintError(msg: string) {
  return (
    msg.includes("no unique or exclusion constraint") ||
    msg.includes("matching the ON CONFLICT specification")
  );
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

  // ✅ AJUSTE 1: placeholder vira NULL (não "")

  const cleanedRows = rows.map((r) => ({
    ...r,
    "ID Bling": isPlaceholderBling(r["ID Bling"])
      ? null
      : String(r["ID Bling"] ?? "").trim(),
  }));

  // tenta primeiro
  if (primaryOnConflict) {
    const { error } = await supabase
      .from(table)
      .upsert(cleanedRows as any, { onConflict: primaryOnConflict });

    if (!error) return;

    const msg = (error as any)?.message ?? String(error ?? "");

    // ✅ se não for o erro de constraint, estoura
    if (!isMissingUniqueConstraintError(msg)) {
      throw new Error(`Erro ao importar ${table}: ${msg}`);
    }

    // ✅ se for o erro clássico, cai pro fallback
    console.warn(`[${table}] upsert primary falhou, usando fallback.`, msg);
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

  if (error2) {
    const msg2 = (error2 as any)?.message ?? String(error2 ?? "");
    throw new Error(`Erro ao importar ${table}: ${msg2}`);
  }
}

/* =========================
   Validações por MODO
========================= */
async function fetchExistingKeysByStore(
  pikotRows: RowShape[],
  sobaquetasRows: RowShape[]
) {
  const keysPkBling = Array.from(
    new Set(
      pikotRows
        .map((r) => norm(r["ID Bling"]))
        .filter((v) => v && !isPlaceholderBling(v))
    )
  );
  const keysSbBling = Array.from(
    new Set(
      sobaquetasRows
        .map((r) => norm(r["ID Bling"]))
        .filter((v) => v && !isPlaceholderBling(v))
    )
  );

  const [pkExisting, sbExisting] = await Promise.all([
    (async () => {
      if (keysPkBling.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("anuncios_pk")
        .select('"ID Bling"')
        .in('"ID Bling"', keysPkBling);
      if (error) throw error;
      return new Set((data ?? []).map((x: any) => norm(x["ID Bling"])));
    })(),
    (async () => {
      if (keysSbBling.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("anuncios_sb")
        .select('"ID Bling"')
        .in('"ID Bling"', keysSbBling);
      if (error) throw error;
      return new Set((data ?? []).map((x: any) => norm(x["ID Bling"])));
    })(),
  ]);

  return { pkExisting, sbExisting };
}

function computeRowKeyForValidation(r: RowShape) {
  const idBlingKey = !isPlaceholderBling(r["ID Bling"])
    ? norm(r["ID Bling"])
    : "";
  if (idBlingKey) return { kind: "bling" as const, key: idBlingKey };

  const odKey = norm(r.OD);
  if (odKey) return { kind: "od" as const, key: odKey };

  const trayKey = norm(r["ID Tray"]);
  if (trayKey) return { kind: "tray" as const, key: trayKey };

  const loja = norm(r.Loja);
  const ref = norm(r["Referência"]);
  if (loja && ref) return { kind: "refloja" as const, key: `${loja}|${ref}` };

  return { kind: "none" as const, key: "" };
}

/**
 * Importa XLSX/CSV e valida para inclusao/alteracao.
 */
export async function importFromXlsxOrCsv(
  file: File,
  previewOnly = false,
  mode: ImportMode = "alteracao"
): Promise<ImportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    warnings.push(
      "Não foi possível ler a planilha. Verifique o formato do arquivo."
    );
    return { data: [], warnings, errors };
  }

  // Pula a primeira linha de grupos
  const range = XLSX.utils.decode_range(sheet["!ref"] as string);
  range.s.r = 1;
  sheet["!ref"] = XLSX.utils.encode_range(range);

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
  });

  if (json.length === 0) {
    warnings.push("Nenhum dado encontrado após o cabeçalho.");
    return { data: [], warnings, errors };
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
      OD: findKey(["OD", "od"]),
      Nome: findKey(["Nome", "name"]),
      Marca: findKey(["Marca", "brand"]),
      Categoria: findKey(["Categoria", "category"]),
      Peso: findKey(["Peso", "weight"]),
      Altura: findKey(["Altura", "height"]),
      Largura: findKey(["Largura", "width"]),
      Comprimento: findKey(["Comprimento", "length"]),
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

  // Dedupe do arquivo
  const deduped = dedupeRows(normalized);

  if (deduped.length !== normalized.length) {
    warnings.push(
      `Foram removidas ${
        normalized.length - deduped.length
      } linha(s) duplicada(s) dentro do arquivo.`
    );
  }

  // Separar por loja
  const { pikotRows, sobaquetasRows, outrosRows } = splitByStore(deduped);

  if (outrosRows.length > 0) {
    warnings.push(
      `${outrosRows.length} registro(s) ignorado(s): sem loja identificada (use PK/SB ou Pikot/Sóbaquetas).`
    );
  }

  // Filtrar linhas sem ID Bling válido (SB ignora)
  const sobaquetasValidas = sobaquetasRows.filter(
    (r) => !isPlaceholderBling(r["ID Bling"])
  );
  const sobaquetasInvalidas = sobaquetasRows.length - sobaquetasValidas.length;

  if (sobaquetasInvalidas > 0) {
    warnings.push(
      `${sobaquetasInvalidas} registro(s) do Sóbaquetas foram ignorados: "ID Bling" vazio/placeholder (ex: N BLING).`
    );
  }

  const pikotSemBling = pikotRows.filter((r) =>
    isPlaceholderBling(r["ID Bling"])
  ).length;

  if (pikotSemBling > 0) {
    warnings.push(
      `${pikotSemBling} registro(s) do Pikot estão sem "ID Bling" válido. Mesmo com UNIQUE, isso pode facilitar duplicação se você gravar "" em vez de NULL (aqui ajustado para NULL).`
    );
  }

  // Preview com validação
  if (pikotRows.length || sobaquetasValidas.length) {
    const { pkExisting, sbExisting } = await fetchExistingKeysByStore(
      pikotRows,
      sobaquetasValidas
    );

    const blocked: string[] = [];

    for (const r of [...pikotRows, ...sobaquetasValidas]) {
      const lojaCode = toStoreCode(r.Loja);
      const keyInfo = computeRowKeyForValidation(r);

      if (keyInfo.kind === "none") continue;

      const exists =
        lojaCode === "SB"
          ? keyInfo.kind === "bling"
            ? sbExisting.has(keyInfo.key)
            : false
          : keyInfo.kind === "bling"
          ? pkExisting.has(keyInfo.key)
          : false;

      if (mode === "inclusao") {
        if (exists) {
          blocked.push(
            `[${lojaCode ?? "?"}] Registro já existe (${keyInfo.kind}: ${keyInfo.key})`
          );
        }
      } else {
        if (!exists && keyInfo.kind === "bling") {
          blocked.push(
            `[${lojaCode ?? "?"}] Registro NÃO encontrado para alterar (ID Bling: ${keyInfo.key})`
          );
        }
      }
    }

    if (blocked.length > 0) {
      errors.push(...blocked.slice(0, 50));
      if (blocked.length > 50) {
        errors.push(`...e mais ${blocked.length - 50} ocorrência(s).`);
      }
    }
  }

  if (previewOnly) {
    return { data: deduped, warnings, errors };
  }

  if (errors.length > 0) {
    throw new Error(
      "Importação bloqueada: existem erros no arquivo (veja a pré-visualização)."
    );
  }

  // Inserção/Upsert
  const inserts: Promise<void>[] = [];

  // anuncios_sb: (mantido como você tinha)
  if (sobaquetasValidas.length > 0) {
    inserts.push(
      (async () => {
        await upsertWithFallback(
          "anuncios_sb",
          sobaquetasValidas,
          '"ID Bling"',
          "ID",
          true
        );
      })()
    );
  }

  // ✅ AJUSTE 2: anuncios_pk usa o NOME do índice UNIQUE real
  if (pikotRows.length > 0) {
    inserts.push(
      (async () => {
        await upsertWithFallback(
          "anuncios_pk",
          pikotRows,
          PK_ID_BLING_UNIQUE_INDEX, // ✅ aqui!
          "ID",
          true
        );
      })()
    );
  }

  await Promise.all(inserts);

  return { data: deduped, warnings, errors };
}