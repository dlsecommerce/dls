// hooks/usebrandpricingoverrides.ts
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { resolveRulesBatch } from "@/components/costs/hooks/usepricingrules";

export type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
  embalagem?: string;
};

type CalculoSetter = React.Dispatch<React.SetStateAction<Calculo>>;

// Imposto SAIU deste hook: é constante fixa por empresa (10%/14%),
// controlada em PriceCalculationSection.tsx via manualFlags.imposto.
// Nunca vem de pricing_rules.
type BrandRuleField = "marketing" | "margem" | "desconto";

// Nomes em PT (front) — resolveRulesBatch já faz o mapeamento pra EN (banco).
const RULE_TYPES: Record<BrandRuleField, string> = {
  marketing: "marketing",
  margem: "margem_minima",
  desconto: "desconto",
};

export type BrandOverrideFlags = {
  marketing: boolean;
  margem: boolean;
  desconto: boolean;
};

export type BrandOverrideDefaults = Partial<Record<BrandRuleField, string>>;

type BrandRulesResult = {
  marketing: any | null;
  margem: any | null;
  desconto: any | null;
};

/**
 * ---------------------------------------------------------------------------
 * CACHE COMPARTILHADO ENTRE TODAS AS INSTÂNCIAS DO HOOK (todos os canais).
 * ---------------------------------------------------------------------------
 * - Cache em memória por marca (evita N canais * 1 requisição batch).
 * - TTL de 5 minutos: evita servir dado stale por tempo indefinido sem
 *   precisar de invalidação manual espalhada pelo código.
 * - Persistência em sessionStorage: sobrevive a navegação entre páginas
 *   (não sobrevive a fechar a aba, por design — dado de pricing não deve
 *   ficar "eterno" no disco do usuário).
 * - Limite de tamanho (LRU simples): evita crescimento de memória
 *   indefinido se o catálogo de marcas for grande.
 * ---------------------------------------------------------------------------
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_SIZE = 50;
const STORAGE_KEY = "brandRulesCache:v1";

type CacheEntry = { promise: Promise<BrandRulesResult>; timestamp: number };

const brandRulesCache = new Map<string, CacheEntry>();
const brandRulesSubscribers = new Map<string, Set<(result: BrandRulesResult) => void>>();

/** Hidrata o cache em memória a partir do sessionStorage (uma vez, no load do módulo). */
function hydrateFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: Record<string, { data: BrandRulesResult; timestamp: number }> = JSON.parse(raw);
    const now = Date.now();
    Object.entries(parsed).forEach(([marca, entry]) => {
      if (now - entry.timestamp < CACHE_TTL_MS) {
        brandRulesCache.set(marca, {
          promise: Promise.resolve(entry.data),
          timestamp: entry.timestamp,
        });
      }
    });
  } catch {
    // sessionStorage indisponível ou corrompido — ignora, segue sem cache persistido
  }
}

/** Persiste o cache resolvido no sessionStorage (best-effort, silenciosamente ignora erros). */
function persistToStorage(marca: string, data: BrandRulesResult, timestamp: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[marca] = { data, timestamp };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // quota excedida ou storage bloqueado — não é crítico, apenas perde a persistência
  }
}

function evictOldestIfNeeded() {
  if (brandRulesCache.size <= MAX_CACHE_SIZE) return;
  const oldestKey = brandRulesCache.keys().next().value;
  if (oldestKey) brandRulesCache.delete(oldestKey);
}

hydrateFromStorage();

/**
 * Busca (ou reaproveita do cache) as regras de uma marca.
 * Exportado para permitir PREFETCH externo (ex: no onMouseEnter/onFocus
 * de um item de produto na listagem, antes do usuário abrir o modal).
 *
 * Usa resolveRulesBatch — 1 única query no banco para marketing + margem +
 * desconto, em vez de 3 chamadas separadas (resolveRule).
 */
export function fetchBrandRules(marca: string): Promise<BrandRulesResult> {
  const cached = brandRulesCache.get(marca);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.promise;
  }

  const timestamp = Date.now();
  const promise = resolveRulesBatch({
    brand: marca,
    rule_types: [RULE_TYPES.marketing, RULE_TYPES.margem, RULE_TYPES.desconto],
  }).then((resolved) => {
    const result: BrandRulesResult = {
      marketing: resolved[RULE_TYPES.marketing] ?? null,
      margem: resolved[RULE_TYPES.margem] ?? null,
      desconto: resolved[RULE_TYPES.desconto] ?? null,
    };
    brandRulesSubscribers.get(marca)?.forEach((cb) => cb(result));
    persistToStorage(marca, result, timestamp);
    return result;
  });

  brandRulesCache.set(marca, { promise, timestamp });
  evictOldestIfNeeded();
  return promise;
}

/** Permite invalidar o cache manualmente (ex: se uma regra de marca for editada em outra tela). */
export function invalidateBrandRulesCache(marca?: string) {
  if (marca) {
    brandRulesCache.delete(marca);
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed[marca];
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {}
    }
  } else {
    brandRulesCache.clear();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }
}

/**
 * Hook por canal: busca regras de `newsystem.pricing_rules` (scope="brand")
 * assim que `produtoMarca` muda e aplica automaticamente marketing/margem/
 * desconto sobre o `calculo` do canal — SEMPRE respeitando edição manual do
 * usuário (flags internas, mesmo padrão de comissão/frete já usado nos
 * canais Shopee/TikTok/Magalu/ML).
 *
 * Imposto NÃO passa por aqui: é constante fixa por empresa (10% Sóbaquetas /
 * 14% Pikot Shop), controlada fora deste hook.
 *
 * Uso: uma chamada por canal, dentro do componente pai (PricingCalculatorModern).
 * Todas as instâncias compartilham o mesmo cache de regras por marca —
 * apenas 1 requisição real (batch) é feita por marca, mesmo com N canais.
 */
export function usebrandpricingoverrides(
  produtoMarca: string,
  setCalculo: CalculoSetter,
  defaults: BrandOverrideDefaults = {}
) {
  const resolvedDefaults = useMemo<Record<BrandRuleField, string>>(
    () => ({
      marketing: defaults.marketing ?? "3",
      margem: defaults.margem ?? "15",
      desconto: defaults.desconto ?? "0",
    }),
    [defaults.marketing, defaults.margem, defaults.desconto]
  );

  const [flags, setFlags] = useState<BrandOverrideFlags>({
    marketing: false,
    margem: false,
    desconto: false,
  });

  const [brandRules, setBrandRules] = useState<BrandRulesResult>({
    marketing: null,
    margem: null,
    desconto: null,
  });

  const lastMarcaRef = useRef<string>("__init__");

  // Busca (ou reaproveita do cache) as regras de pricing_rules assim que a marca muda.
  useEffect(() => {
    if (produtoMarca === lastMarcaRef.current) return;
    lastMarcaRef.current = produtoMarca;

    if (!produtoMarca) {
      setBrandRules({ marketing: null, margem: null, desconto: null });
      return;
    }

    let active = true;

    // Inscreve esta instância para receber o resultado quando (ou se) o fetch
    // ainda estiver em voo — cobre o caso de vários canais montando ao mesmo
    // tempo e todos pedindo a mesma marca no mesmo instante.
    const onResolved = (result: BrandRulesResult) => {
      if (active) setBrandRules(result);
    };

    if (!brandRulesSubscribers.has(produtoMarca)) {
      brandRulesSubscribers.set(produtoMarca, new Set());
    }
    brandRulesSubscribers.get(produtoMarca)!.add(onResolved);

    fetchBrandRules(produtoMarca)
      .then((result) => {
        if (active) setBrandRules(result);
      })
      .catch(() => {
        // Falha ao buscar pricing_rules por marca: mantém estado anterior,
        // sem quebrar a calculadora. Remove do cache pra permitir retry.
        brandRulesCache.delete(produtoMarca);
      });

    return () => {
      active = false;
      const set = brandRulesSubscribers.get(produtoMarca);
      set?.delete(onResolved);
      if (set && set.size === 0) brandRulesSubscribers.delete(produtoMarca);
    };
  }, [produtoMarca]);

  // Aplica as regras resolvidas ao `calculo` do canal, respeitando flags manuais.
  useEffect(() => {
    setCalculo((prev) => {
      const next: Calculo = {
        ...prev,
        marketing: flags.marketing
          ? prev.marketing
          : brandRules.marketing
            ? String(brandRules.marketing.rate)
            : resolvedDefaults.marketing,
        margem: flags.margem
          ? prev.margem
          : brandRules.margem
            ? String(brandRules.margem.rate)
            : resolvedDefaults.margem,
        desconto: flags.desconto
          ? prev.desconto
          : brandRules.desconto
            ? String(brandRules.desconto.rate)
            : resolvedDefaults.desconto,
      };

      const semAlteracoes =
        next.marketing === prev.marketing &&
        next.margem === prev.margem &&
        next.desconto === prev.desconto;

      return semAlteracoes ? prev : next;
    });
    // setCalculo é estável (setState do React) — não entra nas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandRules, flags, resolvedDefaults]);

  const setEdited = useCallback((field: BrandRuleField, value: boolean) => {
    setFlags((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  const resetFlags = useCallback(() => {
    setFlags({ marketing: false, margem: false, desconto: false });
  }, []);

  // Memoiza o objeto de retorno: evita identidade nova a cada render.
  // Isso é crítico porque `useChannelPricing.ts` monta um objeto
  // `brandOverrides` com o retorno deste hook para cada canal — sem esta
  // memoização, `brandOverrides` (e tudo que dele depende, como
  // `resetManualState`) muda de referência em TODO render, mesmo sem
  // nenhum dado real ter mudado.
  return useMemo(
    () => ({
      brandRules, // regras cruas resolvidas (para exibir badge "regra de marca aplicada")
      flags, // quais campos estão travados por edição manual
      setEdited, // chamar no onChange/onBlur do campo (ex: setEdited("desconto", true))
      resetFlags, // chamar ao limpar composição/trocar produto
    }),
    [brandRules, flags, setEdited, resetFlags]
  );
}
