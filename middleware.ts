import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Libera arquivos internos, assets, API e páginas de debug
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

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("MIDDLEWARE:", {
    pathname,
    hasUser: !!user,
    error: error?.message,
  });

  const redirectWithCookies = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;

    const redirectRes = NextResponse.redirect(url);

    res.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });

    return redirectRes;
  };

  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  if (!user && pathname.startsWith("/dashboard")) {
    return redirectWithCookies("/login");
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
  ],
};