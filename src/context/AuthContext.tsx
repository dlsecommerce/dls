"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: "online" | "away" | "offline";
  email: string | null;
  updated_at?: string | null;
  fullName?: string; // 🔹 nome completo calculado
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

  function buildFullName(first: string | null, last: string | null, email: string | null) {
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return email ?? "Usuário";
  }

  async function loadProfile(userId: string) {
    const { data: authUser } = await supabase.auth.getUser();

    const { data: p, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, status, updated_at")
      .eq("id", userId)
      .single<Profile>();

    if (!error && p) {
      const email = authUser?.user?.email ?? null;
      setProfile({
        ...p,
        email,
        fullName: buildFullName(p.first_name, p.last_name, email),
      });
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (!error) {
      const updatedProfile = {
        ...profile,
        ...data,
        fullName: buildFullName(
          data.first_name ?? profile.first_name,
          data.last_name ?? profile.last_name,
          profile.email
        ),
      };
      setProfile(updatedProfile);
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
