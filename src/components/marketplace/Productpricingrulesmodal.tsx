"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Tag, AlertCircle, Trash2 } from "lucide-react";
import { sanitizeDecimalInput, formatDecimalOnBlur } from "@/components/costs/hooks/utils";
import {
  loadProductPricingRule,
  saveProductPricingRule,
  deleteProductPricingRule,
  ProductPricingRule,
} from "@/components/marketplace/hooks/useproductpricingrules";
import { toast } from "sonner";

const ACCENT = "#1a8ceb";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: string;
  store: string;
  idBling: string;
  referencia?: string;
  brand?: string;
  onApplied?: () => void;
};

const isMercadoLivre = (channel: string) =>
  channel.trim().toLocaleLowerCase("pt-BR").includes("mercado livre");

function parseValue(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = parseFloat(raw.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function toPercentDisplay(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "";
  const pct = Math.round(rate * 100 * 1e6) / 1e6;
  return String(pct);
}

const miniInputClass = `
  h-9 w-full border border-neutral-800 bg-transparent px-2 text-[12.5px] text-white
  placeholder:text-neutral-600 outline-none transition-colors
  focus:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
  disabled:opacity-40
`;

export default function ProductPricingRulesModal({
  open,
  onOpenChange,
  channel,
  store,
  idBling,
  referencia,
  brand,
  onApplied,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingRule, setHasExistingRule] = useState(false);

  const [classicoRate, setClassicoRate] = useState("");
  const [classicoFixedFee, setClassicoFixedFee] = useState("");
  const [freteClassico, setFreteClassico] = useState("");
  const [freteClassicoMode, setFreteClassicoMode] = useState<"fixed" | "percent">("fixed");

  const [premiumRate, setPremiumRate] = useState("");
  const [premiumFixedFee, setPremiumFixedFee] = useState("");
  const [fretePremium, setFretePremium] = useState("");
  const [fretePremiumMode, setFretePremiumMode] = useState<"fixed" | "percent">("fixed");

  const channelIsML = isMercadoLivre(channel);

  const resetState = useCallback(() => {
    setClassicoRate("");
    setClassicoFixedFee("");
    setFreteClassico("");
    setFreteClassicoMode("fixed");
    setPremiumRate("");
    setPremiumFixedFee("");
    setFretePremium("");
    setFretePremiumMode("fixed");
    setHasExistingRule(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open || !channel || !store || !idBling) return;
    setLoading(true);
    setError(null);

    loadProductPricingRule({ channel, store, id_bling: idBling })
      .then((rule) => {
        if (rule) {
          setHasExistingRule(true);
          setClassicoRate(toPercentDisplay(rule.classico_rate));
          setClassicoFixedFee(rule.classico_fixed_fee != null ? String(rule.classico_fixed_fee) : "");
          setFreteClassico(rule.frete_classico != null ? String(rule.frete_classico) : "");
          setFreteClassicoMode(rule.frete_classico_mode ?? "fixed");

          setPremiumRate(toPercentDisplay(rule.premium_rate));
          setPremiumFixedFee(rule.premium_fixed_fee != null ? String(rule.premium_fixed_fee) : "");
          setFretePremium(rule.frete_premium != null ? String(rule.frete_premium) : "");
          setFretePremiumMode(rule.frete_premium_mode ?? "fixed");
        } else {
          setHasExistingRule(false);
        }
      })
      .catch(() => setError("Não foi possível carregar a regra deste produto."))
      .finally(() => setLoading(false));
  }, [open, channel, store, idBling]);

  const handleClose = useCallback(
    (v: boolean) => {
      if (v && (saving || deleting)) return;
      if (!v) resetState();
      onOpenChange(v);
    },
    [saving, deleting, onOpenChange, resetState]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: ProductPricingRule = {
        channel,
        store,
        id_bling: idBling,
        referencia: referencia ?? null,
        brand: brand ?? null,
        classico_rate:
          parseValue(classicoRate) != null ? parseValue(classicoRate)! / 100 : null,
        classico_fixed_fee: parseValue(classicoFixedFee),
        frete_classico: parseValue(freteClassico),
        frete_classico_mode: freteClassicoMode,
        premium_rate:
          parseValue(premiumRate) != null ? parseValue(premiumRate)! / 100 : null,
        premium_fixed_fee: parseValue(premiumFixedFee),
        frete_premium: parseValue(fretePremium),
        frete_premium_mode: fretePremiumMode,
      };

      await saveProductPricingRule(payload);
      toast.success("Regra do produto salva e preço recalculado.");
      onApplied?.();
      resetState();
      onOpenChange(false);
    } catch {
      setError("Erro ao salvar a regra deste produto. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [
    channel,
    store,
    idBling,
    referencia,
    brand,
    classicoRate,
    classicoFixedFee,
    freteClassico,
    freteClassicoMode,
    premiumRate,
    premiumFixedFee,
    fretePremium,
    fretePremiumMode,
    onApplied,
    onOpenChange,
    resetState,
  ]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteProductPricingRule({ channel, store, id_bling: idBling });
      toast.success("Regra do produto removida. Voltando à regra geral do canal.");
      onApplied?.();
      resetState();
      onOpenChange(false);
    } catch {
      setError("Erro ao remover a regra deste produto.");
    } finally {
      setDeleting(false);
    }
  }, [channel, store, idBling, onApplied, onOpenChange, resetState]);

  if (!channelIsML) {
    // Regra por produto hoje só faz sentido com listing_type (Clássico/Premium),
    // exclusivo do Mercado Livre. Para outros canais, não exibimos o modal.
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (saving || deleting) {
            e.preventDefault();
            return;
          }
          handleClose(false);
        }}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-lg sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">
              Regra específica do produto
            </DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {channel} · {store} · ID Bling {idBling}
            {referencia ? ` · Ref. ${referencia}` : ""}
          </p>
          <p className="mt-1 text-[10.5px] text-neutral-600">
            Tem prioridade máxima sobre a regra do canal e da marca. Deixe em branco
            para usar a regra geral do canal.
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
                  Clássico
                </span>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <input
                    inputMode="decimal"
                    value={classicoRate}
                    disabled={saving || deleting}
                    onChange={(e) => setClassicoRate(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => setClassicoRate(formatDecimalOnBlur(classicoRate))}
                    placeholder="% comissão"
                    className={miniInputClass}
                  />
                  <input
                    inputMode="decimal"
                    value={classicoFixedFee}
                    disabled={saving || deleting}
                    onChange={(e) => setClassicoFixedFee(sanitizeDecimalInput(e.target.value))}
                    placeholder="Taxa fixa R$"
                    className={miniInputClass}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex overflow-hidden border border-neutral-800 text-[10px] shrink-0">
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => setFreteClassicoMode("fixed")}
                      className={`px-2 h-9 transition-colors cursor-pointer ${
                        freteClassicoMode === "fixed"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => setFreteClassicoMode("percent")}
                      className={`px-2 h-9 transition-colors cursor-pointer ${
                        freteClassicoMode === "percent"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    inputMode="decimal"
                    value={freteClassico}
                    disabled={saving || deleting}
                    onChange={(e) => setFreteClassico(sanitizeDecimalInput(e.target.value))}
                    placeholder="Frete Clássico"
                    className={miniInputClass}
                  />
                </div>
              </div>

              <div className="mb-4">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Premium
                </span>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <input
                    inputMode="decimal"
                    value={premiumRate}
                    disabled={saving || deleting}
                    onChange={(e) => setPremiumRate(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => setPremiumRate(formatDecimalOnBlur(premiumRate))}
                    placeholder="% comissão"
                    className={miniInputClass}
                  />
                  <input
                    inputMode="decimal"
                    value={premiumFixedFee}
                    disabled={saving || deleting}
                    onChange={(e) => setPremiumFixedFee(sanitizeDecimalInput(e.target.value))}
                    placeholder="Taxa fixa R$"
                    className={miniInputClass}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex overflow-hidden border border-neutral-800 text-[10px] shrink-0">
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => setFretePremiumMode("fixed")}
                      className={`px-2 h-9 transition-colors cursor-pointer ${
                        fretePremiumMode === "fixed"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => setFretePremiumMode("percent")}
                      className={`px-2 h-9 transition-colors cursor-pointer ${
                        fretePremiumMode === "percent"
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    inputMode="decimal"
                    value={fretePremium}
                    disabled={saving || deleting}
                    onChange={(e) => setFretePremium(sanitizeDecimalInput(e.target.value))}
                    placeholder="Frete Premium"
                    className={miniInputClass}
                  />
                </div>
              </div>

              {error && (
                <p className="mt-3 flex items-center gap-1 text-[10.5px] text-red-400">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {error}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
          {hasExistingRule ? (
            <button
              type="button"
              disabled={saving || deleting || loading}
              onClick={handleDelete}
              className="flex h-11 items-center justify-center gap-2 border border-red-900/50 text-sm text-red-400 transition-colors hover:bg-red-950/30 cursor-pointer disabled:opacity-50 sm:h-10 sm:px-4"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remover regra
            </button>
          ) : (
            <span />
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => handleClose(false)}
              className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || deleting || loading}
              onClick={handleSave}
              className="flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium transition-colors sm:h-10 sm:w-auto sm:px-6 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar regra"}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
