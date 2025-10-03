"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  email: string | null;
};

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
    const { data: authUser } = await supabase.auth.getUser();

    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && p) {
      setProfile({
        ...p,
        email: authUser?.user?.email ?? null,
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

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
      setProfile({ ...profile, ...data });
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
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
