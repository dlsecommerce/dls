// marketplace/hooks/useMarketplace.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Marketplace } from "@/components/marketplace/hooks/types";
import { createNotification } from "@/lib/createNotification";

export type MarketplaceSituacaoFilter = "Ativos" | "Inativos" | "Todos";
export type MarketplaceTipoFilter = "Todos" | "Produtos" | "Variações";
export type MarketplaceCondicaoFilter = "Todos" | "Clássico" | "Premium";
export type MarketplaceSortField =
  | "store"
  | "channel"
  | "id_bling"
  | "reference"
  | "product"
  | "mark"
  | "commission_rate"
  | "profit_margin"
  | "freight"
  | "current_cost"
  | "selling_price"
  | "created_at";
export type MarketplaceSortDir = "asc" | "desc";

type UseMarketplaceParams = {
  store?: string;
  channel?: string;
  tipo?: MarketplaceTipoFilter | string;
  condicao?: MarketplaceCondicaoFilter | string;
  search?: string;
  situacao?: MarketplaceSituacaoFilter;
  brands?: string[];
  sortBy?: MarketplaceSortField;
  sortDir?: MarketplaceSortDir;
};

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;

const LIMITE_COMISSAO_CLASSICO = 14;
const CANAL_MERCADO_LIVRE = "mercado livre";

function isMercadoLivre(channel?: string) {
  return String(channel ?? "").trim().toLowerCase().includes(CANAL_MERCADO_LIVRE);
}

function normalizeNullable(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normalizeRequired(v: any): string {
  return String(v ?? "").trim();
}

function normalizeIdBling(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "n bling" || low.includes("n bling") || low === "n/a" || low === "na") {
    return null;
  }
  return s;
}

function mapErrorMessage(err: any): string {
  const msg = String(err?.message || err || "");
  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return "Já existe um anúncio com essa referência nesse canal/loja.";
  }
  if (msg.includes("violates not-null constraint")) {
    return "Faltam campos obrigatórios para salvar o registro.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return msg || "Erro desconhecido.";
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      const isNetworkError = msg.includes("Failed to fetch") || msg.includes("network");
      if (!isNetworkError || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

function safeNotify(context: string, payload: Parameters<typeof createNotification>[0]) {
  createNotification(payload).catch((notifErr) => {
    console.error(`[useMarketplace] ${context}:notification`, notifErr);
  });
}

function buildMarketplaceLink(id: string, store: string, channel: string) {
  return `/dashboard/marketplace/edit?id=${encodeURIComponent(id)}&loja=${encodeURIComponent(
    store
  )}&canal=${encodeURIComponent(channel)}`;
}

const savingLocks = new Set<string>();

export function useMarketplace(params: UseMarketplaceParams) {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const abortRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------
  // Debounce do search — evita disparar fetch a cada tecla digitada.
  // ---------------------------------------------------------------------
  const [debouncedSearch, setDebouncedSearch] = useState(params.search ?? "");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(params.search ?? "");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [params.search]);

  // ---------------------------------------------------------------------
  // Serializa "brands" para uma string estável — evita refetch quando o
  // array é recriado (nova referência) mas o conteúdo é o mesmo.
  // ---------------------------------------------------------------------
  const brandsKey = (params.brands ?? []).slice().sort().join("|");

  const buildQuery = useCallback((query: any) => {
    const { store, channel, tipo, condicao, situacao, brands } = paramsRef.current;

    if (situacao === "Ativos") query = query.is("deleted_at", null);
    else if (situacao === "Inativos") query = query.not("deleted_at", "is", null);

    if (store) query = query.eq("store", store);
    if (channel) query = query.eq("channel", channel);
    if (brands && brands.length > 0) query = query.in("mark", brands);

    if (tipo === "Produtos") {
      query = query.eq("is_variation", false);
    } else if (tipo === "Variações") {
      query = query.eq("is_variation", true);
    }

    if (condicao && condicao !== "Todos" && isMercadoLivre(channel)) {
      if (condicao === "Clássico") {
        query = query.lte("commission_rate", LIMITE_COMISSAO_CLASSICO);
      } else if (condicao === "Premium") {
        query = query.gt("commission_rate", LIMITE_COMISSAO_CLASSICO);
      }
    }

    const term = debouncedSearch.trim();
    if (term) {
      query = query.or(
        `reference.ilike.%${term}%,product.ilike.%${term}%,id_bling.ilike.%${term}%`
      );
    }

    return query;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const fetchData = useCallback(async () => {
    // Cancela requisição anterior ainda em voo, se houver.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .schema("newsystem")
        .from("marketplace")
        .select("*", { count: "estimated" })
        .abortSignal(controller.signal);

      query = buildQuery(query);

      const { sortBy, sortDir } = paramsRef.current;
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortDir !== "desc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: err, count } = await query;

      if (err) throw err;

      setMarketplaces((data ?? []) as Marketplace[]);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      if (err?.name === "AbortError") return; // fetch cancelado — não é erro real
      console.error("Erro ao buscar marketplace:", err);
      setError(err?.message ?? "Erro ao buscar dados.");
      toast.error("Não foi possível carregar os dados do marketplace.");
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [buildQuery, page, pageSize]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [
    fetchData,
    params.store,
    params.channel,
    params.tipo,
    params.condicao,
    debouncedSearch,
    params.situacao,
    brandsKey,
    params.sortBy,
    params.sortDir,
  ]);

  useEffect(() => {
    setPage(0);
  }, [
    params.store,
    params.channel,
    params.tipo,
    params.condicao,
    debouncedSearch,
    params.situacao,
    brandsKey,
  ]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  const fetchAllMatchingIds = useCallback(async () => {
    let query = supabase.schema("newsystem").from("marketplace").select("id, deleted_at");
    query = buildQuery(query);
    const { data, error: err } = await query;
    if (err) throw err;
    return (data ?? []) as { id: string; deleted_at: string | null }[];
  }, [buildQuery]);

  const handleSave = useCallback(
    async (row: Partial<Marketplace> & Record<string, any>, onAfterSave?: () => void) => {
      const store = normalizeRequired(row?.store);
      const channel = normalizeRequired(row?.channel);
      const reference = normalizeRequired(row?.reference);

      if (!store) {
        toast.error("Selecione uma loja válida antes de salvar.");
        return;
      }
      if (!channel) {
        toast.error("Selecione um canal válido antes de salvar.");
        return;
      }
      if (!reference) {
        toast.error("Informe uma referência válida.");
        return;
      }

      const lockKey = `${store}:${channel}:${reference}`;
      if (savingLocks.has(lockKey) || savingRef.current) return;

      savingLocks.add(lockKey);
      savingRef.current = true;
      setSaving(true);

      const idBling = normalizeIdBling(row?.id_bling);
      const product = normalizeRequired(row?.product);
      const mark = normalizeNullable(row?.mark);
      const ativo = row?.active === undefined ? true : Boolean(row?.active);

      if (!product) {
        toast.error("Informe o nome do produto para salvar.");
        savingLocks.delete(lockKey);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      const isUpdate = Boolean(row?.id);
      let idFinal = "";

      try {
        const { data, error } = await withRetry(() =>
          supabase.schema("newsystem").rpc("upsert_marketplace", {
            p_store: store,
            p_channel: channel,
            p_id_bling: idBling,
            p_reference: reference,
            p_product: product,
            p_mark: mark,
            p_code_id: row?.code_id ?? null,
            p_ativo: ativo,
            p_id: row?.id ?? null,
          })
        );

        if (error) throw error;

        idFinal = String(data ?? "");
        toast.success(isUpdate ? "Registro atualizado." : "Registro criado.");

        if (onAfterSave) onAfterSave();
        else await fetchData();
      } catch (err: any) {
        console.error("[useMarketplace] handleSave:", err);
        toast.error("Erro ao salvar: " + mapErrorMessage(err));
        return;
      } finally {
        savingLocks.delete(lockKey);
        savingRef.current = false;
        setSaving(false);
      }

      safeNotify("handleSave", {
        title: isUpdate ? "Registro atualizado" : "Registro criado",
        message: `O anúncio "${product || reference || idFinal}" foi ${
          isUpdate ? "atualizado" : "criado"
        } no canal ${channel}.`,
        action: isUpdate ? "update" : "create",
        entityType: "marketplace",
        entityId: idFinal,
        link: buildMarketplaceLink(idFinal, store, channel),
      });
    },
    [fetchData]
  );

  return {
    marketplaces,
    loading,
    error,
    refetch,
    handleSave,
    saving,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    fetchAllMatchingIds,
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return value as T;
  } catch {
    return null;
  }
}

function setCached<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    // sessionStorage indisponível/cheio — ignora silenciosamente
  }
}

export async function fetchDistinctStores(): Promise<string[]> {
  const cached = getCached<string[]>("mkt:stores");
  if (cached) return cached;

  const { data, error } = await supabase
    .schema("newsystem")
    .rpc("distinct_marketplace_stores");

  if (error) return [];
  const list = (data ?? []).map((r: any) => r.store).filter(Boolean);
  setCached("mkt:stores", list);
  return list;
}

export async function fetchDistinctChannels(): Promise<string[]> {
  const cached = getCached<string[]>("mkt:channels");
  if (cached) return cached;

  const { data, error } = await supabase
    .schema("newsystem")
    .rpc("distinct_marketplace_channels");

  if (error) return [];
  const list = (data ?? []).map((r: any) => r.channel).filter(Boolean);
  setCached("mkt:channels", list);
  return list;
}

export async function fetchDistinctBrands(): Promise<string[]> {
  const cached = getCached<string[]>("mkt:brands");
  if (cached) return cached;

  const { data, error } = await supabase
    .schema("newsystem")
    .rpc("distinct_marketplace_brands");

  if (error) return [];
  const list = (data ?? []).map((r: any) => r.mark).filter(Boolean);
  setCached("mkt:brands", list);
  return list;
}
