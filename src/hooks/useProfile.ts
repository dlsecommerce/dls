"use client";

import useSWR, { mutate } from "swr";
import { supabase } from "@/integrations/supabase/client";

const fetchProfile = async (userId: string) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url, status")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao carregar perfil:", error);
    return null;
  }

  return {
    name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
    avatar_url: data?.avatar_url ?? null,
    first_name: data?.first_name ?? "",
    last_name: data?.last_name ?? "",
    status: data?.status ?? "online", // fallback
  };
};

export function useProfile(userId?: string) {
  return useSWR(userId ? ["profile", userId] : null, () => fetchProfile(userId));
}

export function refreshProfile(userId: string) {
  mutate(["profile", userId]);
}
