import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Middleware de autenticação com Supabase (versão otimizada)
 * ---------------------------------------------------------
 * - Redireciona usuários não autenticados para /inicio
 * - Redireciona usuários logados para /dashboard ao tentar acessar / ou /login
 * - Evita flash de tela no pós-login (callback)
 * - Mantém cookie sincronizado com o Supabase SSR/Edge
 */

export async function middleware(req: NextRequest) {
  // Cria a resposta padrão (necessária pro Supabase funcionar no Edge)
  const res = NextResponse.next();

  // Cria cliente Supabase com contexto de request/response
  const supabase = createMiddlewareClient({ req, res });

  // Obtém sessão atual
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;
  const referer = req.headers.get("referer") || "";

  // 🔹 Ignora rotas públicas, assets e técnicas
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/site.webmanifest") ||
    pathname.includes(".") // arquivos estáticos
  ) {
    return res;
  }

  // 🧠 Log opcional para depuração (pode remover em prod)
  console.log("🔍 [Middleware] Sessão:", session ? "ATIVA" : "INEXISTENTE", "→", pathname);

  // 🔹 Usuário logado → redireciona rotas públicas para o dashboard
  if (session && (pathname === "/" || pathname === "/inicio" || pathname === "/login")) {
    const redirectUrl = new URL("/dashboard", req.url);
    redirectUrl.searchParams.set("from", pathname);
    console.log("➡️ Redirecionando usuário logado para:", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Usuário não autenticado → bloqueia acesso a rotas protegidas
  if (!session && pathname.startsWith("/dashboard")) {
    // ⚙️ Permite acesso temporário se veio diretamente do callback (para evitar loop)
    if (referer.includes("/auth/callback")) {
      console.log("⚠️ Acesso temporário permitido (pós-callback)");
      return res;
    }

    const redirectUrl = new URL("/inicio", req.url);
    redirectUrl.searchParams.set("from", pathname);
    console.log("⛔ Usuário não autenticado → redirecionando para:", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Caso contrário, permite continuar normalmente
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
