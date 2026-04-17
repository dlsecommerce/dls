export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

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

  const redirectWithCookies = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url));

    for (const cookie of res.cookies.getAll()) {
      response.cookies.set(cookie);
    }

    return response;
  };

  // Usuário logado acessando "/" ou "/login"
  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  // Usuário não logado acessando área protegida
  if (!user && pathname.startsWith("/dashboard")) {
    return redirectWithCookies("/login");
  }

  return res;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};