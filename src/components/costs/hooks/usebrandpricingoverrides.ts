// hooks/usebrandpricingoverrides.ts

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { resolveRule } from "@/components/costs/hooks/usepricingrules";

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

const RULE_TYPE_MAP: Record<BrandRuleField, string> = {
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
 */
export function usebrandpricingoverrides(
  produtoMarca: string,
  setCalculo: CalculoSetter,
  defaults: BrandOverrideDefaults = {}
) {
  const resolvedDefaults: Record<BrandRuleField, string> = {
    marketing: defaults.marketing ?? "3",
    margem: defaults.margem ?? "15",
    desconto: defaults.desconto ?? "0",
  };

  const [flags, setFlags] = useState<BrandOverrideFlags>({
    marketing: false,
    margem: false,
    desconto: false,
  });

  const [brandRules, setBrandRules] = useState<{
    marketing: any | null;
    margem: any | null;
    desconto: any | null;
  }>({
    marketing: null,
    margem: null,
    desconto: null,
  });

  const lastMarcaRef = useRef<string>("__init__");

  // Busca as regras de pricing_rules (scope='brand') assim que a marca muda.
  useEffect(() => {
    if (produtoMarca === lastMarcaRef.current) return;
    lastMarcaRef.current = produtoMarca;

    if (!produtoMarca) {
      setBrandRules({ marketing: null, margem: null, desconto: null });
      return;
    }

    let active = true;

    Promise.all([
      resolveRule({ rule_type: RULE_TYPE_MAP.marketing, brand: produtoMarca }),
      resolveRule({ rule_type: RULE_TYPE_MAP.margem, brand: produtoMarca }),
      resolveRule({ rule_type: RULE_TYPE_MAP.desconto, brand: produtoMarca }),
    ])
      .then(([marketing, margem, desconto]) => {
        if (!active) return;
        setBrandRules({ marketing, margem, desconto });
      })
      .catch(() => {
        // Falha ao buscar pricing_rules por marca: mantém estado anterior,
        // sem quebrar a calculadora.
      });

    return () => {
      active = false;
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
  }, [brandRules, flags, resolvedDefaults.marketing, resolvedDefaults.margem, resolvedDefaults.desconto]);

  const setEdited = useCallback((field: BrandRuleField, value: boolean) => {
    setFlags((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  const resetFlags = useCallback(() => {
    setFlags({ marketing: false, margem: false, desconto: false });
  }, []);

  return {
    brandRules, // regras cruas resolvidas (para exibir badge "regra de marca aplicada")
    flags, // quais campos estão travados por edição manual
    setEdited, // chamar no onChange/onBlur do campo (ex: setEdited("desconto", true))
    resetFlags, // chamar ao limpar composição/trocar produto
  };
}
