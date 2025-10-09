import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;
  const referer = req.headers.get("referer") || "";

  // Ignora rotas públicas e arquivos
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

  // Usuário logado → redireciona rotas públicas para /dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Usuário não logado → bloqueia acesso ao dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    // Permite passagem pós-login ou pós-callback
    if (referer.includes("/login") || referer.includes("/auth/callback")) {
      return res;
    }

    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

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
