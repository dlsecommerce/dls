import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

// 🔹 Página server-side protegida com autenticação via Supabase SSR
export default async function DashboardPage() {
  const cookieStore = await cookies();

  // ✅ Cria o client SSR (compatível com Next.js 15)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value }) =>
            cookieStore.set(name, value)
          ),
      },
    }
  );

  // 🔒 Obtém e valida o usuário autenticado diretamente com o servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ❌ Se não estiver logado, redireciona para /login
  if (!user) {
    redirect("/login");
  }

  // ✅ Se estiver logado, renderiza o painel
  return (
    <div className="p-6 text-white">
      {/* 🧱 Seus cards e conteúdo do dashboard virão aqui */}
    </div>
  );
}
