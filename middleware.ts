import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * 🔒 Middleware de autenticação Supabase — versão otimizada para produção
 *
 * Funcionalidades:
 * - Redireciona usuários autenticados que acessam rotas públicas (/, /login)
 *   → para /dashboard
 * - Redireciona usuários não autenticados que tentam acessar /dashboard
 *   → para /
 * - Evita loops e falhas de sessão logo após login pelo callback do Google
 * - Mantém cookies sincronizados com SSR (Edge Middleware)
 */

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;
  const referer = req.headers.get("referer") || "";

  // 🔹 Ignora rotas públicas, arquivos e rotas internas
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/site.webmanifest") ||
    pathname.includes(".")
  ) {
    return res;
  }

  // 🔹 Usuário autenticado → redireciona rotas públicas para /dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    const redirectUrl = new URL("/dashboard", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Usuário não autenticado → bloqueia acesso a rotas protegidas
  if (!session && pathname.startsWith("/dashboard")) {
    // Permite acesso temporário se veio do callback
    if (referer.includes("/auth/callback")) {
      return res;
    }

    // Redireciona visitantes não logados para a home pública (/)
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Caso contrário, segue normalmente
  return res;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/auth/:path*",
    "/api/:path*",
  ],
};
