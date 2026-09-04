// marketplace/hooks/useMarketplace.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Marketplace } from "@/components/marketplace/hooks/types";
import { createNotification } from "@/lib/createNotification";

// ===========================================================================
// TIPOS
// ===========================================================================

export type MarketplaceSituacaoFilter = "Ativos" | "Inativos" | "Todos" | "Últimos incluídos";
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
  page?: number;
  pageSize?: number;
};

// ===========================================================================
// CONSTANTES
// ===========================================================================

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;
const LIMITE_COMISSAO_CLASSICO = 14;
const CANAL_MERCADO_LIVRE = "mercado livre";

// ===========================================================================
// VALIDAÇÃO (ZOD) — Single Source of Truth
// ===========================================================================

const marketplaceSaveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  store: z.string().trim().min(1, "Selecione uma loja válida antes de salvar."),
  channel: z.string().trim().min(1, "Selecione um canal válido antes de salvar."),
  reference: z.string().trim().min(1, "Informe uma referência válida."),
  product: z.string().trim().min(1, "Informe o nome do produto para salvar."),
  mark: z.string().trim().nullable().optional(),
  id_bling: z.string().trim().nullable().optional(),
  code_id: z.union([z.string(), z.number()]).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export type MarketplaceSaveInput = z.infer<typeof marketplaceSaveSchema>;

// ===========================================================================
// HELPERS
// ===========================================================================

function isMercadoLivre(channel?: string) {
  return String(channel ?? "").trim().toLowerCase().includes(CANAL_MERCADO_LIVRE);
}

function normalizeIdBling(v: unknown): string | null {
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

function buildMarketplaceLink(id: string, store: string, channel: string) {
  return `/dashboard/marketplace/edit?id=${encodeURIComponent(id)}&loja=${encodeURIComponent(
    store
  )}&canal=${encodeURIComponent(channel)}`;
}

function safeNotify(context: string, payload: Parameters<typeof createNotification>[0]) {
  createNotification(payload).catch((notifErr) => {
    console.error(`[useMarketplace] ${context}:notification`, notifErr);
  });
}

/**
 * Recalcula o preço de venda no client — espelha exatamente a fórmula usada
 * no export e no banco (fn_calc_marketplace_price). Usado para preview
 * instantâneo em edição inline, sem depender de round-trip ao Supabase.
 */
export function calcSellingPricePreview(params: {
  cost: number;
  freight: number;
  commissionRate: number;
  profitMargin: number;
  taxRate?: number;
  marketingRate?: number;
}): number {
  const { cost, freight, commissionRate, profitMargin, taxRate = 0, marketingRate = 0 } = params;
  const denominator = 1 - (commissionRate + profitMargin + taxRate + marketingRate) / 100;
  if (denominator <= 0) return 0;
  return Math.round(((cost + freight) / denominator) * 100) / 100;
}

// ===========================================================================
// SERIALIZAÇÃO DE FILTROS — chave estável para o queryKey
// ===========================================================================

function buildFiltersKey(params: UseMarketplaceParams, debouncedSearch: string) {
  return JSON.stringify({
    store: params.store ?? null,
    channel: params.channel ?? null,
    tipo: params.tipo ?? null,
    condicao: params.condicao ?? null,
    situacao: params.situacao ?? "Ativos",
    brands: (params.brands ?? []).slice().sort(),
    search: debouncedSearch.trim(),
    sortBy: params.sortBy ?? "created_at",
    sortDir: params.sortDir ?? "desc",
  });
}

// ===========================================================================
// QUERY BUILDER (reaproveitado por fetch de dados e por fetchAllMatchingIds)
// ===========================================================================

function applyFilters(query: any, params: UseMarketplaceParams, debouncedSearch: string) {
  const { store, channel, tipo, condicao, situacao, brands } = params;

  // ---- Situação: Ativos / Inativos / Todos / Últimos incluídos ----
  if (situacao === "Inativos") {
    query = query.not("deleted_at", "is", null);
  } else if (situacao === "Todos") {
    // sem filtro de deleted_at — traz tudo
  } else if (situacao === "Últimos incluídos") {
    // FIX: sem cutoff de tempo — traz sempre os mais recentes.
    // Antes havia um gte(created_at, cutoff de N dias) que zerava
    // a lista quando não havia inclusões dentro dessa janela.
    // A ordenação por created_at desc (aplicada no fetch) já garante
    // que os mais recentes aparecem primeiro, sem risco de lista vazia.
    query = query.is("deleted_at", null);
  } else {
    // "Ativos" ou undefined (default)
    query = query.is("deleted_at", null);
  }

  if (store) query = query.eq("store", store);
  if (channel) query = query.eq("channel", channel);
  if (brands && brands.length > 0) query = query.in("mark", brands);

  if (tipo === "Produtos") query = query.eq("is_variation", false);
  else if (tipo === "Variações") query = query.eq("is_variation", true);

  if (condicao && condicao !== "Todos" && isMercadoLivre(channel)) {
    if (condicao === "Clássico") query = query.lte("commission_rate", LIMITE_COMISSAO_CLASSICO);
    else if (condicao === "Premium") query = query.gt("commission_rate", LIMITE_COMISSAO_CLASSICO);
  }

  const term = debouncedSearch.trim();
  if (term) {
    query = query.or(
      `reference.ilike.%${term}%,product.ilike.%${term}%,id_bling.ilike.%${term}%`
    );
  }

  return query;
}

// ===========================================================================
// FETCH FUNCTION
// ===========================================================================

type FetchResult = { rows: Marketplace[]; totalCount: number };

async function fetchMarketplacePage(
  params: UseMarketplaceParams,
  debouncedSearch: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<FetchResult> {
  let query = supabase
    .schema("newsystem")
    .from("marketplace")
    .select("*", { count: "estimated" });

  if (signal) query = query.abortSignal(signal);

  query = applyFilters(query, params, debouncedSearch);

  // "Últimos incluídos" força ordenação por created_at desc,
  // independentemente do sortBy/sortDir vindo dos filtros da UI.
  const isUltimosIncluidos = params.situacao === "Últimos incluídos";
  const sortBy = isUltimosIncluidos ? "created_at" : params.sortBy ?? "created_at";
  const sortDir = isUltimosIncluidos ? "desc" : params.sortDir ?? "desc";
  query = query.order(sortBy, { ascending: sortDir === "asc" });

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data ?? []) as Marketplace[], totalCount: count ?? 0 };
}

// ===========================================================================
// HOOK PRINCIPAL
// ===========================================================================

export function useMarketplace(params: UseMarketplaceParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(params.page ?? 0);
  const [pageSize, setPageSize] = useState(params.pageSize ?? DEFAULT_PAGE_SIZE);

  // ---------------------------------------------------------------------
  // Debounce do search
  // ---------------------------------------------------------------------
  const [debouncedSearch, setDebouncedSearch] = useState(params.search ?? "");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(params.search ?? ""), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [params.search]);

  // ---------------------------------------------------------------------
  // Chave de filtros estável (resolve problema de referência do array brands)
  // ---------------------------------------------------------------------
  const filtersKey = useMemo(
    () => buildFiltersKey(params, debouncedSearch),
    [params.store, params.channel, params.tipo, params.condicao, params.situacao, params.brands, params.sortBy, params.sortDir, debouncedSearch]
  );

  // Reseta página ao mudar qualquer filtro
  useEffect(() => {
    setPage(0);
  }, [filtersKey]);

  const queryKey = useMemo(
    () => ["marketplace", filtersKey, page, pageSize] as const,
    [filtersKey, page, pageSize]
  );

  // ---------------------------------------------------------------------
  // QUERY principal — cache, dedupe, abort e retry gerenciados pelo React Query
  // ---------------------------------------------------------------------
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchMarketplacePage(params, debouncedSearch, page, pageSize, signal),
    placeholderData: keepPreviousData, // evita flicker ao trocar de página
    staleTime: 30_000,
    retry: (failureCount, err: any) => {
      const msg = String(err?.message || "");
      const isNetworkError = msg.includes("Failed to fetch") || msg.includes("network");
      return isNetworkError && failureCount < 2;
    },
  });

  const marketplaces = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ---------------------------------------------------------------------
  // Prefetch preditivo da próxima página — navegação instantânea
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (page + 1 >= totalPages) return;
    const nextKey = ["marketplace", filtersKey, page + 1, pageSize] as const;
    queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: () => fetchMarketplacePage(params, debouncedSearch, page + 1, pageSize),
      staleTime: 30_000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, pageSize, totalPages]);

  // ---------------------------------------------------------------------
  // Realtime sync — atualiza tabela quando outro usuário edita/insere/remove
  // ---------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel("marketplace-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "newsystem", table: "marketplace" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["marketplace"], exact: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refetch = useCallback(() => refetchQuery(), [refetchQuery]);

  // ---------------------------------------------------------------------
  // fetchAllMatchingIds — usado no export (todos os registros do filtro)
  // ---------------------------------------------------------------------
  const fetchAllMatchingIds = useCallback(async () => {
    let query = supabase.schema("newsystem").from("marketplace").select("id, deleted_at");
    query = applyFilters(query, params, debouncedSearch);
    const { data: rows, error: err } = await query;
    if (err) throw err;
    return (rows ?? []) as { id: string; deleted_at: string | null }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  // ---------------------------------------------------------------------
  // MUTATION — handleSave com optimistic update
  // ---------------------------------------------------------------------
  const savingLocksRef = useRef<Set<string>>(new Set());

  const saveMutation = useMutation({
    mutationFn: async (input: MarketplaceSaveInput) => {
      const parsed = marketplaceSaveSchema.safeParse(input);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new Error(firstIssue?.message || "Dados inválidos.");
      }

      const v = parsed.data;
      const idBling = normalizeIdBling(v.id_bling);
      const mark = v.mark?.trim() || null;

      const { data: result, error: rpcError } = await supabase
        .schema("newsystem")
        .rpc("upsert_marketplace", {
          p_store: v.store,
          p_channel: v.channel,
          p_id_bling: idBling,
          p_reference: v.reference,
          p_product: v.product,
          p_mark: mark,
          p_code_id: v.code_id ?? null,
          p_ativo: v.active ?? true,
          p_id: v.id ?? null,
        });

      if (rpcError) throw rpcError;
      return { id: String(result ?? ""), input: v };
    },

    // ---- Optimistic update: atualiza o cache local antes da resposta do servidor
    onMutate: async (input) => {
      const lockKey = `${input.store}:${input.channel}:${input.reference}`;
      if (savingLocksRef.current.has(lockKey)) {
        throw new Error("__LOCKED__");
      }
      savingLocksRef.current.add(lockKey);

      await queryClient.cancelQueries({ queryKey: ["marketplace"], exact: false });

      const previousData = queryClient.getQueriesData({ queryKey: ["marketplace"], exact: false });

      if (input.id) {
        queryClient.setQueriesData<FetchResult>(
          { queryKey: ["marketplace"], exact: false },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              rows: old.rows.map((row) =>
                row.id === input.id ? { ...row, ...input } as Marketplace : row
              ),
            };
          }
        );
      }

      return { previousData, lockKey };
    },

    onError: (err: any, _input, context) => {
      if (err?.message === "__LOCKED__") return; // clique duplo — ignora silenciosamente

      // rollback do cache otimista
      context?.previousData?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });

      toast.error("Erro ao salvar: " + mapErrorMessage(err));
    },

    onSuccess: (result, input, context) => {
      const isUpdate = Boolean(input.id);
      toast.success(isUpdate ? "Registro atualizado." : "Registro criado.");

      safeNotify("handleSave", {
        title: isUpdate ? "Registro atualizado" : "Registro criado",
        message: `O anúncio "${input.product || input.reference || result.id}" foi ${
          isUpdate ? "atualizado" : "criado"
        } no canal ${input.channel}.`,
        action: isUpdate ? "update" : "create",
        entityType: "marketplace",
        entityId: result.id,
        link: buildMarketplaceLink(result.id, input.store, input.channel),
      });
    },

    onSettled: (_result, _err, _input, context) => {
      if (context?.lockKey) savingLocksRef.current.delete(context.lockKey);
      // garante consistência final com o servidor
      queryClient.invalidateQueries({ queryKey: ["marketplace"], exact: false });
    },
  });

  const handleSave = useCallback(
    async (row: Partial<Marketplace> & Record<string, any>, onAfterSave?: () => void) => {
      try {
        await saveMutation.mutateAsync({
          id: row?.id ?? null,
          store: row?.store,
          channel: row?.channel,
          reference: row?.reference,
          product: row?.product,
          mark: row?.mark ?? null,
          id_bling: row?.id_bling ?? null,
          code_id: row?.code_id ?? null,
          active: row?.active === undefined ? true : Boolean(row?.active),
        });
        onAfterSave?.();
      } catch (err: any) {
        if (err?.message !== "__LOCKED__") {
          // erro já tratado em onError; aqui só evita unhandled rejection
        }
      }
    },
    [saveMutation]
  );

  return {
    marketplaces,
    loading: isLoading,
    isFetching, // true durante refetch em background — útil para spinner sutil
    error: error ? mapErrorMessage(error) : null,
    refetch,
    handleSave,
    saving: saveMutation.isPending,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    fetchAllMatchingIds,
    calcSellingPricePreview,
  };
}

// ===========================================================================
// DISTINCT LISTS — cache via React Query (substitui sessionStorage manual)
// ===========================================================================

const LOOKUP_STALE_TIME = 5 * 60 * 1000; // 5min

export function useMarketplaceStores() {
  return useQuery({
    queryKey: ["marketplace-lookup", "stores"],
    queryFn: async () => {
      const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_stores");
      if (error) throw error;
      return (data ?? []).map((r: any) => r.store).filter(Boolean) as string[];
    },
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useMarketplaceChannels() {
  return useQuery({
    queryKey: ["marketplace-lookup", "channels"],
    queryFn: async () => {
      const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_channels");
      if (error) throw error;
      return (data ?? []).map((r: any) => r.channel).filter(Boolean) as string[];
    },
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useMarketplaceBrands() {
  return useQuery({
    queryKey: ["marketplace-lookup", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_brands");
      if (error) throw error;
      return (data ?? []).map((r: any) => r.mark).filter(Boolean) as string[];
    },
    staleTime: LOOKUP_STALE_TIME,
  });
}

// ---------------------------------------------------------------------------
// Funções standalone (compatibilidade com código legado que ainda usa await
// direto em vez do hook). Internamente usam o mesmo RPC, sem cache próprio
// — se usadas fora de componente React, prefira os hooks acima.
// ---------------------------------------------------------------------------

export async function fetchDistinctStores(): Promise<string[]> {
  const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_stores");
  if (error) return [];
  return (data ?? []).map((r: any) => r.store).filter(Boolean);
}

export async function fetchDistinctChannels(): Promise<string[]> {
  const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_channels");
  if (error) return [];
  return (data ?? []).map((r: any) => r.channel).filter(Boolean);
}

export async function fetchDistinctBrands(): Promise<string[]> {
  const { data, error } = await supabase.schema("newsystem").rpc("distinct_marketplace_brands");
  if (error) return [];
  return (data ?? []).map((r: any) => r.mark).filter(Boolean);
}
