"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook de verificação global de sessão do Supabase
 * Garante redirecionamento profissional:
 * - Se logado → vai direto ao dashboard
 * - Se não logado → vai ao início
 */
export function useInitialRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      // ✅ Usuário logado: se estiver em / ou /inicio → vai direto pro dashboard
      if (session && (pathname === "/" || pathname === "/inicio" || pathname === "/login")) {
        router.replace("/dashboard");
        return;
      }

      // 🚫 Usuário não logado: se tentar acessar dashboard → volta pro início
      if (!session && pathname.startsWith("/dashboard")) {
        router.replace("/inicio");
        return;
      }
    };

    verifySession();
  }, [pathname, router]);
}
