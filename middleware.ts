export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  // Cria resposta padrão
  const res = NextResponse.next();

  // Cria client Supabase com persistência de cookies (ESSENCIAL)
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Obtém sessão atual do usuário
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // ✅ Se o usuário estiver logado e acessar "/" ou "/login", manda pra dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ❌ Se o usuário NÃO estiver logado e tentar acessar "/dashboard", bloqueia
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Mantém cookies sincronizados na resposta (IMPORTANTE!)
  return res;
}

// Roda apenas nas rotas necessárias
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
