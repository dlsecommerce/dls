"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";

export function useLogout() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
