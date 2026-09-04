"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Loader2,
  Package,
  Percent,
  AlertCircle,
  ClipboardList,
  Store,
  Globe,
  Boxes,
  ChevronDown,
  Check,
  Search,
  Radio,
  Tag,
} from "lucide-react";

import {
  CostAdjustments as CostAdjustmentsType,
  DEFAULT_COST_ADJUSTMENTS,
  Custo,
} from "@/components/costs/hooks/types";
import { sanitizeDecimalInput, formatDecimalOnBlur } from "@/components/costs/hooks/utils";

import {
  loadDistinctStores,
  loadDistinctChannels,
  loadDistinctBrands,
} from "@/components/costs/hooks/usepricingrules";

export type EmbalagemMode = "fixed" | "percent";
export type RuleScope = "global" | "store" | "channel" | "product";

export type ApplyPayload = CostAdjustmentsType & {
  embalagemMode: EmbalagemMode;
  scope: RuleScope;
  store?: string;
  channel?: string;
  brand?: string;
};

export type ApplyResult = {
  success: boolean;
  error?: string;
  counts?: {
    costsUpdated: number;
    rulesCreated: number;
  };
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedRows: Custo[];
  onApply: (values: ApplyPayload) => Promise<ApplyResult>;
  applying?: boolean;
  existingRules?: Partial<Record<keyof CostAdjustmentsType, number>>;
};

/** Cores e ícones */
const ACCENT = "#1a8ceb";

/** Tipos de configuração */
type FieldConfig = {
  key: keyof CostAdjustmentsType;
  label: string;
  suffix: "R$" | "%";
  min?: number;
  max?: number;
};

/** Campos de custos e regras */
const COST_FIELDS: FieldConfig[] = [
  { key: "embalagem", label: "Embalagem", suffix: "R$", min: 0 },
];

const RULE_FIELDS: FieldConfig[] = [
  { key: "imposto", label: "Imposto", suffix: "%", min: 0, max: 100 },
  { key: "marketing", label: "Marketing", suffix: "%", min: 0, max: 100 },
  { key: "desconto", label: "Desconto", suffix: "%", min: 0, max: 100 },
  { key: "margemMinima", label: "Mínimo de Margem", suffix: "%", min: 0, max: 100 },
];

const ALL_FIELDS: FieldConfig[] = [...COST_FIELDS, ...RULE_FIELDS];

/** Abas de escopo */
const SCOPE_TABS: { key: RuleScope; label: string; icon: React.ReactNode }[] = [
  { key: "global", label: "Global", icon: <Globe className="h-3.5 w-3.5" /> },
  { key: "store", label: "Loja", icon: <Store className="h-3.5 w-3.5" /> },
  { key: "channel", label: "Canal", icon: <Radio className="h-3.5 w-3.5" /> },
  { key: "product", label: "Produto", icon: <Boxes className="h-3.5 w-3.5" /> },
];

/** Componente cabeçalho das seções */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center border border-neutral-800 text-neutral-500">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-300">{title}</p>
        <p className="text-[10px] text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

/** Formata valor monetário */
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Parse num string BR ("12,34") */
function parseValue(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = parseFloat(raw.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

/** Validação simples em campos */
function validateField(field: FieldConfig, raw: string): string | null {
  const parsed = parseValue(raw);
  if (parsed === null) return null;
  if (field.min !== undefined && parsed < field.min) {
    return `Mín: ${field.min}${field.suffix === "%" ? "%" : ""}`;
  }
  if (field.max !== undefined && parsed > field.max) {
    return `Máx: ${field.max}${field.suffix === "%" ? "%" : ""}`;
  }
  return null;
}

/** Componente de campo ajustável */
function AdjustmentField({
  label,
  value,
  onChange,
  onBlur,
  suffix,
  disabled,
  existingRate,
  previewText,
  error,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  suffix: "R$" | "%";
  disabled: boolean;
  existingRate?: number;
  previewText?: string | null;
  error?: string | null;
  toggle?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {toggle}
          {existingRate !== undefined && (
            <span
              className="rounded-none border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-400"
              title="Regra ativa será sobrescrita"
            >
              já possui regra ativa: {existingRate}%
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{suffix}</span>
        <input
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(sanitizeDecimalInput(e.target.value))}
          onBlur={onBlur}
          placeholder="0,00"
          aria-label={label}
          aria-invalid={!!error}
          className={`
            h-10 w-full rounded-none border bg-transparent
            pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors
            focus-visible:ring-1
            disabled:cursor-not-allowed disabled:opacity-40
            ${
              error
                ? "border-red-500/70 focus:border-red-500 focus-visible:ring-red-500"
                : "border-neutral-800 focus:border-[#1a8ceb]/60 focus-visible:ring-[#1a8ceb]"
            }
          `}
        />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[10.5px] text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
      {!error && previewText && <p className="mt-1 text-[10.5px] text-neutral-500">{previewText}</p>}
    </div>
  );
}

/** Dropdown genérico (loja/canal/marca) — com portal, sem scroll duplo.
 *  data-cost-portal identifica o menu para o DialogContent ignorar
 *  "clique fora" quando o clique acontece dentro dele (ver onPointerDownOutside). */
function OptionDropdown({
  options,
  selected,
  onSelect,
  loading,
  disabled,
  icon,
  placeholder,
  loadingLabel,
  searchPlaceholder,
  emptyLabel,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  loading: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  placeholder: string;
  loadingLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  // Fecha o dropdown se qualquer container ancestral rolar (evita menu desalinhado)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Fecha ao clicar fora (botão + menu, já que o menu está em portal)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedButton && !clickedMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setSearch("");
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return options;
    return options.filter((s) => s.toLowerCase().includes(term));
  }, [options, search]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  const isDisabled = disabled || loading;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((v) => !v)}
        className={`
          flex h-10 w-full items-center justify-between gap-2 border bg-transparent px-3 text-sm
          outline-none transition-colors cursor-pointer
          ${open ? "border-[#1a8ceb]/60" : "border-neutral-800 hover:border-neutral-700"}
          disabled:cursor-not-allowed disabled:opacity-50
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className={selected ? "text-white" : "text-neutral-500"}>
            {loading ? loadingLabel : selected || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted &&
        open &&
        !isDisabled &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            data-cost-portal=""
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="border border-neutral-800 bg-[#0a0a0a] shadow-2xl"
          >
            <div className="relative border-b border-neutral-900 px-3 pt-2 pb-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent pl-9 pr-3 text-xs text-white outline-none placeholder:text-neutral-600"
              />
            </div>
            <div className="max-h-36 overflow-y-auto py-1">
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-neutral-600">{emptyLabel}</div>
              )}
              {filteredOptions.map((s) => {
                const selectedFlag = s === selected;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors cursor-pointer ${
                      selectedFlag
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-400 hover:bg-neutral-900/70 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{s}</span>
                    {selectedFlag && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** Componente modal ajustado com dropdown custom de loja/canal/marca e embalagem liberada para os escopos aplicáveis */
export default function CostAdjustmentsModal({
  open,
  onOpenChange,
  selectedRows,
  onApply,
  applying = false,
  existingRules,
}: Props) {
  const [values, setValues] = useState<CostAdjustmentsType>(DEFAULT_COST_ADJUSTMENTS);
  const [embalagemMode, setEmbalagemMode] = useState<EmbalagemMode>("fixed");
  const [showSummary, setShowSummary] = useState(false);
  const [scope, setScope] = useState<RuleScope>(selectedRows.length > 0 ? "product" : "global");
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Marca — escopo adicional exclusivo do campo Desconto (rules_brand no SQL)
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [loadingBrands, setLoadingBrands] = useState(false);

  useEffect(() => {
    setScope(selectedRows.length > 0 ? "product" : "global");
  }, [selectedRows.length, open]);

  useEffect(() => {
    if (scope !== "store" || stores.length > 0) return;
    setLoadingStores(true);
    loadDistinctStores()
      .then(setStores)
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, [scope, stores.length]);

  useEffect(() => {
    if (scope !== "channel" || channels.length > 0) return;
    setLoadingChannels(true);
    loadDistinctChannels()
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoadingChannels(false));
  }, [scope, channels.length]);

  // Carrega marcas apenas quando o campo Desconto estiver preenchido
  const descontoFilled = parseValue(values.desconto) !== null;
  useEffect(() => {
    if (!descontoFilled || brands.length > 0) return;
    setLoadingBrands(true);
    loadDistinctBrands()
      .then(setBrands)
      .catch(() => setBrands([]))
      .finally(() => setLoadingBrands(false));
  }, [descontoFilled, brands.length]);

  // Limpa a marca selecionada se o campo Desconto for esvaziado
  useEffect(() => {
    if (!descontoFilled && selectedBrand) {
      setSelectedBrand("");
    }
  }, [descontoFilled, selectedBrand]);

  const update = useCallback((k: keyof CostAdjustmentsType, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
  }, []);

  const handleBlur = useCallback((k: keyof CostAdjustmentsType) => {
    setValues((p) => ({ ...p, [k]: formatDecimalOnBlur(p[k]) }));
  }, []);

  const errors = useMemo(() => {
    const errs: Partial<Record<keyof CostAdjustmentsType, string>> = {};
    for (const f of ALL_FIELDS) {
      const ef =
        f.key === "embalagem" && embalagemMode === "percent"
          ? { ...f, suffix: "%" as const, min: 0, max: 100 }
          : f;
      const e = validateField(ef, values[f.key]);
      if (e) errs[f.key] = e;
    }
    return errs;
  }, [values, embalagemMode]);

  const hasErrors = Object.keys(errors).length > 0;
  const hasAny = useMemo(() => Object.values(values).some((v) => v.trim() !== ""), [values]);
  const isProductScope = scope === "product";
  const isStoreScope = scope === "store";
  const isChannelScope = scope === "channel";
  const isGlobalScope = scope === "global";

  const targetLabel = useMemo(() => {
    if (isGlobalScope) return "Todos os produtos (regra global)";
    if (isStoreScope) return selectedStore ? `Loja: ${selectedStore}` : "Selecione uma loja";
    if (isChannelScope) return selectedChannel ? `Canal: ${selectedChannel}` : "Selecione um canal";
    return `${selectedRows.length} produto(s) selecionado(s)`;
  }, [isGlobalScope, isStoreScope, isChannelScope, selectedStore, selectedChannel, selectedRows.length]);

  const sampleProduct = selectedRows[0];

  const getPreview = useCallback(
    (k: keyof CostAdjustmentsType, s: "R$" | "%") => {
      if (!isProductScope || !sampleProduct) return null;
      if (errors[k]) return null;
      const v = parseValue(values[k]);
      if (v === null) return null;
      const base = sampleProduct.current_cost ?? 0;
      if (base <= 0) return null;

      if (k === "embalagem" && embalagemMode === "percent") {
        const res = base * (1 + v / 100);
        return `Ex: ${sampleProduct.code} → ${formatCurrency(base)} (+${v}%) = ${formatCurrency(res)}`;
      }

      if (s === "R$") {
        const res = base + v;
        return `Ex: ${sampleProduct.code} → ${formatCurrency(base)} + ${formatCurrency(v)} = ${formatCurrency(res)}`;
      }

      if (k === "margemMinima") {
        return `Piso de margem: vendas com margem abaixo de ${v}% serão sinalizadas/bloqueadas`;
      }

      if (k === "desconto") {
        const res = base * (1 - v / 100);
        return `Ex: ${sampleProduct.code} → ${formatCurrency(base)} (-${v}%) = ${formatCurrency(res)}`;
      }

      const res = base * (1 + v / 100);
      const sign = v >= 0 ? "+" : "";
      return `Ex: ${sampleProduct.code} → ${formatCurrency(base)} (${sign}${v}%) = ${formatCurrency(res)}`;
    },
    [sampleProduct, values, errors, embalagemMode, isProductScope]
  );

  const embalagemPreview = useMemo(() => {
    if (isProductScope) {
      return getPreview("embalagem", "R$");
    }
    if (isGlobalScope) {
      return "Será aplicado a todos os produtos";
    }
    if (isStoreScope) {
      return selectedStore
        ? `Será aplicado a todos os produtos da loja: ${selectedStore}`
        : "Selecione uma loja para aplicar";
    }
    if (isChannelScope) {
      return "Embalagem não se aplica ao escopo Canal (custo direto do produto)";
    }
    return null;
  }, [isProductScope, isGlobalScope, isStoreScope, isChannelScope, selectedStore, getPreview]);

  const descontoBrandPreview = useMemo(() => {
    if (!descontoFilled) return null;
    return selectedBrand
      ? `Desconto será aplicado apenas para a marca: ${selectedBrand}`
      : "Nenhuma marca selecionada — Desconto seguirá o escopo principal";
  }, [descontoFilled, selectedBrand]);

  const summary = useMemo(() => {
    const productCount = isProductScope ? selectedRows.length : 0;
    const embalagemFilled = !isChannelScope && parseValue(values.embalagem) !== null;
    const rulesFilledCount = RULE_FIELDS.filter((f) => parseValue(values[f.key]) !== null).length;

    const rulesAffected = isProductScope ? rulesFilledCount * productCount : rulesFilledCount;

    const costsAffected = embalagemFilled ? (isProductScope ? productCount : null) : 0;

    return { rulesAffected, costsAffected, productCount, embalagemFilled, rulesFilledCount };
  }, [values, isProductScope, isChannelScope, selectedRows.length]);

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (summary.costsAffected !== 0) {
      parts.push(
        summary.costsAffected === null
          ? "custo de embalagem de todos os produtos"
          : `${summary.costsAffected} custo(s) de embalagem`
      );
    }
    if (summary.rulesAffected > 0) parts.push(`${summary.rulesAffected} regra(s) de precificação`);
    if (parts.length === 0) return "Nenhuma alteração pendente";
    return `Isso vai atualizar: ${parts.join(" • ")}`;
  }, [summary]);

  const resetState = useCallback(() => {
    setValues(DEFAULT_COST_ADJUSTMENTS);
    setEmbalagemMode("fixed");
    setShowSummary(false);
    setSelectedStore("");
    setSelectedChannel("");
    setSelectedBrand("");
  }, []);

  const handleApply = useCallback(async () => {
    if (!hasAny || applying || hasErrors) return;
    if (isStoreScope && !selectedStore) return;
    if (isChannelScope && !selectedChannel) return;
    const payload: ApplyPayload = {
      ...values,
      embalagemMode,
      scope,
    };
    if (isStoreScope) payload.store = selectedStore;
    if (isChannelScope) payload.channel = selectedChannel;
    if (descontoFilled && selectedBrand) payload.brand = selectedBrand;
    const r = await onApply(payload);
    if (r.success) {
      resetState();
      onOpenChange(false);
    }
  }, [
    hasAny,
    applying,
    hasErrors,
    isStoreScope,
    isChannelScope,
    selectedStore,
    selectedChannel,
    descontoFilled,
    selectedBrand,
    onApply,
    values,
    embalagemMode,
    scope,
    resetState,
    onOpenChange,
  ]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && applying) return;
      if (!v) resetState();
      onOpenChange(v);
    },
    [applying, onOpenChange, resetState]
  );

  const canApply =
    hasAny &&
    !hasErrors &&
    (!isStoreScope || !!selectedStore) &&
    (!isChannelScope || !!selectedChannel);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-cost-portal]")) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-cost-portal]")) {
            e.preventDefault();
          }
        }}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-md sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {/* Cabeçalho */}
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">Ajustes em massa</DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{targetLabel}</p>
        </DialogHeader>

        {/* Seletor de escopo */}
        <div className="mt-3 flex shrink-0 gap-1 border border-neutral-800 p-1">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={applying}
              onClick={() => setScope(tab.key)}
              className={`
              flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer
              ${scope === tab.key ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"}
              ${applying ? "cursor-not-allowed opacity-50" : ""}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown Loja custom */}
        {scope === "store" && (
          <div className="mt-3">
            <OptionDropdown
              options={stores}
              selected={selectedStore}
              onSelect={setSelectedStore}
              loading={loadingStores}
              disabled={applying}
              icon={<Store className="h-3.5 w-3.5 shrink-0 text-neutral-500" />}
              placeholder="Selecione uma loja"
              loadingLabel="Carregando lojas..."
              searchPlaceholder="Buscar loja..."
              emptyLabel="Nenhuma loja encontrada"
            />
          </div>
        )}

        {/* Dropdown Canal custom */}
        {scope === "channel" && (
          <div className="mt-3">
            <OptionDropdown
              options={channels}
              selected={selectedChannel}
              onSelect={setSelectedChannel}
              loading={loadingChannels}
              disabled={applying}
              icon={<Radio className="h-3.5 w-3.5 shrink-0 text-neutral-500" />}
              placeholder="Selecione um canal"
              loadingLabel="Carregando canais..."
              searchPlaceholder="Buscar canal..."
              emptyLabel="Nenhum canal encontrado"
            />
          </div>
        )}

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          {/* Custo */}
          <div>
            <SectionHeader
              icon={<Package className="h-3.5 w-3.5" />}
              title="Custo direto"
              description="Atualiza o valor de embalagem na tabela de custos, para todos os produtos do escopo selecionado"
            />
            <div className="space-y-3">
              {COST_FIELDS.map((field) => (
                <AdjustmentField
                  key={field.key}
                  label={field.label}
                  value={values[field.key]}
                  onChange={(v) => update(field.key, v)}
                  onBlur={() => handleBlur(field.key)}
                  suffix={embalagemMode === "percent" ? "%" : field.suffix}
                  disabled={applying || isChannelScope}
                  error={errors[field.key]}
                  previewText={embalagemPreview}
                  toggle={
                    <div className="flex overflow-hidden border border-neutral-800 text-[10px]">
                      <button
                        type="button"
                        disabled={applying || isChannelScope}
                        onClick={() => setEmbalagemMode("fixed")}
                        className={`px-2 py-0.5 transition-colors cursor-pointer ${
                          embalagemMode === "fixed" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        disabled={applying || isChannelScope}
                        onClick={() => setEmbalagemMode("percent")}
                        className={`px-2 py-0.5 transition-colors cursor-pointer ${
                          embalagemMode === "percent" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>

          <div className="my-5 h-px bg-neutral-900" />

          {/* Regras */}
          <div>
            <SectionHeader
              icon={<Percent className="h-3.5 w-3.5" />}
              title="Regras de precificação"
              description={
                isGlobalScope
                  ? "Aplicado como regra global (todos os produtos)"
                  : isStoreScope
                  ? "Aplicado apenas para a loja selecionada"
                  : isChannelScope
                  ? "Aplicado apenas para o canal selecionado"
                  : "Aplicado como regra específica por produto"
              }
            />
            <div className="space-y-3">
              {RULE_FIELDS.map((f) => (
                <React.Fragment key={f.key}>
                  <AdjustmentField
                    label={f.label}
                    value={values[f.key]}
                    onChange={(v) => update(f.key, v)}
                    onBlur={() => handleBlur(f.key)}
                    suffix={f.suffix}
                    disabled={applying}
                    error={errors[f.key]}
                    existingRate={existingRules?.[f.key]}
                    previewText={f.key === "desconto" ? descontoBrandPreview : getPreview(f.key, f.suffix)}
                  />

                  {/* Seletor de marca — exclusivo do campo Desconto */}
                  {f.key === "desconto" && descontoFilled && (
                    <div className="pl-1">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-neutral-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                          Restringir por marca (opcional)
                        </span>
                      </div>
                      <OptionDropdown
                        options={brands}
                        selected={selectedBrand}
                        onSelect={setSelectedBrand}
                        loading={loadingBrands}
                        disabled={applying}
                        icon={<Tag className="h-3.5 w-3.5 shrink-0 text-neutral-500" />}
                        placeholder="Todas as marcas"
                        loadingLabel="Carregando marcas..."
                        searchPlaceholder="Buscar marca..."
                        emptyLabel="Nenhuma marca encontrada"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Resumo */}
          {hasAny && !hasErrors && (
            <div className="mt-5 border border-neutral-800">
              <button
                type="button"
                onClick={() => setShowSummary((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left cursor-pointer"
              >
                <span className="flex items-center gap-2 text-[11px] font-medium text-neutral-300">
                  <ClipboardList className="h-3.5 w-3.5 text-neutral-500" />
                  Resumo do que será aplicado
                </span>
                <span className="text-[10px] text-neutral-500">{showSummary ? "ocultar" : "ver detalhes"}</span>
              </button>
              {showSummary && (
                <div className="border-t border-neutral-900 px-3 py-2">
                  <p className="text-[11px] text-neutral-400">{summaryText}</p>
                  <ul className="mt-1.5 space-y-0.5 text-[10.5px] text-neutral-500">
                    <li>
                      Escopo:{" "}
                      {isGlobalScope
                        ? "Global (todos os produtos)"
                        : isStoreScope
                        ? `Loja: ${selectedStore}`
                        : isChannelScope
                        ? `Canal: ${selectedChannel}`
                        : `${selectedRows.length} produto(s)`}
                    </li>
                    {summary.embalagemFilled && (
                      <li>
                        Embalagem: {values.embalagem}
                        {embalagemMode === "percent" ? "%" : " R$"}
                        {!isProductScope && " (todos os produtos do escopo)"}
                      </li>
                    )}
                    {summary.rulesFilledCount > 0 && (
                      <li>Campos de regra preenchidos: {summary.rulesFilledCount}</li>
                    )}
                    {descontoFilled && selectedBrand && (
                      <li>Desconto restrito à marca: {selectedBrand}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={applying}
            onClick={() => handleOpenChange(false)}
            className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={handleApply}
            title={
              !hasAny
                ? "Preencha ao menos um campo para aplicar"
                : hasErrors
                ? "Corrija os campos com erro"
                : isStoreScope && !selectedStore
                ? "Selecione uma loja"
                : isChannelScope && !selectedChannel
                ? "Selecione um canal"
                : undefined
            }
            className={`
              flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium
              transition-colors sm:h-10 sm:w-auto sm:px-6
              disabled:cursor-not-allowed disabled:opacity-50
              ${canApply ? "cursor-pointer" : ""}
            `}
            style={canApply ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}
            onMouseEnter={(e) => {
              if (canApply) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3b9df0";
            }}
            onMouseLeave={(e) => {
              if (canApply) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
            }}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar ajustes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
