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
  return `REGRA - PRODUTO - ${date} ${time}.xlsx`;
}

export async function GET() {
  try {
    const { data: rules, error } = await supabaseAdmin
      .schema(SCHEMA)
      .from("marketplace_product_rules")
      .select("*")
      .is("deleted_at", null)
      .order("channel", { ascending: true })
      .order("store", { ascending: true });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MyHUB.IA";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Regras por Produto");
    sheet.columns = [
      { header: "Canal", key: "channel", width: 24 },
      { header: "Loja", key: "store", width: 20 },
      { header: "ID Bling", key: "id_bling", width: 16 },
      { header: "Referência", key: "referencia", width: 20 },
      { header: "Marca", key: "brand", width: 18 },
      { header: "Clássico Comissão (%)", key: "classico_rate", width: 20 },
      { header: "Clássico Taxa Fixa (R$)", key: "classico_fixed_fee", width: 20 },
      { header: "Frete Clássico", key: "frete_classico", width: 14 },
      { header: "Modo Frete Clássico (fixed/percent)", key: "frete_classico_mode", width: 30 },
      { header: "Premium Comissão (%)", key: "premium_rate", width: 20 },
      { header: "Premium Taxa Fixa (R$)", key: "premium_fixed_fee", width: 20 },
      { header: "Frete Premium", key: "frete_premium", width: 14 },
      { header: "Modo Frete Premium (fixed/percent)", key: "frete_premium_mode", width: 30 },
    ];
    sheet.getRow(1).eachCell(headerStyle);

    for (const r of rules ?? []) {
      sheet.addRow({
        channel: r.channel,
        store: r.store,
        id_bling: r.id_bling,
        referencia: r.referencia ?? "",
        brand: r.brand ?? "",
        classico_rate: r.classico_rate != null ? Number(r.classico_rate) * 100 : "",
        classico_fixed_fee: r.classico_fixed_fee ?? "",
        frete_classico: r.frete_classico ?? "",
        frete_classico_mode: r.frete_classico_mode ?? "",
        premium_rate: r.premium_rate != null ? Number(r.premium_rate) * 100 : "",
        premium_fixed_fee: r.premium_fixed_fee ?? "",
        frete_premium: r.frete_premium ?? "",
        frete_premium_mode: r.frete_premium_mode ?? "",
      });
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
    console.error("Erro ao exportar regras por produto:", err);
    return NextResponse.json(
      { error: "Erro ao gerar planilha de regras por produto." },
      { status: 500 }
    );
  }
}
