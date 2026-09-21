import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";
const ACCENT = "1A8CEB";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function headerStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${ACCENT}` },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function buildFileName() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  const time = `${pad(now.getHours())}h${pad(now.getMinutes())}m`;
  return `REGRA - MARKETPLACE - ${date} ${time}.xlsx`;
}

export async function GET() {
  try {
    const { data: rules, error } = await supabaseAdmin
      .schema(SCHEMA)
      .from("marketplace_channel_rules")
      .select("*")
      .order("channel", { ascending: true });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MyHUB.IA";
    workbook.created = new Date();

    // ---------- Aba: Fixo ----------
    const flatSheet = workbook.addWorksheet("Fixo");
    flatSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Comissão (%)", key: "comissao", width: 16 },
      { header: "Frete", key: "frete", width: 14 },
      { header: "Modo Frete (fixed/percent)", key: "frete_mode", width: 24 },
    ];
    flatSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Por Preço ----------
    const tieredSheet = workbook.addWorksheet("Por Preço");
    tieredSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Mín (R$)", key: "min", width: 12 },
      { header: "Máx (R$) - vazio = sem limite", key: "max", width: 28 },
      { header: "Taxa (%)", key: "rate", width: 12 },
      { header: "Frete Fixo (R$)", key: "fixedFee", width: 16 },
    ];
    tieredSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Por Marca ----------
    const brandSheet = workbook.addWorksheet("Por Marca");
    brandSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Marca", key: "brand", width: 20 },
      { header: "Comissão (%)", key: "rate", width: 14 },
      { header: "Taxa Fixa (R$)", key: "fixedFee", width: 16 },
      { header: "Clássico % (opcional)", key: "classico_rate", width: 20 },
      { header: "Clássico R$ (opcional)", key: "classico_fee", width: 20 },
      { header: "Premium % (opcional)", key: "premium_rate", width: 20 },
      { header: "Premium R$ (opcional)", key: "premium_fee", width: 20 },
      { header: "É Regra Padrão? (SIM/NÃO)", key: "is_default", width: 24 },
    ];
    brandSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Condição ML (Global) ----------
    const conditionSheet = workbook.addWorksheet("Condição ML (Global)");
    conditionSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Modo (flat/tiered/brand)", key: "mode", width: 22 },
      { header: "Listing (classico/premium)", key: "listing", width: 24 },
      { header: "Comissão (%)", key: "rate", width: 14 },
      { header: "Taxa Fixa (R$)", key: "fixedFee", width: 16 },
      { header: "Frete", key: "frete", width: 12 },
      { header: "Modo Frete (fixed/percent)", key: "frete_mode", width: 24 },
    ];
    conditionSheet.getRow(1).eachCell(headerStyle);

    // ---------- Preenche as abas ----------
    for (const rule of rules ?? []) {
      if (rule.pricing_mode === "flat") {
        flatSheet.addRow({
          channel: rule.channel,
          comissao: rule.comissao,
          frete: rule.frete,
          frete_mode: rule.frete_mode,
        });
      }

      if (rule.pricing_mode === "tiered" && rule.commission_tiers?.length) {
        for (const t of rule.commission_tiers) {
          tieredSheet.addRow({
            channel: rule.channel,
            min: t.min,
            max: t.max ?? "",
            rate: Number(t.rate) * 100,
            fixedFee: t.fixedFee,
          });
        }
      }

      if (rule.pricing_mode === "brand") {
        if (rule.default_rule) {
          brandSheet.addRow({
            channel: rule.channel,
            brand: "",
            rate: Number(rule.default_rule.commission_rate) * 100,
            fixedFee: rule.default_rule.fixed_fee,
            classico_rate: "",
            classico_fee: "",
            premium_rate: "",
            premium_fee: "",
            is_default: "SIM",
          });
        }
        for (const b of rule.brand_rules ?? []) {
          brandSheet.addRow({
            channel: rule.channel,
            brand: b.brand,
            rate: Number(b.commission_rate) * 100,
            fixedFee: b.fixed_fee,
            classico_rate: b.classico ? Number(b.classico.rate) * 100 : "",
            classico_fee: b.classico ? b.classico.fixedFee : "",
            premium_rate: b.premium ? Number(b.premium.rate) * 100 : "",
            premium_fee: b.premium ? b.premium.fixedFee : "",
            is_default: "NÃO",
          });
        }
      }

      if (rule.listing_type_rules) {
        for (const mode of ["flat", "tiered", "brand"] as const) {
          const block = rule.listing_type_rules[mode];
          if (!block) continue;
          for (const listing of ["classico", "premium"] as const) {
            const lt = block[listing];
            if (!lt) continue;
            conditionSheet.addRow({
              channel: rule.channel,
              mode,
              listing,
              rate: Number(lt.commission_rate) * 100,
              fixedFee: lt.fixed_fee,
              frete: lt.frete ?? "",
              frete_mode: lt.frete_mode ?? "",
            });
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = buildFileName();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err: any) {
    console.error("Erro ao exportar regras de canal:", err);
    return NextResponse.json(
      { error: "Erro ao gerar planilha de regras de canal." },
      { status: 500 }
    );
  }
}
