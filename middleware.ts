export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  // Cria resposta padrão
  const res = NextResponse.next();

  // Cria um client Supabase com suporte a cookies
  const supabase = createMiddlewareClient({ req, res });

  // Busca a sessão atual
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // 🔹 Usuário logado → redireciona rotas públicas pro dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🔹 Usuário não logado → bloqueia dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Se passou por todas as regras, libera acesso normalmente
  return res;
}

// 🔧 Middleware deve rodar APENAS nessas rotas
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"], // ❌ nunca inclua /auth/:path*
};
