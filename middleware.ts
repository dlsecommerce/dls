export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  // ✅ Lê os cookies manualmente (corrige bug do Next 15)
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieArray = cookieHeader
    .split(";")
    .filter(Boolean)
    .map((c) => {
      const [name, ...rest] = c.trim().split("=");
      return { name, value: rest.join("=") };
    });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieArray,
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user =
    session?.user ??
    (await supabase.auth
      .getUser()
      .then((r) => r.data.user)
      .catch(() => null));

  const pathname = req.nextUrl.pathname;

  // Helper para sincronizar cookies ao redirecionar
  const redirectWithCookies = (path: string) => {
    const redirectUrl = new URL(path, req.url);
    const response = NextResponse.redirect(redirectUrl);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  };

  // Usuário logado → redireciona para dashboard se estiver em / ou /login
  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  // Usuário não logado → redireciona para /login se tentar acessar dashboard
  if (!user && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(redirectUrl);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  }

  // Caso contrário, segue normalmente
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
