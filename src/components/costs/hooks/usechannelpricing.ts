import { useState, useEffect, useCallback, useRef } from "react";
import { CHANNELS } from "@/components/costs/hooks/channelsconfig";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import { resolveRuleForChannel } from "@/components/costs/hooks/ruleresolvers";
import { usebrandpricingoverrides } from "@/components/costs/hooks/usebrandpricingoverrides";
import { loadMarketplaceChannelRule } from "@/components/costs/hooks/usepricingrules";
import type { Calculo } from "@/components/pricing/PricingCalculatorModern";

export type ManualFlags = {
  comissao: boolean;
  frete: boolean;
  embalagem: boolean;
};

export type BrandRuleField = "imposto" | "marketing" | "margem";

export type BrandOverrides = {
  flags: { imposto: boolean; marketing: boolean; margem: boolean };
  setEdited: (field: BrandRuleField, value: boolean) => void;
  resetFlags: () => void;
};

const emptyManualFlags = (): ManualFlags => ({
  comissao: false,
  frete: false,
  embalagem: false,
});

export function useChannelPricing(
  produtoMarca: string,
  calcularPreco: (c: Calculo) => number
) {
  const [calculos, setCalculos] = useState<Record<ChannelKey, Calculo>>(
    () =>
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, { ...c.defaults }])
      ) as Record<ChannelKey, Calculo>
  );

  const setCalculo = useCallback(
    (key: ChannelKey, updater: (prev: Calculo) => Calculo) => {
      setCalculos((prev) => ({ ...prev, [key]: updater(prev[key]) }));
    },
    []
  );

  const [manualFlags, setManualFlagsState] = useState<
    Record<ChannelKey, ManualFlags>
  >(
    () =>
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, emptyManualFlags()])
      ) as Record<ChannelKey, ManualFlags>
  );

  const setManualFlag = useCallback(
    (key: ChannelKey, field: keyof ManualFlags, value: boolean) => {
      setManualFlagsState((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
    },
    []
  );

  // =====================
  // Brand overrides — um hook por canal (CHANNELS é estático, então
  // chamar o hook em loop fixo é seguro quanto a rules-of-hooks).
  // =====================
  const shoppingBrandOverrides = {} as Record<ChannelKey, BrandOverrides>;

  for (const def of CHANNELS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hook = usebrandpricingoverrides(
      produtoMarca,
      (updater: (prev: Calculo) => Calculo) => setCalculo(def.key, updater),
      {
        imposto: def.defaults.imposto,
        marketing: def.defaults.marketing,
        margem: def.defaults.margem,
      }
    );

    shoppingBrandOverrides[def.key] = hook;
  }

  const brandOverrides = shoppingBrandOverrides;

  // =====================
  // Regras salvas no banco por canal
  // =====================
  const [dbRules, setDbRules] = useState<Record<ChannelKey, any | null>>(
    () =>
      Object.fromEntries(CHANNELS.map((c) => [c.key, null])) as Record<
        ChannelKey,
        any | null
      >
  );

  useEffect(() => {
    let active = true;
    const withRule = CHANNELS.filter((c) => c.dbRuleName);

    Promise.all(
      withRule.map((c) => loadMarketplaceChannelRule(c.dbRuleName!))
    )
      .then((results) => {
        if (!active) return;

        setDbRules((prev) => {
          const next = { ...prev };
          withRule.forEach((c, i) => {
            next[c.key] = results[i] ?? null;
          });
          return next;
        });
      })
      .catch(() => {
        // Mantém fallback hardcoded sem quebrar a calculadora.
      });

    return () => {
      active = false;
    };
  }, []);

  // =====================
  // Engine única de regra automática de comissão/frete
  // =====================
  for (const def of CHANNELS) {
    const rule = dbRules[def.key];
    const calc = calculos[def.key];
    const flags = manualFlags[def.key];

    const embalagemOverride =
      flags.embalagem && calc.embalagem ? calc.embalagem : null;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (!def.allowManualComissaoFrete) return;

      const resolved = resolveRuleForChannel(
        def,
        rule,
        produtoMarca,
        calc,
        calcularPreco,
        embalagemOverride
      );

      if (!resolved) return;

      setCalculo(def.key, (prev) => {
        const next: Calculo = {
          ...prev,
          comissao: flags.comissao ? prev.comissao : resolved.comissao,
          frete: flags.frete ? prev.frete : resolved.frete,
        };

        const semAlteracoes =
          next.comissao === prev.comissao && next.frete === prev.frete;

        return semAlteracoes ? prev : next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      rule,
      produtoMarca,
      calc.desconto,
      calc.imposto,
      calc.margem,
      calc.marketing,
      flags.comissao,
      flags.frete,
      embalagemOverride,
    ]);
  }

  // =====================
  // Preços calculados
  // =====================
  const precos = Object.fromEntries(
    CHANNELS.map((c) => [c.key, calcularPreco(calculos[c.key])])
  ) as Record<ChannelKey, number>;

  // =====================
  // Reset de flags manuais + overrides de marca (chamado ao trocar
  // produto/composição ou ao limpar tudo).
  // =====================
  const resetManualState = useCallback(() => {
    setManualFlagsState(
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, emptyManualFlags()])
      ) as Record<ChannelKey, ManualFlags>
    );

    CHANNELS.forEach((c) => brandOverrides[c.key].resetFlags());
  }, [brandOverrides]);

  const resetAll = useCallback(() => {
    setCalculos(
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, { ...c.defaults, embalagem: "" }])
      ) as Record<ChannelKey, Calculo>
    );

    resetManualState();
  }, [resetManualState]);

  return {
    calculos,
    setCalculo,
    setCalculos,
    manualFlags,
    setManualFlag,
    brandOverrides,
    precos,
    resetAll,
    resetManualState,
  };
}
