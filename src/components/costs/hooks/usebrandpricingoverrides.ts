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

type BrandRuleField = "imposto" | "marketing" | "margem";

const RULE_TYPE_MAP: Record<BrandRuleField, string> = {
  imposto: "imposto",
  marketing: "marketing",
  margem: "margem_minima",
};

export type BrandOverrideFlags = {
  imposto: boolean;
  marketing: boolean;
  margem: boolean;
};

export type BrandOverrideDefaults = Partial<Record<BrandRuleField, string>>;

/**
 * Hook por canal: busca regras de `newsystem.pricing_rules` (scope="brand")
 * assim que `produtoMarca` muda e aplica automaticamente imposto/marketing/
 * margem sobre o `calculo` do canal — SEMPRE respeitando edição manual do
 * usuário (flags internas, mesmo padrão de comissão/frete já usado nos
 * canais Shopee/TikTok/Magalu/ML).
 *
 * Uso: uma chamada por canal, dentro do componente pai (PricingCalculatorModern).
 */
export function usebrandpricingoverrides(
  produtoMarca: string,
  setCalculo: CalculoSetter,
  defaults: BrandOverrideDefaults = {}
) {
  const resolvedDefaults: Record<BrandRuleField, string> = {
    imposto: defaults.imposto ?? "14",
    marketing: defaults.marketing ?? "3",
    margem: defaults.margem ?? "15",
  };

  const [flags, setFlags] = useState<BrandOverrideFlags>({
    imposto: false,
    marketing: false,
    margem: false,
  });

  const [brandRules, setBrandRules] = useState<{
    imposto: any | null;
    marketing: any | null;
    margem: any | null;
  }>({
    imposto: null,
    marketing: null,
    margem: null,
  });

  const lastMarcaRef = useRef<string>("__init__");

  // Busca as regras de pricing_rules (scope='brand') assim que a marca muda.
  useEffect(() => {
    if (produtoMarca === lastMarcaRef.current) return;
    lastMarcaRef.current = produtoMarca;

    if (!produtoMarca) {
      setBrandRules({ imposto: null, marketing: null, margem: null });
      return;
    }

    let active = true;

    Promise.all([
      resolveRule({ rule_type: RULE_TYPE_MAP.imposto, brand: produtoMarca }),
      resolveRule({ rule_type: RULE_TYPE_MAP.marketing, brand: produtoMarca }),
      resolveRule({ rule_type: RULE_TYPE_MAP.margem, brand: produtoMarca }),
    ])
      .then(([imposto, marketing, margem]) => {
        if (!active) return;
        setBrandRules({ imposto, marketing, margem });
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
        imposto: flags.imposto
          ? prev.imposto
          : brandRules.imposto
            ? String(brandRules.imposto.rate)
            : resolvedDefaults.imposto,
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
      };

      const semAlteracoes =
        next.imposto === prev.imposto &&
        next.marketing === prev.marketing &&
        next.margem === prev.margem;

      return semAlteracoes ? prev : next;
    });
    // setCalculo é estável (setState do React) — não entra nas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandRules, flags, resolvedDefaults.imposto, resolvedDefaults.marketing, resolvedDefaults.margem]);

  const setEdited = useCallback((field: BrandRuleField, value: boolean) => {
    setFlags((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  const resetFlags = useCallback(() => {
    setFlags({ imposto: false, marketing: false, margem: false });
  }, []);

  return {
    brandRules, // regras cruas resolvidas (para exibir badge "regra de marca aplicada")
    flags, // quais campos estão travados por edição manual
    setEdited, // chamar no onChange/onBlur do campo (ex: setEdited("imposto", true))
    resetFlags, // chamar ao limpar composição/trocar produto
  };
}
