import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Middleware de autenticação profissional (versão compatível com Vercel Edge):
 * - Redireciona usuários não autenticados para /
 * - Evita flash de tela no login/logout
 * - Mantém o cookie sincronizado com Supabase SSR
 */
export async function middleware(req: NextRequest) {
  // Cria uma resposta padrão
  const res = NextResponse.next();

  // Garante que o Supabase use o contexto Edge corretamente
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

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

  // 🔹 Usuário autenticado → redireciona para /dashboard
  if (
    session &&
    (pathname === "/" || pathname === "/inicio" || pathname === "/login")
  ) {
    const redirectUrl = new URL("/dashboard", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Usuário não autenticado → bloqueia rotas protegidas
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Retorna a resposta com cookies sincronizados
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
