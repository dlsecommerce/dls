"use client";

import { useState } from "react";
import { Info, Hash } from "lucide-react";

type Props = {
  nome: string;
  onNomeChange: (value: string) => void;
  idBling?: string | number;
  referencia?: string;
  marca?: string;
  loja?: string;
  onLojaChange?: (value: string) => void;
  onReferenciaChange?: (value: string) => void;
  onMarcaChange?: (value: string) => void;
  maxLength?: number;
  codigoAnuncio?: string | number;
  criadoEm?: string;
};

const inputClass = `
  h-10 w-full border border-neutral-800 bg-[#070707] px-3
  text-sm font-semibold text-white outline-none
  placeholder:text-white/20
  focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
`;

const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500";

function formatDate(date?: string) {
  if (!date) return "Data não disponível";
  try {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Data não disponível";
  }
}

function CodeBadge({
  codigo,
  criadoEm,
}: {
  codigo?: string | number;
  criadoEm?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center gap-3 border border-neutral-800 bg-[#0f0f0f] px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-800 text-[#1a8ceb]">
        <Hash className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <div className="relative flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-neutral-500">
            Código do produto
          </span>

          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip((v) => !v)}
            className="cursor-pointer text-neutral-500 hover:text-[#1a8ceb]"
          >
            <Info className="h-3 w-3" />
          </button>

          {showTooltip && (
            <div className="absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap border border-neutral-800 bg-[#0a0a0a] px-2.5 py-1.5 text-[11px] text-white shadow-lg">
              Criado em: {formatDate(criadoEm)}
            </div>
          )}
        </div>

        <p className="mt-0.5 truncate text-sm font-semibold text-white">
          {codigo || "Não informado"}
        </p>
      </div>
    </div>
  );
}

export default function Productnamesection({
  nome,
  onNomeChange,
  idBling,
  referencia = "",
  marca = "",
  loja = "",
  onLojaChange,
  onReferenciaChange,
  onMarcaChange,
  maxLength = 200,
  codigoAnuncio,
  criadoEm,
}: Props) {
  return (
    <section className="border border-neutral-800 bg-[#161616] p-5">
      <div className="mb-4">
        <CodeBadge codigo={codigoAnuncio} criadoEm={criadoEm} />
      </div>

      <h2 className="mb-3 text-[15px] font-semibold text-white">
        Nome do produto
      </h2>
      <input
        type="text"
        value={nome}
        onChange={(e) => onNomeChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        className={inputClass}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-[#1a8ceb]">
          Dê ao seu produto um nome curto e claro.
        </span>
        <span className="text-neutral-500">
          {nome.length} / {maxLength}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Loja</label>
          <select
            value={loja}
            onChange={(e) => onLojaChange?.(e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">Selecione</option>
            <option value="PK">PK</option>
            <option value="SB">SB</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>ID Bling</label>
          <input
            type="text"
            value={idBling ?? ""}
            disabled
            className={`${inputClass} cursor-not-allowed text-neutral-500`}
          />
        </div>

        <div>
          <label className={labelClass}>Referência</label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => onReferenciaChange?.(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Marca</label>
          <input
            type="text"
            value={marca}
            onChange={(e) => onMarcaChange?.(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}
