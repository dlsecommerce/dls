import React from "react";
import { Copy, CheckCheck, Store } from "lucide-react";
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

const TrayIcon = () => {
  return <Store className="h-5 w-5 text-white" />;
};

const TrayCard = ({
  percent,
  difference,
  copied,
  onCopy,
}: {
  percent: number;
  difference: number;
  copied: boolean;
  onCopy: () => void;
}) => {
  return (
    <div
      className="
        group relative rounded-xl border border-[#1a8ceb]/45
        bg-gradient-to-br from-[#1a8ceb]/12 via-[#151515] to-[#151515]
        px-3 py-2 transition-all duration-200
      "
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
        aria-label="Copiar acréscimo Tray"
      >
        {copied ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="mb-1 flex items-center gap-2">
        <div
          className="
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-xl border border-[#1a8ceb]/40 bg-[#1a8ceb]
            shadow-sm
          "
        >
          <TrayIcon />
        </div>

        <div className="min-w-0 pr-8">
          <h3 className="truncate text-base font-semibold text-white">
            Tray
          </h3>

          <p className="mt-0.5 truncate text-xs text-white/45">
            Marketplace / Anúncio
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[84px_1fr] items-baseline gap-3">
          <span className="text-sm text-white/65">Acréscimo</span>

          <span className="text-2xl font-black tabular-nums text-[#1a8ceb]">
            {percent > 0 ? "+" : ""}
            <AnimatedNumber value={Number(percent || 0)} />%
          </span>
        </div>

        <div className="grid grid-cols-[84px_1fr] items-baseline gap-3">
          <span className="text-sm text-white/65">Diferença</span>

          <span className="text-lg font-bold tabular-nums text-[#1a8ceb]">
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
  const [copied, setCopied] = React.useState(false);

  const precoLoja = parseBR(acrescimos?.precoLoja);

  const precoTray = parseBR(
    acrescimos?.precoTray ||
      acrescimos?.precoLoja ||
      acrescimos?.precoMarketplace ||
      acrescimos?.preco
  );

  const freteTray = parseBR(acrescimos?.freteTray || acrescimos?.frete || 0);

  const baseTray = precoLoja + freteTray;
  const acrescimoTray = getPercent(precoTray, baseTray);
  const diferencaTray = precoTray - baseTray;

  const copyTray = async () => {
    const text = formatPercentForCopy(acrescimoTray);

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

    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
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

      <div className="grid grid-cols-1 gap-4">
        <TrayCard
          percent={acrescimoTray}
          difference={diferencaTray}
          copied={copied}
          onCopy={copyTray}
        />
      </div>
    </section>
  );
};