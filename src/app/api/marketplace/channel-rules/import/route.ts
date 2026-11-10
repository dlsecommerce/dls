import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";
const PRODUCT_SHEET = "Por Produto";
const UPSERT_CHUNK = 500;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Nomes exatos dos cabeçalhos da aba Por Produto.
// MLB, Título e Frete Vendedor não estão aqui: são informativos e não são importados.
const COL = {
  channel: "Canal",
  store: "Loja",
  id_bling: "ID Bling",
  referencia: "Referência",
  brand: "Marca",
  classico_rate: "Clássico (%)",
  classico_fixed_fee: "Clássico Taxa Fixa (R$)",
  premium_rate: "Premium (%)",
  premium_fixed_fee: "Premium Taxa Fixa (R$)",
  frete_classico: "Frete Clássico",
  frete_classico_mode: "Modo Frete Clássico (fixed/percent)",
  frete_premium: "Frete Premium",
  frete_premium_mode: "Modo Frete Premium (fixed/percent)",
} as const;

function toNumber(val: any): number {
  if (val == null || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function toNumberOrNull(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

// Planilha guarda percentual (12 = 12%); o banco guarda fração (0.12)
function toRateOrNull(val: unknown): number | null {
  const n = toNumberOrNull(val);
  return n == null ? null : n / 100;
}

function cellText(cell: ExcelJS.Cell): string {
  return String(cell.value ?? "").trim();
}

type Mode = "fixed" | "percent";

// Retorna null para vazio, undefined para valor inválido
function parseMode(raw: string): Mode | null | undefined {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "fixed" || v === "percent") return v;
  return undefined;
}

type ProductRow = {
  channel: string;
  store: string;
  id_bling: string;
  referencia: string | null;
  brand: string | null;
  classico_rate: number | null;
  classico_fixed_fee: number | null;
  premium_rate: number | null;
  premium_fixed_fee: number | null;
  frete_classico: number | null;
  frete_classico_mode: Mode | null;
  frete_premium: number | null;
  frete_premium_mode: Mode | null;
  deleted_at: null;
};

type ByChannel = Record<
  string,
  {
    pricing_mode?: "flat" | "tiered" | "brand";
    comissao?: number;
    frete?: number;
    frete_mode?: "fixed" | "percent";
    commission_tiers?: any[];
    default_rule?: { commission_rate: number; fixed_fee: number } | null;
    brand_rules?: any[];
    listing_type_rules?: Record<string, { classico?: any; premium?: any }>;
  }
>;

function parseProductSheet(workbook: ExcelJS.Workbook, errors: string[]): ProductRow[] {
  const sheet = workbook.getWorksheet(PRODUCT_SHEET);
  if (!sheet) return [];

  const headerIdx = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const h = cellText(cell);
    if (h) headerIdx.set(h, col);
  });

  const obrigatorias = [COL.channel, COL.id_bling];
  const ausentes = obrigatorias.filter((h) => !headerIdx.has(h));
  if (ausentes.length) {
    errors.push(`Por Produto: colunas obrigatórias ausentes: ${ausentes.join(", ")}.`);
    return [];
  }

  const raw = (row: ExcelJS.Row, header: string) => {
    const idx = headerIdx.get(header);
    return idx ? row.getCell(idx).value : null;
  };
  const txt = (row: ExcelJS.Row, header: string) =>
    String(raw(row, header) ?? "").trim();

  const rows: ProductRow[] = [];
  const seen = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const channel = txt(row, COL.channel);
    const idBling = txt(row, COL.id_bling);

    // Linha totalmente vazia: ignora
    if (!channel && !idBling) return;

    if (!channel) {
      errors.push(`Por Produto, linha ${rowNumber}: "Canal" é obrigatório.`);
      return;
    }
    if (!idBling) {
      errors.push(`Por Produto, linha ${rowNumber}: "ID Bling" é obrigatório.`);
      return;
    }

    // Loja vazia é salva como string vazia, para que a chave de conflito funcione
    const store = txt(row, COL.store);
    const key = `${channel}|${store}|${idBling}`;
    if (seen.has(key)) {
      errors.push(
        `Por Produto, linha ${rowNumber}: ID Bling "${idBling}" repetido para o canal "${channel}" e loja "${store}".`
      );
      return;
    }
    seen.add(key);

    const freteClassicoMode = parseMode(txt(row, COL.frete_classico_mode));
    const fretePremiumMode = parseMode(txt(row, COL.frete_premium_mode));

    if (freteClassicoMode === undefined) {
      errors.push(`Por Produto, linha ${rowNumber}: "Modo Frete Clássico" deve ser fixed ou percent.`);
      return;
    }
    if (fretePremiumMode === undefined) {
      errors.push(`Por Produto, linha ${rowNumber}: "Modo Frete Premium" deve ser fixed ou percent.`);
      return;
    }

    rows.push({
      channel,
      store,
      id_bling: idBling,
      referencia: txt(row, COL.referencia) || null,
      brand: txt(row, COL.brand) || null,
      classico_rate: toRateOrNull(raw(row, COL.classico_rate)),
      classico_fixed_fee: toNumberOrNull(raw(row, COL.classico_fixed_fee)),
      premium_rate: toRateOrNull(raw(row, COL.premium_rate)),
      premium_fixed_fee: toNumberOrNull(raw(row, COL.premium_fixed_fee)),
      frete_classico: toNumberOrNull(raw(row, COL.frete_classico)),
      frete_classico_mode: freteClassicoMode,
      frete_premium: toNumberOrNull(raw(row, COL.frete_premium)),
      frete_premium_mode: fretePremiumMode,
      deleted_at: null,
    });
  });

  return rows;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const errors: string[] = [];
    const byChannel: ByChannel = {};

    const ensureChannel = (channel: string) => {
      if (!byChannel[channel]) byChannel[channel] = {};
      return byChannel[channel];
    };

    // ---------- Aba Fixo ----------
    const flatSheet = workbook.getWorksheet("Fixo");
    if (flatSheet) {
      flatSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const channel = cellText(row.getCell(1));
        if (!channel) return;

        const entry = ensureChannel(channel);
        entry.pricing_mode = "flat";
        entry.comissao = toNumber(row.getCell(2).value);
        entry.frete = toNumber(row.getCell(3).value);
        const modeRaw = cellText(row.getCell(4)).toLowerCase();
        entry.frete_mode = modeRaw === "percent" ? "percent" : "fixed";
      });
    }

    // ---------- Aba Por Preço ----------
    const tieredSheet = workbook.getWorksheet("Por Preço");
    if (tieredSheet) {
      tieredSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const channel = cellText(row.getCell(1));
        if (!channel) return;

        const min = row.getCell(2).value;
        if (min == null || min === "") {
          errors.push(`Por Preço, linha ${rowNumber}: "Mín (R$)" é obrigatório.`);
          return;
        }

        const entry = ensureChannel(channel);
        entry.pricing_mode = "tiered";
        if (!entry.commission_tiers) entry.commission_tiers = [];

        const maxRaw = row.getCell(3).value;
        entry.commission_tiers.push({
          min: toNumber(min),
          max: maxRaw != null && maxRaw !== "" ? toNumber(maxRaw) : null,
          rate: toNumber(row.getCell(4).value) / 100,
          fixedFee: toNumber(row.getCell(5).value),
        });
      });
    }

    // ---------- Aba Por Marca ----------
    const brandSheet = workbook.getWorksheet("Por Marca");
    if (brandSheet) {
      brandSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const channel = cellText(row.getCell(1));
        if (!channel) return;

        const entry = ensureChannel(channel);
        entry.pricing_mode = "brand";

        const brand = cellText(row.getCell(2));
        const isDefault = cellText(row.getCell(9)).toUpperCase() === "SIM";

        if (isDefault || !brand) {
          entry.default_rule = {
            commission_rate: toNumber(row.getCell(3).value) / 100,
            fixed_fee: toNumber(row.getCell(4).value),
          };
          return;
        }

        if (!entry.brand_rules) entry.brand_rules = [];

        const classicoRate = row.getCell(5).value;
        const classicoFee = row.getCell(6).value;
        const premiumRate = row.getCell(7).value;
        const premiumFee = row.getCell(8).value;

        const hasClassico =
          (classicoRate != null && classicoRate !== "") ||
          (classicoFee != null && classicoFee !== "");
        const hasPremium =
          (premiumRate != null && premiumRate !== "") ||
          (premiumFee != null && premiumFee !== "");

        entry.brand_rules.push({
          brand,
          commission_rate: toNumber(row.getCell(3).value) / 100,
          fixed_fee: toNumber(row.getCell(4).value),
          ...(hasClassico
            ? { classico: { rate: toNumber(classicoRate) / 100, fixedFee: toNumber(classicoFee) } }
            : {}),
          ...(hasPremium
            ? { premium: { rate: toNumber(premiumRate) / 100, fixedFee: toNumber(premiumFee) } }
            : {}),
        });
      });
    }

    // ---------- Aba Condição ML (Global) ----------
    const conditionSheet = workbook.getWorksheet("Condição ML (Global)");
    if (conditionSheet) {
      conditionSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const channel = cellText(row.getCell(1));
        const mode = cellText(row.getCell(2)).toLowerCase() as "flat" | "tiered" | "brand";
        const listing = cellText(row.getCell(3)).toLowerCase() as "classico" | "premium";
        if (!channel || !mode || !listing) return;

        if (!["flat", "tiered", "brand"].includes(mode)) {
          errors.push(`Condição ML, linha ${rowNumber}: modo "${mode}" inválido.`);
          return;
        }
        if (!["classico", "premium"].includes(listing)) {
          errors.push(`Condição ML, linha ${rowNumber}: listing "${listing}" inválido.`);
          return;
        }

        const entry = ensureChannel(channel);
        if (!entry.listing_type_rules) entry.listing_type_rules = {};
        if (!entry.listing_type_rules[mode]) entry.listing_type_rules[mode] = {};

        const freteRaw = row.getCell(6).value;
        entry.listing_type_rules[mode][listing] = {
          commission_rate: toNumber(row.getCell(4).value) / 100,
          fixed_fee: toNumber(row.getCell(5).value),
          frete: freteRaw != null && freteRaw !== "" ? toNumber(freteRaw) : null,
          frete_mode: cellText(row.getCell(7)).toLowerCase() === "percent" ? "percent" : "fixed",
        };
      });
    }

    // ---------- Aba Por Produto ----------
    const productRows = parseProductSheet(workbook, errors);

    if (errors.length) {
      return NextResponse.json(
        { error: "Erros de validação encontrados.", details: errors },
        { status: 400 }
      );
    }

    const channels = Object.keys(byChannel);
    if (!channels.length && !productRows.length) {
      return NextResponse.json(
        { error: "Nenhum dado válido encontrado na planilha." },
        { status: 400 }
      );
    }

    // ---------- Salva regras por canal ----------
    let updatedCount = 0;
    const saveErrors: string[] = [];

    for (const channel of channels) {
      const entry = byChannel[channel];
      if (!entry.pricing_mode) continue;

      try {
        const { data: existing } = await supabaseAdmin
          .schema(SCHEMA)
          .from("marketplace_channel_rules")
          .select("*")
          .eq("channel", channel)
          .maybeSingle();

        const existingListingTypeRules = existing?.listing_type_rules ?? {};
        const importedListingTypeRules = entry.listing_type_rules ?? {};

        const mergedListingTypeRules = {
          ...existingListingTypeRules,
          ...importedListingTypeRules,
        };

        const mode = entry.pricing_mode;

        const row = {
          channel,
          pricing_mode: mode,
          comissao: mode === "flat" ? entry.comissao ?? 0 : existing?.comissao ?? 0,
          frete: mode === "flat" ? entry.frete ?? 0 : existing?.frete ?? 0,
          frete_mode: mode === "flat" ? entry.frete_mode ?? "fixed" : existing?.frete_mode ?? "fixed",
          commission_tiers: mode === "tiered" ? entry.commission_tiers ?? null : null,
          default_rule: mode === "brand" ? entry.default_rule ?? null : null,
          brand_rules: mode === "brand" ? entry.brand_rules ?? null : null,
          listing_type_rules: Object.keys(mergedListingTypeRules).length
            ? mergedListingTypeRules
            : null,
        };

        const { error: upsertError } = await supabaseAdmin
          .schema(SCHEMA)
          .from("marketplace_channel_rules")
          .upsert(row, { onConflict: "channel" });

        if (upsertError) throw upsertError;

        await supabaseAdmin
          .schema(SCHEMA)
          .rpc("recalc_channel_pricing", { p_channel: channel });

        updatedCount++;
      } catch (err: any) {
        saveErrors.push(`Canal "${channel}": ${err.message ?? "erro desconhecido"}.`);
      }
    }

    // ---------- Salva regras por produto ----------
    let productsSaved = 0;

    for (let i = 0; i < productRows.length; i += UPSERT_CHUNK) {
      const chunk = productRows.slice(i, i + UPSERT_CHUNK);

      const { error: productError } = await supabaseAdmin
        .schema(SCHEMA)
        .from("marketplace_product_rules")
        .upsert(chunk, { onConflict: "channel,store,id_bling" });

      if (productError) {
        saveErrors.push(
          `Por Produto (linhas ${i + 1} a ${i + chunk.length}): ${productError.message}.`
        );
      } else {
        productsSaved += chunk.length;
      }
    }

    return NextResponse.json({
      success: true,
      updatedChannels: updatedCount,
      totalChannels: channels.length,
      updatedProducts: productsSaved,
      totalProducts: productRows.length,
      errors: saveErrors.length ? saveErrors : undefined,
    });
  } catch (err: any) {
    console.error("Erro ao importar regras de canal:", err);
    return NextResponse.json(
      { error: "Erro ao processar a planilha de regras de canal." },
      { status: 500 }
    );
  }
}
