import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumber(val: any): number {
  if (val == null || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function cellText(cell: ExcelJS.Cell): string {
  return String(cell.value ?? "").trim();
}

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

    if (errors.length) {
      return NextResponse.json(
        { error: "Erros de validação encontrados.", details: errors },
        { status: 400 }
      );
    }

    const channels = Object.keys(byChannel);
    if (!channels.length) {
      return NextResponse.json(
        { error: "Nenhum dado válido encontrado na planilha." },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      updatedChannels: updatedCount,
      totalChannels: channels.length,
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
