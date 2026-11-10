"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Percent,
  Truck,
  Store,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
  Layers,
} from "lucide-react";
import { sanitizeDecimalInput, formatDecimalOnBlur } from "@/components/costs/hooks/utils";
import {
  loadMarketplaceChannelRule,
  saveMarketplaceChannelRule,
  loadChannelPricingRule,
} from "@/components/costs/hooks/usepricingrules";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCENT = "#1a8ceb";

// =====================
// Convenções de armazenamento (todas validadas no front antes de salvar):
// - Taxas de comissão são gravadas como FRAÇÃO (12% -> 0.12).
// - Frete em modo "percent" é gravado como FRAÇÃO; em "fixed", em R$.
// - Campo opcional vazio é gravado como null (herda o fallback), nunca 0.
// =====================

type PricingMode = "flat" | "tiered" | "brand";
type FreteMode = "fixed" | "percent";

interface PriceTier {
  min: string;
  max: string;
  rate: string;
  fixedFee: string;
}

interface BrandListingSubRule {
  rate: string;
  fixedFee: string;
}

interface BrandRule {
  brand: string;
  rate: string;
  fixedFee: string;
  classico?: BrandListingSubRule;
  premium?: BrandListingSubRule;
}

interface ListingTypeRule {
  rate: string;
  fixedFee: string;
  frete: string;
  freteMode: FreteMode;
}

// =====================
// Condição (Clássico/Premium) é um "slice" por pricing_mode —
// cada modo (flat/tiered/brand) tem seu próprio checkbox "enabled"
// e seus próprios valores de classico/premium.
// =====================
interface ConditionSlice {
  enabled: boolean;
  classico: ListingTypeRule;
  premium: ListingTypeRule;
}

// Contrato de envio para saveMarketplaceChannelRule.
// null = herdar do fallback (ou "não definido"); nunca 0 para campo vazio.
interface CommissionTierPayload {
  min: number;
  max: number | null;
  rate: number;
  fixedFee: number | null;
}

interface BrandListingPayload {
  rate: number | null;
  fixedFee: number | null;
}

interface BrandRulePayload {
  brand: string;
  commission_rate: number | null;
  fixed_fee: number | null;
  classico?: BrandListingPayload;
  premium?: BrandListingPayload;
}

interface ListingRulePayload {
  commission_rate: number | null;
  fixed_fee: number | null;
  frete: number | null;
  frete_mode: FreteMode | null;
}

interface MarketplaceRulePayload {
  channel: string;
  pricing_mode: PricingMode;
  comissao: number | null;
  frete: number | null;
  freteMode: FreteMode;
  commission_tiers?: CommissionTierPayload[];
  default_rule?: {
    commission_rate: number | null;
    fixed_fee: number | null;
  };
  brand_rules?: BrandRulePayload[];
  // null remove APENAS a condição do modo ativo (merge no hook).
  listing_type_rules?: {
    classico: ListingRulePayload | null;
    premium: ListingRulePayload | null;
  } | null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: string;
  onApplied?: () => void;
  allBrands?: string[];
};

// Converte para número; vazio ou inválido vira null (nunca 0).
function toNumOrNull(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "") return null;
  const n = parseFloat(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

// Taxa digitada em percentual -> fração. Vazio vira null.
function toRateOrNull(raw: string | undefined): number | null {
  const n = toNumOrNull(raw);
  return n != null ? n / 100 : null;
}

// Frete: em "percent" grava fração; em "fixed" grava R$.
function toFreteValue(raw: string | undefined, mode: FreteMode): number | null {
  return mode === "percent" ? toRateOrNull(raw) : toNumOrNull(raw);
}

// Converte uma taxa decimal (ex: 0.14000000000000002) em percentual
// exibível sem lixo de ponto flutuante (ex: "14").
function toPercentDisplay(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "";
  const pct = Math.round(rate * 100 * 1e6) / 1e6;
  return String(pct);
}

// Valor de frete para exibição, respeitando o modo gravado.
function freteForDisplay(value: number | null | undefined, mode: FreteMode): string {
  if (value == null || Number.isNaN(value)) return "";
  return mode === "percent" ? toPercentDisplay(value) : String(value);
}

const isMercadoLivre = (channel: string) =>
  channel.trim().toLocaleLowerCase("pt-BR").includes("mercado livre");

function emptyTier(): PriceTier {
  return { min: "", max: "", rate: "", fixedFee: "" };
}

function emptyBrandRule(): BrandRule {
  return { brand: "", rate: "", fixedFee: "" };
}

function emptyBrandListingSubRule(): BrandListingSubRule {
  return { rate: "", fixedFee: "" };
}

function emptyListingTypeRule(): ListingTypeRule {
  return { rate: "", fixedFee: "", frete: "", freteMode: "fixed" };
}

function emptyConditionSlice(): ConditionSlice {
  return {
    enabled: false,
    classico: emptyListingTypeRule(),
    premium: emptyListingTypeRule(),
  };
}

function emptyConditionByMode(): Record<PricingMode, ConditionSlice> {
  return {
    flat: emptyConditionSlice(),
    tiered: emptyConditionSlice(),
    brand: emptyConditionSlice(),
  };
}

// Uma condição por marca só existe se algum campo tiver valor real.
// Evita gravar objetos vazios que travariam a marca em 0%.
function hasFilledValue(sub?: BrandListingSubRule): boolean {
  if (!sub) return false;
  return sub.rate.trim() !== "" || sub.fixedFee.trim() !== "";
}

// Verifica se o bloco Clássico/Premium do modo ativo tem valor real.
function hasFilledListingType(rule: ListingTypeRule): boolean {
  return (
    rule.rate.trim() !== "" ||
    rule.fixedFee.trim() !== "" ||
    rule.frete.trim() !== ""
  );
}

function hasTierContent(t: PriceTier): boolean {
  return [t.min, t.max, t.rate, t.fixedFee].some((v) => v.trim() !== "");
}

function buildBrandSub(sub: BrandListingSubRule): BrandListingPayload {
  return {
    rate: toRateOrNull(sub.rate),
    fixedFee: toNumOrNull(sub.fixedFee),
  };
}

// Monta o contrato de listing type (Clássico/Premium) do modo ativo.
function buildListingRule(r: ListingTypeRule): ListingRulePayload {
  const frete = toFreteValue(r.frete, r.freteMode);
  return {
    commission_rate: toRateOrNull(r.rate),
    fixed_fee: toNumOrNull(r.fixedFee),
    frete,
    frete_mode: frete != null ? r.freteMode : null,
  };
}

// Faixas: linhas sem conteúdo são ignoradas; linhas preenchidas já foram validadas.
function buildTiers(tiers: PriceTier[]): CommissionTierPayload[] {
  const out: CommissionTierPayload[] = [];
  for (const t of tiers) {
    if (!hasTierContent(t)) continue;
    const min = toNumOrNull(t.min);
    const rate = toRateOrNull(t.rate);
    if (min == null || rate == null) continue;
    out.push({
      min,
      max: toNumOrNull(t.max), // vazio = sem limite superior
      rate,
      fixedFee: toNumOrNull(t.fixedFee),
    });
  }
  return out;
}

// Quando a condição por marca está ativa, a comissão geral da marca some da
// tela; por isso é enviada como null (a marca usa a condição ou o fallback).
function buildBrandRule(b: BrandRule, showCondition: boolean): BrandRulePayload {
  const rule: BrandRulePayload = {
    brand: b.brand.trim(),
    commission_rate: showCondition ? null : toRateOrNull(b.rate),
    fixed_fee: showCondition ? null : toNumOrNull(b.fixedFee),
  };
  if (showCondition && b.classico && hasFilledValue(b.classico)) {
    rule.classico = buildBrandSub(b.classico);
  }
  if (showCondition && b.premium && hasFilledValue(b.premium)) {
    rule.premium = buildBrandSub(b.premium);
  }
  return rule;
}

// Valida antes de salvar. Retorna a mensagem do primeiro problema, ou null.
function validateForm(
  mode: PricingMode,
  comissao: string,
  tiers: PriceTier[],
  defaultRate: string,
  brandRules: BrandRule[]
): string | null {
  if (mode === "flat" && toRateOrNull(comissao) == null) {
    return "Informe a comissão do marketplace.";
  }

  if (mode === "tiered") {
    const filled = tiers.filter(hasTierContent);
    if (filled.length === 0) return "Adicione ao menos uma faixa de preço.";

    for (const t of filled) {
      const min = toNumOrNull(t.min);
      const max = toNumOrNull(t.max);
      if (min == null) return "Preencha o valor mínimo de todas as faixas.";
      if (toRateOrNull(t.rate) == null) return "Preencha a comissão de todas as faixas.";
      if (max != null && max < min) {
        return "Em uma faixa, o valor máximo é menor que o mínimo.";
      }
    }
  }

  if (mode === "brand") {
    if (toRateOrNull(defaultRate) == null) {
      return "Informe a comissão da regra padrão (fallback).";
    }

    const seen = new Set<string>();
    for (const b of brandRules) {
      const brand = b.brand.trim();
      const hasValues =
        b.rate.trim() !== "" ||
        b.fixedFee.trim() !== "" ||
        hasFilledValue(b.classico) ||
        hasFilledValue(b.premium);

      if (!brand) {
        if (hasValues) return "Selecione a marca em todas as linhas preenchidas.";
        continue;
      }
      if (seen.has(brand)) return `A marca "${brand}" está repetida.`;
      seen.add(brand);
    }
  }

  return null;
}

const modeTabClass = (active: boolean) => `
  flex-1 flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-medium
  border transition-colors cursor-pointer
  ${
    active
      ? "border-[#1a8ceb] bg-[#1a8ceb]/10 text-[#1a8ceb]"
      : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
  }
`;

const miniInputClass = `
  h-9 w-full border border-neutral-800 bg-transparent px-2 text-[12.5px] text-white
  placeholder:text-neutral-600 outline-none transition-colors
  focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
  disabled:opacity-40
`;

// Bloco Clássico ou Premium da condição do modo ativo.
function ConditionSide({
  label,
  value,
  disabled,
  onPatch,
  onFreteModeChange,
}: {
  label: string;
  value: ListingTypeRule;
  disabled: boolean;
  onPatch: (patch: Partial<ListingTypeRule>) => void;
  onFreteModeChange: (mode: FreteMode) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10.5px] text-neutral-500">{label}</span>
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <input
          inputMode="decimal"
          value={value.rate}
          disabled={disabled}
          onChange={(e) => onPatch({ rate: sanitizeDecimalInput(e.target.value) })}
          placeholder="% comissão"
          className={miniInputClass}
        />
        <input
          inputMode="decimal"
          value={value.fixedFee}
          disabled={disabled}
          onChange={(e) => onPatch({ fixedFee: sanitizeDecimalInput(e.target.value) })}
          placeholder="Taxa fixa R$"
          className={miniInputClass}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex overflow-hidden border border-neutral-800 text-[10px] shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFreteModeChange("fixed")}
            className={`px-2 h-9 transition-colors cursor-pointer ${
              value.freteMode === "fixed"
                ? "bg-neutral-800 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            R$
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFreteModeChange("percent")}
            className={`px-2 h-9 transition-colors cursor-pointer ${
              value.freteMode === "percent"
                ? "bg-neutral-800 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            %
          </button>
        </div>
        <input
          inputMode="decimal"
          value={value.frete}
          disabled={disabled}
          onChange={(e) => onPatch({ frete: sanitizeDecimalInput(e.target.value) })}
          placeholder={`Frete ${label}`}
          className={miniInputClass}
        />
      </div>
    </div>
  );
}

export default function ChannelPricingRulesModal({
  open,
  onOpenChange,
  channel,
  onApplied,
  allBrands = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pricingMode, setPricingMode] = useState<PricingMode>("flat");

  const [comissao, setComissao] = useState("");

  const [tiers, setTiers] = useState<PriceTier[]>([emptyTier()]);

  const [defaultRate, setDefaultRate] = useState("");
  const [defaultFixedFee, setDefaultFixedFee] = useState("");
  const [brandRules, setBrandRules] = useState<BrandRule[]>([emptyBrandRule()]);

  // Camada 1 (marca): ativa a condição Clássico/Premium por marca.
  const [useConditionBrand, setUseConditionBrand] = useState(false);

  // Camada 2 (modo): condição Clássico/Premium indexada por pricing_mode.
  const [conditionByMode, setConditionByMode] = useState<Record<PricingMode, ConditionSlice>>(
    emptyConditionByMode
  );

  const activeCondition = conditionByMode[pricingMode];

  const setActiveCondition = useCallback(
    (updater: (prev: ConditionSlice) => ConditionSlice) => {
      setConditionByMode((prev) => ({
        ...prev,
        [pricingMode]: updater(prev[pricingMode]),
      }));
    },
    [pricingMode]
  );

  const patchActiveSide = (side: "classico" | "premium", patch: Partial<ListingTypeRule>) =>
    setActiveCondition((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));

  // Trocar R$/% limpa o valor, para não gravar um R$ como percentual.
  const setListingFreteMode = (side: "classico" | "premium", mode: FreteMode) =>
    setActiveCondition((prev) =>
      prev[side].freteMode === mode
        ? prev
        : { ...prev, [side]: { ...prev[side], freteMode: mode, frete: "" } }
    );

  const [frete, setFrete] = useState("");
  const [freteMode, setFreteMode] = useState<FreteMode>("fixed");

  const [margemMinima, setMargemMinima] = useState<string | null>(null);

  const channelIsML = isMercadoLivre(channel);

  const changeFreteMode = (mode: FreteMode) => {
    if (mode === freteMode) return;
    setFreteMode(mode);
    setFrete("");
  };

  const resetState = useCallback(() => {
    setPricingMode("flat");
    setComissao("");
    setTiers([emptyTier()]);
    setDefaultRate("");
    setDefaultFixedFee("");
    setBrandRules([emptyBrandRule()]);
    setUseConditionBrand(false);
    setConditionByMode(emptyConditionByMode());
    setFrete("");
    setFreteMode("fixed");
    setMargemMinima(null);
    setError(null);
    setLoadFailed(false);
  }, []);

  useEffect(() => {
    if (!open || !channel) return;

    // Descarta respostas de um canal/abertura anterior (corrida de carga).
    let cancelled = false;

    resetState();
    setLoading(true);
    setError(null);
    setLoadFailed(false);

    Promise.all([
      loadMarketplaceChannelRule(channel),
      loadChannelPricingRule(channel),
    ])
      .then(([marketplaceRule, pricingRule]) => {
        if (cancelled) return;

        if (marketplaceRule) {
          const mode = (marketplaceRule.pricing_mode as PricingMode) ?? "flat";
          setPricingMode(mode);

          const loadedFreteMode: FreteMode =
            marketplaceRule.frete_mode === "percent" ? "percent" : "fixed";

          setComissao(
            toPercentDisplay(marketplaceRule.comissao as number | null | undefined)
          );
          setFreteMode(loadedFreteMode);
          setFrete(
            freteForDisplay(marketplaceRule.frete as number | null | undefined, loadedFreteMode)
          );

          if (marketplaceRule.commission_tiers?.length) {
            setTiers(
              marketplaceRule.commission_tiers.map((t: any) => ({
                min: String(t.min ?? ""),
                max: t.max != null ? String(t.max) : "",
                rate: toPercentDisplay(t.rate),
                fixedFee: t.fixedFee != null ? String(t.fixedFee) : "",
              }))
            );
          }

          if (marketplaceRule.default_rule) {
            setDefaultRate(toPercentDisplay(marketplaceRule.default_rule.commission_rate));
            setDefaultFixedFee(
              marketplaceRule.default_rule.fixed_fee != null
                ? String(marketplaceRule.default_rule.fixed_fee)
                : ""
            );
          }

          if (marketplaceRule.brand_rules?.length) {
            let anyBrandCondition = false;

            const loadedBrandRules = marketplaceRule.brand_rules.map((b: any) => {
              const hasClassico = b.classico != null;
              const hasPremium = b.premium != null;
              if (hasClassico || hasPremium) anyBrandCondition = true;

              return {
                brand: b.brand,
                rate: toPercentDisplay(b.commission_rate),
                fixedFee: b.fixed_fee != null ? String(b.fixed_fee) : "",
                classico: hasClassico
                  ? {
                      rate: toPercentDisplay(b.classico.rate),
                      fixedFee: b.classico.fixedFee != null ? String(b.classico.fixedFee) : "",
                    }
                  : undefined,
                premium: hasPremium
                  ? {
                      rate: toPercentDisplay(b.premium.rate),
                      fixedFee: b.premium.fixedFee != null ? String(b.premium.fixedFee) : "",
                    }
                  : undefined,
              };
            });

            setBrandRules(loadedBrandRules);
            if (anyBrandCondition) setUseConditionBrand(true);
          }

          // listing_type_rules é indexado por pricing_mode.
          if (marketplaceRule.listing_type_rules) {
            const nextByMode = emptyConditionByMode();

            (["flat", "tiered", "brand"] as PricingMode[]).forEach((m) => {
              const block = marketplaceRule.listing_type_rules?.[m];
              if (!block) return;

              const lc = block.classico;
              const lp = block.premium;

              const cFreteMode: FreteMode = lc?.frete_mode === "percent" ? "percent" : "fixed";
              const pFreteMode: FreteMode = lp?.frete_mode === "percent" ? "percent" : "fixed";

              nextByMode[m] = {
                enabled: true,
                classico: {
                  rate: toPercentDisplay(lc?.commission_rate),
                  fixedFee: lc?.fixed_fee != null ? String(lc.fixed_fee) : "",
                  frete: freteForDisplay(lc?.frete, cFreteMode),
                  freteMode: cFreteMode,
                },
                premium: {
                  rate: toPercentDisplay(lp?.commission_rate),
                  fixedFee: lp?.fixed_fee != null ? String(lp.fixed_fee) : "",
                  frete: freteForDisplay(lp?.frete, pFreteMode),
                  freteMode: pFreteMode,
                },
              };
            });

            setConditionByMode(nextByMode);
          }
        }

        if (pricingRule) {
          setMargemMinima(String(pricingRule.margemMinima ?? pricingRule.margem_minima ?? ""));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[ChannelPricingRulesModal] falha ao carregar regras:", err);
        setLoadFailed(true);
        setError("Não foi possível carregar as regras deste canal. Feche e abra novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, channel, resetState]);

  const handleClose = useCallback(
    (v: boolean) => {
      if (v && saving) return;
      if (!v) resetState();
      onOpenChange(v);
    },
    [saving, onOpenChange, resetState]
  );

  const addTier = () => setTiers((prev) => [...prev, emptyTier()]);
  const removeTier = (index: number) =>
    setTiers((prev) => prev.filter((_, i) => i !== index));
  const updateTier = (index: number, field: keyof PriceTier, value: string) =>
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );

  const addBrandRule = () => setBrandRules((prev) => [...prev, emptyBrandRule()]);
  const removeBrandRule = (index: number) =>
    setBrandRules((prev) => prev.filter((_, i) => i !== index));
  const updateBrandRule = (
    index: number,
    field: "brand" | "rate" | "fixedFee",
    value: string
  ) =>
    setBrandRules((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );

  const updateBrandListing = (
    index: number,
    listingType: "classico" | "premium",
    field: keyof BrandListingSubRule,
    value: string
  ) =>
    setBrandRules((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const current = b[listingType] ?? emptyBrandListingSubRule();
        return { ...b, [listingType]: { ...current, [field]: value } };
      })
    );

  const handleSave = useCallback(async () => {
    // Não grava se a carga falhou: evita sobrescrever regras reais com campos vazios.
    if (!channel || loading || loadFailed) return;

    const validationError = validateForm(pricingMode, comissao, tiers, defaultRate, brandRules);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const showCondition = channelIsML && useConditionBrand;

      const payload: MarketplaceRulePayload = {
        channel,
        pricing_mode: pricingMode,
        // Comissão geral só existe no modo Fixo; nos demais é null.
        comissao: pricingMode === "flat" ? toRateOrNull(comissao) : null,
        // Frete geral não se aplica ao modo Por Preço (frete fica em cada faixa).
        frete: pricingMode === "tiered" ? null : toFreteValue(frete, freteMode),
        freteMode,
      };

      if (pricingMode === "tiered") {
        payload.commission_tiers = buildTiers(tiers);
      }

      if (pricingMode === "brand") {
        payload.default_rule = {
          commission_rate: toRateOrNull(defaultRate),
          fixed_fee: toNumOrNull(defaultFixedFee),
        };

        payload.brand_rules = brandRules
          .filter((b) => b.brand.trim() !== "")
          .map((b) => buildBrandRule(b, showCondition));
      }

      // =====================
      // Precedência do resolver (documentar no SQL):
      //   condição da marca -> condição global do modo -> fallback (default_rule / comissão do modo)
      // listing_type_rules é relativo ao MODO ATIVO. null remove apenas
      // a condição deste modo; os demais modos são preservados no merge do hook.
      // =====================
      if (channelIsML) {
        const { enabled, classico, premium } = activeCondition;
        const classicoFilled = hasFilledListingType(classico);
        const premiumFilled = hasFilledListingType(premium);

        payload.listing_type_rules =
          enabled && (classicoFilled || premiumFilled)
            ? {
                classico: classicoFilled ? buildListingRule(classico) : null,
                premium: premiumFilled ? buildListingRule(premium) : null,
              }
            : null;
      }

      await saveMarketplaceChannelRule(payload);

      const { data: result, error: rpcError } = await supabase
        .schema("newsystem")
        .rpc("recalc_channel_pricing", { p_channel: channel });

      if (rpcError) {
        // As regras foram salvas: atualiza a lista, mas mantém o modal aberto
        // exibindo o erro para o usuário.
        console.error("[ChannelPricingRulesModal] falha no recálculo:", rpcError);
        toast.error("Regras salvas, mas houve erro ao recalcular os preços do canal.");
        setError("Regras salvas, mas houve erro ao recalcular os preços. Tente novamente.");
        onApplied?.();
        return;
      }

      if (result?.[0]) {
        const { updated_count, queued_count } = result[0];
        toast.success(
          `${updated_count} anúncio(s) atualizados. ${queued_count} entrando na fila de recálculo de preço.`
        );
      }

      onApplied?.();
      resetState();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("[ChannelPricingRulesModal] falha ao salvar regras:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Erro ao salvar as regras. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }, [
    channel,
    loading,
    loadFailed,
    pricingMode,
    comissao,
    frete,
    freteMode,
    tiers,
    defaultRate,
    defaultFixedFee,
    brandRules,
    channelIsML,
    useConditionBrand,
    activeCondition,
    onApplied,
    onOpenChange,
    resetState,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (saving) {
            e.preventDefault();
            return;
          }
          handleClose(false);
        }}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-lg sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">
              {channel}
            </DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Taxas exclusivas deste marketplace. Não altera o custo real do produto.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Tipo de comissão
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPricingMode("flat")}
                    className={modeTabClass(pricingMode === "flat")}
                  >
                    <Percent className="h-3.5 w-3.5" /> Fixo
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPricingMode("tiered")}
                    className={modeTabClass(pricingMode === "tiered")}
                  >
                    <Layers className="h-3.5 w-3.5" /> Por Preço
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setPricingMode("brand")}
                    className={modeTabClass(pricingMode === "brand")}
                  >
                    <Tag className="h-3.5 w-3.5" /> Marca
                  </button>
                </div>
              </div>

              {pricingMode === "flat" && (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Comissão do marketplace
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
                    <input
                      inputMode="decimal"
                      value={comissao}
                      disabled={saving}
                      onChange={(e) => setComissao(sanitizeDecimalInput(e.target.value))}
                      onBlur={() => setComissao(formatDecimalOnBlur(comissao))}
                      placeholder="0,00"
                      className="h-10 w-full border border-neutral-800 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:opacity-40"
                    />
                  </div>
                </div>
              )}

              {pricingMode === "tiered" && (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Faixas de preço
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={addTier}
                      className="flex items-center gap-1 text-[11px] text-[#1a8ceb] hover:underline cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> Adicionar faixa
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tiers.map((tier, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 border border-neutral-900 p-2"
                      >
                        <input
                          inputMode="decimal"
                          value={tier.min}
                          disabled={saving}
                          onChange={(e) => updateTier(index, "min", sanitizeDecimalInput(e.target.value))}
                          placeholder="Mín. R$"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.max}
                          disabled={saving}
                          onChange={(e) => updateTier(index, "max", sanitizeDecimalInput(e.target.value))}
                          placeholder="Máx. (vazio = sem limite)"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.rate}
                          disabled={saving}
                          onChange={(e) => updateTier(index, "rate", sanitizeDecimalInput(e.target.value))}
                          placeholder="%"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.fixedFee}
                          disabled={saving}
                          onChange={(e) => updateTier(index, "fixedFee", sanitizeDecimalInput(e.target.value))}
                          placeholder="Frete R$"
                          className={miniInputClass}
                        />
                        <button
                          type="button"
                          disabled={saving || tiers.length === 1}
                          onClick={() => removeTier(index)}
                          className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[10px] text-neutral-600">
                    Nesse modo, cada faixa tem seu próprio frete. Deixe "Máx." vazio para
                    representar uma faixa "acima de X" sem limite superior. O campo geral
                    de "Frete" abaixo não se aplica aqui.
                  </p>
                </div>
              )}

              {pricingMode === "brand" && (
                <div className="mb-4">
                  <div className="mb-2">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Regra padrão (fallback)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        inputMode="decimal"
                        value={defaultRate}
                        disabled={saving}
                        onChange={(e) => setDefaultRate(sanitizeDecimalInput(e.target.value))}
                        placeholder="% comissão"
                        className={miniInputClass}
                      />
                      <input
                        inputMode="decimal"
                        value={defaultFixedFee}
                        disabled={saving}
                        onChange={(e) => setDefaultFixedFee(sanitizeDecimalInput(e.target.value))}
                        placeholder="Taxa fixa R$"
                        className={miniInputClass}
                      />
                    </div>
                  </div>

                  {channelIsML && (
                    <label className="mb-2 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useConditionBrand}
                        disabled={saving}
                        onChange={(e) => setUseConditionBrand(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#1a8ceb] cursor-pointer"
                      />
                      <span className="text-[11.5px] font-medium text-neutral-300">
                        Diferenciar Clássico / Premium por marca
                      </span>
                    </label>
                  )}

                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Comissão por marca
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={addBrandRule}
                      className="flex items-center gap-1 text-[11px] text-[#1a8ceb] hover:underline cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> Adicionar marca
                    </button>
                  </div>

                  <div className="space-y-2">
                    {brandRules.map((rule, index) => {
                      const showCondition = channelIsML && useConditionBrand;

                      return (
                        <div key={index} className="border border-neutral-900 p-2 space-y-1.5">
                          <div
                            className={`grid gap-1.5 ${
                              showCondition
                                ? "grid-cols-[1.4fr_auto]"
                                : "grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
                            }`}
                          >
                            {allBrands.length > 0 ? (
                              <select
                                value={rule.brand}
                                disabled={saving}
                                onChange={(e) => updateBrandRule(index, "brand", e.target.value)}
                                className={`${miniInputClass} cursor-pointer`}
                              >
                                <option value="">Selecione</option>
                                {allBrands.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={rule.brand}
                                disabled={saving}
                                onChange={(e) => updateBrandRule(index, "brand", e.target.value)}
                                placeholder="Marca"
                                className={miniInputClass}
                              />
                            )}

                            {!showCondition && (
                              <>
                                <input
                                  inputMode="decimal"
                                  value={rule.rate}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateBrandRule(index, "rate", sanitizeDecimalInput(e.target.value))
                                  }
                                  placeholder="%"
                                  className={miniInputClass}
                                />
                                <input
                                  inputMode="decimal"
                                  value={rule.fixedFee}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateBrandRule(index, "fixedFee", sanitizeDecimalInput(e.target.value))
                                  }
                                  placeholder="Taxa R$"
                                  className={miniInputClass}
                                />
                              </>
                            )}

                            <button
                              type="button"
                              disabled={saving || brandRules.length === 1}
                              onClick={() => removeBrandRule(index)}
                              className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {showCondition && (
                            <div className="grid grid-cols-2 gap-1.5 pl-0">
                              <div>
                                <span className="mb-1 block text-[10px] text-neutral-500">Clássico</span>
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    inputMode="decimal"
                                    value={rule.classico?.rate ?? ""}
                                    disabled={saving}
                                    onChange={(e) =>
                                      updateBrandListing(
                                        index,
                                        "classico",
                                        "rate",
                                        sanitizeDecimalInput(e.target.value)
                                      )
                                    }
                                    placeholder="% comissão"
                                    className={miniInputClass}
                                  />
                                  <input
                                    inputMode="decimal"
                                    value={rule.classico?.fixedFee ?? ""}
                                    disabled={saving}
                                    onChange={(e) =>
                                      updateBrandListing(
                                        index,
                                        "classico",
                                        "fixedFee",
                                        sanitizeDecimalInput(e.target.value)
                                      )
                                    }
                                    placeholder="Frete R$"
                                    className={miniInputClass}
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="mb-1 block text-[10px] text-neutral-500">Premium</span>
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    inputMode="decimal"
                                    value={rule.premium?.rate ?? ""}
                                    disabled={saving}
                                    onChange={(e) =>
                                      updateBrandListing(
                                        index,
                                        "premium",
                                        "rate",
                                        sanitizeDecimalInput(e.target.value)
                                      )
                                    }
                                    placeholder="% comissão"
                                    className={miniInputClass}
                                  />
                                  <input
                                    inputMode="decimal"
                                    value={rule.premium?.fixedFee ?? ""}
                                    disabled={saving}
                                    onChange={(e) =>
                                      updateBrandListing(
                                        index,
                                        "premium",
                                        "fixedFee",
                                        sanitizeDecimalInput(e.target.value)
                                      )
                                    }
                                    placeholder="Frete R$"
                                    className={miniInputClass}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {channelIsML && useConditionBrand && (
                    <p className="mt-2 text-[10px] text-neutral-600">
                      Cada marca tem sua própria condição (Clássico/Premium). Marcas sem
                      valor preenchido usam a Regra padrão (fallback) acima.
                    </p>
                  )}
                </div>
              )}

              {/*
                Bloco de Condição (Clássico/Premium) DO MODO ATIVO —
                lido de conditionByMode[pricingMode] via activeCondition.
              */}
              {channelIsML && (
                <div className="mb-4 border border-neutral-900 p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeCondition.enabled}
                      disabled={saving}
                      onChange={(e) =>
                        setActiveCondition((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="h-3.5 w-3.5 accent-[#1a8ceb] cursor-pointer"
                    />
                    <span className="text-[11.5px] font-medium text-neutral-300">
                      Diferenciar por Condição (Clássico / Premium)
                    </span>
                  </label>

                  {activeCondition.enabled && (
                    <div className="mt-3 space-y-3">
                      <ConditionSide
                        label="Clássico"
                        value={activeCondition.classico}
                        disabled={saving}
                        onPatch={(patch) => patchActiveSide("classico", patch)}
                        onFreteModeChange={(mode) => setListingFreteMode("classico", mode)}
                      />

                      <ConditionSide
                        label="Premium"
                        value={activeCondition.premium}
                        disabled={saving}
                        onPatch={(patch) => patchActiveSide("premium", patch)}
                        onFreteModeChange={(mode) => setListingFreteMode("premium", mode)}
                      />

                      <p className="text-[10px] text-neutral-600">
                        Essa condição é exclusiva do modo selecionado acima ({pricingMode === "flat" ? "Fixo" : pricingMode === "tiered" ? "Por Preço" : "Marca"}).
                        Ao trocar de aba, uma condição diferente (ou vazia) pode ser exibida —
                        cada modo guarda sua própria configuração.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {pricingMode === "tiered" ? (
                <div className="mb-4 border border-neutral-800 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Frete
                    </span>
                  </div>
                  <p className="text-[10.5px] text-neutral-500">
                    No modo "Por Preço", o frete é definido individualmente em cada faixa
                    (campo "Frete R$" de cada linha acima).
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Frete
                      </span>
                    </div>
                    <div className="flex overflow-hidden border border-neutral-800 text-[10px]">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => changeFreteMode("fixed")}
                        className={`px-2 py-0.5 transition-colors cursor-pointer ${
                          freteMode === "fixed" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => changeFreteMode("percent")}
                        className={`px-2 py-0.5 transition-colors cursor-pointer ${
                          freteMode === "percent" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                      {freteMode === "percent" ? "%" : "R$"}
                    </span>
                    <input
                      inputMode="decimal"
                      value={frete}
                      disabled={saving}
                      onChange={(e) => setFrete(sanitizeDecimalInput(e.target.value))}
                      onBlur={() => setFrete(formatDecimalOnBlur(frete))}
                      placeholder="0,00"
                      className="h-10 w-full border border-neutral-800 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:opacity-40"
                    />
                  </div>
                </div>
              )}

              {margemMinima !== null && (
                <div className="border border-neutral-800 px-3 py-2">
                  <p className="text-[10.5px] text-neutral-500">
                    Margem mínima configurada para este canal:{" "}
                    <span className="text-neutral-300">{margemMinima}%</span>
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-600">
                    Para alterar, use "Ajustes em massa" → escopo Canal.
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-3 flex items-center gap-1 text-[10.5px] text-red-400">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {error}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleClose(false)}
            className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || loading || loadFailed}
            onClick={handleSave}
            className="flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium transition-colors sm:h-10 sm:w-auto sm:px-6 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar regras"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
