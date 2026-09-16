// components/announce/hooks/useChannels.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Channel = {
  id: string;
  name: string;
};

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchChannels() {
      setLoading(true);

      const { data, error } = await supabase
        .schema("newsystem")
        .from("channels")
        .select("id, name")
        .order("name");

      if (!mounted) return;

      if (error) {
        console.error("Erro ao buscar canais:", error);
        setError(error.message);
        setChannels([]);
      } else {
        setChannels(Array.isArray(data) ? data : []);
        setError(null);
      }

      setLoading(false);
    }

    fetchChannels();

    return () => {
      mounted = false;
    };
  }, []);

  return { channels, loading, error };
}
