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
  Lock,
  Receipt,
  Megaphone,
  Tag,
  ShieldAlert,
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
// Regra de faixas da Shopee (mesma lógica usada no export Excel)
// ───────────────────────────────

interface ShopeeTierResult {
  freight: number;
  commission: number;
  price: number;
}

function calcularShopee(custoProduto: number, profitMargin: number): ShopeeTierResult {
  const margem = Number(profitMargin) || 0;
  const custo = Number(custoProduto) || 0;

  const calcPreco = (frete: number, comissao: number) => {
    const percentual = (comissao + margem) / 100;
    if (percentual >= 1) return 0;
    const preco = (custo + frete) / (1 - percentual);
    return Number.isFinite(preco) ? preco : 0;
  };

  const price1 = calcPreco(4, 20);
  if (price1 <= 79.99) return { freight: 4, commission: 20, price: price1 };

  const price2 = calcPreco(16, 14);
  if (price2 <= 99.99) return { freight: 16, commission: 14, price: price2 };

  const price3 = calcPreco(20, 14);
  if (price3 <= 199.99) return { freight: 20, commission: 14, price: price3 };

  const price4 = calcPreco(26, 14);
  return { freight: 26, commission: 14, price: price4 };
}

const isShopee = (channel: string) => channel.trim().toLocaleLowerCase("pt-BR") === "shopee";

// ───────────────────────────────
// Cálculo de preço — espelha fielmente newsystem.fn_calc_marketplace_price
// ───────────────────────────────
//
// v_divisor := 1 - (tax + margin/100 + commission/100 + marketing)
// v_price   := ((cost_total * (1 - discount)) + packaging) / v_divisor + freight
//
// Retorna null quando o divisor é <= 0 (equivalente à exceção lançada pelo banco).

function calcularPrecoVenda(
  custoTotal: number,
  embalagem: number,
  freight: number,
  commissionRate: number,
  profitMargin: number,
  imposto: number,
  marketing: number,
  desconto: number
): number | null {
  const tax = (Number(imposto) || 0) / 100;
  const mkt = (Number(marketing) || 0) / 100;
  const disc = (Number(desconto) || 0) / 100;
  const margin = (Number(profitMargin) || 0) / 100;
  const commission = (Number(commissionRate) || 0) / 100;

  const divisor = 1 - (tax + margin + commission + mkt);
  if (divisor <= 0) return null;

  const preco = (Number(custoTotal) * (1 - disc) + Number(embalagem)) / divisor + Number(freight);
  return Number.isFinite(preco) ? Math.round(preco * 100) / 100 : null;
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
  disabled,
  disabledHint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rawValue, setRawValue] = useState("");

  const displayValue = isEditing ? rawValue : formatBR(value);

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {icon}
        {label}
        {disabled && <Lock className="h-2.5 w-2.5 text-neutral-600" />}
      </label>
      <div
        className={`flex h-10 items-center border px-3 transition-colors ${
          disabled
            ? "border-neutral-800 bg-neutral-950/40"
            : `bg-neutral-950 focus-within:border-[${AZUL}]/60 ${
                highlight ? `border-[${AZUL}]/40 bg-[${AZUL}]/[0.03]` : "border-neutral-800"
              }`
        }`}
      >
        {prefix && <span className="mr-1.5 text-[12px] font-medium text-neutral-500">{prefix}</span>}
        {disabled ? (
          <span className="text-[14px] font-semibold text-neutral-400">{formatBR(value)}</span>
        ) : (
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
        )}
      </div>
      {disabled && disabledHint && (
        <p className="mt-1 text-[10px] text-neutral-600">{disabledHint}</p>
      )}
    </div>
  );
}

// Pequeno badge somente-leitura para taxas resolvidas via pricing_rules
function RuleBadge({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1 border border-neutral-800 bg-neutral-950/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
      {icon}
      {label} {formatBR(value)}%
    </span>
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

interface PricingRules {
  imposto: number;
  marketing: number;
  desconto: number;
  margemMinima: number;
}

interface PricingBase {
  custoTotal: number;
  embalagem: number;
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

const EMPTY_RULES: PricingRules = { imposto: 0, marketing: 0, desconto: 0, margemMinima: 0 };
const EMPTY_BASE: PricingBase = { custoTotal: 0, embalagem: 0 };

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
  const [rules, setRules] = useState<PricingRules>(EMPTY_RULES);
  const [base, setBase] = useState<PricingBase>(EMPTY_BASE);
  const [precoAnterior, setPrecoAnterior] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const carregouRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !marketplaceId) return;
    if (carregouRef.current === marketplaceId) return;

    setLoading(true);
    setError(null);

    (async () => {
      const [{ data: row, error: rowError }, { data: preview, error: previewError }] = await Promise.all([
        supabase
          .schema("newsystem")
          .from("marketplace")
          .select("product, store, channel, current_cost, freight, commission_rate, profit_margin, selling_price")
          .eq("id", marketplaceId)
          .single(),
        supabase
          .schema("newsystem")
          .rpc("get_pricing_preview", { p_marketplace_id: marketplaceId })
          .single(),
      ]);

      if (rowError || !row) {
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

      if (!previewError && preview) {
        setRules({
          imposto: Number(preview.imposto) || 0,
          marketing: Number(preview.marketing) || 0,
          desconto: Number(preview.desconto) || 0,
          margemMinima: Number(preview.margem_minima) || 0,
        });
        setBase({
          custoTotal: Number(preview.cost_total) || 0,
          embalagem: Number(preview.packaging) || 0,
        });
      } else {
        // fallback: sem regras resolvidas, usa current_cost como base íntegra
        setRules(EMPTY_RULES);
        setBase({ custoTotal: loaded.current_cost, embalagem: 0 });
      }

      carregouRef.current = marketplaceId;
      setLoading(false);
    })();
  }, [open, marketplaceId]);

  useEffect(() => {
    if (!open) carregouRef.current = null;
  }, [open]);

  const shopeeAtivo = isShopee(data.channel);

  // Para Shopee: frete/comissão são derivados da faixa (custo + margem).
  const shopeeCalc = useMemo(
    () => (shopeeAtivo ? calcularShopee(data.current_cost, data.profit_margin) : null),
    [shopeeAtivo, data.current_cost, data.profit_margin]
  );

  const freteEfetivo = shopeeAtivo ? shopeeCalc!.freight : data.freight;
  const comissaoEfetiva = shopeeAtivo ? shopeeCalc!.commission : data.commission_rate;

  const precoFinal = useMemo(
    () =>
      calcularPrecoVenda(
        base.custoTotal,
        base.embalagem,
        freteEfetivo,
        comissaoEfetiva,
        data.profit_margin,
        rules.imposto,
        rules.marketing,
        rules.desconto
      ),
    [base, freteEfetivo, comissaoEfetiva, data.profit_margin, rules]
  );

  const custoBase = base.custoTotal * (1 - rules.desconto / 100) + base.embalagem + freteEfetivo;

  const divisorInvalido = precoFinal === null;
  const margemNegativa = data.profit_margin < 0;
  const margemAbaixoMinima = rules.margemMinima > 0 && data.profit_margin < rules.margemMinima;
  const percentualInvalido = divisorInvalido || margemNegativa;

  const precoExibido = precoFinal ?? 0;

  const status = margemStatus(data.profit_margin, percentualInvalido);
  const statusColor = STATUS_COLORS[status];

  const valorComissao = precoExibido * (comissaoEfetiva / 100);
  const valorMargem = precoExibido * (data.profit_margin / 100);

  const diferenca = precoExibido - precoAnterior;
  const percentualMudanca = precoAnterior > 0 ? (diferenca / precoAnterior) * 100 : 0;

  const faltaParaSaudavel = status === "warning" ? MARGEM_MINIMA_SAUDAVEL - data.profit_margin : 0;

  const bordaResultado =
    percentualInvalido || data.profit_margin <= 0 ? "border-red-500/50" : "border-emerald-500/50";

  const handleSugerirMinimo = () => {
    const margemMaxima = 99 - comissaoEfetiva - rules.imposto - rules.marketing;
    const pisoMinimo = Math.max(MARGEM_MINIMA_VIAVEL, rules.margemMinima || 0);
    const margemSugerida = Math.max(pisoMinimo, Math.min(pisoMinimo, margemMaxima));
    setData((prev) => ({ ...prev, profit_margin: margemSugerida }));
  };

  const handleAplicarMinima = () => {
    setData((prev) => ({ ...prev, profit_margin: rules.margemMinima }));
  };

  const handleCopiarPreco = async () => {
    try {
      await navigator.clipboard.writeText(formatBR(precoExibido));
      setCopiado(true);
      toast.success("Preço copiado!");
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleSalvar = useCallback(async () => {
    if (!marketplaceId || percentualInvalido || precoFinal === null || saving || loading) return;
    setSaving(true);

    // ⚠️ Usa RPC em vez de .update() direto: a função no banco seta
    // a flag "newsystem.manual_price_override" na transação antes do UPDATE,
    // impedindo que os triggers fn_marketplace_apply_rules e
    // trg_enqueue_on_marketplace_change sobrescrevam o preço manual depois.
    const { error } = await supabase
      .schema("newsystem")
      .rpc("update_marketplace_manual_price", {
        p_id: marketplaceId,
        p_freight: freteEfetivo,
        p_commission_rate: comissaoEfetiva,
        p_profit_margin: data.profit_margin,
        p_selling_price: precoFinal,
      });

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar. Tente novamente.");
      return;
    }

    toast.success("Preço atualizado!");
    onSuccess?.({ id: marketplaceId, selling_price: precoFinal });
    onClose();
  }, [
    marketplaceId,
    data.profit_margin,
    freteEfetivo,
    comissaoEfetiva,
    precoFinal,
    percentualInvalido,
    saving,
    loading,
    onSuccess,
    onClose,
  ]);

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

          {!loading && (rules.imposto > 0 || rules.marketing > 0 || rules.desconto > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RuleBadge label="Imposto" value={rules.imposto} icon={<Receipt className="h-2.5 w-2.5" />} />
              <RuleBadge label="Marketing" value={rules.marketing} icon={<Megaphone className="h-2.5 w-2.5" />} />
              <RuleBadge label="Desconto" value={rules.desconto} icon={<Tag className="h-2.5 w-2.5" />} />
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
                    {formatBR(base.custoTotal + base.embalagem)}
                  </span>
                </div>
              </div>

              {shopeeAtivo && (
                <div
                  className="flex items-start gap-2 border px-3 py-2"
                  style={{ borderColor: `${AZUL}4D`, backgroundColor: `${AZUL}0D` }}
                >
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: AZUL }} />
                  <p className="text-[11px] text-neutral-400">
                    Shopee usa faixas fixas de frete/comissão por preço final. Esses campos são calculados
                    automaticamente conforme você ajusta a margem.
                  </p>
                </div>
              )}

              {/* Inputs agrupados */}
              <div className="space-y-4 border border-neutral-800/60 bg-neutral-950/20 p-3">
                <EditableNumberField
                  label="Frete"
                  value={freteEfetivo}
                  onChange={(n) => setData((prev) => ({ ...prev, freight: n }))}
                  prefix="R$"
                  icon={<Truck className="h-3 w-3 text-neutral-500" />}
                  disabled={shopeeAtivo}
                  disabledHint="Definido pela faixa de preço da Shopee."
                />

                <EditableNumberField
                  label="Comissão"
                  value={comissaoEfetiva}
                  onChange={(n) => setData((prev) => ({ ...prev, commission_rate: n }))}
                  prefix="%"
                  icon={<Percent className="h-3 w-3 text-neutral-500" />}
                  disabled={shopeeAtivo}
                  disabledHint="Definido pela faixa de preço da Shopee."
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

              {/* Aviso de margem abaixo do mínimo exigido pela regra */}
              {margemAbaixoMinima && !margemNegativa && (
                <div className="space-y-2 border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <p className="text-[11px] font-medium text-amber-400">
                      Margem mínima exigida para este produto/loja: {formatBR(rules.margemMinima)}%.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAplicarMinima}
                    className="flex cursor-pointer items-center gap-1.5 border border-amber-400/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-300 transition-colors hover:bg-amber-400/10 active:scale-[0.98]"
                  >
                    <Wand2 className="h-3 w-3" />
                    Aplicar margem mínima ({formatBR(rules.margemMinima)}%)
                  </button>
                </div>
              )}

              {/* Aviso de margem baixa (vermelho) */}
              {status === "warning" && !percentualInvalido && !margemAbaixoMinima && (
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
                      {margemNegativa
                        ? "Margem resultante é negativa."
                        : "Comissão + Margem + Imposto + Marketing não pode ser ≥ 100%."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSugerirMinimo}
                    className="flex cursor-pointer items-center gap-1.5 border border-red-400/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-red-300 transition-colors hover:bg-red-400/10 active:scale-[0.98]"
                  >
                    <Wand2 className="h-3 w-3" />
                    Sugerir margem mínima viável
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
                  {precoAnterior > 0 && Math.abs(diferenca) > 0.001 && !divisorInvalido && (
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
                      {divisorInvalido ? "—" : formatBR(precoExibido)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopiarPreco}
                    disabled={divisorInvalido}
                    title="Copiar preço"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border border-neutral-700 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copiado ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {!divisorInvalido && precoExibido > 0 && (
                  <div className="mt-3">
                    <div className="flex h-1.5 w-full overflow-hidden bg-neutral-900">
                      <div
                        className="bg-neutral-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (custoBase / precoExibido) * 100)}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (valorComissao / precoExibido) * 100)}%` }}
                      />
                      <div
                        className={`transition-all duration-300 ${statusColor.bg}`}
                        style={{ width: `${Math.max(0, Math.min(100, (valorMargem / precoExibido) * 100))}%` }}
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
