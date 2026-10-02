// src/app/api/bling/callback/route.ts
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return new Response("Sem code", { status: 400 });

  const id = process.env.BLING_CLIENT_ID_SOBAQUETAS!;
  const secret = process.env.BLING_CLIENT_SECRET_SOBAQUETAS!;

  const r = await fetch("https://api.bling.com.br/Api/v3/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  if (!r.ok) return new Response(await r.text(), { status: 502 });
  const j = await r.json();

  const db = createClient(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!.trim(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY_SECRET ?? process.env.SUPABASE_SECRET_KEY)!.trim(),
    { auth: { persistSession: false }, db: { schema: "newsystem" } }
  );

  const agora = Date.now();
  const { error } = await db.from("bling_tokens").upsert({
    id: 1,
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: new Date(agora + j.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(agora + 30 * 24 * 3600 * 1000).toISOString(),
  });
  if (error) return new Response(error.message, { status: 500 });

  return new Response("Bling conectado ✅");
}
