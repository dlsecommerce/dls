export const runtime = "nodejs";

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
    "🧩 [NODE] Path:", pathname,
    "| Referer:", referer,
    "| Session:", session ? "✅ Sim" : "❌ Não"
  );

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth") ||
    pathname.includes(".")
  ) {
    return res;
  }

  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!session && pathname.startsWith("/dashboard")) {
    if (referer.includes("/login") || referer.includes("/auth/callback")) {
      console.log("⚠️ Permissão temporária (pós-login)");
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
