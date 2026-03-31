"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Login realizado!");
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Saiu da conta.");
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return {
    login,
    loginWithGoogle,
    logout,
    loading,
  };
}