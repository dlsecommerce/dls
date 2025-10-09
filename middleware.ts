import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  const pathname = req.nextUrl.pathname;

  // ⚠️ Ignora rotas de autenticação (callback, api, etc.)
  if (pathname.startsWith("/auth")) return res;

  // 🚀 Usuário logado → envia direto para /dashboard
  if (session && (pathname === "/" || pathname === "/inicio" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🚫 Não logado → impede acesso ao dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    // ✅ Evita conflito logo após login (grace period)
    const referer = req.headers.get("referer") || "";
    if (referer.includes("/auth/callback")) return res;

    return NextResponse.redirect(new URL("/inicio", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/", "/inicio", "/login", "/dashboard/:path*", "/auth/:path*"],
};
