import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Store,
  ShoppingBag,
  Handshake,
  Check,
  X,
  Copy,
  CheckCheck,
  ArrowUpCircle,
} from "lucide-react";
import { ClearAndDownloadActions } from "./ClearAndDownloadActions";
import { AcrescimosSection } from "./AcrescimosSection";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Calculo } from "../PricingCalculatorModern";

type PriceCalculationSectionProps = {
  calculoLoja: Calculo;
  setCalculoLoja: (c: Calculo) => void;

  calculoShopee: Calculo;
  setCalculoShopee: (c: Calculo) => void;

  calculoMagalu: Calculo;
  setCalculoMagalu: (c: Calculo) => void;

  calculoMLClassico: Calculo;
  setCalculoMLClassico: (c: Calculo) => void;

  calculoMLPremium: Calculo;
  setCalculoMLPremium: (c: Calculo) => void;

  precoLoja: number;
  precoShopee: number;
  precoMagalu: number;
  precoMLClassico: number;
  precoMLPremium: number;

  acrescimos: any;
  setAcrescimos: (value: any) => void;

  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;

  handleLinearNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;

  calcLojaRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcShopeeRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcMagaluRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcMLClassicoRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcMLPremiumRefs: React.MutableRefObject<HTMLInputElement[]>;
  acrescimosRefs: React.MutableRefObject<HTMLInputElement[]>;

  handleEmbalagemBlurShared: (raw: string) => void;
  handleEmbalagemChangeShared: (raw: string) => void;
  handleEmbalagemBlurShopee: (raw: string) => void;
  handleEmbalagemChangeShopee: (raw: string) => void;

  handleDownload: () => void;
  handleClearAll: () => void;
  isClearing: boolean;
  clicks: number;

  statusAcrescimo: any;

  syncDescontoFromLoja: (descontoInternal: string) => void;

  userEditedShopeeComissao: boolean;
  setUserEditedShopeeComissao: (v: boolean) => void;
  userEditedShopeeFrete: boolean;
  setUserEditedShopeeFrete: (v: boolean) => void;

  userEditedShopeeImposto: boolean;
  setUserEditedShopeeImposto: (v: boolean) => void;
  userEditedShopeeMargem: boolean;
  setUserEditedShopeeMargem: (v: boolean) => void;
  userEditedShopeeMarketing: boolean;
  setUserEditedShopeeMarketing: (v: boolean) => void;
  userEditedShopeeEmbalagem: boolean;
  setUserEditedShopeeEmbalagem: (v: boolean) => void;
};

type ChannelKey =
  | "loja"
  | "shopee"
  | "magalu"
  | "mlClassico"
  | "mlPremium";

type ChannelRow = {
  key: ChannelKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  state: Calculo;
  preco: number;
  refs: React.MutableRefObject<HTMLInputElement[]>;
};

const BLOCKS: Array<{ key: ChannelKey; nome: string }> = [
  { key: "loja", nome: "Loja Própria" },
  { key: "shopee", nome: "Shopee" },
  { key: "magalu", nome: "Magalu" },
  { key: "mlClassico", nome: "Mercado Livre" },
  { key: "mlPremium", nome: "Mercado Livre" },
];

const STORAGE_KEY = "pricing.visibleBlocks.v4";

const fields: Array<{
  key: keyof Calculo;
  label: string;
  suffix?: string;
  unit: string;
}> = [
  { key: "desconto", label: "Desconto", suffix: "%", unit: "(%)" },
  { key: "embalagem", label: "Embalagem", suffix: "R$", unit: "(R$)" },
  { key: "frete", label: "Frete", suffix: "R$", unit: "(R$)" },
  { key: "imposto", label: "Imposto", suffix: "%", unit: "(%)" },
  { key: "comissao", label: "Comissão", suffix: "%", unit: "(%)" },
  { key: "margem", label: "Margem de Lucro", suffix: "%", unit: "(%)" },
  { key: "marketing", label: "Marketing", suffix: "%", unit: "(%)" },
];

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const shortLabel = (key: ChannelKey) => {
  if (key === "loja") return "Loja";
  if (key === "shopee") return "Shopee";
  if (key === "magalu") return "Magalu";
  if (key === "mlClassico") return "Clássico";
  return "Premium";
};

const isEmptyOrZero = (v: string) => {
  const s = (v || "").trim();
  if (!s) return true;

  const n = Number(s);
  return !isFinite(n) || n === 0;
};

const ChannelIcon = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) => {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

const MagaluLogo = () => {
  return (
    <span className="select-none text-[10px] font-black leading-none tracking-tight text-white">
      Magalu
    </span>
  );
};

const FieldInput = ({
  value,
  fieldKey,
  editingKey,
  suffix,
  inputRef,
  navIndex,
  totalFields,
  refs,
  onChange,
  onBlur,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
  handleLinearNav,
}: {
  value: string | undefined;
  fieldKey: keyof Calculo;
  editingKey: string;
  suffix?: string;
  inputRef: (el: HTMLInputElement | null) => void;
  navIndex: number;
  totalFields: number;
  refs: React.MutableRefObject<HTMLInputElement[]>;
  onChange: (key: keyof Calculo, value: string) => void;
  onBlur: (key: keyof Calculo, value: string) => void;
  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;
  handleLinearNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;
}) => {
  const rawValue = value || "";
  const displayValue = isEditing(editingKey) ? rawValue : toDisplay(rawValue);

  return (
    <div className="mx-auto flex h-10 w-full max-w-[96px] items-center rounded-lg border border-white/10 bg-[#070707] px-2 transition focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
      <input
        ref={inputRef}
        value={displayValue}
        inputMode="decimal"
        onFocus={() => setEditing(editingKey, true)}
        onBlur={(e) => {
          setEditing(editingKey, false);
          const internalValue = toInternal(e.target.value);
          onBlur(fieldKey, internalValue);
        }}
        onChange={(e) => {
          const internalValue = toInternal(e.target.value);
          onChange(fieldKey, internalValue);
        }}
        onKeyDown={(e) => handleLinearNav(e, navIndex, refs, totalFields)}
        className="
          h-full w-full min-w-0 bg-transparent text-center text-sm font-semibold text-white
          outline-none placeholder:text-white/20
          focus:outline-none focus:ring-0
          focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
        "
      />

      {suffix && (
        <span className="ml-1 shrink-0 text-xs font-semibold text-white/45">
          {suffix}
        </span>
      )}
    </div>
  );
};

export const PriceCalculationSection: React.FC<PriceCalculationSectionProps> = ({
  calculoLoja,
  setCalculoLoja,
  calculoShopee,
  setCalculoShopee,
  calculoMagalu,
  setCalculoMagalu,
  calculoMLClassico,
  setCalculoMLClassico,
  calculoMLPremium,
  setCalculoMLPremium,
  precoLoja,
  precoShopee,
  precoMagalu,
  precoMLClassico,
  precoMLPremium,
  acrescimos,
  setAcrescimos,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
  handleLinearNav,
  calcLojaRefs,
  calcShopeeRefs,
  calcMagaluRefs,
  calcMLClassicoRefs,
  calcMLPremiumRefs,
  acrescimosRefs,
  handleDownload,
  handleClearAll,
  isClearing,
  clicks,
  statusAcrescimo,
  syncDescontoFromLoja,
  setUserEditedShopeeComissao,
  setUserEditedShopeeFrete,
  setUserEditedShopeeImposto,
  setUserEditedShopeeMargem,
  setUserEditedShopeeMarketing,
  setUserEditedShopeeEmbalagem,
}) => {
  const defaultVisible: Record<ChannelKey, boolean> = React.useMemo(
    () => ({
      loja: true,
      shopee: true,
      magalu: true,
      mlClassico: true,
      mlPremium: true,
    }),
    []
  );

  const [visible, setVisible] =
    React.useState<Record<ChannelKey, boolean>>(defaultVisible);

  const [isLayoutOpen, setIsLayoutOpen] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<ChannelKey | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<Record<ChannelKey, boolean>>;

      const next: Record<ChannelKey, boolean> = {
        ...defaultVisible,
        ...parsed,
      };

      const count = Object.values(next).filter(Boolean).length;

      setVisible(count === 0 ? { ...next, loja: true } : next);
    } catch {
      // ignore
    }
  }, [defaultVisible]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // ignore
    }
  }, [visible]);

  const ensureAtLeastOneVisible = React.useCallback(
    (next: Record<ChannelKey, boolean>) => {
      const count = Object.values(next).filter(Boolean).length;
      if (count === 0) return { ...next, loja: true };
      return next;
    },
    []
  );

  const hideBlock = React.useCallback(
    (key: ChannelKey) => {
      setVisible((prev) =>
        ensureAtLeastOneVisible({
          ...prev,
          [key]: false,
        })
      );
    },
    [ensureAtLeastOneVisible]
  );

  const toggleBlock = (key: ChannelKey) => {
    setVisible((prev) =>
      ensureAtLeastOneVisible({
        ...prev,
        [key]: !prev[key],
      })
    );
  };

  const restore = React.useCallback((key: ChannelKey) => {
    setVisible((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  const hiddenBlocks = React.useMemo(
    () => BLOCKS.filter((b) => !visible[b.key]),
    [visible]
  );

  const closeLayoutOnOutside = React.useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement | null;

    if (!target) return;
    if (target.closest?.("[data-layout-dropdown]")) return;

    setIsLayoutOpen(false);
  }, []);

  React.useEffect(() => {
    if (!isLayoutOpen) return;

    window.addEventListener("mousedown", closeLayoutOnOutside);

    return () => {
      window.removeEventListener("mousedown", closeLayoutOnOutside);
    };
  }, [isLayoutOpen, closeLayoutOnOutside]);

  const rows: ChannelRow[] = [
    {
      key: "loja",
      title: "Loja Própria",
      subtitle: "Site / E-commerce",
      icon: <Store className="h-5 w-5 text-[#1a8ceb]" />,
      iconClassName: "border-[#1a8ceb]/35 bg-[#1a8ceb]/15",
      state: calculoLoja,
      preco: precoLoja,
      refs: calcLojaRefs,
    },
    {
      key: "shopee",
      title: "Shopee",
      subtitle: "Marketplace",
      icon: <ShoppingBag className="h-5 w-5 text-white" />,
      iconClassName: "border-orange-500/30 bg-orange-500",
      state: calculoShopee,
      preco: precoShopee,
      refs: calcShopeeRefs,
    },
    {
      key: "magalu",
      title: "Magalu",
      subtitle: "Marketplace",
      icon: <MagaluLogo />,
      iconClassName: "border-[#1a8ceb]/40 bg-[#1a8ceb]",
      state: calculoMagalu,
      preco: precoMagalu,
      refs: calcMagaluRefs,
    },
    {
      key: "mlClassico",
      title: "Mercado Livre",
      subtitle: "Clássico",
      icon: <Handshake className="h-5 w-5 text-white" />,
      iconClassName: "border-yellow-500/30 bg-yellow-500/80",
      state: calculoMLClassico,
      preco: precoMLClassico,
      refs: calcMLClassicoRefs,
    },
    {
      key: "mlPremium",
      title: "Mercado Livre",
      subtitle: "Premium",
      icon: <Handshake className="h-5 w-5 text-white" />,
      iconClassName: "border-yellow-500/30 bg-yellow-500/80",
      state: calculoMLPremium,
      preco: precoMLPremium,
      refs: calcMLPremiumRefs,
    },
  ];

  const visibleRows = rows.filter((row) => visible[row.key]);
  const totalFields = fields.length;

  const handleChange = (
    row: ChannelRow,
    field: keyof Calculo,
    internalValue: string
  ) => {
    if (field === "embalagem") {
      setCalculoLoja({
        ...calculoLoja,
        embalagem: internalValue,
      });

      setCalculoShopee({
        ...calculoShopee,
        embalagem: internalValue,
      });

      setCalculoMagalu({
        ...calculoMagalu,
        embalagem: internalValue,
      });

      setCalculoMLClassico({
        ...calculoMLClassico,
        embalagem: internalValue,
      });

      setCalculoMLPremium({
        ...calculoMLPremium,
        embalagem: internalValue,
      });

      setUserEditedShopeeEmbalagem(true);

      return;
    }

    if (row.key === "loja") {
      if (field === "desconto") {
        syncDescontoFromLoja(internalValue);
      } else {
        setCalculoLoja({
          ...calculoLoja,
          [field]: internalValue,
        });
      }

      return;
    }

    if (row.key === "shopee") {
      if (field === "comissao") setUserEditedShopeeComissao(true);
      if (field === "frete") setUserEditedShopeeFrete(true);
      if (field === "imposto") setUserEditedShopeeImposto(true);
      if (field === "margem") setUserEditedShopeeMargem(true);
      if (field === "marketing") setUserEditedShopeeMarketing(true);

      setCalculoShopee({
        ...calculoShopee,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "magalu") {
      setCalculoMagalu({
        ...calculoMagalu,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "mlClassico") {
      setCalculoMLClassico({
        ...calculoMLClassico,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "mlPremium") {
      setCalculoMLPremium({
        ...calculoMLPremium,
        [field]: internalValue,
      });
    }
  };

  const handleBlur = (
    row: ChannelRow,
    field: keyof Calculo,
    internalValue: string
  ) => {
    if (field === "embalagem") {
      const value = internalValue || "3";

      setCalculoLoja({
        ...calculoLoja,
        embalagem: value,
      });

      setCalculoShopee({
        ...calculoShopee,
        embalagem: value,
      });

      setCalculoMagalu({
        ...calculoMagalu,
        embalagem: value,
      });

      setCalculoMLClassico({
        ...calculoMLClassico,
        embalagem: value,
      });

      setCalculoMLPremium({
        ...calculoMLPremium,
        embalagem: value,
      });

      if (isEmptyOrZero(value)) {
        setUserEditedShopeeEmbalagem(false);
      }

      return;
    }

    if (row.key === "loja") {
      if (field === "desconto") {
        syncDescontoFromLoja(internalValue);
      } else {
        setCalculoLoja({
          ...calculoLoja,
          [field]: internalValue,
        });
      }

      return;
    }

    if (row.key === "shopee") {
      if (field === "comissao" && isEmptyOrZero(internalValue)) {
        setUserEditedShopeeComissao(false);
      }

      if (field === "frete" && isEmptyOrZero(internalValue)) {
        setUserEditedShopeeFrete(false);
      }

      if (field === "imposto" && isEmptyOrZero(internalValue)) {
        setUserEditedShopeeImposto(false);
      }

      if (field === "margem" && isEmptyOrZero(internalValue)) {
        setUserEditedShopeeMargem(false);
      }

      if (field === "marketing" && isEmptyOrZero(internalValue)) {
        setUserEditedShopeeMarketing(false);
      }

      setCalculoShopee({
        ...calculoShopee,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "magalu") {
      setCalculoMagalu({
        ...calculoMagalu,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "mlClassico") {
      setCalculoMLClassico({
        ...calculoMLClassico,
        [field]: internalValue,
      });

      return;
    }

    if (row.key === "mlPremium") {
      setCalculoMLPremium({
        ...calculoMLPremium,
        [field]: internalValue,
      });
    }
  };

  const getPriceClass = (row: ChannelRow) => {
    if (row.key === "loja") return "text-emerald-400";
    if (row.key === "shopee") return "text-orange-400";
    if (row.key === "magalu") return "text-[#1a8ceb]";
    if (row.key === "mlClassico") return "text-yellow-400";
    if (row.key === "mlPremium") return "text-yellow-400";
    return "text-white";
  };

  const formatCopyValue = (value: number) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCopyPrice = async (row: ChannelRow) => {
    const value = formatCopyValue(row.preco);

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(row.key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      setCopiedKey(row.key);
      setTimeout(() => setCopiedKey(null), 1200);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section
        data-layout-dropdown
        className="relative rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
              3.
            </span>

            <h2 className="text-base font-semibold text-white">
              Preço de Venda por Canal
            </h2>
          </div>

          <ClearAndDownloadActions
            handleDownload={handleDownload}
            handleClearAll={handleClearAll}
            isClearing={isClearing}
            clicks={clicks}
            onToggleLayout={() => setIsLayoutOpen((v) => !v)}
          />
        </div>

        <AnimatePresence>
          {isLayoutOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-4 top-14 z-50 w-full max-w-[280px] rounded-xl border border-white/10 bg-black/80 p-2 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-white/80">
                  Ajustar layout
                </div>

                <button
                  type="button"
                  onClick={() => setIsLayoutOpen(false)}
                  className="cursor-pointer rounded-md p-1 transition hover:bg-white/10"
                  title="Fechar ajuste de layout"
                >
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {BLOCKS.map((block) => {
                  const checked = visible[block.key];

                  return (
                    <button
                      key={block.key}
                      type="button"
                      onClick={() => toggleBlock(block.key)}
                      className={[
                        "flex h-10 cursor-pointer items-center justify-between rounded-lg border border-white/10 px-2 transition",
                        checked ? "bg-white/10" : "bg-white/5",
                        "hover:bg-white/10",
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs text-white/85">
                          {block.nome}
                        </span>

                        <span className="shrink-0 text-[10px] text-white/45">
                          ({shortLabel(block.key)})
                        </span>
                      </div>

                      <div
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10",
                          checked ? "bg-white/10" : "bg-transparent",
                        ].join(" ")}
                      >
                        {checked && (
                          <Check className="h-4 w-4 text-white/80" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setVisible(defaultVisible)}
                className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 transition hover:bg-white/10"
              >
                Mostrar todos
              </button>

              <div className="mt-2 text-[10px] text-white/40">
                Suas escolhas ficam salvas automaticamente.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="hidden grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] border-b border-white/10 bg-[#181818] lg:grid">
            <div className="px-4 py-4 text-sm font-semibold text-white">
              Canal
            </div>

            {fields.map((field) => (
              <div
                key={field.key}
                className="px-2 py-4 text-center text-sm font-semibold text-white"
              >
                {field.label}
                <div className="mt-1 text-xs text-white/55">
                  {field.unit}
                </div>
              </div>
            ))}

            <div className="px-4 py-4 text-center text-sm font-semibold text-white">
              Preço de Venda
              <div className="mt-1 text-xs text-white/55">
                Calculado (R$)
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {visibleRows.map((row) => (
              <div
                key={row.key}
                className="group/row grid grid-cols-1 gap-3 bg-[#151515] p-4 lg:grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] lg:items-center lg:gap-0 lg:p-0"
              >
                <div className="flex items-center justify-between gap-3 lg:px-4 lg:py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChannelIcon className={row.iconClassName}>
                      {row.icon}
                    </ChannelIcon>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {row.title}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-white/45">
                        {row.subtitle}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => hideBlock(row.key)}
                    className="flex h-7 w-7 cursor-pointer shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover/row:opacity-100"
                    title={`Ocultar ${row.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={`${row.key}-${field.key}`}
                    className="lg:px-2 lg:py-5"
                  >
                    <div className="mb-1 text-xs font-medium text-white/45 lg:hidden">
                      {field.label}
                    </div>

                    <FieldInput
                      value={row.state[field.key]}
                      fieldKey={field.key}
                      editingKey={`${row.key}-${field.key}`}
                      suffix={field.suffix}
                      inputRef={(el) => {
                        row.refs.current[index] = el!;
                      }}
                      navIndex={index}
                      totalFields={totalFields}
                      refs={row.refs}
                      onChange={(key, value) => handleChange(row, key, value)}
                      onBlur={(key, value) => handleBlur(row, key, value)}
                      isEditing={isEditing}
                      setEditing={setEditing}
                      toDisplay={toDisplay}
                      toInternal={toInternal}
                      handleLinearNav={handleLinearNav}
                    />
                  </div>
                ))}

                <div className="group/price flex items-center justify-between border-t border-white/10 pt-3 lg:border-t-0 lg:px-4 lg:py-5">
                  <span className="text-xs font-medium text-white/45 lg:hidden">
                    Preço de Venda
                  </span>

                  <div className="flex w-full items-center justify-end gap-1.5">
                    <span
                      className={`text-xl font-bold tabular-nums ${getPriceClass(
                        row
                      )}`}
                    >
                      R$ <AnimatedNumber value={Number(row.preco || 0)} />
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyPrice(row)}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover/price:opacity-100"
                      title="Copiar preço"
                    >
                      {copiedKey === row.key ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {hiddenBlocks.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#181818] px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/50">Ocultos</span>

                {hiddenBlocks.map((block) => (
                  <button
                    key={block.key}
                    type="button"
                    onClick={() => restore(block.key)}
                    className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    title={`Restaurar ${block.nome}`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    {shortLabel(block.key)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVisible(defaultVisible)}
                className="h-8 cursor-pointer rounded-lg border border-white/10 px-3 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                Restaurar todos
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AcrescimosSection
        acrescimos={acrescimos}
        setAcrescimos={setAcrescimos}
        isEditing={isEditing}
        setEditing={setEditing}
        toDisplay={toDisplay}
        toInternal={toInternal}
        handleLinearNav={handleLinearNav}
        acrescimosRefs={acrescimosRefs}
        statusAcrescimo={statusAcrescimo}
      />
    </div>
  );
};