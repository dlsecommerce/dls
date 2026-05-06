import React from "react";
import { Copy, CheckCheck, Info, PackageCheck, TrendingUp } from "lucide-react";
import { Item } from "@/components/decomposition/CompositionCosts";

export type ResultadoView = {
  codigo: string;
  unitFmt: string;
  totalFmt: string;
  hasCost: boolean;
};

type Props = {
  resultados: ResultadoView[];
  composicao: Item[];
  precoVenda: string;
  enableScroll: boolean;
};

type CopyKey = {
  index: number;
  tipo: "unitario" | "total";
} | null;

const parseBRNumber = (value: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value || "").trim();

  if (!raw) return 0;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const onlyNumber = normalized.replace(/[^\d.-]/g, "");
  const parsed = Number(onlyNumber);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrencyOnly = (value: number) => {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const itemTemConteudo = (item: Item) => {
  return (
    String(item?.codigo || "").trim() ||
    String(item?.quantidade || "").trim() ||
    String(item?.custo || "").trim() ||
    String(item?.descricao || "").trim() ||
    String(item?.produto || "").trim()
  );
};

const copiarTexto = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");

    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
};

const CopyButton = ({
  copied,
  onCopy,
  title,
}: {
  copied: boolean;
  onCopy: () => void;
  title: string;
}) => {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="
        flex h-5 w-5 cursor-pointer items-center justify-center rounded
        border border-white/10 bg-white/[0.03] text-white/45
        transition hover:bg-white/[0.08] hover:text-white
        active:scale-[0.96]
      "
      title={title}
    >
      {copied ? (
        <CheckCheck className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
};

const ResultadoMiniValue = ({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) => {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="min-w-0">
        <div className="text-[8px] font-semibold uppercase leading-none tracking-wide text-white/35">
          {label}
        </div>

        <div className="mt-0.5 truncate text-xs font-black leading-tight tabular-nums text-white">
          R$ {value || "0,00"}
        </div>
      </div>

      <CopyButton
        copied={copied}
        onCopy={onCopy}
        title={`Copiar ${label.toLowerCase()}`}
      />
    </div>
  );
};

const ResultadoCard = ({
  index,
  codigo,
  unitario,
  total,
  hasCost,
  copiedKey,
  onCopy,
}: {
  index: number;
  codigo: string;
  unitario: string;
  total: string;
  hasCost: boolean;
  copiedKey: CopyKey;
  onCopy: (index: number, tipo: "unitario" | "total", value: string) => void;
}) => {
  const unitarioCopiado =
    copiedKey?.index === index && copiedKey?.tipo === "unitario";

  const totalCopiado = copiedKey?.index === index && copiedKey?.tipo === "total";

  return (
    <div
      className={`
        rounded-lg border px-2 py-1.5 transition
        ${
          hasCost
            ? "border-[#1a8ceb]/30 bg-[#1a8ceb]/10 hover:border-[#1a8ceb]/55 hover:bg-[#1a8ceb]/15"
            : "border-[#1a8ceb]/20 bg-[#1a8ceb]/5 hover:border-[#1a8ceb]/40 hover:bg-[#1a8ceb]/10"
        }
      `}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[7px] font-bold uppercase leading-none tracking-wide text-[#1a8ceb]/75">
            Item da composição
          </p>

          <p className="mt-0.5 truncate text-[11px] font-bold leading-tight text-white">
            SKU: {codigo || "SKU"}
          </p>
        </div>

        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#1a8ceb]/25 bg-[#1a8ceb]/10 text-[#1a8ceb]">
          <TrendingUp className="h-3 w-3" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <ResultadoMiniValue
          label="Unitário"
          value={unitario}
          copied={unitarioCopiado}
          onCopy={() => onCopy(index, "unitario", unitario || "0,00")}
        />

        <ResultadoMiniValue
          label="Total"
          value={total}
          copied={totalCopiado}
          onCopy={() => onCopy(index, "total", total || "0,00")}
        />
      </div>
    </div>
  );
};

export default function Resultados({
  resultados,
  composicao,
  precoVenda,
  enableScroll,
}: Props) {
  const [copiedKey, setCopiedKey] = React.useState<CopyKey>(null);

  const precoVendaNumber = parseBRNumber(precoVenda);

  const itensValidos = composicao.filter(itemTemConteudo);

  const resultadosValidos = resultados.filter((item) =>
    String(item.codigo || "").trim()
  );

  const quantidadeResultados = resultadosValidos.length;

  const temResultado = quantidadeResultados > 0 || itensValidos.length > 0;

  const resultadosParaExibir =
    resultadosValidos.length > 0
      ? resultadosValidos
      : itensValidos.map((item) => ({
          codigo: item.codigo || "SKU",
          unitFmt: formatCurrencyOnly(precoVendaNumber),
          totalFmt: formatCurrencyOnly(precoVendaNumber),
          hasCost: !!item.custo,
        }));

  const shouldScroll = resultadosParaExibir.length > 5;

  const wrapperClass = shouldScroll
    ? "max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
    : "";

  const handleCopyValue = async (
    index: number,
    tipo: "unitario" | "total",
    value: string
  ) => {
    await copiarTexto(value);

    setCopiedKey({ index, tipo });

    setTimeout(() => {
      setCopiedKey(null);
    }, 1200);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
            4.
          </span>

          <h2 className="truncate text-base font-semibold text-white">
            Resultados
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#1a8ceb]/25 bg-[#1a8ceb]/10 px-3 py-1.5">
          <PackageCheck className="h-4 w-4 text-[#1a8ceb]" />

          <span className="text-xs font-semibold text-white/65">
            {quantidadeResultados || 0} item
            {(quantidadeResultados || 0) === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {temResultado ? (
        <div className={wrapperClass}>
          <div className="space-y-1">
            {resultadosParaExibir.map((resultado, idx) => (
              <ResultadoCard
                key={`${resultado.codigo || "sku"}-${idx}`}
                index={idx}
                codigo={resultado.codigo}
                unitario={resultado.unitFmt}
                total={resultado.totalFmt}
                hasCost={resultado.hasCost}
                copiedKey={copiedKey}
                onCopy={handleCopyValue}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-7 text-center">
          <p className="text-sm font-semibold text-white/75">
            Nenhum resultado calculado
          </p>

          <p className="mt-1 text-xs text-white/40">
            Informe os custos e o preço de venda para visualizar os resultados.
          </p>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-white/10 bg-[#181818] px-4 py-3">
        <div className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />

          <p className="text-xs leading-relaxed text-white/45">
            Os resultados são calculados com base nos custos informados na
            composição.
          </p>
        </div>
      </div>
    </section>
  );
}