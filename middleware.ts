export const runtime = "edge";

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

  console.log(
    "🧩 [EDGE] Path:", pathname,
    "| Referer:", referer,
    "| Session:", session ? "✅ Sim" : "❌ Não"
  );

  // 🔹 Ignora rotas públicas
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth") ||
    pathname.includes(".")
  ) {
    return res;
  }

  // 🔹 Usuário autenticado → redireciona rotas públicas para dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🔹 Usuário não autenticado → bloqueia dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    // Permite pós-login e pós-callback (delay do cookie)
    if (referer.includes("/login") || referer.includes("/auth/callback")) {
      console.log("⚠️ Permissão temporária (Edge cookie delay)");
      return res;
    }

    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("from", pathname);
    console.log("🚫 Sem sessão → redirecionando para", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
