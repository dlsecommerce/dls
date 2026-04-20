import React from "react";

type Sugestao = { codigo: string; custo: number };

type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (codigo: string, custo: number) => void;
};

export const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
}) => {
  if (!isActive || !sugestoes.length) return null;

  return (
    <div
      ref={listaRef}
      className="absolute left-0 top-full mt-1 z-[90] w-[min(220px,calc(100vw-32px))] sm:w-full max-h-56 sm:max-h-40 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-[#0f0f0f] shadow-lg"
    >
      {sugestoes.map((s, i) => (
        <div
          key={i}
          className={`px-3 sm:px-2 py-2 sm:py-1 min-h-[36px] sm:min-h-0 text-sm sm:text-xs text-white cursor-pointer flex items-center justify-between gap-2 ${
            i === indiceSelecionado
              ? "bg-[#1a8ceb]/30"
              : "hover:bg-[#1a8ceb]/20"
          }`}
          onClick={() => onSelect(s.codigo, s.custo)}
        >
          <span className="flex-1 min-w-0 truncate text-left">{s.codigo}</span>
          <span className="text-[#1a8ceb] shrink-0 text-right">
            R$ {s.custo.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};