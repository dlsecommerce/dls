"use client";

import { useEffect, useState } from "react";
import { supabaseNewSystem } from "@/integrations/supabase/client";
import type { CompInfo, CompStatus, CompItem, CompAlert } from "./types";

const CHUNK = 200;

export function useCompositionMap(ids: string[]) {
  const [map, setMap] = useState<Record<string, CompInfo>>({});

  // Normaliza e deduplica os IDs para manter uma chave estável.
  const key = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).join(",");

  useEffect(() => {
    const idsToFetch = key ? key.split(",") : [];

    if (idsToFetch.length === 0) {
      setMap({});
      return;
    }

    let cancelled = false;

    // Evita exibir os dados da página anterior enquanto a nova consulta carrega.
    setMap({});

    const fetchComposition = async () => {
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < idsToFetch.length; i += CHUNK) {
          chunks.push(idsToFetch.slice(i, i + CHUNK));
        }

        // O client supabaseNewSystem já está configurado para o schema "newsystem".
        const results = await Promise.all(
          chunks.map((chunk) =>
            supabaseNewSystem
              .from("v_marketplace_composition")
              .select("marketplace_id, status, items, alerts")
              .in("marketplace_id", chunk)
          )
        );

        if (cancelled) return;

        const next: Record<string, CompInfo> = {};

        for (const { data, error } of results) {
          if (error) {
            console.error("Erro ao buscar composição:", error);
            continue;
          }

          for (const row of data ?? []) {
            if (!row.marketplace_id) continue;

            next[String(row.marketplace_id)] = {
              status: row.status as CompStatus,
              items: (row.items ?? []) as CompItem[],
              alerts: (row.alerts ?? []) as CompAlert[],
            };
          }
        }

        setMap(next);
      } catch (error) {
        if (!cancelled) {
          console.error("Erro ao buscar composição:", error);
          setMap({});
        }
      }
    };

    void fetchComposition();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return map;
}
