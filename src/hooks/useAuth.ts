"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function login(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);

    toast.success("Login realizado!");
    router.replace("/dashboard");
    router.refresh();
  }

  async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
    else if (data.url) window.location.href = data.url;
  }

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Saiu da conta.");
    router.replace("/login");
    router.refresh();
  }

  return { login, loginWithGoogle, logout, loading };
}
