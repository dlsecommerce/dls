export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("⚠️ Nenhum código recebido do OAuth provider");
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  // ✅ CORREÇÃO: executa cookies() para retornar o store correto
  const cookieStore = cookies();

  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("❌ Erro Supabase OAuth:", error.message);
    return NextResponse.redirect(new URL(`/login?error=${error.message}`, req.url));
  }

  console.log("✅ Sessão criada com sucesso, redirecionando para /dashboard");
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
