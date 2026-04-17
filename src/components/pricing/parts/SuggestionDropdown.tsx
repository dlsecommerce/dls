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
      className="absolute z-50 mt-1 bg-[#0f0f0f] border border-white/10 rounded-md shadow-lg w-full max-h-40 overflow-y-auto"
    >
      {sugestoes.map((s, i) => (
        <div
          key={i}
          className={`px-2 py-1 text-xs text-white cursor-pointer flex justify-between ${
            i === indiceSelecionado
              ? "bg-[#1a8ceb]/30"
              : "hover:bg-[#1a8ceb]/20"
          }`}
          onClick={() => onSelect(s.codigo, s.custo)}
        >
          <span>{s.codigo}</span>
          <span className="text-[#1a8ceb]">R$ {s.custo.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};
