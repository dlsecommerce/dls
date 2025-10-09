"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Escuta mudanças de sessão em tempo real:
 * - Login → vai pro dashboard
 * - Logout → volta pro início
 */
export function useAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/dashboard");
      else router.replace("/inicio");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);
}
