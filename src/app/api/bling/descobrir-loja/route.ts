import { NextResponse } from "next/server";
import { blingGet } from "@/lib/bling";

export const dynamic = "force-dynamic";

export async function GET() {
  const ids = [
    process.env.BLING_LOJA_ML_SOBAQUETAS_ID!,
    "204814030",
    "205122033",
  ];
  const out: Record<string, any> = {};

  for (const idLoja of ids) {
    try {
      const { data = [] } = await blingGet("/produtos/lojas", { idLoja, limite: 100 });
      const cods = data.map((i: any) => String(i.codigo ?? "").trim()).filter(Boolean);
      out[idLoja] = {
        retornados: data.length,
        comCodigo: cods.length,
        mlb: cods.filter((c: string) => c.startsWith("MLB")).length,
        amostras: cods.slice(0, 3),
      };
    } catch (e: any) {
      out[idLoja] = { erro: String(e?.message ?? e) };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return NextResponse.json(out);
}
