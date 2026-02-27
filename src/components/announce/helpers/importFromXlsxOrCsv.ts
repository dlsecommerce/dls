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

type ImportMode = "inclusao" | "alteracao";

type ImportResult = {
  data: RowShape[];
  warnings: string[];
  errors: string[];
};

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

/** =========================
 * helpers de número BR
 * ========================= */
export const parseValorBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;

  let str = String(v).trim();
  str = str.replace(/[^\d.,-]/g, "");

  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");

  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

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
 */
async function preencherIdsAutomaticos(tabela: string, rows: any[]) {
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
      r.ID = proximoId;
      proximoId++;
    }
    return r;
  });
}

/**
 * Faz upsert tentando por onConflict desejado.
 */
async function upsertWithFallback(
  table: string,
  rows: RowShape[],
  primaryOnConflict: string | null,
  fallbackOnConflict: string | null,
  needAutoIdsForFallback: boolean
) {
  if (rows.length === 0) return;

  const cleanedRows = rows.map((r) => {
    const out: any = { ...r };

    for (const k of Object.keys(out)) {
      if (out[k] === "") out[k] = null;
    }

    if (out.ID === null || out.ID === undefined) {
      delete out.ID;
    }

    out["ID Bling"] = isPlaceholderBling(out["ID Bling"])
      ? null
      : String(out["ID Bling"] ?? "").trim();

    return out;
  });

  if (primaryOnConflict) {
    const { error } = await supabase
      .from(table)
      .upsert(cleanedRows as any, { onConflict: primaryOnConflict });

    if (!error) return;

    console.warn(
      `[${table}] upsert primary falhou, usando fallback.`,
      error.message
    );
  }

  if (!fallbackOnConflict) {
    throw new Error(
      `Não foi possível importar em ${table}: sem estratégia de fallback definida.`
    );
  }

  let payload: any[] = cleanedRows;

  if (needAutoIdsForFallback) {
    payload = await preencherIdsAutomaticos(table, payload);
  }

  const { error: error2 } = await supabase
    .from(table)
    .upsert(payload as any, { onConflict: fallbackOnConflict });

  if (error2) {
    console.error("UPSERT ERROR:", error2);
    throw new Error(
      `Erro ao importar ${table}: ${error2.message}${
        error2.details ? " | " + error2.details : ""
      }`
    );
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

/* ============================================================
   ✅ NOVO: custos no import (mesma lógica do editor)
   - busca custos existentes
   - cria custos faltantes com custo 0
   - retorna mapa codigo -> custoAtual(number)
============================================================ */
interface CustoRow {
  Código?: string;
  Codigo?: string;
  "Custo Atual"?: number | string;
  "Custo_Atual"?: number | string;
  custo?: number | string;
}

async function fetchOrAddCustos(
  codigos: string[]
): Promise<Record<string, number>> {
  const only = Array.from(new Set(codigos.map((c) => String(c).trim()).filter(Boolean)));
  if (only.length === 0) return {};

  const { data, error } = await supabase
    .from("custos")
    .select("*")
    .in("Código", only);

  let rows: CustoRow[] = (data || []) as any;

  if (error || rows.length === 0) {
    const alt = await supabase.from("custos").select("*").in("Codigo", only);
    if (!alt.error && alt.data) rows = alt.data as any;
  }

  const map: Record<string, number> = {};
  const found = new Set<string>();

  for (const r of rows) {
    const codigo = (r.Código || r.Codigo || "").toString().trim();
    const custoRaw = r["Custo Atual"] ?? r["Custo_Atual"] ?? r.custo ?? 0;
    const custoNum = parseValorBR(custoRaw as any);
    if (codigo) {
      map[codigo] = isNaN(custoNum) ? 0 : custoNum;
      found.add(codigo);
    }
  }

  const missing = only.filter((c) => !found.has(c));
  if (missing.length > 0) {
    const novos = missing.map((c) => ({ Código: c, "Custo Atual": 0 }));
    const { error: insErr } = await supabase.from("custos").insert(novos);
    if (insErr) console.warn("⚠️ Erro ao inserir novos custos:", insErr);
    missing.forEach((c) => (map[c] = 0));
  }

  return map;
}

/* ============================================================
   ✅ NOVO: extrai composição (códigos/quantidades) de uma row
============================================================ */
function extractComposicao(row: RowShape) {
  const itens: Array<{ codigo: string; qtd: number }> = [];

  for (let i = 1; i <= 10; i++) {
    const codigo = (row as any)[`Código ${i}`];
    const qtdRaw = (row as any)[`Quantidade ${i}`];

    const cod = String(codigo ?? "").trim();
    if (!cod) continue;

    const qtd =
      qtdRaw === null || qtdRaw === undefined || qtdRaw === ""
        ? 1
        : parseValorBR(String(qtdRaw));

    itens.push({ codigo: cod, qtd: qtd || 0 });
  }

  return itens;
}

/* ============================================================
   ✅ NOVO: calcula custo total da composição
============================================================ */
function calcCustoTotal(
  itens: Array<{ codigo: string; qtd: number }>,
  custosMap: Record<string, number>
) {
  return itens.reduce((sum, it) => {
    const custo = custosMap[it.codigo] ?? 0;
    return sum + (Number(it.qtd) * Number(custo));
  }, 0);
}

/* ============================================================
   ✅ NOVO: atualiza marketplace_*."Custo" via upsert
   - usa anuncio_id = row.ID (int8)
   - set "Custo" = total
============================================================ */
async function upsertMarketplaceCusto(
  loja: "PK" | "SB",
  anuncioId: number,
  custoTotal: number
) {
  const tables =
    loja === "PK"
      ? ["marketplace_shopee_pk", "marketplace_tray_pk"]
      : ["marketplace_shopee_sb", "marketplace_tray_sb"];

  const payload = { anuncio_id: anuncioId, Custo: custoTotal };

  // A ideia aqui é: se já existir linha, update; se não existir, cria.
  // Para isso funcionar 100%, o ideal é ter UNIQUE(anuncio_id) nessas tabelas.
  // Se não tiver, ainda tenta update primeiro (fallback).
  for (const table of tables) {
    // 1) tenta UPDATE (não depende de constraint)
    const upd = await supabase
      .from(table)
      .update({ Custo: custoTotal } as any)
      .eq("anuncio_id", anuncioId);

    if (!upd.error && (upd.count ?? 0) > 0) continue;

    // 2) se não atualizou nenhuma linha, tenta INSERT
    const ins = await supabase.from(table).insert(payload as any);
    if (ins.error) {
      // se der erro de duplicado por alguma razão, tenta update de novo
      await supabase
        .from(table)
        .update({ Custo: custoTotal } as any)
        .eq("anuncio_id", anuncioId);
    }
  }
}

/**
 * ✅ Ajuste principal:
 * - Importa anuncios_pk/anuncios_sb
 * - Depois calcula custos e atualiza marketplace automaticamente
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

  const range = XLSX.utils.decode_range(sheet["!ref"] as string);
  range.s.r = 1;
  sheet["!ref"] = XLSX.utils.encode_range(range);

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: null,
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
      return key ? row[key] : null;
    };

    const obj: any = {
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
      obj[`Código ${i}`] = findKey([`Código ${i}`, `codigo ${i}`, `cod ${i}`]);
      obj[`Quantidade ${i}`] = findKey([
        `Quantidade ${i}`,
        `quantidade ${i}`,
        `quant ${i}`,
        `qtd ${i}`,
      ]);
    }

    return obj as RowShape;
  });

  const deduped = dedupeRows(normalized);

  if (deduped.length !== normalized.length) {
    warnings.push(
      `Foram removidas ${
        normalized.length - deduped.length
      } linha(s) duplicada(s) dentro do arquivo.`
    );
  }

  const { pikotRows, sobaquetasRows, outrosRows } = splitByStore(deduped);

  if (outrosRows.length > 0) {
    warnings.push(
      `${outrosRows.length} registro(s) ignorado(s): sem loja identificada (use PK/SB ou Pikot/Sóbaquetas).`
    );
  }

  const sobaquetasValidas = sobaquetasRows.filter(
    (r) => !isPlaceholderBling(r["ID Bling"])
  );
  const sobaquetasInvalidas = sobaquetasRows.length - sobaquetasValidas.length;

  if (sobaquetasInvalidas > 0) {
    warnings.push(
      `${sobaquetasInvalidas} registro(s) do Sóbaquetas foram ignorados: "ID Bling" vazio/placeholder (ex: N BLING).`
    );
  }

  const pikotSemBling = pikotRows.filter((r) => isPlaceholderBling(r["ID Bling"]))
    .length;
  if (pikotSemBling > 0) {
    warnings.push(
      `${pikotSemBling} registro(s) do Pikot estão sem "ID Bling" válido. Sem UNIQUE no PK, isso pode facilitar duplicação.`
    );
  }

  // Preview validação
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

  // =========================
  // ✅ IMPORTA ANÚNCIOS
  // =========================
  const inserts: Promise<void>[] = [];

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

  if (pikotRows.length > 0) {
    inserts.push(
      (async () => {
        await upsertWithFallback(
          "anuncios_pk",
          pikotRows,
          '"ID Bling"',
          "ID",
          true
        );
      })()
    );
  }

  await Promise.all(inserts);

  // =========================
  // ✅ NOVO: CALCULA + GRAVA CUSTO EM MARKETPLACE
  // - Usa as próprias rows importadas
  // - Busca custos (e cria faltantes)
  // - Atualiza marketplace_* por anuncio_id
  // =========================
  const allRowsToProcess: Array<{ loja: "PK" | "SB"; row: RowShape }> = [
    ...pikotRows.map((r) => ({ loja: "PK" as const, row: r })),
    ...sobaquetasValidas.map((r) => ({ loja: "SB" as const, row: r })),
  ];

  // 1) coletar todos os códigos usados no arquivo
  const allCodigos: string[] = [];
  for (const item of allRowsToProcess) {
    const itens = extractComposicao(item.row);
    for (const it of itens) allCodigos.push(it.codigo);
  }

  // 2) buscar/criar custos
  const custosMap = await fetchOrAddCustos(allCodigos);

  // 3) processar em lotes para não estourar rate limit
  const BATCH = 50;
  for (let i = 0; i < allRowsToProcess.length; i += BATCH) {
    const chunk = allRowsToProcess.slice(i, i + BATCH);

    await Promise.all(
      chunk.map(async ({ loja, row }) => {
        const anuncioId = parseInt(String(row.ID ?? "").trim(), 10);
        if (!Number.isFinite(anuncioId)) return;

        const itens = extractComposicao(row);
        const custoTotal = calcCustoTotal(itens, custosMap);

        await upsertMarketplaceCusto(loja, anuncioId, custoTotal);
      })
    );
  }

  return { data: deduped, warnings, errors };
}