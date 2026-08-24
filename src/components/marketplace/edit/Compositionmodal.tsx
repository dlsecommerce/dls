"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Percent,
  TrendingUp,
  Store,
  Radio,
  Wand2,
  Copy,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ───────────────────────────────
// Constantes
// ───────────────────────────────

const MARGEM_MINIMA_SAUDAVEL = 10; // %
const MARGEM_MINIMA_VIAVEL = 5; // % usada na sugestão automática
const AZUL = "#1a8ceb";

// ───────────────────────────────
// Helpers de formatação/parsing/cálculo
// ───────────────────────────────

function calcularPrecoVenda(
  custoBase: number,
  commissionRate: number,
  profitMargin: number
): number {
  const percentualTotal = (Number(commissionRate) || 0) / 100 + (Number(profitMargin) || 0) / 100;
  if (percentualTotal >= 1) return 0;
  const preco = custoBase / (1 - percentualTotal);
  return Number.isFinite(preco) ? preco : 0;
}

const formatBR = (v: any) => {
  const num = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(num)) return "0,00";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseInputNumber = (raw: string): number => {
  if (!raw || !String(raw).trim()) return 0;
  let str = String(raw).trim().replace(/[^\d.,-]/g, "");
  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");
  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
};

function margemStatus(margem: number, invalido: boolean): "danger" | "warning" | "ok" {
  if (invalido || margem < 0) return "danger";
  if (margem < MARGEM_MINIMA_SAUDAVEL) return "warning";
  return "ok";
}

const STATUS_COLORS = {
  ok: { text: "text-emerald-400", bg: "bg-emerald-400", border: "border-emerald-400/40" },
  warning: { text: "text-red-400", bg: "bg-red-400", border: "border-red-400/40" },
  danger: { text: "text-red-400", bg: "bg-red-400", border: "border-red-400/40" },
};

// ───────────────────────────────
// Campo numérico editável
// ───────────────────────────────

function EditableNumberField({
  label,
  value,
  onChange,
  prefix,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rawValue, setRawValue] = useState("");

  const displayValue = isEditing ? rawValue : formatBR(value);

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {icon}
        {label}
      </label>
      <div
        className={`flex h-10 items-center border bg-neutral-950 px-3 transition-colors focus-within:border-[${AZUL}]/60 ${
          highlight ? `border-[${AZUL}]/40 bg-[${AZUL}]/[0.03]` : "border-neutral-800"
        }`}
      >
        {prefix && <span className="mr-1.5 text-[12px] font-medium text-neutral-500">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={() => {
            setIsEditing(true);
            setRawValue(formatBR(value));
          }}
          onChange={(e) => setRawValue(e.target.value)}
          onBlur={() => {
            const parsed = parseInputNumber(rawValue);
            onChange(parsed);
            setIsEditing(false);
          }}
          className="w-full bg-transparent text-[14px] font-semibold text-white outline-none"
        />
      </div>
    </div>
  );
}

// Skeleton shimmer
function FieldSkeleton() {
  return (
    <div>
      <div className="mb-1.5 h-2.5 w-16 bg-neutral-800 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-neutral-700/60 to-transparent" />
      </div>
      <div className="h-10 border border-neutral-800 bg-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-neutral-800/60 to-transparent" />
      </div>
    </div>
  );
}

// ───────────────────────────────
// Modal principal
// ───────────────────────────────

interface MarketplaceData {
  product: string;
  store: string;
  channel: string;
  current_cost: number;
  freight: number;
  commission_rate: number;
  profit_margin: number;
}

const EMPTY_DATA: MarketplaceData = {
  product: "",
  store: "",
  channel: "",
  current_cost: 0,
  freight: 0,
  commission_rate: 0,
  profit_margin: 0,
};

export default function MarketplacePricingModal({
  open,
  onClose,
  marketplaceId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  marketplaceId: string | null;
  onSuccess?: (updated?: { id: string; selling_price: number }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MarketplaceData>(EMPTY_DATA);
  const [precoAnterior, setPrecoAnterior] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const carregouRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !marketplaceId) return;
    if (carregouRef.current === marketplaceId) return;

    setLoading(true);
    setError(null);

    (async () => {
      const { data: row, error } = await supabase
        .schema("newsystem")
        .from("marketplace")
        .select("product, store, channel, current_cost, freight, commission_rate, profit_margin, selling_price")
        .eq("id", marketplaceId)
        .single();

      if (error || !row) {
        setError("Não foi possível carregar os dados.");
        setLoading(false);
        return;
      }

      const loaded: MarketplaceData = {
        product: row.product || "",
        store: row.store || "",
        channel: row.channel || "",
        current_cost: Number(row.current_cost) || 0,
        freight: Number(row.freight) || 0,
        commission_rate: Number(row.commission_rate) || 0,
        profit_margin: Number(row.profit_margin) || 0,
      };

      setData(loaded);
      setPrecoAnterior(Number(row.selling_price) || 0);
      carregouRef.current = marketplaceId;
      setLoading(false);
    })();
  }, [open, marketplaceId]);

  useEffect(() => {
    if (!open) carregouRef.current = null;
  }, [open]);

  const custoBase = data.current_cost + data.freight;

  const precoFinal = useMemo(
    () => calcularPrecoVenda(custoBase, data.commission_rate, data.profit_margin),
    [custoBase, data.commission_rate, data.profit_margin]
  );

  const percentualTotal = (data.commission_rate + data.profit_margin) / 100;
  const percentualInvalido = percentualTotal >= 1 || data.profit_margin < 0;

  const status = margemStatus(data.profit_margin, percentualInvalido);
  const statusColor = STATUS_COLORS[status];

  const valorComissao = precoFinal * (data.commission_rate / 100);
  const valorMargem = precoFinal * (data.profit_margin / 100);

  const diferenca = precoFinal - precoAnterior;
  const percentualMudanca = precoAnterior > 0 ? (diferenca / precoAnterior) * 100 : 0;

  const faltaParaSaudavel = status === "warning" ? MARGEM_MINIMA_SAUDAVEL - data.profit_margin : 0;

  const bordaResultado =
    percentualInvalido || data.profit_margin <= 0 ? "border-red-500/50" : "border-emerald-500/50";

  const handleSugerirMinimo = () => {
    const margemMaxima = 99 - data.commission_rate;
    const margemSugerida = Math.max(MARGEM_MINIMA_VIAVEL, Math.min(MARGEM_MINIMA_VIAVEL, margemMaxima));
    setData((prev) => ({ ...prev, profit_margin: margemSugerida }));
  };

  const handleCopiarPreco = async () => {
    try {
      await navigator.clipboard.writeText(formatBR(precoFinal));
      setCopiado(true);
      toast.success("Preço copiado!");
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleSalvar = useCallback(async () => {
    if (!marketplaceId || percentualInvalido || saving || loading) return;
    setSaving(true);

    const { error } = await supabase
      .schema("newsystem")
      .from("marketplace")
      .update({
        freight: data.freight,
        commission_rate: data.commission_rate,
        profit_margin: data.profit_margin,
        selling_price: precoFinal,
      })
      .eq("id", marketplaceId);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar. Tente novamente.");
      return;
    }

    toast.success("Preço atualizado!");
    onSuccess?.({ id: marketplaceId, selling_price: precoFinal });
    onClose();
  }, [marketplaceId, data, precoFinal, percentualInvalido, saving, loading, onSuccess, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSalvar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleSalvar]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="
          !rounded-none bg-[#0a0a0a]/95 backdrop-blur-xl border border-neutral-800 shadow-2xl
          w-[calc(100vw-16px)] max-w-[calc(100vw-16px)]
          sm:w-[95%] sm:max-w-md
          flex flex-col overflow-hidden p-0
        "
      >
        <style>{`
          @keyframes shimmer { 100% { transform: translateX(100%); } }
        `}</style>

        <DialogHeader className="shrink-0 border-b border-neutral-900 px-4 pt-4 pb-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-300">
            <DollarSign className="h-4 w-4" style={{ color: AZUL }} />
            Ajustar Preço de Venda
          </DialogTitle>

          {!loading && data.product && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="truncate text-[13px] font-semibold text-white">{data.product}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                  <Store className="h-3 w-3 text-neutral-500" />
                  {data.store}
                </span>
                <span className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                  <Radio className="h-3 w-3 text-neutral-500" />
                  {data.channel}
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pt-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-9 border border-neutral-800 bg-neutral-900" />
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
              <div className="h-28 border border-neutral-800 bg-neutral-900" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custo (somente leitura) */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Custo
                </label>
                <div className="flex h-10 items-center border border-neutral-800 bg-neutral-950/60 px-3">
                  <span className="mr-1.5 text-[12px] font-medium text-neutral-500">R$</span>
                  <span className="text-[14px] font-semibold text-neutral-400">
                    {formatBR(data.current_cost)}
                  </span>
                </div>
              </div>

              {/* Inputs agrupados */}
              <div className="space-y-4 border border-neutral-800/60 bg-neutral-950/20 p-3">
                <EditableNumberField
                  label="Frete"
                  value={data.freight}
                  onChange={(n) => setData((prev) => ({ ...prev, freight: n }))}
                  prefix="R$"
                  icon={<Truck className="h-3 w-3 text-neutral-500" />}
                />

                <EditableNumberField
                  label="Comissão"
                  value={data.commission_rate}
                  onChange={(n) => setData((prev) => ({ ...prev, commission_rate: n }))}
                  prefix="%"
                  icon={<Percent className="h-3 w-3 text-neutral-500" />}
                />

                <EditableNumberField
                  label="Margem de Lucro"
                  value={data.profit_margin}
                  onChange={(n) => setData((prev) => ({ ...prev, profit_margin: n }))}
                  prefix="%"
                  icon={<TrendingUp className="h-3 w-3" style={{ color: AZUL }} />}
                  highlight
                />
              </div>

              {/* Aviso de margem baixa (vermelho) */}
              {status === "warning" && !percentualInvalido && (
                <div className="flex items-center gap-2 border border-red-400/30 bg-red-400/[0.06] px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <p className="text-[11px] font-medium text-red-400">
                    Faltam {formatBR(faltaParaSaudavel)}% para atingir margem saudável (≥{MARGEM_MINIMA_SAUDAVEL}%).
                  </p>
                </div>
              )}

              {/* Erro com sugestão automática */}
              {percentualInvalido && (
                <div className="space-y-2 border border-red-400/30 bg-red-400/[0.06] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    <p className="text-[11px] font-medium text-red-400">
                      {data.profit_margin < 0
                        ? "Margem resultante é negativa."
                        : "Comissão + Margem não pode ser ≥ 100%."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSugerirMinimo}
                    className="flex cursor-pointer items-center gap-1.5 border border-red-400/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-red-300 transition-colors hover:bg-red-400/10 active:scale-[0.98]"
                  >
                    <Wand2 className="h-3 w-3" />
                    Sugerir margem mínima viável ({MARGEM_MINIMA_VIAVEL}%)
                  </button>
                </div>
              )}

              {/* Card de resultado */}
              <div
                className={`relative overflow-hidden border p-4 transition-colors ${bordaResultado}`}
                style={{ background: `linear-gradient(to bottom right, ${AZUL}14, transparent)` }}
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${statusColor.bg}`} />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    Preço de Venda
                  </span>
                  {precoAnterior > 0 && Math.abs(diferenca) > 0.001 && (
                    <span
                      className={`flex items-center gap-0.5 border px-1.5 py-0.5 text-[10px] font-semibold ${
                        diferenca > 0
                          ? "border-emerald-400/30 text-emerald-400"
                          : "border-red-400/30 text-red-400"
                      }`}
                    >
                      {diferenca > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {formatBR(Math.abs(percentualMudanca))}%
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1 transition-all duration-200">
                    <span className="text-[13px] font-medium text-neutral-500">R$</span>
                    <span className="text-2xl font-bold tabular-nums text-white">
                      {formatBR(precoFinal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopiarPreco}
                    title="Copiar preço"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border border-neutral-700 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white active:scale-[0.95]"
                  >
                    {copiado ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {precoFinal > 0 && (
                  <div className="mt-3">
                    <div className="flex h-1.5 w-full overflow-hidden bg-neutral-900">
                      <div
                        className="bg-neutral-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (custoBase / precoFinal) * 100)}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (valorComissao / precoFinal) * 100)}%` }}
                      />
                      <div
                        className={`transition-all duration-300 ${statusColor.bg}`}
                        style={{ width: `${Math.max(0, Math.min(100, (valorMargem / precoFinal) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[9px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-neutral-500" /> Custo
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-red-500" /> Comissão
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 ${statusColor.bg}`} /> Margem
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-neutral-500">Custo</p>
                    <p className="text-[12px] font-semibold text-neutral-300">
                      R$ {formatBR(custoBase)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-neutral-500">Comissão</p>
                    <p className="text-[12px] font-semibold text-neutral-300">
                      R$ {formatBR(valorComissao)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-neutral-500">Margem</p>
                    <p className={`text-[12px] font-semibold ${statusColor.text}`}>
                      R$ {formatBR(valorMargem)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-900 px-4 py-3 sm:px-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 border border-neutral-800 text-[12px] font-medium uppercase tracking-wide text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving || loading || percentualInvalido}
            title="Ctrl+Enter para salvar"
            className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 text-[12px] font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
            style={{ backgroundColor: AZUL }}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
