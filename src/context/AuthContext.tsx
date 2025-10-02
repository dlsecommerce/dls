"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  avatar_url: string | null;
  status: "online" | "away" | "offline";
  email: string | null; // ✅ novo campo
}

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  setStatus: (status: "online" | "away" | "offline") => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    // pega user do auth para capturar email
    const { data: authUser } = await supabase.auth.getUser();

    const { data: p, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, name, avatar_url, status")
      .eq("id", userId)
      .single();

    if (!error && p) {
      setProfile({
        ...p,
        email: authUser?.user?.email ?? null, // ✅ adiciona email
      } as Profile);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        await loadProfile(data.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const setStatus = async (status: "online" | "away" | "offline") => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, status });
    } else {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        avatar_url: data.avatar_url,
      })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, ...data }); // 🔄 Atualiza local
    } else {
      console.error("Erro ao atualizar perfil:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ profile, loading, setStatus, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
