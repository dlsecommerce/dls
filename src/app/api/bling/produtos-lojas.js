// src/app/api/bling/descobrir-loja/route.ts
// Rota TEMPORÁRIA: apague depois de descobrir o idLoja.
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BLING = "https://api.bling.com.br/Api/v3";

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL no .env.local");
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY no .env.local");
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "newsystem" },
  });
}

async function readTokens(db: ReturnType<typeof getDb>) {
  const { data, error } = await db.from("bling_tokens").select("*").eq("id", 1).single();
  if (error) throw new Error("Tokens não encontrados: " +  error.message);
  return data;
}

async function getAccessToken(): Promise<string> {
  const db = getDb();
  const t = await readTokens(db);

  // token ainda válido (margem de 10 min)
  if (new Date(t.expires_at).getTime() - Date.now() > 10 * 60 * 1000) return t.access_token;

  const id = process.env.BLING_CLIENT_ID_SOBAQUETAS;
  const secret = process.env.BLING_CLIENT_SECRET_SOBAQUETAS;
  if (!id || !secret) throw new Error("Faltam BLING_CLIENT_ID_SOBAQUETAS / BLING_CLIENT_SECRET_SOBAQUETAS");

  const resp = await fetch(`${BLING}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token }),
  });

  if (!resp.ok) {
    const fresh = await readTokens(db);
    if (fresh.refresh_token !== t.refresh_token) return fresh.access_token;
    throw new Error("Falha no refresh do Bling: " + (await resp.text()));
  }

  const j = await resp.json();
  const { data: ok, error } = await db.rpc("rotate_bling_tokens", {
    p_old_refresh: t.refresh_token,
    p_access: j.access_token,
    p_refresh: j.refresh_token,
    p_expires_at: new Date(Date.now() + j.expires_in * 1000).toISOString(),
  });
  if (error) throw new Error("Erro ao gravar tokens: " + error.message);
  if (!ok) return (await readTokens(db)).access_token;
  return j.access_token;
}

export async function GET() {
  try {
    const token = await getAccessToken();

    const r = await fetch(`${BLING}/produtos/lojas?limite=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (!r.ok) {
      return Response.json({ error: `Bling ${r.status}`, detalhe: await r.text() }, { status: r.status });
    }

    const { data = [] } = await r.json();

    const porLoja: Record<string, string> = {};
    for (const i of data) {
      const id = String(i.loja?.id ?? "");
      if (id && !porLoja[id]) porLoja[id] = String(i.codigo ?? "");
    }

    const lojasMLB = [
      ...new Set(
        data
          .filter((i: any) => String(i.codigo ?? "").startsWith("MLB"))
          .map((i: any) => i.loja?.id)
      ),
    ];

    return Response.json({ lojasMLB, todasLojas: porLoja, exemplo: data[0] ?? null });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
