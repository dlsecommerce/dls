import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/debug") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Variáveis do Supabase ausentes no middleware");
    return res;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const hasUser = !!session?.user;

  const redirectWithCookies = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;

    const redirectRes = NextResponse.redirect(url);

    res.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });

    return redirectRes;
  };

  if (hasUser && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  if (!hasUser && pathname.startsWith("/dashboard")) {
    return redirectWithCookies("/login");
  }

  return res;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};