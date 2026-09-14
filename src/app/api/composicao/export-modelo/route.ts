// app/api/composicao/export-modelo/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: announces, error } = await supabase
    .schema("newsystem")
    .from("announce")
    .select(`
      store,
      reference,
      product,
      composition (
        amount,
        costs ( code, product )
      )
    `)
    .is("deleted_at", null)
    .is("composition.deleted_at", null)
    .order("store", { ascending: true })
    .order("reference", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: Record<string, string | number>[] = [];

  for (const a of announces ?? []) {
    const comps = a.composition ?? [];
    if (comps.length === 0) {
      // Anúncio sem composição - linha em branco pra preencher
      rows.push({
        Loja: a.store,
        Referência: a.reference,
        Produto: a.product,
        "Código do Item": "",
        "Quantidade": "",
      });
    } else {
      for (const c of comps) {
        rows.push({
          Loja: a.store,
          Referência: a.reference,
          Produto: a.product,
          "Código do Item": c.costs?.code ?? "",
          "Quantidade": c.amount ?? "",
        });
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 }, { wch: 22 }, { wch: 35 }, { wch: 16 }, { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo Composição");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo-composicao.xlsx"`,
    },
  });
}
