"use client";

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

export interface RowShape {
  ID: string | number;
  Loja?: string;
  "ID Bling"?: string;
  "ID Tray"?: string;
  "Referência"?: string;
  "ID Var"?: string;
  OD?: string;
  Nome?: string;
  Marca?: string;
  Categoria?: string;
  Peso?: string;
  Altura?: string;
  Largura?: string;
  Comprimento?: string;
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

type PersistedRow = {
  ID: string | number | null;
  Loja?: string | null;
  "ID Bling"?: string | null;
  "ID Tray"?: string | null;
  "Referência"?: string | null;
  OD?: string | null;
};

interface CustoRow {
  Código?: string;
  Codigo?: string;
  "Custo Atual"?: number | string;
  "Custo_Atual"?: number | string;
  custo?: number | string;
}

type StoreCode = "PK" | "SB";

type FetchableField = "ID Bling" | "ID Tray" | "OD" | "Referência";

const SELECT_BASE = 'ID, Loja, "ID Bling", "ID Tray", "Referência", OD';

// Ajustes de performance para arquivos grandes
const IN_QUERY_CHUNK = 200;
const WRITE_BATCH = 500;
const MARKETPLACE_WRITE_BATCH = 100;
const PREVIEW_LIMIT = 200;

// Se false, a importação termina logo após salvar anúncios.
// Isso acelera muito arquivos grandes.
const ENABLE_MARKETPLACE_COST_UPDATE = false;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeStore(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function toStoreCode(s: unknown): StoreCode | null {
  const v = normalizeStore(s);
  if (v === "pk") return "PK";
  if (v === "sb") return "SB";
  if (v.includes("pikot")) return "PK";
  if (v.includes("sobaquetas")) return "SB";
  return null;
}

function isPlaceholderBling(v: unknown) {
  const s = norm(v);
  if (!s) return true;
  if (s === "n bling" || s.includes("n bling") || s.includes("nº bling")) {
    return true;
  }
  if (s === "n/bling" || s === "na" || s === "n/a") return true;
  return false;
}

export const parseValorBR = (
  v: string | number | null | undefined
): number => {
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
  return Number.isNaN(num) ? 0 : num;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];

  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function runSequentialBatches<T>(
  items: T[],
  batchSize: number,
  handler: (item: T, index: number) => Promise<void>
) {
  const batches = chunkArray(items, batchSize);

  let globalIndex = 0;
  for (const batch of batches) {
    for (const item of batch) {
      await handler(item, globalIndex);
      globalIndex += 1;
    }
  }
}

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

function sanitizeRow(row: RowShape) {
  const out: Record<string, unknown> = { ...row };

  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }

  if (out.ID === null || out.ID === undefined || out.ID === "") {
    delete out.ID;
  }

  out["ID Bling"] = isPlaceholderBling(out["ID Bling"])
    ? null
    : String(out["ID Bling"] ?? "").trim() || null;

  if (out.Loja) {
    const lojaCode = toStoreCode(out.Loja);
    if (lojaCode) out.Loja = lojaCode;
  }

  return out;
}

async function preencherIdsAutomaticos(
  tabela: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) return rows;

  const { data: ultimo, error } = await supabase
    .from(tabela)
    .select("ID")
    .order("ID", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar último ID em ${tabela}: ${error.message}`);
  }

  let proximoId = ultimo?.ID ? parseInt(String(ultimo.ID), 10) + 1 : 1;

  return rows.map((r) => {
    if (r.ID === "" || r.ID === null || r.ID === undefined) {
      r.ID = proximoId;
      proximoId += 1;
    }
    return r;
  });
}

function buildRowIdentity(r: Partial<RowShape> | PersistedRow) {
  const loja = toStoreCode((r as Record<string, unknown>).Loja);

  const idBling = !isPlaceholderBling(
    (r as Record<string, unknown>)["ID Bling"]
  )
    ? norm((r as Record<string, unknown>)["ID Bling"])
    : "";

  if (loja && idBling) return `bling:${loja}:${idBling}`;

  const odKey = norm((r as Record<string, unknown>).OD);
  if (loja && odKey) return `od:${loja}:${odKey}`;

  const trayKey = norm((r as Record<string, unknown>)["ID Tray"]);
  if (loja && trayKey) return `tray:${loja}:${trayKey}`;

  const ref = norm((r as Record<string, unknown>)["Referência"]);
  if (loja && ref) return `ref:${loja}:${ref}`;

  const id = norm((r as Record<string, unknown>).ID);
  if (loja && id) return `id:${loja}:${id}`;

  return "";
}

function uniqueNormalizedValues(rows: RowShape[], field: FetchableField) {
  return Array.from(
    new Set(
      rows
        .map((r) => {
          if (field === "ID Bling") {
            const value = r[field];
            return !isPlaceholderBling(value) ? norm(value) : "";
          }
          return norm(r[field]);
        })
        .filter(Boolean)
    )
  );
}

async function fetchByFieldChunks(
  table: string,
  field: FetchableField,
  values: string[],
  lojaCode?: StoreCode | null
): Promise<PersistedRow[]> {
  if (values.length === 0) return [];

  const results: PersistedRow[] = [];

  for (const slice of chunkArray(values, IN_QUERY_CHUNK)) {
    let query = supabase.from(table).select(SELECT_BASE).in(field, slice);

    if (field === "Referência" && lojaCode) {
      query = query.eq("Loja", lojaCode);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Erro ao buscar IDs por ${field} em ${table}: ${error.message}`
      );
    }

    results.push(...((data ?? []) as unknown as PersistedRow[]));
  }

  return results;
}

async function fetchRowsByKeys(
  table: string,
  rows: RowShape[]
): Promise<PersistedRow[]> {
  if (rows.length === 0) return [];

  const lojaCode = toStoreCode(rows[0]?.Loja);

  const blingKeys = uniqueNormalizedValues(rows, "ID Bling");
  const trayKeys = uniqueNormalizedValues(rows, "ID Tray");
  const odKeys = uniqueNormalizedValues(rows, "OD");
  const refKeys = uniqueNormalizedValues(rows, "Referência");

  const results: PersistedRow[] = [];

  results.push(...(await fetchByFieldChunks(table, "ID Bling", blingKeys)));
  results.push(...(await fetchByFieldChunks(table, "ID Tray", trayKeys)));
  results.push(...(await fetchByFieldChunks(table, "OD", odKeys)));
  results.push(
    ...(await fetchByFieldChunks(table, "Referência", refKeys, lojaCode))
  );

  const map = new Map<string, PersistedRow>();
  for (const item of results) {
    const identity = buildRowIdentity(item);
    if (identity) map.set(identity, item);
  }

  return [...map.values()];
}

async function safeUpsert(
  table: string,
  payload: Record<string, unknown>[],
  onConflict: string
) {
  for (const batch of chunkArray(payload, WRITE_BATCH)) {
    const { error } = await supabase
      .from(table)
      .upsert(batch as never[], { onConflict });

    if (error) {
      throw error;
    }
  }
}

async function upsertWithFallback(
  table: string,
  rows: RowShape[],
  primaryOnConflict: string | null,
  fallbackOnConflict: string | null,
  needAutoIdsForFallback: boolean
): Promise<PersistedRow[]> {
  if (rows.length === 0) return [];

  const cleanedRows = rows.map(sanitizeRow);

  if (primaryOnConflict) {
    try {
      await safeUpsert(table, cleanedRows, primaryOnConflict);
      return await fetchRowsByKeys(table, rows);
    } catch (error) {
      console.warn(`[${table}] upsert primary falhou, usando fallback.`, error);
    }
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

  try {
    await safeUpsert(table, payload, fallbackOnConflict);
  } catch (error: any) {
    console.error("UPSERT ERROR:", error);
    throw new Error(
      `Erro ao importar ${table}: ${error.message}${
        error.details ? " | " + error.details : ""
      }`
    );
  }

  return await fetchRowsByKeys(table, rows);
}

async function fetchExistingBlingSet(
  table: string,
  keys: string[]
): Promise<Set<string>> {
  if (keys.length === 0) return new Set<string>();

  const found = new Set<string>();

  for (const slice of chunkArray(keys, IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from(table)
      .select('ID, "ID Bling"')
      .in("ID Bling", slice);

    if (error) throw error;

    for (const item of data ?? []) {
      found.add(norm((item as Record<string, unknown>)["ID Bling"]));
    }
  }

  return found;
}

async function fetchExistingKeysByStore(
  pikotRows: RowShape[],
  sobaquetasRows: RowShape[]
) {
  const keysPkBling = uniqueNormalizedValues(pikotRows, "ID Bling");
  const keysSbBling = uniqueNormalizedValues(sobaquetasRows, "ID Bling");

  const pkExisting = await fetchExistingBlingSet("anuncios_pk", keysPkBling);
  const sbExisting = await fetchExistingBlingSet("anuncios_sb", keysSbBling);

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

async function fetchOrAddCustos(
  codigos: string[]
): Promise<Record<string, number>> {
  const only = Array.from(
    new Set(codigos.map((c) => String(c).trim()).filter(Boolean))
  );

  if (only.length === 0) return {};

  let rows: CustoRow[] = [];

  try {
    for (const slice of chunkArray(only, IN_QUERY_CHUNK)) {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .in("Código", slice);

      if (error) throw error;
      rows.push(...((data ?? []) as unknown as CustoRow[]));
    }
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    for (const slice of chunkArray(only, IN_QUERY_CHUNK)) {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .in("Codigo", slice);

      if (!error && data) {
        rows.push(...(data as unknown as CustoRow[]));
      }
    }
  }

  const map: Record<string, number> = {};
  const found = new Set<string>();

  for (const r of rows) {
    const codigo = (r.Código || r.Codigo || "").toString().trim();
    const custoRaw = r["Custo Atual"] ?? r["Custo_Atual"] ?? r.custo ?? 0;
    const custoNum = parseValorBR(
      custoRaw as string | number | null | undefined
    );

    if (codigo) {
      map[codigo] = Number.isNaN(custoNum) ? 0 : custoNum;
      found.add(codigo);
    }
  }

  const missing = only.filter((c) => !found.has(c));

  if (missing.length > 0) {
    const novos = missing.map((c) => ({ Código: c, "Custo Atual": 0 }));

    for (const batch of chunkArray(novos, WRITE_BATCH)) {
      const { error } = await supabase.from("custos").insert(batch as never[]);
      if (error) {
        console.warn("⚠️ Erro ao inserir novos custos:", error);
      }
    }

    for (const c of missing) {
      map[c] = 0;
    }
  }

  return map;
}

function extractComposicao(row: RowShape) {
  const itens: Array<{ codigo: string; qtd: number }> = [];

  for (let i = 1; i <= 10; i++) {
    const codigo = (row as Record<string, unknown>)[`Código ${i}`];
    const qtdRaw = (row as Record<string, unknown>)[`Quantidade ${i}`];

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

function calcCustoTotal(
  itens: Array<{ codigo: string; qtd: number }>,
  custosMap: Record<string, number>
) {
  return itens.reduce((sum, it) => {
    const custo = custosMap[it.codigo] ?? 0;
    return sum + Number(it.qtd) * Number(custo);
  }, 0);
}

async function upsertMarketplaceCusto(
  loja: StoreCode,
  anuncioId: number,
  custoTotal: number
) {
  const tables =
    loja === "PK"
      ? ["marketplace_shopee_pk", "marketplace_tray_pk"]
      : ["marketplace_shopee_sb", "marketplace_tray_sb"];

  const payload = { anuncio_id: anuncioId, Custo: custoTotal };

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .upsert(payload as never, { onConflict: "anuncio_id" });

    if (error) {
      throw new Error(`Erro ao atualizar custo em ${table}: ${error.message}`);
    }
  }
}

function mergePersistedIdsIntoRows(rows: RowShape[], persisted: PersistedRow[]) {
  const persistedMap = new Map<string, PersistedRow>();

  for (const item of persisted) {
    const key = buildRowIdentity(item);
    if (key) persistedMap.set(key, item);
  }

  return rows.map((row) => {
    const key = buildRowIdentity(row);
    if (!key) return row;

    const saved = persistedMap.get(key);
    if (!saved?.ID) return row;

    return {
      ...row,
      ID: saved.ID,
      Loja: toStoreCode(saved.Loja ?? row.Loja) ?? row.Loja,
    };
  });
}

function mapRowFromSheet(row: Record<string, unknown>): RowShape {
  const findKey = (keys: string[]): unknown => {
    const key = Object.keys(row).find((k) =>
      keys.some((p) => k.trim().toLowerCase() === p.trim().toLowerCase())
    );
    return key ? row[key] : null;
  };

  const obj: Partial<RowShape> = {
    ID: findKey(["ID", "ID Geral", "ID (Supabase)"]) as string | number,
    Loja: findKey(["Loja", "loja"]) as string,
    "ID Bling": findKey(["ID Bling", "bling"]) as string,
    "ID Tray": findKey(["ID Tray", "tray"]) as string,
    "Referência": findKey(["Referência", "referencia"]) as string,
    "ID Var": findKey(["ID Var", "id var"]) as string,
    OD: findKey(["OD", "od"]) as string,
    Nome: findKey(["Nome", "name"]) as string,
    Marca: findKey(["Marca", "brand"]) as string,
    Categoria: findKey(["Categoria", "category"]) as string,
    Peso: findKey(["Peso", "weight"]) as string,
    Altura: findKey(["Altura", "height"]) as string,
    Largura: findKey(["Largura", "width"]) as string,
    Comprimento: findKey(["Comprimento", "length"]) as string,
  };

  for (let i = 1; i <= 10; i++) {
    (obj as Record<string, unknown>)[`Código ${i}`] = findKey([
      `Código ${i}`,
      `codigo ${i}`,
      `cod ${i}`,
    ]);
    (obj as Record<string, unknown>)[`Quantidade ${i}`] = findKey([
      `Quantidade ${i}`,
      `quantidade ${i}`,
      `quant ${i}`,
      `qtd ${i}`,
    ]);
  }

  return obj as RowShape;
}

async function notifyImportResult(params: {
  mode: ImportMode;
  total: number;
  warnings: string[];
}) {
  const { mode, total, warnings } = params;

  if (total <= 0) return;

  const relevantWarnings = warnings.filter((warning) => {
    const normalized = warning.toLowerCase();

    return (
      !normalized.includes("ganhar velocidade") &&
      !normalized.includes("carregando")
    );
  });

  const hasWarnings = relevantWarnings.length > 0;

  const title = hasWarnings
    ? "Importação concluída com alertas"
    : "Importação concluída";

  const message = hasWarnings
    ? `${total} anúncio(s) processado(s) com sucesso e ${relevantWarnings.length} alerta(s) encontrado(s).`
    : `${total} anúncio(s) ${
        mode === "inclusao" ? "importado(s)" : "atualizado(s)"
      } com sucesso.`;

  try {
    await createNotification({
      title,
      message,
      action: mode === "inclusao" ? "create" : "update",
      entityType: "anuncios_importacao",
      link: "/anuncios",
    });
  } catch (error) {
    console.error("Erro ao criar notificação de importação:", error);
  }
}

export async function importFromXlsxOrCsv(
  file: File,
  previewOnly = false,
  mode: ImportMode = "alteracao"
): Promise<ImportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  let buffer: ArrayBuffer;

  try {
    buffer = await file.arrayBuffer();
  } catch (err: any) {
    throw new Error(`Não foi possível ler o arquivo: ${err?.message || err}`);
  }

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch (err: any) {
    throw new Error(`Arquivo inválido ou corrompido: ${err?.message || err}`);
  }

  const firstSheetName = workbook.SheetNames?.[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

  if (!sheet) {
    warnings.push(
      "Não foi possível ler a planilha. Verifique o formato do arquivo."
    );
    return { data: [], warnings, errors };
  }

  if (!sheet["!ref"]) {
    warnings.push("A planilha está vazia.");
    return { data: [], warnings, errors };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"] as string);
  range.s.r = 1;
  sheet["!ref"] = XLSX.utils.encode_range(range);

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (json.length === 0) {
    warnings.push("Nenhum dado encontrado após o cabeçalho.");
    return { data: [], warnings, errors };
  }

  const normalized = json.map(mapRowFromSheet);
  const deduped = dedupeRows(normalized);

  if (deduped.length !== normalized.length) {
    warnings.push(
      `Foram removidas ${
        normalized.length - deduped.length
      } linha(s) duplicada(s) dentro do arquivo.`
    );
  }

  let { pikotRows, sobaquetasRows, outrosRows } = splitByStore(deduped);

  if (outrosRows.length > 0) {
    warnings.push(
      `${outrosRows.length} registro(s) ignorado(s): sem loja identificada (use PK/SB ou Pikot/Sóbaquetas).`
    );
  }

  let sobaquetasValidas = sobaquetasRows.filter(
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
      `${pikotSemBling} registro(s) do Pikot estão sem "ID Bling" válido. Sem UNIQUE no PK, isso pode facilitar duplicação.`
    );
  }

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
            `[${lojaCode ?? "?"}] Registro já existe (${keyInfo.kind}: ${
              keyInfo.key
            })`
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
    return {
      data: deduped.slice(0, PREVIEW_LIMIT),
      warnings,
      errors,
    };
  }

  if (errors.length > 0) {
    throw new Error(
      `Importação bloqueada: existem erros no arquivo.\n${errors.join("\n")}`
    );
  }

  const persistedPk: PersistedRow[] = [];
  const persistedSb: PersistedRow[] = [];

  if (sobaquetasValidas.length > 0) {
    const savedSb = await upsertWithFallback(
      "anuncios_sb",
      sobaquetasValidas,
      "ID Bling",
      "ID",
      true
    );
    persistedSb.push(...savedSb);
  }

  if (pikotRows.length > 0) {
    const savedPk = await upsertWithFallback(
      "anuncios_pk",
      pikotRows,
      "ID Bling",
      "ID",
      true
    );
    persistedPk.push(...savedPk);
  }

  pikotRows = mergePersistedIdsIntoRows(pikotRows, persistedPk);
  sobaquetasValidas = mergePersistedIdsIntoRows(sobaquetasValidas, persistedSb);

  if (!ENABLE_MARKETPLACE_COST_UPDATE) {
    const finalData = [...pikotRows, ...sobaquetasValidas];
    const finalWarnings = [
      ...warnings,
      "Importação concluída sem recalcular custos/marketplaces nesta etapa para ganhar velocidade.",
    ];

    await notifyImportResult({
      mode,
      total: finalData.length,
      warnings: finalWarnings,
    });

    return {
      data: finalData,
      warnings: finalWarnings,
      errors,
    };
  }

  const allRowsToProcess: Array<{ loja: StoreCode; row: RowShape }> = [
    ...pikotRows.map((r) => ({ loja: "PK" as const, row: r })),
    ...sobaquetasValidas.map((r) => ({ loja: "SB" as const, row: r })),
  ];

  const allCodigos: string[] = [];
  for (const item of allRowsToProcess) {
    const itens = extractComposicao(item.row);
    for (const it of itens) {
      allCodigos.push(it.codigo);
    }
  }

  const custosMap = await fetchOrAddCustos(allCodigos);

  await runSequentialBatches(
    allRowsToProcess,
    MARKETPLACE_WRITE_BATCH,
    async ({ loja, row }) => {
      const anuncioId = parseInt(String(row.ID ?? "").trim(), 10);

      if (!Number.isFinite(anuncioId)) {
        console.warn("Linha sem ID válido após importação:", row);
        return;
      }

      const itens = extractComposicao(row);
      const custoTotal = calcCustoTotal(itens, custosMap);

      await upsertMarketplaceCusto(loja, anuncioId, custoTotal);
    }
  );

  const finalRows = [...pikotRows, ...sobaquetasValidas];

  await notifyImportResult({
    mode,
    total: finalRows.length,
    warnings,
  });

  return {
    data: finalRows,
    warnings,
    errors,
  };
}