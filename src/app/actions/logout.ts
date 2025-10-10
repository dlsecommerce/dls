"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export async function logoutAction() {
  const cookieStore = await cookies();

  // ✅ Novo client SSR compatível com Next.js 15
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value)),
      },
    }
  );

  // ✅ Finaliza a sessão no servidor
  await supabase.auth.signOut();

  // ✅ Redireciona para a tela de login
  redirect("/login");
}
