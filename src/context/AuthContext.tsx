"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizeUpdate } from "@/utils/supabase-helpers";
import { logoutAction } from "@/app/actions/logout"; // ✅ Importa logout do servidor

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type Profile = ProfileRow & { email: string | null };

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  setStatus: (status: string) => Promise<void>;
  setStatusMessage: (message: string) => Promise<void>;
  updateProfile: (data: Partial<ProfileUpdate>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Carrega dados do perfil a partir do user.id
  async function loadProfile(userId: string) {
    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<ProfileRow>();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    if (p) setProfile({ ...p, email: authUser?.user?.email ?? null });
  }

  // 🔹 Atualiza o perfil manualmente
  async function refreshProfile() {
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) await loadProfile(authUser.user.id);
    else setProfile(null);
  }

  // 🔹 Carregamento inicial e monitoramento da sessão
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!isMounted) return;
      if (data.user) await loadProfile(data.user.id);
      else setProfile(null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    // 🔹 Escuta mudanças no banco em tempo real (profiles)
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (profile && payload.new.id === profile.id) {
            setProfile((prev) => ({ ...prev!, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      sub.subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // 🔹 Atualiza status
  const setStatus = async (status: string) => {
    if (!profile) return;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar status:", error);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    setProfile({ ...updated, email: authUser?.user?.email ?? null });
  };

  // 🔹 Atualiza mensagem de status
  const setStatusMessage = async (message: string) => {
    if (!profile) return;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(normalizeUpdate<ProfileUpdate>({ status_message: message }))
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar mensagem de status:", error);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    setProfile({ ...updated, email: authUser?.user?.email ?? null });
  };

  // 🔹 Atualiza dados do perfil
  const updateProfile = async (data: Partial<ProfileUpdate>) => {
    if (!profile) return;

    const updateData: ProfileUpdate = {
      name: data.name ?? profile.name,
      avatar_url: data.avatar_url ?? profile.avatar_url,
      status: data.status ?? profile.status,
      status_message: data.status_message ?? profile.status_message,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(normalizeUpdate(updateData))
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar perfil:", error);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    setProfile({ ...updated, email: authUser?.user?.email ?? null });
  };

  // 🔹 Logout via server action (mantém sincronizado com middleware)
  const signOut = async () => {
    try {
      await logoutAction(); // ✅ limpa cookies e redireciona para /login
      setProfile(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        setStatus,
        setStatusMessage,
        updateProfile,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
