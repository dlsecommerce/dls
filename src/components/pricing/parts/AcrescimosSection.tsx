import React from "react";
import { Copy, CheckCheck, Handshake } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

type AcrescimosSectionProps = {
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
  acrescimosRefs: React.MutableRefObject<HTMLInputElement[]>;
  statusAcrescimo: any;
};

type CardVariant = "classico" | "premium" | "magalu";

type AcrescimoCardProps = {
  variant: CardVariant;
  title: string;
  percent: number;
  difference: number;
  copied: boolean;
  onCopy: () => void;
};

const parseBR = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();

  if (!raw) return 0;

  if (raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  }

  return Number(raw) || 0;
};

const getPercent = (price: number, base: number) => {
  if (!base || !price) return 0;

  return (price / base - 1) * 100;
};

const formatPercentForCopy = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;

  return Math.abs(safeValue).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getVariantClasses = (variant: CardVariant) => {
  if (variant === "magalu") {
    return {
      card: "border-[#1a8ceb]/45 bg-gradient-to-br from-[#1a8ceb]/12 via-[#151515] to-[#151515]",
      icon: "border-[#1a8ceb]/40 bg-[#1a8ceb]",
      percent: "text-[#1a8ceb]",
      difference: "text-[#1a8ceb]",
    };
  }

  return {
    card: "border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-[#151515] to-[#151515]",
    icon: "border-yellow-500/35 bg-yellow-500/80",
    percent: "text-yellow-400",
    difference: "text-yellow-400",
  };
};

const MercadoLivreIcon = () => {
  return <Handshake className="h-5 w-5 text-white" />;
};

const MagaluLogo = () => {
  return (
    <span className="select-none text-[8px] font-black leading-none tracking-tight text-white">
      Magalu
    </span>
  );
};

const AcrescimoCard: React.FC<AcrescimoCardProps> = ({
  variant,
  title,
  percent,
  difference,
  copied,
  onCopy,
}) => {
  const styles = getVariantClasses(variant);

  return (
    <div
      className={`group relative rounded-xl border px-3 py-2 transition-all duration-200 ${styles.card}`}
    >
      <button
        type="button"
        onClick={onCopy}
        className="
          absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center
          justify-center rounded-lg border border-white/10 bg-white/[0.03]
          text-white/45 opacity-0 transition
          hover:bg-white/[0.08] hover:text-white
          group-hover:opacity-100
        "
        title="Copiar acréscimo"
        aria-label={`Copiar acréscimo ${title}`}
      >
        {copied ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="mb-1 flex items-center gap-1">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${styles.icon}`}
        >
          {variant === "magalu" ? <MagaluLogo /> : <MercadoLivreIcon />}
        </div>

        <h3 className="truncate pr-8 text-base font-semibold text-white">
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[84px_1fr] items-baseline gap-3">
          <span className="text-sm text-white/65">Acréscimo</span>

          <span
            className={`text-2xl font-black tabular-nums ${styles.percent}`}
          >
            {percent > 0 ? "+" : ""}
            <AnimatedNumber value={Number(percent || 0)} />%
          </span>
        </div>

        <div className="grid grid-cols-[84px_1fr] items-baseline gap-3">
          <span className="text-sm text-white/65">Diferença</span>

          <span
            className={`text-lg font-bold tabular-nums ${styles.difference}`}
          >
            {difference < 0 ? "-" : ""}
            R$ <AnimatedNumber value={Math.abs(Number(difference || 0))} />
          </span>
        </div>
      </div>
    </div>
  );
};

export const AcrescimosSection: React.FC<AcrescimosSectionProps> = ({
  acrescimos,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<CardVariant | null>(null);

  const precoLoja = parseBR(acrescimos.precoLoja);

  const precoClassico = parseBR(acrescimos.precoMercadoLivreClassico);
  const freteClassico = parseBR(acrescimos.freteMercadoLivreClassico);
  const baseClassico = precoLoja + freteClassico;
  const acrescimoClassico = getPercent(precoClassico, baseClassico);
  const diferencaClassico = precoClassico - baseClassico;

  const precoPremium = parseBR(acrescimos.precoMercadoLivrePremium);
  const fretePremium = parseBR(acrescimos.freteMercadoLivrePremium);
  const basePremium = precoLoja + fretePremium;
  const acrescimoPremium = getPercent(precoPremium, basePremium);
  const diferencaPremium = precoPremium - basePremium;

  const precoMagalu = parseBR(acrescimos.precoMagalu);
  const acrescimoMagalu = getPercent(precoMagalu, precoLoja);
  const diferencaMagalu = precoMagalu - precoLoja;

  const copyCard = async (key: CardVariant, percent: number) => {
    const text = formatPercentForCopy(percent);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
          4.
        </span>

        <h2 className="text-base font-semibold text-white">
          Acréscimo sobre o Preço da Loja Própria
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AcrescimoCard
          variant="classico"
          title="Mercado Livre Clássico"
          percent={acrescimoClassico}
          difference={diferencaClassico}
          copied={copiedKey === "classico"}
          onCopy={() => copyCard("classico", acrescimoClassico)}
        />

        <AcrescimoCard
          variant="premium"
          title="Mercado Livre Premium"
          percent={acrescimoPremium}
          difference={diferencaPremium}
          copied={copiedKey === "premium"}
          onCopy={() => copyCard("premium", acrescimoPremium)}
        />

        <AcrescimoCard
          variant="magalu"
          title="Magalu"
          percent={acrescimoMagalu}
          difference={diferencaMagalu}
          copied={copiedKey === "magalu"}
          onCopy={() => copyCard("magalu", acrescimoMagalu)}
        />
      </div>
    </section>
  );
};