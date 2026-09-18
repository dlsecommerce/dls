import { useState, useEffect, useCallback, useMemo } from "react";
import { CHANNELS, EMBALAGEM_PADRAO } from "@/components/costs/hooks/channelsconfig";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import { resolveRuleForChannel } from "@/components/costs/hooks/ruleresolvers";
import { usebrandpricingoverrides } from "@/components/costs/hooks/usebrandpricingoverrides";
import { loadMarketplaceChannelRule } from "@/components/costs/hooks/usepricingrules";
import type { Calculo } from "@/components/pricing/PricingCalculatorModern";

// Imposto agora é constante fixa por empresa (10% Sóbaquetas / 14% Pikot),
// controlada em PriceCalculationSection.tsx. Aqui só precisamos travar
// edição manual do usuário, igual comissão/frete/embalagem.
export type ManualFlags = {
  comissao: boolean;
  frete: boolean;
  embalagem: boolean;
  imposto: boolean;
};

// Imposto SAIU do sistema de brand overrides (não é regra de marca).
// Desconto ENTROU.
export type BrandRuleField = "marketing" | "margem" | "desconto";

export type BrandOverrides = {
  flags: { marketing: boolean; margem: boolean; desconto: boolean };
  setEdited: (field: BrandRuleField, value: boolean) => void;
  resetFlags: () => void;
};

const emptyManualFlags = (): ManualFlags => ({
  comissao: false,
  frete: false,
  embalagem: false,
  imposto: false,
});

// =====================
// Defaults estáticos calculados uma única vez (CHANNELS não muda em runtime).
// Evita recriar os mesmos objetos via .map() em toda chamada de
// resetAll/resetManualState e na inicialização dos useState.
//
// embalagem SEMPRE nasce vazia ("") — nunca fixa em c.defaults.embalagem.
// Isso é o que permite os 3 modos funcionarem em cascata: 1) banco
// (packaging_cost da composição), 2) fixo (fallback hardcoded quando a
// composição não tem custo de embalagem), 3) manual (usuário digita
// algo, o campo passa a ter prioridade via manualFlags).
//
// O preenchimento efetivo do campo (banco ou fixo) é feito pelo
// useEffect "Engine de embalagem" abaixo — SEM ele, o campo ficava
// vazio na tela pra sempre, mesmo influenciando o preço internamente.
// =====================
const DEFAULT_CALCULOS = Object.fromEntries(
  CHANNELS.map((c) => [c.key, { ...c.defaults, embalagem: "" }])
) as Record<ChannelKey, Calculo>;

const RESET_CALCULOS = DEFAULT_CALCULOS;

const DEFAULT_MANUAL_FLAGS = Object.fromEntries(
  CHANNELS.map((c) => [c.key, emptyManualFlags()])
) as Record<ChannelKey, ManualFlags>;

const EMPTY_DB_RULES = Object.fromEntries(
  CHANNELS.map((c) => [c.key, null])
) as Record<ChannelKey, any | null>;

const CHANNELS_WITH_RULE = CHANNELS.filter((c) => c.dbRuleName);

// =====================
// Cache em módulo das regras de banco por canal (dbRules).
// Diferente das regras de marca, estas NÃO dependem de `produtoMarca` —
// são fixas por canal. Sem cache, toda montagem do hook (ex: reabrir o
// modal da calculadora) refazia N requisições ao banco pra buscar
// exatamente os mesmos dados. Warm-up disparado no module scope: o fetch
// já começa antes do primeiro render do componente que usa este hook.
// =====================
let dbRulesCache: Promise<Record<ChannelKey, any | null>> | null = null;

function loadAllDbRules(): Promise<Record<ChannelKey, any | null>> {
  if (dbRulesCache) return dbRulesCache;

  dbRulesCache = Promise.all(
    CHANNELS_WITH_RULE.map((c) => loadMarketplaceChannelRule(c.dbRuleName!))
  )
    .then((results) => {
      const map = { ...EMPTY_DB_RULES };
      CHANNELS_WITH_RULE.forEach((c, i) => {
        map[c.key] = results[i] ?? null;
      });
      return map;
    })
    .catch((err) => {
      dbRulesCache = null; // permite retry numa próxima montagem
      throw err;
    });

  return dbRulesCache;
}

// Warm-up antecipado: dispara o fetch assim que o módulo é importado,
// não quando o componente monta. Ignora erro aqui — o efeito no hook
// trata a falha e mantém fallback hardcoded.
loadAllDbRules().catch(() => {});

export function useChannelPricing(
  produtoMarca: string,
  calcularPreco: (c: Calculo) => number,
  calcularEmbalagemAutomatica: () => number
) {
  const [calculos, setCalculos] = useState<Record<ChannelKey, Calculo>>(
    () => ({ ...DEFAULT_CALCULOS })
  );

  const setCalculo = useCallback(
    (key: ChannelKey, updater: (prev: Calculo) => Calculo) => {
      setCalculos((prev) => ({ ...prev, [key]: updater(prev[key]) }));
    },
    []
  );

  const [manualFlags, setManualFlagsState] = useState<
    Record<ChannelKey, ManualFlags>
  >(() => ({ ...DEFAULT_MANUAL_FLAGS }));

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
  // Imposto NÃO entra mais aqui — é constante fixa por empresa.
  // Cada `hook` já vem memoizado internamente (usebrandpricingoverrides
  // usa useMemo no retorno), então `brandOverrides` só muda de referência
  // quando algum canal realmente mudou de estado.
  // =====================
  const shoppingBrandOverrides = {} as Record<ChannelKey, BrandOverrides>;

  for (const def of CHANNELS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hook = usebrandpricingoverrides(
      produtoMarca,
      (updater: (prev: Calculo) => Calculo) => setCalculo(def.key, updater),
      {
        marketing: def.defaults.marketing,
        margem: def.defaults.margem,
        desconto: def.defaults.desconto,
      }
    );

    shoppingBrandOverrides[def.key] = hook;
  }

  const brandOverrides = shoppingBrandOverrides;

  // =====================
  // Regras salvas no banco por canal — busca via cache em módulo.
  // =====================
  const [dbRules, setDbRules] = useState<Record<ChannelKey, any | null>>(
    () => ({ ...EMPTY_DB_RULES })
  );

  useEffect(() => {
    let active = true;

    loadAllDbRules()
      .then((map) => {
        if (active) setDbRules(map);
      })
      .catch(() => {
        // Mantém fallback hardcoded sem quebrar a calculadora.
      });

    return () => {
      active = false;
    };
  }, []);

  // =====================
  // Engine de embalagem — resolve os 3 modos (Banco > Fixo > Manual)
  // e ESCREVE o valor resolvido de volta no estado `calculos`.
  // -----------------------------------------------------------------
  // Sem este efeito, `calcularEmbalagemAutomatica()` só era consumido
  // dentro de `calcularPreco` (influenciava o preço "por baixo"), mas
  // o campo de embalagem exibido em cada canal permanecia sempre
  // vazio — nada nunca reescrevia `calculos[key].embalagem`.
  //
  // - Canal com manualFlags[key].embalagem = true → pulado, preserva
  //   o valor digitado pelo usuário.
  // - automatico > 0 (composição tem packaging_cost) → usa o valor do
  //   banco em todos os demais canais.
  // - automatico === 0 → cai no fallback fixo (EMBALAGEM_PADRAO).
  //
  // Segue o mesmo padrão do engine de comissão/frete: 1 único efeito,
  // 1 única atualização de estado por ciclo.
  // =====================
  useEffect(() => {
    setCalculos((prevCalculos) => {
      let changed = false;
      const next = { ...prevCalculos };
      const automatico = calcularEmbalagemAutomatica();

      for (const def of CHANNELS) {
        const flags = manualFlags[def.key];

        if (flags.embalagem) continue;

        const resolved =
          automatico > 0 ? automatico.toFixed(2) : EMBALAGEM_PADRAO;

        if (prevCalculos[def.key].embalagem !== resolved) {
          next[def.key] = { ...prevCalculos[def.key], embalagem: resolved };
          changed = true;
        }
      }

      return changed ? next : prevCalculos;
    });
  }, [calcularEmbalagemAutomatica, manualFlags]);

  // =====================
  // Engine única de regra automática de comissão/frete.
  // -----------------------------------------------------------------
  // ANTES: 1 useEffect por canal (até 6 efeitos), cada um disparando
  // seu próprio setCalculo — até 6 setState + 6 commits do React em
  // sequência sempre que dbRules/produtoMarca mudavam.
  //
  // AGORA: 1 único efeito processa todos os canais e faz UMA única
  // atualização de estado (batched), reduzindo drasticamente o número
  // de re-renders.
  // =====================
  useEffect(() => {
    setCalculos((prevCalculos) => {
      let changed = false;
      const next = { ...prevCalculos };

      for (const def of CHANNELS) {
        if (!def.allowManualComissaoFrete) continue;

        const rule = dbRules[def.key];
        const calc = prevCalculos[def.key];
        const flags = manualFlags[def.key];
        const embalagemOverride =
          flags.embalagem && calc.embalagem ? calc.embalagem : null;

        const resolved = resolveRuleForChannel(
          def,
          rule,
          produtoMarca,
          calc,
          calcularPreco,
          embalagemOverride
        );

        if (!resolved) continue;

        const updated: Calculo = {
          ...calc,
          comissao: flags.comissao ? calc.comissao : resolved.comissao,
          frete: flags.frete ? calc.frete : resolved.frete,
        };

        if (
          updated.comissao !== calc.comissao ||
          updated.frete !== calc.frete
        ) {
          next[def.key] = updated;
          changed = true;
        }
      }

      return changed ? next : prevCalculos;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRules, produtoMarca, manualFlags, calcularPreco]);

  // =====================
  // Preços calculados
  // -----------------------------------------------------------------
  // Memoizado — só recalcula quando `calculos` realmente muda (ou a
  // função `calcularPreco`, que é estável via useCallback no componente
  // pai).
  // =====================
  const precos = useMemo(
    () =>
      Object.fromEntries(
        CHANNELS.map((c) => [c.key, calcularPreco(calculos[c.key])])
      ) as Record<ChannelKey, number>,
    [calculos, calcularPreco]
  );

  // =====================
  // Reset de flags manuais + overrides de marca (chamado ao trocar
  // produto/composição ou ao limpar tudo).
  // =====================
  const resetManualState = useCallback(() => {
    setManualFlagsState({ ...DEFAULT_MANUAL_FLAGS });
    CHANNELS.forEach((c) => brandOverrides[c.key].resetFlags());
  }, [brandOverrides]);

  const resetAll = useCallback(() => {
    setCalculos({ ...RESET_CALCULOS });
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
