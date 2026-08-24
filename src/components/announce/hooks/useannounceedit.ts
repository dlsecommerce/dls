"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StoreName = "Pikot Shop" | "Sóbaquetas";

export interface Announce {
  id: string;
  code_id?: number | null;
  store: StoreName | string;
  id_bling: string | null;
  reference: string | null;
  product: string | null;
  mark: string | null;
  active?: boolean;
  deleted_at?: string | null;
  created_at?: string | null;

  total_variacoes?: number;
  variacoes?: any[];

  [key: string]: any;
}

export interface ComposicaoItem {
  uid?: string;
  codigo: string;
  produto?: string;
  descricao?: string;
  custo: number;
  quantidade: string;
}

// =========================
// helpers de número BR
// =========================
export const parseValorBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let str = String(v).trim();
  str = str.replace(/[^\d.,-]/g, "");

  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");

  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
};

export const formatValorBR = (v: number | string): string => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0,00";

  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ===========================================================
// ✅ NORMALIZAÇÃO DE LOJA (sigla <-> nome completo)
// ===========================================================
export function lojaNomeToCodigo(value: string | null | undefined): "PK" | "SB" | null {
  if (!value) return null;

  const norm = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (norm === "pk" || norm.includes("pikot")) return "PK";
  if (norm === "sb" || norm.includes("sobaquetas")) return "SB";

  return null;
}

export function lojaCodigoToNome(codigo: "PK" | "SB" | null | undefined): StoreName | null {
  if (codigo === "PK") return "Pikot Shop";
  if (codigo === "SB") return "Sóbaquetas";
  return null;
}

/**
 * ✅ Aceita sigla ("PK"/"SB") ou nome completo e sempre
 * retorna o nome completo, que é o formato salvo na coluna `store`.
 */
export function toStoreName(value: string | null | undefined): StoreName | null {
  if (!value) return null;

  const v = String(value).trim();

  if (v === "Pikot Shop" || v === "Sóbaquetas") return v as StoreName;

  const codigo = lojaNomeToCodigo(v);
  return lojaCodigoToNome(codigo);
}

// ===========================================================
// Regras de PAI/VAR baseadas na reference
// (ex: PAI-MARCA-CODIGO / VAR-MARCA-CODIGO)
// ===========================================================
const normalizarReferencia = (value: any) => {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .trim()
    .toUpperCase();
};

export const isProdutoPai = (reference?: string | null): boolean => {
  return normalizarReferencia(reference).startsWith("PAI-");
};

export const isProdutoVariacao = (reference?: string | null): boolean => {
  return normalizarReferencia(reference).startsWith("VAR-");
};

const parseReferencia = (referenciaRaw: any) => {
  const ref = normalizarReferencia(referenciaRaw);

  if (!ref.startsWith("PAI-") && !ref.startsWith("VAR-")) return null;

  const tipo = ref.startsWith("PAI-") ? "PAI" : "VAR";
  const semPrefixo = ref.slice(4);
  const partes = semPrefixo.split("-").filter(Boolean);

  if (partes.length < 2) return null;

  const marca = partes[0];
  const codigo = partes.slice(1).join("-");

  if (!marca || !codigo) return null;

  return { ref, tipo, marca, codigo };
};

const variacaoPertenceAoPai = (
  parsedPai: { marca: string; tipo: string } | null,
  referenciaVarRaw: any
) => {
  if (!parsedPai) return false;
  const variacao = parseReferencia(referenciaVarRaw);
  if (!variacao) return false;
  if (parsedPai.tipo !== "PAI" || variacao.tipo !== "VAR") return false;
  return parsedPai.marca === variacao.marca;
};

// ===========================================================
// Montagem do objeto Announce a partir da row do banco
// ===========================================================
const montarAnuncioFromRow = (row: any): Announce => {
  return {
    id: String(row?.id ?? "").trim(),
    code_id: row?.code_id ?? null,
    store: row?.store ?? null,
    id_bling: row?.id_bling ?? null,
    reference: row?.reference ?? null,
    product: row?.product ?? null,
    mark: row?.mark ?? null,
    active: row?.active ?? true,
    deleted_at: row?.deleted_at ?? null,
    created_at: row?.created_at ?? null,

    // aliases usados na UI existente
    loja: row?.store ?? null,
    Loja: row?.store ?? null,
    nome: row?.product ?? null,
    Nome: row?.product ?? null,
    marca: row?.mark ?? null,
    Marca: row?.mark ?? null,
    referencia: row?.reference ?? null,
    Referencia: row?.reference ?? null,
    "Referência": row?.reference ?? null,
    sku: row?.reference ?? null,

    ativo: row?.active ?? true,

    total_variacoes: 0,
    variacoes: [],
  };
};

// ===========================================================
// Calcula o custo total de uma composição
// ===========================================================
export const calcCustoTotal = (composicao: ComposicaoItem[]) => {
  return (Array.isArray(composicao) ? composicao : []).reduce((total, item) => {
    const quantidade = parseValorBR(item?.quantidade);
    const custo = Number(item?.custo) || 0;
    return total + quantidade * custo;
  }, 0);
};

// ===========================================================
// Buscar variações do pai (via reference — sem FK física)
// ===========================================================
async function fetchVariacoesDoPai(
  store: string,
  referenciaPai?: string | null,
  signal?: AbortSignal
): Promise<Announce[]> {
  if (!isProdutoPai(referenciaPai)) return [];

  const parsedPai = parseReferencia(referenciaPai);
  if (!parsedPai) return [];

  let query = supabase
    .schema("newsystem")
    .from("announce")
    .select("id, code_id, store, id_bling, reference, product, mark, active, deleted_at, created_at")
    .eq("store", store)
    .ilike("reference", `VAR-${parsedPai.marca}-%`)
    .is("deleted_at", null);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;

  if (error) {
    if (error.name !== "AbortError") console.error("Erro ao buscar variações do anúncio:", error);
    return [];
  }

  return (Array.isArray(data) ? data : [])
    .filter((row: any) => variacaoPertenceAoPai(parsedPai, row?.reference))
    .map((row: any) => montarAnuncioFromRow(row));
}

// ===========================================================
// Buscar composição via RPC
// ===========================================================
async function fetchComposicao(announceId: string): Promise<ComposicaoItem[]> {
  const { data, error } = await supabase
    .schema("newsystem")
    .rpc("get_announce_composition", { p_announce_id: announceId });

  if (error) {
    console.error("Erro ao carregar composição:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    uid: r.uid,
    codigo: r.code,
    produto: r.product,
    descricao: r.product,
    custo: Number(r.current_cost) || 0,
    quantidade: r.amount != null ? String(r.amount) : "1",
  }));
}

// ===========================================================
// Cache em memória (stale-while-revalidate) — dura a sessão da aba
// Inclui deduplicação de requests concorrentes por id
// ===========================================================
type CacheEntry = {
  produto: Announce;
  variacoes: Announce[];
  composicao: ComposicaoItem[];
  timestamp: number;
};

const announceCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<CacheEntry | null>>();
const CACHE_TTL_MS = 60_000; // 60s

/**
 * Busca completa (announce + variações + composição) com dedupe de
 * requisições concorrentes para o mesmo id.
 */
async function fetchAnuncioCompleto(
  idLimpo: string,
  signal?: AbortSignal
): Promise<CacheEntry | null> {
  if (inflightRequests.has(idLimpo)) {
    return inflightRequests.get(idLimpo)!;
  }

  const promise = (async (): Promise<CacheEntry | null> => {
    let query = supabase
      .schema("newsystem")
      .from("announce")
      .select("id, code_id, store, id_bling, reference, product, mark, active, deleted_at, created_at")
      .eq("id", idLimpo);

    if (signal) query = query.abortSignal(signal);

    const { data: row, error } = await query.maybeSingle();

    if (error) {
      if (error.name !== "AbortError") console.error("Erro ao buscar anúncio:", error);
      return null;
    }

    if (!row) {
      console.warn("Nenhum anúncio encontrado para ID:", idLimpo);
      return null;
    }

    const produtoBase = montarAnuncioFromRow(row);

    const [listaVariacoes, compMapeada] = await Promise.all([
      fetchVariacoesDoPai(row.store, row.reference, signal),
      fetchComposicao(idLimpo),
    ]);

    const produtoFinal: Announce = {
      ...produtoBase,
      total_variacoes: listaVariacoes.length,
      variacoes: listaVariacoes,
      tipo_anuncio: listaVariacoes.length > 0 ? "variacoes" : produtoBase?.tipo_anuncio,
    };

    const entry: CacheEntry = {
      produto: produtoFinal,
      variacoes: listaVariacoes,
      composicao: compMapeada,
      timestamp: Date.now(),
    };

    announceCache.set(idLimpo, entry);
    return entry;
  })();

  inflightRequests.set(idLimpo, promise);

  try {
    return await promise;
  } finally {
    inflightRequests.delete(idLimpo);
  }
}

/**
 * ✅ Prefetch — chame no onMouseEnter/onFocus de um item da lista.
 * Não atualiza nenhum estado de componente, só popula o cache.
 * Quando o usuário efetivamente abrir o anúncio, `carregarAnuncio`
 * vai encontrar os dados já prontos e exibir instantaneamente.
 */
export async function prefetchAnuncio(id: string) {
  const idLimpo = String(id).trim();
  if (!idLimpo) return;

  const cached = announceCache.get(idLimpo);
  const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;
  if (isFresh) return; // já está fresco, não precisa refazer

  try {
    await fetchAnuncioCompleto(idLimpo);
  } catch {
    // prefetch é best-effort — silencioso em caso de erro
  }
}

/** Invalida o cache de um anúncio específico (chamar após salvar/deletar) */
export function invalidateAnuncioCache(id: string) {
  announceCache.delete(String(id).trim());
}

// ===========================================================
// Hook principal
// ===========================================================
export function useAnnounceEdit(id?: string, lojaParam?: string | null) {
  const [produto, setProduto] = useState<Announce | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [composicao, setComposicao] = useState<ComposicaoItem[]>([]);

  const [variacoes, setVariacoes] = useState<Announce[]>([]);
  const [loadingVariacoes, setLoadingVariacoes] = useState(false);

  const storeInicial = useMemo(() => toStoreName(lojaParam), [lojaParam]);

  const loadingKeyRef = useRef<string>("");
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // snapshot para rollback do optimistic UI
  const preSaveSnapshotRef = useRef<{
    produto: Announce | null;
    composicao: ComposicaoItem[];
  } | null>(null);

  const custoTotal = useMemo(() => calcCustoTotal(composicao), [composicao]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // ---------------------------------------------------------
  // Carregar variações do pai (por reference) — chamada isolada,
  // não usa closures de `produto` para evitar recriações do callback.
  // ---------------------------------------------------------
  const carregarVariacoes = useCallback(
    async (storeParam?: string, referenciaParam?: string | null) => {
      const storeFinal = storeParam ?? storeInicial;
      const referenciaFinal = referenciaParam;

      if (!storeFinal || !isProdutoPai(referenciaFinal)) {
        setVariacoes([]);
        return [];
      }

      setLoadingVariacoes(true);

      try {
        const lista = await fetchVariacoesDoPai(storeFinal, referenciaFinal);

        if (!mountedRef.current) return [];

        setVariacoes(lista);

        setProduto((prev) =>
          prev
            ? {
                ...prev,
                total_variacoes: lista.length,
                variacoes: lista,
                tipo_anuncio: lista.length > 0 ? "variacoes" : prev?.tipo_anuncio,
              }
            : prev
        );

        return lista;
      } finally {
        if (mountedRef.current) setLoadingVariacoes(false);
      }
    },
    [storeInicial]
  );

  // ---------------------------------------------------------
  // Carregar anúncio + composição + variações (cache SWR + dedupe)
  // ---------------------------------------------------------
  const carregarAnuncio = useCallback(async () => {
    if (!id) return;

    const idLimpo = String(id).trim();

    if (loadingKeyRef.current === idLimpo) return;
    loadingKeyRef.current = idLimpo;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cached = announceCache.get(idLimpo);
    const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

    if (cached) {
      setProduto(cached.produto);
      setVariacoes(cached.variacoes);
      setComposicao(cached.composicao);
      setLoading(false);

      if (isFresh) {
        loadingKeyRef.current = "";
        return;
      }
      // cache velho → revalida em silêncio (sem "loading" visível)
    } else {
      setLoading(true);
    }

    try {
      const entry = await fetchAnuncioCompleto(idLimpo, controller.signal);

      if (!mountedRef.current || controller.signal.aborted) return;

      if (!entry) {
        if (!cached) {
          setProduto(null);
          setVariacoes([]);
          setComposicao([]);
        }
        return;
      }

      setProduto(entry.produto);
      setVariacoes(entry.variacoes);
      setComposicao(entry.composicao);
    } finally {
      if (mountedRef.current) setLoading(false);
      loadingKeyRef.current = "";
    }
  }, [id]);

  useEffect(() => {
    if (id) carregarAnuncio();
  }, [id, carregarAnuncio]);

  // ---------------------------------------------------------
  // ✅ Salvar anúncio (pai + variações) via RPC combinada
  // upsert_announce_with_variations — 1 única chamada de rede.
  // Composição continua sendo uma RPC separada (regra própria).
  //
  // ✅ Envia p_id quando o produto já tiver um id (ex.: rascunho
  // criado via create_draft_announce), garantindo UPDATE direto
  // por id no banco em vez de gerar um registro novo por engano.
  // ---------------------------------------------------------
  const salvarAnuncio = useCallback(
    async (produtoAtual: Announce, composicaoAtual: ComposicaoItem[]) => {
      const storeVal = toStoreName(produtoAtual?.store);

      if (!storeVal) {
        console.error("Loja inválida — não é possível salvar.");
        return { success: false, error: "loja inválida" };
      }

      const reference = String(produtoAtual?.reference ?? "").trim();
      const product = String(produtoAtual?.product ?? "").trim();

      if (!reference) {
        return { success: false, error: "referência ausente" };
      }
      if (!product) {
        return { success: false, error: "nome do produto ausente" };
      }

      const idAtual =
        produtoAtual?.id && String(produtoAtual.id).trim() !== ""
          ? String(produtoAtual.id).trim()
          : null;

      // -------------------------------------------------
      // OPTIMISTIC UI — assume sucesso e atualiza a tela já
      // -------------------------------------------------
      preSaveSnapshotRef.current = { produto, composicao };
      setProduto({ ...produtoAtual, active: produtoAtual?.active ?? produtoAtual?.ativo ?? true });
      setComposicao(composicaoAtual);
      setSaving(true);

      try {
        const listaVariacoes = Array.isArray(produtoAtual?.variacoes)
          ? produtoAtual.variacoes
          : [];

        const payloadVariacoes = listaVariacoes
          .filter((v: any) => String(v?.reference ?? "").trim() !== "")
          .map((v: any) => ({
            id_bling: v?.id_bling || null,
            code_id:
              v?.code_id !== null && v?.code_id !== undefined ? String(v.code_id) : null,
            reference: String(v?.reference ?? "").trim(),
            product: String(v?.product ?? "").trim(),
            mark: v?.mark || null,
            ativo: v?.active ?? v?.ativo ?? true,
          }));

        // ✅ 1 única chamada de rede — pai + todas as variações
        const { data, error } = await supabase
          .schema("newsystem")
          .rpc("upsert_announce_with_variations", {
            p_store: storeVal,
            p_id_bling: produtoAtual?.id_bling || null,
            p_code_id:
              produtoAtual?.code_id !== null && produtoAtual?.code_id !== undefined
                ? String(produtoAtual.code_id)
                : null,
            p_reference: reference,
            p_product: product,
            p_mark: produtoAtual?.mark || null,
            p_ativo: produtoAtual?.active ?? produtoAtual?.ativo ?? true,
            p_variacoes: payloadVariacoes.length > 0 ? JSON.stringify(payloadVariacoes) : null,
            p_id: idAtual,
          });

        if (error) {
          console.error("Erro ao salvar anúncio:", error);
          if (preSaveSnapshotRef.current) {
            setProduto(preSaveSnapshotRef.current.produto);
            setComposicao(preSaveSnapshotRef.current.composicao);
          }
          return { success: false, error: error.message };
        }

        const announceId = String(data ?? produtoAtual.id);

        // Composição segue como RPC própria (regra independente do pai)
        if (announceId) {
          const items = (Array.isArray(composicaoAtual) ? composicaoAtual : [])
            .filter((item) => String(item?.codigo || "").trim() !== "")
            .map((item) => ({
              code: String(item.codigo).trim(),
              quantidade: Number(item.quantidade) || 0,
            }));

          const { error: compError } = await supabase
            .schema("newsystem")
            .rpc("save_announce_composition", {
              p_announce_id: announceId,
              p_items: items,
            });

          if (compError) {
            console.error("Erro ao salvar composição:", compError);
            if (preSaveSnapshotRef.current) {
              setProduto(preSaveSnapshotRef.current.produto);
              setComposicao(preSaveSnapshotRef.current.composicao);
            }
            return { success: false, error: compError.message };
          }
        }

        invalidateAnuncioCache(announceId);
        preSaveSnapshotRef.current = null;

        return { success: true, announceId };
      } catch (e: any) {
        if (preSaveSnapshotRef.current) {
          setProduto(preSaveSnapshotRef.current.produto);
          setComposicao(preSaveSnapshotRef.current.composicao);
        }
        return { success: false, error: e?.message ?? "erro inesperado" };
      } finally {
        setSaving(false);
      }
    },
    [produto, composicao]
  );

  // ---------------------------------------------------------
  // 🔧 FALLBACK — salvar uma variação individual isolada
  // (útil fora do fluxo principal, ex: editar só uma variação)
  // ---------------------------------------------------------
  const salvarVariacao = useCallback(async (variacao: Announce) => {
    const storeVal = toStoreName(variacao?.store);

    if (!storeVal) return { success: false, error: "loja inválida" };

    const reference = String(variacao?.reference ?? "").trim();
    const product = String(variacao?.product ?? "").trim();

    if (!reference || !product) {
      return { success: false, error: "campos obrigatórios ausentes" };
    }

    const { data, error } = await supabase.schema("newsystem").rpc("upsert_announce", {
      p_store: storeVal,
      p_id_bling: variacao?.id_bling || null,
      p_code_id:
        variacao?.code_id !== null && variacao?.code_id !== undefined
          ? String(variacao.code_id)
          : null,
      p_reference: reference,
      p_product: product,
      p_mark: variacao?.mark || null,
      p_ativo: variacao?.active ?? true,
    });

    if (error) {
      console.error("Erro ao salvar variação:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: String(data) };
  }, []);

  /**
   * 🔧 FALLBACK — salva um lote de variações em paralelo, fora do
   * fluxo principal (que agora usa a RPC combinada em salvarAnuncio).
   */
  const salvarVariacoesEmLote = useCallback(
    async (variacoesLista: Announce[]) => {
      const resultados = await Promise.all(
        variacoesLista.map((v) => salvarVariacao(v))
      );

      const falhas = resultados.filter((r) => !r.success);
      if (falhas.length > 0) {
        console.error("Falhas ao salvar variações:", falhas);
      }

      return { success: falhas.length === 0, resultados, falhas };
    },
    [salvarVariacao]
  );

  // ---------------------------------------------------------
  // Ativar/desativar (coluna active) — com optimistic UI
  // ---------------------------------------------------------
  const alterarAtivo = useCallback(
    async (announceId: string, ativo: boolean) => {
      const anterior = produto;

      // optimistic
      setProduto((prev) => (prev ? { ...prev, active: ativo, ativo } : prev));

      const { error } = await supabase
        .schema("newsystem")
        .from("announce")
        .update({ active: ativo })
        .eq("id", announceId);

      if (error) {
        console.error("Erro ao alterar status do anúncio:", error);
        setProduto(anterior); // rollback
        return false;
      }

      invalidateAnuncioCache(announceId);
      return true;
    },
    [produto]
  );

  return {
    produto,
    setProduto,

    composicao,
    setComposicao,
    custoTotal,

    loading,
    saving,
    carregarAnuncio,
    salvarAnuncio,
    salvarVariacao,
    salvarVariacoesEmLote,
    alterarAtivo,

    lojaCodigoToNome,
    lojaNomeToCodigo,
    toStoreName,

    variacoes,
    setVariacoes,
    totalVariacoes: variacoes.length,
    loadingVariacoes,
    carregarVariacoes,

    isProdutoPai,
    isProdutoVariacao,
  };
}
