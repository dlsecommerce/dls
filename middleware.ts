export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Cria o cliente Supabase com cookies reativos
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Helper para redirecionar mantendo cookies
  const redirectWithCookies = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url));
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  };

  // Usuário logado: / ou /login → manda pra /dashboard
  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  // Usuário não logado: acessando /dashboard → volta pra /login
  if (!user && pathname.startsWith("/dashboard")) {
    return redirectWithCookies("/login");
  }

  // Segue fluxo normal
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"],
};
