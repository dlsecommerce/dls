export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  // 🔹 Cria uma resposta base
  let res = NextResponse.next();

  // ✅ Cria o Supabase client lendo cookies diretamente do cabeçalho
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Lê todos os cookies da requisição, não apenas do objeto req.cookies
        getAll: () => {
          const cookieHeader = req.headers.get("cookie") || "";
          return cookieHeader
            .split(";")
            .filter(Boolean)
            .map((cookie) => {
              const [name, ...rest] = cookie.trim().split("=");
              return { name, value: rest.join("=") };
            });
        },
        // Mantém sincronização com o response
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // ✅ Helper que mantém cookies no redirecionamento
  const redirectWithCookies = (path: string) => {
    const redirectUrl = new URL(path, req.url);
    const response = NextResponse.redirect(redirectUrl);

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);

    return response;
  };

  // ✅ Se o usuário estiver logado e acessar "/" ou "/login" → vai pra dashboard
  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies("/dashboard");
  }

  // ❌ Se o usuário NÃO estiver logado e tentar acessar /dashboard → volta pro login
  if (!user && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("from", pathname);

    const response = NextResponse.redirect(redirectUrl);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);

    return response;
  }

  // ✅ Fluxo normal
  return res;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
