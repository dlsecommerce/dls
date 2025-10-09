"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function useInitialRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const checkSession = async () => {
      try {
        // Evita conflito durante callback ou logout
        if (
          pathname.startsWith("/auth/callback") ||
          pathname === "/logout"
        ) {
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Usuário logado → manda pro dashboard
        if (session && pathname === "/inicio") {
          router.replace("/dashboard");
        }

        // Usuário não logado → bloqueia acesso ao dashboard
        if (!session && pathname.startsWith("/dashboard")) {
          router.replace("/inicio");
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      }
    };

    // Rodar com pequeno delay evita 404 em transições rápidas
    const timeout = setTimeout(checkSession, 150);
    return () => clearTimeout(timeout);
  }, [pathname, router]);
}
