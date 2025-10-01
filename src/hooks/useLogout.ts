"use client";

import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

export function useLogout() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error("Erro ao sair, tente novamente.");
        return;
      }

      toast.success("Você saiu da sua conta.");
      router.replace("/login");
    } catch (err) {
      console.error("Erro no logout:", err);
      toast.error("Não foi possível sair.");
    }
  };

  return { handleLogout };
}
