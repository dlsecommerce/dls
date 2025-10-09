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
  setStatus: (status: string) => Promise<void>;
  setStatusMessage: (message: string) => Promise<void>;
  updateProfile: (data: Partial<ProfileUpdate>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data: authUser } = await supabase.auth.getUser();
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<ProfileRow>();
    if (p) setProfile({ ...p, email: authUser?.user?.email ?? null });
  }

  async function refreshProfile() {
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) await loadProfile(authUser.user.id);
    else setProfile(null);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) await loadProfile(data.user.id);
      else setProfile(null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => sub.subscription?.unsubscribe();
  }, []);

  const setStatus = async (status: string) => {
    if (!profile) return;
    await supabase.from("profiles").update({ status }).eq("id", profile.id);
    await refreshProfile();
  };

  const setStatusMessage = async (message: string) => {
    if (!profile) return;
    await supabase
      .from("profiles")
      .update(normalizeUpdate<ProfileUpdate>({ status_message: message }))
      .eq("id", profile.id);
    await refreshProfile();
  };

  const updateProfile = async (data: Partial<ProfileUpdate>) => {
    if (!profile) return;
    const updateData: ProfileUpdate = {
      name: data.name ?? profile.name,
      avatar_url: data.avatar_url ?? profile.avatar_url,
      status: data.status ?? profile.status,
      status_message: data.status_message ?? profile.status_message,
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from("profiles")
      .update(normalizeUpdate(updateData))
      .eq("id", profile.id);
    setProfile({ ...profile, ...updateData });
    await refreshProfile();
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
