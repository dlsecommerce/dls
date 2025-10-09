export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("❌ Supabase OAuth error:", error.message);
    return NextResponse.redirect(new URL(`/login?error=${error.message}`, req.url));
  }

  // ✅ O próprio Supabase já cuida dos cookies — não precisa reescrever manualmente
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
