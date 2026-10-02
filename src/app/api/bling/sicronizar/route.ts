import { NextRequest, NextResponse } from "next/server";
import { getSb, isLoja, listarAnunciosML } from "@/lib/bling";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const loja = req.nextUrl.searchParams.get("loja");
  if (!isLoja(loja)) {
    return NextResponse.json({ erro: "Use ?loja=sobaquetas ou ?loja=pikot" }, { status: 400 });
  }

  try {
    const todos = await listarAnunciosML(loja);
    const agora = new Date().toISOString();

    const rows = todos.map((a) => {
      const mlb = /^MLB\d+$/.test(a.idMercadoLivre);
      return {
        loja,
        codigo: a.idMercadoLivre,
        tipo: mlb ? "anuncio" : "variacao",
        id_bling: a.idBling,
        item_id: mlb ? a.idMercadoLivre : null,
        preco: Math.round(a.preco * 100) / 100,
        atualizado_em: agora,
      };
    });

    const sb = getSb();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb
        .from("anuncios_ml")
        .upsert(rows.slice(i, i + 500), { onConflict: "loja,codigo" });
      if (error) return NextResponse.json({ erro: error.message, lote: i }, { status: 500 });
    }
    return NextResponse.json({ loja, gravados: rows.length });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
