import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isLoja } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (body: Record<string, unknown>, status = 400) => {
  const res = NextResponse.json({ ok: false, ...body }, { status });
  res.cookies.delete("ml_oauth_state");
  return res;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");

  if (sp.get("error")) {
    return fail({ error: sp.get("error"), desc: sp.get("error_description") });
  }

  // CSRF: state da URL precisa ser igual ao do cookie
  const cookieState = req.cookies.get("ml_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail({ error: "state inválido ou expirado. Rode o /authorize de novo." });
  }

  const loja = state.split(".")[0];
  if (!isLoja(loja)) return fail({ error: "loja inválida" });

  const sufixo = loja.toUpperCase();
  const clientId = process.env[`ML_CLIENT_ID_${sufixo}`];
  const clientSecret = process.env[`ML_CLIENT_SECRET_${sufixo}`];
  const redirectUri = process.env[`ML_REDIRECT_URI_${sufixo}`];
  if (!clientId || !clientSecret || !redirectUri) {
    return fail({ error: `faltam envs ML_*_${sufixo}` }, 500);
  }

  // Troca do code por tokens
  const r = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const t = await r.json();
  if (!r.ok) {
    return fail({ status: r.status, error: t.error, message: t.message });
  }

  const now = Date.now();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: "newsystem" } }
  );

  const { error } = await supabase.from("ml_tokens").upsert(
    {
      conta: loja,
      user_id: t.user_id,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: new Date(now + t.expires_in * 1000).toISOString(),
      refresh_expires_at: new Date(now + 180 * 24 * 3600 * 1000).toISOString(),
    },
    { onConflict: "conta" }
  );

  if (error) return fail({ db_error: error.message }, 500);

  // Nunca devolver tokens
  const res = NextResponse.json({ ok: true, conta: loja, user_id: t.user_id, scope: t.scope });
  res.cookies.delete("ml_oauth_state");
  return res;
}
