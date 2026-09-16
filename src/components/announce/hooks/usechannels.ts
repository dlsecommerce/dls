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

      const [channelsRes, marketplaceRes] = await Promise.all([
        supabase.schema("newsystem").from("channels").select("id, name"),
        supabase
          .schema("newsystem")
          .from("marketplace")
          .select("channel")
          .is("deleted_at", null),
      ]);

      if (!mounted) return;

      if (channelsRes.error) {
        console.error("Erro ao buscar canais:", channelsRes.error);
        setError(channelsRes.error.message);
        setChannels([]);
        setLoading(false);
        return;
      }

      if (marketplaceRes.error) {
        console.error("Erro ao buscar canais do marketplace:", marketplaceRes.error);
      }

      // Mapa nome -> Channel, priorizando o id real da tabela `channels`
      const map = new Map<string, Channel>();

      (channelsRes.data ?? []).forEach((c) => {
        map.set(c.name, { id: c.id, name: c.name });
      });

      (marketplaceRes.data ?? []).forEach((m: { channel: string }) => {
        if (m.channel && !map.has(m.channel)) {
          map.set(m.channel, { id: m.channel, name: m.channel });
        }
      });

      const merged = Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setChannels(merged);
      setError(null);
      setLoading(false);
    }

    fetchChannels();

    return () => {
      mounted = false;
    };
  }, []);

  return { channels, loading, error };
}
