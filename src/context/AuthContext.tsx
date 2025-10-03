"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizeUpdate } from "@/utils/supabase-helpers";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type Profile = ProfileRow & { email: string | null };

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  setStatus: (status: NonNullable<ProfileRow["status"]>) => Promise<void>;
  updateProfile: (data: Partial<ProfileUpdate>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      .single<ProfileRow>();

    if (!error && p) {
      setProfile({ ...p, email: authUser?.user?.email ?? null });
    }
  }

  async function refreshProfile() {
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) {
      await loadProfile(authUser.user.id);
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) await loadProfile(data.user.id);
      else setProfile(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const setStatus = async (status: NonNullable<ProfileRow["status"]>) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update(normalizeUpdate<ProfileUpdate>({ status }))
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, status });
    }
  };

  const updateProfile = async (data: Partial<ProfileUpdate>) => {
    if (!profile) return;

    const updateData: ProfileUpdate = {
      name: data.name ?? profile.name,
      avatar_url: data.avatar_url ?? profile.avatar_url,
      status: data.status ?? profile.status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(normalizeUpdate(updateData))
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, ...updateData });
    }
  };

  return (
    <AuthContext.Provider
      value={{ profile, loading, setStatus, updateProfile, refreshProfile }}
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
