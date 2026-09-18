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

type PricingMode = "flat" | "tiered" | "brand";

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
  freteMode: "fixed" | "percent";
}

// =====================
// Condição (Clássico/Premium) continua sendo um "slice" por modo
// (flat/tiered/brand), cada um com seu enabled + valores próprios.
// =====================
interface ConditionSlice {
  enabled: boolean;
  classico: ListingTypeRule;
  premium: ListingTypeRule;
}

// =====================
// NOVO: flags de ativação por modo. Substituem o antigo `pricingMode`
// como "seletor exclusivo". Agora um canal pode ter, ao mesmo tempo,
// regra flat + tiered + brand habilitadas — a resolução em cascata
// (no backend / ruleresolvers.ts) decide qual aplicar para cada item,
// na ordem: brand > tiered > flat.
// `activeTab` continua existindo só para controlar QUAL bloco está
// sendo exibido/editado no momento na UI.
// =====================
interface ModeEnabledFlags {
  flat: boolean;
  tiered: boolean;
  brand: boolean;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: string;
  onApplied?: () => void;
  allBrands?: string[];
};

function parseValue(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  const parsed = parseFloat(raw.replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toPercentDisplay(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "";
  const pct = Math.round(rate * 100 * 1e6) / 1e6;
  return String(pct);
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

function emptyModeFlags(): ModeEnabledFlags {
  return { flat: true, tiered: false, brand: false };
}

function hasFilledValue(sub?: BrandListingSubRule): boolean {
  return Boolean(
    (sub?.rate ?? "").trim() !== "" || (sub?.fixedFee ?? "").trim() !== ""
  );
}

function hasFilledListingType(rule: ListingTypeRule): boolean {
  return (
    rule.rate.trim() !== "" ||
    rule.fixedFee.trim() !== "" ||
    rule.frete.trim() !== ""
  );
}

const modeTabClass = (active: boolean, enabled: boolean) => `
  flex-1 flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-medium
  border transition-colors cursor-pointer relative
  ${
    active
      ? "border-[#1a8ceb] bg-[#1a8ceb]/10 text-[#1a8ceb]"
      : enabled
      ? "border-neutral-700 text-neutral-300 hover:border-neutral-600"
      : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
  }
`;

const miniInputClass = `
  h-9 w-full border border-neutral-800 bg-transparent px-2 text-[12.5px] text-white
  placeholder:text-neutral-600 outline-none transition-colors
  focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
  disabled:opacity-40
`;

export default function ChannelPricingRulesModal({
  open,
  onOpenChange,
  channel,
  onApplied,
  allBrands = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aba exibida atualmente (não é mais "modo exclusivo salvo", é só a UI)
  const [activeTab, setActiveTab] = useState<PricingMode>("flat");

  // Flags de ativação independentes — controlam o que é enviado no save
  const [modeEnabled, setModeEnabled] = useState<ModeEnabledFlags>(emptyModeFlags());

  const [comissao, setComissao] = useState("");

  const [tiers, setTiers] = useState<PriceTier[]>([emptyTier()]);

  const [defaultRate, setDefaultRate] = useState("");
  const [defaultFixedFee, setDefaultFixedFee] = useState("");
  const [brandRules, setBrandRules] = useState<BrandRule[]>([emptyBrandRule()]);

  const [useConditionBrand, setUseConditionBrand] = useState(false);

  const [conditionByMode, setConditionByMode] = useState<Record<PricingMode, ConditionSlice>>(
    emptyConditionByMode
  );

  const activeCondition = conditionByMode[activeTab];

  const setActiveCondition = useCallback(
    (updater: (prev: ConditionSlice) => ConditionSlice) => {
      setConditionByMode((prev) => ({
        ...prev,
        [activeTab]: updater(prev[activeTab]),
      }));
    },
    [activeTab]
  );

  const [frete, setFrete] = useState("");
  const [freteMode, setFreteMode] = useState<"fixed" | "percent">("fixed");

  const [margemMinima, setMargemMinima] = useState<string | null>(null);

  const channelIsML = isMercadoLivre(channel);

  const resetState = useCallback(() => {
    setActiveTab("flat");
    setModeEnabled(emptyModeFlags());
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
  }, []);

  useEffect(() => {
    if (!open || !channel) return;
    setLoading(true);
    setError(null);

    Promise.all([
      loadMarketplaceChannelRule(channel),
      loadChannelPricingRule(channel),
    ])
      .then(([marketplaceRule, pricingRule]) => {
        if (marketplaceRule) {
          // Aba inicial exibida = último modo salvo (só afeta a UI)
          const lastMode = (marketplaceRule.pricing_mode as PricingMode) ?? "flat";
          setActiveTab(lastMode);

          // Flags de ativação: usa campos explícitos do backend se
          // existirem (flat_enabled/tiered_enabled/brand_enabled).
          // Se não existirem (registros antigos), infere pela presença
          // de dados preenchidos em cada bloco — mantém compatibilidade
          // com o formato anterior (modo único).
          const hasTiersData = !!marketplaceRule.commission_tiers?.length;
          const hasBrandData = !!marketplaceRule.brand_rules?.length;
          const hasFlatData =
            marketplaceRule.comissao != null && marketplaceRule.comissao !== 0;

          setModeEnabled({
            flat:
              marketplaceRule.flat_enabled ?? (lastMode === "flat" || hasFlatData),
            tiered:
              marketplaceRule.tiered_enabled ?? (lastMode === "tiered" || hasTiersData),
            brand:
              marketplaceRule.brand_enabled ?? (lastMode === "brand" || hasBrandData),
          });

          setComissao(String(marketplaceRule.comissao ?? ""));
          setFrete(String(marketplaceRule.frete ?? ""));
          setFreteMode(marketplaceRule.frete_mode ?? "fixed");

          if (marketplaceRule.commission_tiers?.length) {
            setTiers(
              marketplaceRule.commission_tiers.map((t: any) => ({
                min: String(t.min ?? ""),
                max: t.max != null ? String(t.max) : "",
                rate: toPercentDisplay(t.rate),
                fixedFee: String(t.fixedFee ?? ""),
              }))
            );
          }

          if (marketplaceRule.default_rule) {
            setDefaultRate(toPercentDisplay(marketplaceRule.default_rule.commission_rate));
            setDefaultFixedFee(String(marketplaceRule.default_rule.fixed_fee ?? ""));
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
                fixedFee: String(b.fixed_fee ?? ""),
                classico: hasClassico
                  ? {
                      rate: toPercentDisplay(b.classico.rate),
                      fixedFee: String(b.classico.fixedFee ?? ""),
                    }
                  : undefined,
                premium: hasPremium
                  ? {
                      rate: toPercentDisplay(b.premium.rate),
                      fixedFee: String(b.premium.fixedFee ?? ""),
                    }
                  : undefined,
              };
            });

            setBrandRules(loadedBrandRules);
            if (anyBrandCondition) setUseConditionBrand(true);
          }

          if (marketplaceRule.listing_type_rules) {
            const nextByMode = emptyConditionByMode();

            (["flat", "tiered", "brand"] as PricingMode[]).forEach((m) => {
              const block = marketplaceRule.listing_type_rules?.[m];
              if (!block) return;

              const lc = block.classico;
              const lp = block.premium;

              nextByMode[m] = {
                enabled: true,
                classico: {
                  rate: toPercentDisplay(lc?.commission_rate),
                  fixedFee: String(lc?.fixed_fee ?? ""),
                  frete: String(lc?.frete ?? ""),
                  freteMode: lc?.frete_mode ?? "fixed",
                },
                premium: {
                  rate: toPercentDisplay(lp?.commission_rate),
                  fixedFee: String(lp?.fixed_fee ?? ""),
                  frete: String(lp?.frete ?? ""),
                  freteMode: lp?.frete_mode ?? "fixed",
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
      .catch(() => setError("Não foi possível carregar as regras deste canal."))
      .finally(() => setLoading(false));
  }, [open, channel]);

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

  // Alterna se um modo está habilitado (participa da cascata de resolução)
  const toggleModeEnabled = (mode: PricingMode) => {
    setModeEnabled((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  const handleSave = useCallback(async () => {
    if (!channel) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        channel,
        // Mantido só por compatibilidade / último modo editado —
        // não é mais usado como seletor exclusivo na resolução.
        pricing_mode: activeTab,
        flat_enabled: modeEnabled.flat,
        tiered_enabled: modeEnabled.tiered,
        brand_enabled: modeEnabled.brand,
      };

      // Bloco FLAT — enviado se habilitado, independente da aba aberta
      if (modeEnabled.flat) {
        payload.comissao = parseValue(comissao);
        payload.frete = parseValue(frete);
        payload.freteMode = freteMode;
      }

      // Bloco TIERED
      if (modeEnabled.tiered) {
        payload.commission_tiers = tiers
          .filter((t) => t.min !== "")
          .map((t) => ({
            min: parseValue(t.min),
            max: t.max !== "" ? parseValue(t.max) : null,
            rate: parseValue(t.rate) / 100,
            fixedFee: parseValue(t.fixedFee),
          }));
      } else {
        payload.commission_tiers = null;
      }

      // Bloco BRAND
      if (modeEnabled.brand) {
        payload.default_rule = {
          commission_rate: parseValue(defaultRate) / 100,
          fixed_fee: parseValue(defaultFixedFee),
        };

        payload.brand_rules = brandRules
          .filter((b) => b.brand.trim() !== "")
          .map((b) => {
            const hasClassico = hasFilledValue(b.classico);
            const hasPremium = hasFilledValue(b.premium);

            return {
              brand: b.brand,
              commission_rate: parseValue(b.rate) / 100,
              fixed_fee: parseValue(b.fixedFee),
              ...(channelIsML && useConditionBrand && hasClassico
                ? {
                    classico: {
                      rate: parseValue(b.classico?.rate ?? "") / 100,
                      fixedFee: parseValue(b.classico?.fixedFee ?? ""),
                    },
                  }
                : {}),
              ...(channelIsML && useConditionBrand && hasPremium
                ? {
                    premium: {
                      rate: parseValue(b.premium?.rate ?? "") / 100,
                      fixedFee: parseValue(b.premium?.fixedFee ?? ""),
                    },
                  }
                : {}),
            };
          });
      } else {
        payload.default_rule = null;
        payload.brand_rules = null;
      }

      // =====================
      // listing_type_rules agora envia a condição de TODOS os modos
      // habilitados (merge feito no backend preserva os demais).
      // Modo desabilitado ou sem condição marcada envia `null` para
      // aquele slot, limpando apenas ele.
      // =====================
      if (channelIsML) {
        const listingTypeRules: Record<string, unknown> = {};

        (["flat", "tiered", "brand"] as PricingMode[]).forEach((mode) => {
          const { enabled, classico, premium } = conditionByMode[mode];
          const shouldSend =
            modeEnabled[mode] &&
            enabled &&
            (hasFilledListingType(classico) || hasFilledListingType(premium));

          if (shouldSend) {
            listingTypeRules[mode] = {
              classico: {
                commission_rate: parseValue(classico.rate) / 100,
                fixed_fee: parseValue(classico.fixedFee),
                frete: classico.frete !== "" ? parseValue(classico.frete) : null,
                frete_mode: classico.freteMode,
              },
              premium: {
                commission_rate: parseValue(premium.rate) / 100,
                fixed_fee: parseValue(premium.fixedFee),
                frete: premium.frete !== "" ? parseValue(premium.frete) : null,
                frete_mode: premium.freteMode,
              },
            };
          } else {
            listingTypeRules[mode] = null;
          }
        });

        payload.listing_type_rules = listingTypeRules;
      }

      await saveMarketplaceChannelRule(payload as any);

      const { data: result, error: rpcError } = await supabase
        .schema("newsystem")
        .rpc("recalc_channel_pricing", { p_channel: channel });

      if (rpcError) {
        setError(
          "Regras salvas, mas houve um erro ao recalcular os preços do canal."
        );
      } else if (result?.[0]) {
        const { updated_count, queued_count } = result[0];
        toast.success(
          `${updated_count} anúncio(s) atualizados. ${queued_count} entrando na fila de recálculo de preço.`
        );
      }

      onApplied?.();
      resetState();
      onOpenChange(false);
    } catch {
      setError("Erro ao salvar as regras. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [
    channel,
    activeTab,
    modeEnabled,
    comissao,
    frete,
    freteMode,
    tiers,
    defaultRate,
    defaultFixedFee,
    brandRules,
    channelIsML,
    useConditionBrand,
    conditionByMode,
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
              <div className="mb-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Blocos de comissão (podem ficar ativos ao mesmo tempo)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setActiveTab("flat")}
                    className={modeTabClass(activeTab === "flat", modeEnabled.flat)}
                  >
                    <Percent className="h-3.5 w-3.5" /> Fixo
                    {modeEnabled.flat && (
                      <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#1a8ceb]" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setActiveTab("tiered")}
                    className={modeTabClass(activeTab === "tiered", modeEnabled.tiered)}
                  >
                    <Layers className="h-3.5 w-3.5" /> Por Preço
                    {modeEnabled.tiered && (
                      <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#1a8ceb]" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setActiveTab("brand")}
                    className={modeTabClass(activeTab === "brand", modeEnabled.brand)}
                  >
                    <Tag className="h-3.5 w-3.5" /> Marca
                    {modeEnabled.brand && (
                      <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#1a8ceb]" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-neutral-600">
                  Prioridade de resolução: Marca &gt; Por Preço &gt; Fixo. Um item usa a
                  primeira regra habilitada que se aplique a ele.
                </p>
              </div>

              {/* Checkbox de ativação do bloco da aba atual */}
              <label className="mb-3 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modeEnabled[activeTab]}
                  disabled={saving}
                  onChange={() => toggleModeEnabled(activeTab)}
                  className="h-3.5 w-3.5 accent-[#1a8ceb] cursor-pointer"
                />
                <span className="text-[11.5px] font-medium text-neutral-300">
                  Ativar bloco "
                  {activeTab === "flat" ? "Fixo" : activeTab === "tiered" ? "Por Preço" : "Marca"}
                  " para este canal
                </span>
              </label>

              {activeTab === "flat" && (
                <div className={`mb-4 ${!modeEnabled.flat ? "opacity-40" : ""}`}>
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
                      disabled={saving || !modeEnabled.flat}
                      onChange={(e) => setComissao(sanitizeDecimalInput(e.target.value))}
                      onBlur={() => setComissao(formatDecimalOnBlur(comissao))}
                      placeholder="0,00"
                      className="h-10 w-full border border-neutral-800 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:opacity-40"
                    />
                  </div>
                </div>
              )}

              {activeTab === "tiered" && (
                <div className={`mb-4 ${!modeEnabled.tiered ? "opacity-40" : ""}`}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Faixas de preço
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={saving || !modeEnabled.tiered}
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
                          disabled={saving || !modeEnabled.tiered}
                          onChange={(e) => updateTier(index, "min", sanitizeDecimalInput(e.target.value))}
                          placeholder="Mín. R$"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.max}
                          disabled={saving || !modeEnabled.tiered}
                          onChange={(e) => updateTier(index, "max", sanitizeDecimalInput(e.target.value))}
                          placeholder="Máx. (vazio = sem limite)"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.rate}
                          disabled={saving || !modeEnabled.tiered}
                          onChange={(e) => updateTier(index, "rate", sanitizeDecimalInput(e.target.value))}
                          placeholder="%"
                          className={miniInputClass}
                        />
                        <input
                          inputMode="decimal"
                          value={tier.fixedFee}
                          disabled={saving || !modeEnabled.tiered}
                          onChange={(e) => updateTier(index, "fixedFee", sanitizeDecimalInput(e.target.value))}
                          placeholder="Frete R$"
                          className={miniInputClass}
                        />
                        <button
                          type="button"
                          disabled={saving || tiers.length === 1 || !modeEnabled.tiered}
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

              {activeTab === "brand" && (
                <div className={`mb-4 ${!modeEnabled.brand ? "opacity-40" : ""}`}>
                  <div className="mb-2">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Regra padrão (fallback)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        inputMode="decimal"
                        value={defaultRate}
                        disabled={saving || !modeEnabled.brand}
                        onChange={(e) => setDefaultRate(sanitizeDecimalInput(e.target.value))}
                        placeholder="% comissão"
                        className={miniInputClass}
                      />
                      <input
                        inputMode="decimal"
                        value={defaultFixedFee}
                        disabled={saving || !modeEnabled.brand}
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
                        disabled={saving || !modeEnabled.brand}
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
                      disabled={saving || !modeEnabled.brand}
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
                                disabled={saving || !modeEnabled.brand}
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
                                disabled={saving || !modeEnabled.brand}
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
                                  disabled={saving || !modeEnabled.brand}
                                  onChange={(e) =>
                                    updateBrandRule(index, "rate", sanitizeDecimalInput(e.target.value))
                                  }
                                  placeholder="%"
                                  className={miniInputClass}
                                />
                                <input
                                  inputMode="decimal"
                                  value={rule.fixedFee}
                                  disabled={saving || !modeEnabled.brand}
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
                              disabled={saving || brandRules.length === 1 || !modeEnabled.brand}
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
                                    disabled={saving || !modeEnabled.brand}
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
                                    disabled={saving || !modeEnabled.brand}
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
                                    disabled={saving || !modeEnabled.brand}
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
                                    disabled={saving || !modeEnabled.brand}
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

              {channelIsML && (
                <div className={`mb-4 border border-neutral-900 p-3 ${!modeEnabled[activeTab] ? "opacity-40" : ""}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeCondition.enabled}
                      disabled={saving || !modeEnabled[activeTab]}
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
                      <div>
                        <span className="mb-1 block text-[10.5px] text-neutral-500">Clássico</span>
                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                          <input
                            inputMode="decimal"
                            value={activeCondition.classico.rate}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                classico: { ...prev.classico, rate: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="% comissão"
                            className={miniInputClass}
                          />
                          <input
                            inputMode="decimal"
                            value={activeCondition.classico.fixedFee}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                classico: { ...prev.classico, fixedFee: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="Taxa fixa R$"
                            className={miniInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex overflow-hidden border border-neutral-800 text-[10px] shrink-0">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setActiveCondition((prev) => ({
                                  ...prev,
                                  classico: { ...prev.classico, freteMode: "fixed" },
                                }))
                              }
                              className={`px-2 h-9 transition-colors cursor-pointer ${
                                activeCondition.classico.freteMode === "fixed"
                                  ? "bg-neutral-800 text-white"
                                  : "text-neutral-500 hover:text-neutral-300"
                              }`}
                            >
                              R$
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setActiveCondition((prev) => ({
                                  ...prev,
                                  classico: { ...prev.classico, freteMode: "percent" },
                                }))
                              }
                              className={`px-2 h-9 transition-colors cursor-pointer ${
                                activeCondition.classico.freteMode === "percent"
                                  ? "bg-neutral-800 text-white"
                                  : "text-neutral-500 hover:text-neutral-300"
                              }`}
                            >
                              %
                            </button>
                          </div>
                          <input
                            inputMode="decimal"
                            value={activeCondition.classico.frete}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                classico: { ...prev.classico, frete: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="Frete Clássico"
                            className={miniInputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="mb-1 block text-[10.5px] text-neutral-500">Premium</span>
                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                          <input
                            inputMode="decimal"
                            value={activeCondition.premium.rate}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                premium: { ...prev.premium, rate: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="% comissão"
                            className={miniInputClass}
                          />
                          <input
                            inputMode="decimal"
                            value={activeCondition.premium.fixedFee}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                premium: { ...prev.premium, fixedFee: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="Taxa fixa R$"
                            className={miniInputClass}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex overflow-hidden border border-neutral-800 text-[10px] shrink-0">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setActiveCondition((prev) => ({
                                  ...prev,
                                  premium: { ...prev.premium, freteMode: "fixed" },
                                }))
                              }
                              className={`px-2 h-9 transition-colors cursor-pointer ${
                                activeCondition.premium.freteMode === "fixed"
                                  ? "bg-neutral-800 text-white"
                                  : "text-neutral-500 hover:text-neutral-300"
                              }`}
                            >
                              R$
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setActiveCondition((prev) => ({
                                  ...prev,
                                  premium: { ...prev.premium, freteMode: "percent" },
                                }))
                              }
                              className={`px-2 h-9 transition-colors cursor-pointer ${
                                activeCondition.premium.freteMode === "percent"
                                  ? "bg-neutral-800 text-white"
                                  : "text-neutral-500 hover:text-neutral-300"
                              }`}
                            >
                              %
                            </button>
                          </div>
                          <input
                            inputMode="decimal"
                            value={activeCondition.premium.frete}
                            disabled={saving}
                            onChange={(e) =>
                              setActiveCondition((prev) => ({
                                ...prev,
                                premium: { ...prev.premium, frete: sanitizeDecimalInput(e.target.value) },
                              }))
                            }
                            placeholder="Frete Premium"
                            className={miniInputClass}
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-neutral-600">
                        Essa condição é exclusiva do bloco selecionado acima (
                        {activeTab === "flat" ? "Fixo" : activeTab === "tiered" ? "Por Preço" : "Marca"}
                        ). Cada bloco guarda sua própria configuração.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tiered" ? (
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
                <div className={`mb-4 ${!modeEnabled.flat && activeTab === "flat" ? "opacity-40" : ""}`}>
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
                        onClick={() => setFreteMode("fixed")}
                        className={`px-2 py-0.5 transition-colors cursor-pointer ${
                          freteMode === "fixed" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setFreteMode("percent")}
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
            disabled={saving || loading}
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
