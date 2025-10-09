import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Middleware de autenticação profissional:
 * - Redireciona usuários não autenticados para /
 * - Evita "flash" de tela no login/logout
 * - Mantém o cookie sincronizado com Supabase SSR
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  const pathname = req.nextUrl.pathname;

  // 🔹 Ignora rotas públicas e técnicas
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/site.webmanifest")
  ) {
    return res;
  }

  // 🔹 Usuário autenticado → envia direto para /dashboard
  if (session && (pathname === "/" || pathname === "/inicio" || pathname === "/login")) {
    const redirectUrl = new URL("/dashboard", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Usuário não autenticado → bloqueia acesso a rotas protegidas
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Garante atualização do cookie SSR (sincronização)
  return res;
}

export const config = {
  matcher: [
    "/",
    "/inicio",
    "/login",
    "/dashboard/:path*",
    "/auth/:path*",
    "/api/:path*",
  ],
};
