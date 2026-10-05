import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapProductToRows } from "@/lib/bling/mapProduct";
import { getBlingAccessToken } from "@/lib/bling/auth"; // ⚠️ sua função de token existente

export const runtime = "nodejs";

const LOJA = "Sóbaquetas"; // ⚠️ use exatamente o valor gravado hoje na coluna `loja`

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "newsystem" } }
);

function validSignature(raw: string, header: string | null) {
  if (!header) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.BLING_CLIENT_SECRET!)
      .update(raw)
      .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!validSignature(raw, req.headers.get("x-bling-signature-256"))) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const evt = JSON.parse(raw);
  const productId = evt?.data?.id;
  if (!productId) return NextResponse.json({ ok: true });

  try {
    if (evt.event === "product.deleted") {
      await admin.from("anuncios_ml").delete().eq("loja", LOJA).eq("id_bling", productId);
      return NextResponse.json({ ok: true });
    }

    if (evt.event === "product.created" || evt.event === "product.updated") {
      const token = await getBlingAccessToken();
      const r = await fetch(`https://api.bling.com.br/Api/v3/produtos/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Bling ${r.status}`);

      const { data } = await r.json();
      const rows = mapProductToRows(data, LOJA);

      if (rows.length) {
        const { error } = await admin
          .from("anuncios_ml")
          .upsert(rows, { onConflict: "loja,codigo" });
        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook Bling:", err);
    // 500 faz o Bling tentar de novo
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}
