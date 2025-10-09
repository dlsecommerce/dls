"use client";

import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function useLogout() {
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Erro ao sair:", error.message);
        toast.error("Erro ao sair, tente novamente.");
        return;
      }

      toast.success("Saindo da sua conta...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      window.location.replace("/inicio");
    } catch (err) {
      console.error("Erro inesperado no logout:", err);
      toast.error("Não foi possível sair.");
      window.location.replace("/inicio");
    }
  };

  return { handleLogout };
}
