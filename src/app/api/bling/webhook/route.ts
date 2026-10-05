import crypto from "crypto";
import { NextResponse } from "next/server";
import { blingGet, getSb, type Loja } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOJA: Loja = "sobaquetas";

function validSignature(raw: string, header: string | null) {
  const secret = process.env.BLING_CLIENT_SECRET_SOBAQUETAS;
  if (!header || !secret) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!validSignature(raw, req.headers.get("x-bling-signature-256"))) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  const productId = Number(evt?.data?.id);
  if (!productId) return NextResponse.json({ ok: true });

  try {
    const sb = getSb();

    if (evt.event === "product.deleted") {
      const { error } = await sb
        .from("anuncios_ml")
        .delete()
        .eq("loja", LOJA)
        .eq("id_bling", productId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (evt.event === "product.created" || evt.event === "product.updated") {
      const idLoja = process.env.BLING_LOJA_ML_SOBAQUETAS_ID?.trim();
      if (!idLoja) throw new Error("BLING_LOJA_ML_SOBAQUETAS_ID não definido");

      const resp = await blingGet(LOJA, "/produtos/lojas", {
        idProduto: productId,
        idLoja,
        limite: 100,
      });

      const links = ((resp?.data ?? []) as any[]).filter(
        (i) =>
          String(i.loja?.id) === String(idLoja) &&
          i.codigo &&
          Number(i.produto?.id ?? productId) === productId
      );

      if (links.length > 0) {
        const prod = await blingGet(LOJA, `/produtos/${productId}`);
        const titulo = String(prod?.data?.nome ?? "").trim() || null;
        const agora = new Date().toISOString();

        const rows = links.map((i) => {
          const codigo = String(i.codigo);
          const mlb = /^MLB\d+$/.test(codigo);
          return {
            loja: LOJA,
            codigo,
            tipo: mlb ? "anuncio" : "variacao",
            id_bling: productId,
            item_id: mlb ? codigo : null,
            preco: Math.round(Number(i.preco ?? 0) * 100) / 100,
            titulo,
            atualizado_em: agora,
          };
        });

        const { error } = await sb
          .from("anuncios_ml")
          .upsert(rows, { onConflict: "loja,codigo" });
        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook Bling:", err);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}
