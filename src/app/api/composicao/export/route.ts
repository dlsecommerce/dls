// app/api/composicao/export/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: composicoes, error } = await supabase
    .schema("newsystem")
    .from("composition")
    .select(`
      amount,
      announce ( store, reference, product ),
      costs ( code, product )
    `)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (composicoes ?? []).map((c) => ({
    Loja: c.announce?.store ?? "",
    Referência: c.announce?.reference ?? "",
    Produto: c.announce?.product ?? "",
    "Código do Item": c.costs?.code ?? "",
    "Produto do Item": c.costs?.product ?? "",
    Quantidade: c.amount ?? 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 }, { wch: 22 }, { wch: 35 }, { wch: 16 }, { wch: 35 }, { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Composições");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="composicoes.xlsx"`,
    },
  });
}
