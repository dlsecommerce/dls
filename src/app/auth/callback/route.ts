export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // ❌ Sem código → redireciona com erro
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", req.url)
    );
  }

  const cookieStore = await cookies();

  // 🔵 Cria o Supabase Client no servidor (Node runtime)
  //    Importante: Edge não permite cookies mutáveis, Node sim.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            cookieStore.set(name, value);
          });
        },
      },
    }
  );

  // 🔄 Troca o código OAuth pelo token de sessão (salva cookies)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        req.url
      )
    );
  }

  // 🎯 Sucesso → redireciona para o dashboard
  return NextResponse.redirect(
    new URL("/dashboard", req.url)
  );
}
