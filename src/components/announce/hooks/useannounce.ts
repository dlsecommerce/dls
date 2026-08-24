"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";
import type { Announce as AnnounceType, StoreName } from "@/components/announce/hooks/types";

/* ─────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────── */

export type AnnounceRow = {
  id: string;
  code_id: string;
  store: StoreName | string;
  id_bling: string | null;
  reference: string | null;
  product: string | null;
  mark: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;

  is_variation: boolean;
};

export type AnnounceTypeFilter =
  | "all"
  | "products"
  | "variations"
  | "Todos"
  | "Produtos"
  | "Variações";

export type AnnounceSituacaoFilter =
  | "Todos"
  | "Ativos"
  | "Inativos"
  | "Excluídos"
  | "Últimos incluídos";

export type AnnounceSortField =
  | "created_at"
  | "updated_at"
  | "reference"
  | "product"
  | "id_bling"
  | "store"
  | "code_id";

export type AnnounceSortDir = "asc" | "desc";

type UseAnnounceFilters = {
  store?: string | null;
  search?: string | null;
  type?: AnnounceTypeFilter;
  situacao?: AnnounceSituacaoFilter;
  sortBy?: AnnounceSortField;
  sortDir?: AnnounceSortDir;
  marks?: string[];
  page?: number;
  pageSize?: number;
};

type ProdutoInput = Partial<AnnounceType> & Record<string, any>;

/* ─────────────────────────────────────────────
 * NORMALIZAÇÃO DE TIPO (aceita PT e EN)
 * ───────────────────────────────────────────── */

function normalizeTypeFilter(
  type?: AnnounceTypeFilter
): Exclude<AnnounceTypeFilter, "Todos" | "Produtos" | "Variações"> {
  switch (type) {
    case "Todos":
      return "all";
    case "Produtos":
      return "products";
    case "Variações":
      return "variations";
    case "products":
    case "variations":
      return type;
    default:
      return "all";
  }
}

/* ─────────────────────────────────────────────
 * REGRA DE PRODUTO x VARIAÇÃO
 * ───────────────────────────────────────────── */

function isVariationReference(reference: string | null | undefined): boolean {
  const ref = (reference || "").trim().toUpperCase();
  return ref.startsWith("VAR");
}

/* ─────────────────────────────────────────────
 * NORMALIZAÇÃO
 * ───────────────────────────────────────────── */

function anyToStoreName(v: any): StoreName | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "pk" || s === "pikot shop" || s === "pikot") return "Pikot Shop";
  if (s === "sb" || s === "sóbaquetas" || s === "sobaquetas") return "Sóbaquetas";
  return null;
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
  if (
    low === "n bling" ||
    low.includes("n bling") ||
    low.includes("nº bling") ||
    low === "n/bling" ||
    low === "na" ||
    low === "n/a"
  ) {
    return null;
  }

  return s;
}

function getField(obj: any, ...keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return "";
}

function getProdutoLabel(produto: ProdutoInput, fallback: string) {
  return (
    produto?.product ||
    produto?.nome ||
    produto?.Nome ||
    produto?.reference ||
    produto?.referencia ||
    produto?.id_bling ||
    fallback
  );
}

function buildAnnouncementLink(id: string, store: StoreName) {
  return `/dashboard/anuncios/edit?id=${encodeURIComponent(id)}&loja=${encodeURIComponent(store)}`;
}

function mapErrorMessage(err: any): string {
  const msg = String(err?.message || err || "");

  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return "Já existe um anúncio com essa referência nessa loja.";
  }
  if (msg.includes("violates not-null constraint")) {
    return "Faltam campos obrigatórios para salvar o anúncio.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return msg || "Erro desconhecido.";
}

function logError(context: string, err: any, extra?: Record<string, any>) {
  // eslint-disable-next-line no-console
  console.error(`[useAnnounce] ${context}:`, err, extra);
}

function safeNotify(
  context: string,
  payload: Parameters<typeof createNotification>[0]
) {
  // Fire-and-forget: nunca bloqueia a UI nem o fluxo principal.
  createNotification(payload).catch((notifErr) => {
    logError(`${context}:notification`, notifErr, { entityId: payload.entityId });
  });
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

/* ─────────────────────────────────────────────
 * SOFT DELETE — move para a lixeira (deleted_at = now())
 * Usado quando o registro AINDA está ativo (deleted_at null).
 * ───────────────────────────────────────────── */
async function softDeleteByIds(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const { data, error } = await withRetry(() =>
    supabase
      .schema("newsystem")
      .from("announce")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .is("deleted_at", null)
      .select("id")
  );

  if (error) throw error;

  if (!data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[softDeleteByIds] Nenhuma linha afetada.", { ids });
    throw new Error(
      `Nenhum anúncio foi movido para a lixeira. IDs: ${JSON.stringify(ids)}`
    );
  }
}

/* ─────────────────────────────────────────────
 * HARD DELETE — exclusão permanente via RPC
 * A RPC "hard_delete_announce" apaga em uma única
 * chamada de rede: 1) as composições vinculadas
 * (composition.announce_id) e 2) o announce em si
 * (só se deleted_at estiver preenchido). Isso evita
 * 2 round-trips separados + elimina o erro de FK
 * "composition_announce_id_fkey".
 * ───────────────────────────────────────────── */
async function hardDeleteByIds(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const { data, error } = await withRetry(() =>
    supabase.schema("newsystem").rpc("hard_delete_announce", { p_ids: ids })
  );

  if (error) throw error;

  if (!data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[hardDeleteByIds] Nenhuma linha excluída permanentemente.", { ids });
    throw new Error(
      `Nenhum anúncio foi excluído permanentemente. IDs: ${JSON.stringify(ids)}`
    );
  }
}

/* ─────────────────────────────────────────────
 * RESTORE — tira da lixeira (deleted_at = null)
 * Usado quando o registro está na lixeira e o
 * usuário quer reativá-lo.
 * ───────────────────────────────────────────── */
async function restoreByIds(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const { data, error } = await withRetry(() =>
    supabase
      .schema("newsystem")
      .from("announce")
      .update({ deleted_at: null })
      .in("id", ids)
      .not("deleted_at", "is", null)
      .select("id")
  );

  if (error) throw error;

  if (!data || data.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[restoreByIds] Nenhuma linha restaurada.", { ids });
    throw new Error(
      `Nenhum anúncio foi restaurado. IDs: ${JSON.stringify(ids)}`
    );
  }
}

/* ─────────────────────────────────────────────
 * LOCKS
 * ───────────────────────────────────────────── */

const savingLocks = new Set<string>();
const deletingLocks = new Set<string>();

/* ─────────────────────────────────────────────
 * DEFAULTS DE PAGINAÇÃO
 * ───────────────────────────────────────────── */

const DEFAULT_PAGE_SIZE = 50;

/* ─────────────────────────────────────────────
 * QUERY BUILDER COMPARTILHADO
 * ───────────────────────────────────────────── */

type SharedFilterArgs = {
  situacao: AnnounceSituacaoFilter;
  store: string | null;
  search: string | null;
  type: Exclude<AnnounceTypeFilter, "Todos" | "Produtos" | "Variações">;
  marks: string[];
};

function applySharedFilters(query: any, args: SharedFilterArgs) {
  const { situacao, store, search, type, marks } = args;

  if (situacao === "Ativos") {
    query = query.is("deleted_at", null).eq("active", true);
  } else if (situacao === "Inativos") {
    query = query.is("deleted_at", null).eq("active", false);
  } else if (situacao === "Excluídos") {
    query = query.not("deleted_at", "is", null);
  } else if (situacao === "Últimos incluídos") {
    // FIX: sem cutoff de tempo — traz sempre os mais recentes
    // (ordenação por created_at desc é aplicada no fetchAll).
    // Antes havia um "gte(created_at, cutoff de 48h)" que zerava
    // a lista quando não havia inclusões dentro dessa janela.
    query = query.is("deleted_at", null);
  }

  if (store && store !== "Todos") {
    const storeName = anyToStoreName(store) ?? store;
    query = query.eq("store", storeName);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `product.ilike.${term},reference.ilike.${term},id_bling.ilike.${term}`
    );
  }

  if (type === "products") {
    query = query.not("reference", "ilike", "VAR%");
  } else if (type === "variations") {
    query = query.ilike("reference", "VAR%");
  }

  if (marks.length > 0) {
    query = query.in("mark", marks);
  }

  return query;
}

/* ─────────────────────────────────────────────
 * MARCAS DISTINTAS (para o dropdown de filtro)
 * ───────────────────────────────────────────── */

export async function fetchDistinctBrands(): Promise<string[]> {
  const { data, error } = await withRetry(() =>
    supabase
      .schema("newsystem")
      .from("announce")
      .select("mark")
      .is("deleted_at", null)
      .not("mark", "is", null)
  );

  if (error) throw error;

  const set = new Set<string>();
  (data ?? []).forEach((row: any) => {
    if (row.mark) set.add(row.mark);
  });

  return Array.from(set).sort();
}

/* ─────────────────────────────────────────────
 * HOOK
 * ───────────────────────────────────────────── */

export function useAnnounce(filters?: UseAnnounceFilters) {
  const router = useRouter();

  const [rawAnnounces, setRawAnnounces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savingRef = useRef(false);

  const requestIdRef = useRef(0);

  const situacao = filters?.situacao ?? "Ativos";

  // ── FIX: quando o filtro for "Últimos incluídos", força
  // ordenação por created_at desc (mais recentes primeiro),
  // independentemente do que vier em filters.sortBy/sortDir.
  // Para os demais filtros, mantém o padrão code_id asc.
  const isUltimosIncluidos = situacao === "Últimos incluídos";

  const sortBy: AnnounceSortField = isUltimosIncluidos
    ? "created_at"
    : filters?.sortBy ?? "code_id";

  const sortDir: AnnounceSortDir = isUltimosIncluidos
    ? "desc"
    : filters?.sortDir ?? "asc";

  const store = filters?.store ?? null;
  const search = filters?.search ?? null;
  const type = normalizeTypeFilter(filters?.type);
  const marks = filters?.marks ?? [];
  const marksKey = marks.slice().sort().join("|");

  /* ── PAGINAÇÃO (controlada pelo hook, server-side) ──────── */
  const [page, setPage] = useState(filters?.page ?? 0);
  const [pageSize, setPageSize] = useState(filters?.pageSize ?? DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [store, search, situacao, sortBy, sortDir, type, marksKey]);

  /* ── LISTAGEM (server-side: filtro + paginação no banco) ──── */
  const fetchAll = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .schema("newsystem")
        .from("announce")
        .select(
          "id, code_id, store, id_bling, reference, product, mark, active, deleted_at, created_at, updated_at",
          { count: "exact" }
        )
        .order(sortBy, { ascending: sortDir === "asc" })
        .range(from, to);

      query = applySharedFilters(query, { situacao, store, search, type, marks });

      const { data, error, count } = await withRetry(() => query);

      if (error) throw error;

      if (myRequestId !== requestIdRef.current) return;

      setRawAnnounces(data ?? []);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      if (myRequestId !== requestIdRef.current) return;
      logError("fetchAll", err);
      setError(mapErrorMessage(err));
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, search, situacao, sortBy, sortDir, type, marksKey, page, pageSize]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── ENRIQUECIMENTO (code_id vem direto do banco) ── */
  const announces: AnnounceRow[] = useMemo(() => {
    return rawAnnounces.map((item: any) => {
      const id = String(item.id);
      const isVariation = isVariationReference(item.reference);

      return {
        ...item,
        id,
        code_id: String(item.code_id ?? ""),
        ativo: Boolean(item.active),
        is_variation: isVariation,
      };
    });
  }, [rawAnnounces]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── SELECIONAR TODOS OS REGISTROS QUE CASAM COM O FILTRO ───── */
  const fetchAllMatchingIds = useCallback(async (): Promise<
    { id: string; deleted_at: string | null }[]
  > => {
    let query = supabase.schema("newsystem").from("announce").select("id, deleted_at");

    query = applySharedFilters(query, { situacao, store, search, type, marks });

    const { data, error } = await withRetry(() => query);
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      deleted_at: r.deleted_at ?? null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, search, situacao, type, marksKey]);

  /* ── ACTIONS: SAVE ─────────────────────────── */

  const handleSave = useCallback(
    async (produto: ProdutoInput, onAfterSave?: () => void) => {
      const storeVal = anyToStoreName(produto?.store ?? produto?.loja ?? produto?.Loja);

      if (!storeVal) {
        toast.error("Selecione uma loja válida antes de salvar.");
        return;
      }

      const reference = normalizeRequired(
        getField(produto, "reference", "referencia", "Referência", "Referencia", "sku")
      );

      if (!reference) {
        toast.error("Informe uma referência válida para o anúncio.");
        return;
      }

      const lockKey = `${storeVal}:${reference}`;

      if (savingLocks.has(lockKey) || savingRef.current) return;

      savingLocks.add(lockKey);
      savingRef.current = true;
      setSaving(true);

      const idBling = normalizeIdBling(
        getField(produto, "id_bling", "ID Bling", "idBling", "ID_Bling")
      );

      const product = normalizeRequired(getField(produto, "product", "nome", "Nome"));
      const mark = normalizeNullable(getField(produto, "mark", "marca", "Marca"));
      const ativoRaw = getField(produto, "ativo");
      const ativo = ativoRaw === "" ? true : Boolean(ativoRaw);

      if (!product) {
        toast.error("Informe o nome do produto para salvar o anúncio.");
        savingLocks.delete(lockKey);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      const isUpdate = Boolean(produto?.id);
      let idFinal = "";

      try {
        const { data, error } = await withRetry(() =>
          supabase.schema("newsystem").rpc("upsert_announce", {
            p_id: produto?.id ?? null,
            p_store: storeVal,
            p_id_bling: idBling,
            p_reference: reference,
            p_product: product,
            p_mark: mark,
            p_ativo: ativo,
          })
        );

        if (error) throw error;

        idFinal = String(data ?? "");

        toast.success(isUpdate ? "Anúncio atualizado." : "Anúncio criado.");

        if (onAfterSave) onAfterSave();
        else await fetchAll();
      } catch (err: any) {
        logError("handleSave", err, { store: storeVal, reference });
        toast.error("Erro ao salvar anúncio: " + mapErrorMessage(err));
        return;
      } finally {
        savingLocks.delete(lockKey);
        savingRef.current = false;
        setSaving(false);
      }

      // Notificação em background — não bloqueia a UI
      safeNotify("handleSave", {
        title: isUpdate ? "Anúncio atualizado" : "Anúncio criado",
        message: `O anúncio "${getProdutoLabel(produto, idFinal)}" foi ${isUpdate ? "atualizado" : "criado"}.`,
        action: isUpdate ? "update" : "create",
        entityType: "announcement",
        entityId: idFinal,
        link: buildAnnouncementLink(idFinal, storeVal),
      });
    },
    [fetchAll]
  );

  /* ── ACTIONS: DELETE (único) ─────────────────
   * Se já está na lixeira -> hard delete (via RPC, 1 round-trip).
   * Se está ativo -> soft delete.
   * Update otimista: remove do estado local na hora,
   * sem refazer a query paginada inteira.
   * ───────────────────────────────────────────── */

  const handleDelete = useCallback(
    async (produto: ProdutoInput, onAfterDelete?: () => void) => {
      const idProduto = String(produto?.id ?? "").trim();

      if (!idProduto) {
        toast.error("Anúncio inválido para exclusão.");
        return;
      }

      const jaExcluido = Boolean(produto?.deleted_at);

      if (deletingLocks.has(idProduto)) return;
      deletingLocks.add(idProduto);
      setDeleting(true);

      try {
        if (jaExcluido) {
          await hardDeleteByIds([idProduto]);
          toast.success("Anúncio excluído permanentemente.");
        } else {
          await softDeleteByIds([idProduto]);
          toast.success("Anúncio movido para a lixeira.");
        }

        // Update otimista: remove do estado local sem refetch completo
        setRawAnnounces((prev) => prev.filter((r) => String(r.id) !== idProduto));
        setTotalCount((prev) => Math.max(0, prev - 1));

        if (onAfterDelete) onAfterDelete();
      } catch (err: any) {
        logError("handleDelete", err, { idProduto, jaExcluido });
        toast.error("Erro ao excluir anúncio: " + mapErrorMessage(err));
        return;
      } finally {
        deletingLocks.delete(idProduto);
        setDeleting(false);
      }

      // Notificação em background — não bloqueia a UI
      safeNotify("handleDelete", {
        title: jaExcluido ? "Anúncio excluído permanentemente" : "Anúncio movido para a lixeira",
        message: `O anúncio "${getProdutoLabel(produto, idProduto)}" foi ${
          jaExcluido ? "excluído permanentemente" : "movido para a lixeira"
        }.`,
        action: "delete",
        entityType: "announcement",
        entityId: idProduto,
        link: "/dashboard/anuncios",
      });
    },
    []
  );

  /* ── ACTIONS: DELETE (lote) ──────────────────
   * Separa a seleção em dois grupos:
   *   - ativos      -> soft delete
   *   - já excluídos -> hard delete (via RPC, 1 round-trip cada grupo)
   * Update otimista: remove todos os IDs processados do estado local.
   * ───────────────────────────────────────────── */

  const handleDeleteSelected = useCallback(
    async (selectedRows: ProdutoInput[], onAfterDelete?: () => void) => {
      if (!selectedRows?.length) {
        toast.error("Nenhum anúncio selecionado para exclusão.");
        return;
      }

      const snapshot = [...selectedRows];

      const idsAtivos = snapshot
        .filter((r) => !r?.deleted_at)
        .map((r) => String(r?.id ?? "").trim())
        .filter(Boolean);

      const idsExcluidos = snapshot
        .filter((r) => Boolean(r?.deleted_at))
        .map((r) => String(r?.id ?? "").trim())
        .filter(Boolean);

      if (!idsAtivos.length && !idsExcluidos.length) {
        toast.error("Nenhum ID válido encontrado na seleção.");
        return;
      }

      const lockKey = [...idsAtivos, ...idsExcluidos].sort().join(",");
      if (deletingLocks.has(lockKey)) return;
      deletingLocks.add(lockKey);
      setDeleting(true);

      try {
        // As duas chamadas são independentes -> podem correr em paralelo
        await Promise.all([
          idsAtivos.length ? softDeleteByIds(idsAtivos) : Promise.resolve(),
          idsExcluidos.length ? hardDeleteByIds(idsExcluidos) : Promise.resolve(),
        ]);

        const totalProcessados = idsAtivos.length + idsExcluidos.length;

        if (idsAtivos.length && idsExcluidos.length) {
          toast.success(
            `${idsAtivos.length} movido(s) para a lixeira e ${idsExcluidos.length} excluído(s) permanentemente.`
          );
        } else if (idsExcluidos.length) {
          toast.success(
            totalProcessados === 1
              ? "Anúncio excluído permanentemente."
              : `${totalProcessados} anúncios excluídos permanentemente.`
          );
        } else {
          toast.success(
            totalProcessados === 1
              ? "Anúncio movido para a lixeira."
              : `${totalProcessados} anúncios movidos para a lixeira.`
          );
        }

        // Update otimista: remove todos os IDs processados do estado local
        const processedIds = new Set([...idsAtivos, ...idsExcluidos]);
        setRawAnnounces((prev) => prev.filter((r) => !processedIds.has(String(r.id))));
        setTotalCount((prev) => Math.max(0, prev - processedIds.size));

        if (onAfterDelete) onAfterDelete();
      } catch (err: any) {
        logError("handleDeleteSelected", err, { idsAtivos, idsExcluidos });
        toast.error("Erro ao excluir anúncios: " + mapErrorMessage(err));
        return;
      } finally {
        deletingLocks.delete(lockKey);
        setDeleting(false);
      }

      const labels = snapshot
        .slice(0, 3)
        .map((row) => `"${getProdutoLabel(row, row?.id ?? "anúncio")}"`);

      const message =
        snapshot.length === 1
          ? `O anúncio ${labels[0]} foi processado.`
          : snapshot.length <= 3
          ? `Os anúncios ${labels.join(", ")} foram processados.`
          : `Os anúncios ${labels.join(", ")} e mais ${snapshot.length - 3} foram processados.`;

      // Notificação em background — não bloqueia a UI
      safeNotify("handleDeleteSelected", {
        title: snapshot.length === 1 ? "Anúncio excluído" : "Anúncios excluídos",
        message,
        action: "delete",
        entityType: "announcement",
        entityId: idsAtivos[0] ?? idsExcluidos[0],
        link: "/dashboard/anuncios",
      });
    },
    []
  );

  /* ── ACTIONS: RESTORE (lote) ─────────────────
   * Só faz sentido para itens já excluídos
   * (deleted_at != null). Update otimista: remove
   * do estado local (já que deixa de pertencer ao
   * filtro "Excluídos" ao ser restaurado).
   * ───────────────────────────────────────────── */

  const handleRestoreSelected = useCallback(
    async (selectedRows: ProdutoInput[], onAfterRestore?: () => void) => {
      if (!selectedRows?.length) {
        toast.error("Nenhum anúncio selecionado para restaurar.");
        return;
      }

      const snapshot = [...selectedRows];

      const ids = snapshot
        .filter((r) => Boolean(r?.deleted_at))
        .map((r) => String(r?.id ?? "").trim())
        .filter(Boolean);

      if (!ids.length) {
        toast.error("Nenhum item excluído encontrado na seleção.");
        return;
      }

      const lockKey = `restore:${ids.sort().join(",")}`;
      if (deletingLocks.has(lockKey)) return;
      deletingLocks.add(lockKey);
      setDeleting(true);

      try {
        await restoreByIds(ids);

        toast.success(
          ids.length === 1
            ? "Anúncio restaurado."
            : `${ids.length} anúncios restaurados.`
        );

        // Update otimista: remove do estado local (deixou de pertencer
        // ao filtro atual, que é "Excluídos")
        const processedIds = new Set(ids);
        setRawAnnounces((prev) => prev.filter((r) => !processedIds.has(String(r.id))));
        setTotalCount((prev) => Math.max(0, prev - processedIds.size));

        if (onAfterRestore) onAfterRestore();
      } catch (err: any) {
        logError("handleRestoreSelected", err, { ids });
        toast.error("Erro ao restaurar anúncios: " + mapErrorMessage(err));
        return;
      } finally {
        deletingLocks.delete(lockKey);
        setDeleting(false);
      }

      const labels = snapshot
        .slice(0, 3)
        .map((row) => `"${getProdutoLabel(row, row?.id ?? "anúncio")}"`);

      const message =
        snapshot.length === 1
          ? `O anúncio ${labels[0]} foi restaurado.`
          : snapshot.length <= 3
          ? `Os anúncios ${labels.join(", ")} foram restaurados.`
          : `Os anúncios ${labels.join(", ")} e mais ${snapshot.length - 3} foram restaurados.`;

      // Notificação em background — não bloqueia a UI
      safeNotify("handleRestoreSelected", {
        title: snapshot.length === 1 ? "Anúncio restaurado" : "Anúncios restaurados",
        message,
        action: "update",
        entityType: "announcement",
        entityId: ids[0],
        link: "/dashboard/anuncios",
      });
    },
    []
  );

  return {
    announces,
    loading,
    error,
    refetch: fetchAll,

    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,

    fetchAllMatchingIds,

    saving,
    deleting,
    handleSave,
    handleDelete,
    handleDeleteSelected,
    handleRestoreSelected,
  };
}
