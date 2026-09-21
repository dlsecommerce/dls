import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumber(val: any): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function cellText(cell: ExcelJS.Cell): string {
  return String(cell.value ?? "").trim();
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

    const sheet = workbook.getWorksheet("Regras por Produto");
    if (!sheet) {
      return NextResponse.json(
        { error: 'Aba "Regras por Produto" não encontrada na planilha.' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const rowsToUpsert: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const channel = cellText(row.getCell(1));
      const store = cellText(row.getCell(2));
      const idBling = cellText(row.getCell(3));

      if (!channel || !store || !idBling) return; // linha vazia, ignora

      const classicoRateRaw = row.getCell(6).value;
      const premiumRateRaw = row.getCell(10).value;

      rowsToUpsert.push({
        channel,
        store,
        id_bling: idBling,
        referencia: cellText(row.getCell(4)) || null,
        brand: cellText(row.getCell(5)) || null,
        classico_rate:
          classicoRateRaw != null && classicoRateRaw !== ""
            ? (toNumber(classicoRateRaw) ?? 0) / 100
            : null,
        classico_fixed_fee: toNumber(row.getCell(7).value),
        frete_classico: toNumber(row.getCell(8).value),
        frete_classico_mode:
          cellText(row.getCell(9)).toLowerCase() === "percent" ? "percent" : "fixed",
        premium_rate:
          premiumRateRaw != null && premiumRateRaw !== ""
            ? (toNumber(premiumRateRaw) ?? 0) / 100
            : null,
        premium_fixed_fee: toNumber(row.getCell(11).value),
        frete_premium: toNumber(row.getCell(12).value),
        frete_premium_mode:
          cellText(row.getCell(13)).toLowerCase() === "percent" ? "percent" : "fixed",
        updated_at: new Date().toISOString(),
      });
    });

    if (errors.length) {
      return NextResponse.json(
        { error: "Erros de validação.", details: errors },
        { status: 400 }
      );
    }

    if (!rowsToUpsert.length) {
      return NextResponse.json(
        { error: "Nenhuma linha válida encontrada na planilha." },
        { status: 400 }
      );
    }

    // upsert em lote — depende do índice único parcial
    // marketplace_product_rules_unique_active (channel, store, id_bling)
    // WHERE deleted_at IS NULL, já existente na tabela.
    const { error: upsertError } = await supabaseAdmin
      .schema(SCHEMA)
      .from("marketplace_product_rules")
      .upsert(rowsToUpsert, { onConflict: "channel,store,id_bling" });

    if (upsertError) throw upsertError;

    // Dispara recálculo para cada produto afetado
    const recalcErrors: string[] = [];
    for (const r of rowsToUpsert) {
      const { error: rpcError } = await supabaseAdmin
        .schema(SCHEMA)
        .rpc("recalc_product_pricing", {
          p_channel: r.channel,
          p_store: r.store,
          p_id_bling: r.id_bling,
        });
      if (rpcError) {
        recalcErrors.push(`${r.channel}/${r.store}/${r.id_bling}: ${rpcError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      updatedProducts: rowsToUpsert.length,
      errors: recalcErrors.length ? recalcErrors : undefined,
    });
  } catch (err: any) {
    console.error("Erro ao importar regras por produto:", err);
    return NextResponse.json(
      { error: "Erro ao processar a planilha de regras por produto." },
      { status: 500 }
    );
  }
}
