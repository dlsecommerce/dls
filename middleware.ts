export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export async function middleware(req: NextRequest) {
  // Cria a resposta padrão
  const res = NextResponse.next();

  // Cria um client Supabase conectado aos cookies da requisição
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Busca a sessão atual (caso o cookie esteja válido)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // 🔹 Caso o usuário esteja logado e tente acessar páginas públicas (/ ou /login)
  // Redireciona automaticamente para o dashboard
  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🔹 Caso o usuário NÃO esteja logado e tente acessar rotas protegidas (/dashboard/*)
  // Redireciona de volta para a página inicial
  if (!session && pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔹 Se nenhuma regra foi violada, segue o fluxo normalmente
  return res;
}

// 🔧 Define em quais rotas o middleware deve ser executado
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"], // nunca inclua /auth/*
};
