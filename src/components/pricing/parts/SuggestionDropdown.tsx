import React from "react";

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
};

type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (codigo: string, custo: number, produto?: string) => void;
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
      className="
        absolute left-0 top-full z-[999] mt-1
        max-h-60 w-full overflow-y-auto overscroll-contain
        rounded-lg border border-white/10 bg-[#0f0f0f]
        shadow-[0_18px_40px_rgba(0,0,0,0.45)]
      "
    >
      {sugestoes.map((s, i) => (
        <button
          key={`${s.codigo}-${i}`}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.codigo, s.custo, s.produto);
          }}
          className={`
            flex min-h-[46px] w-full cursor-pointer items-center
            justify-between gap-3 px-3 py-2 text-left transition
            ${
              i === indiceSelecionado
                ? "bg-[#1a8ceb]/30"
                : "hover:bg-[#1a8ceb]/20"
            }
          `}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {s.codigo}
            </div>

            {s.produto && (
              <div className="mt-0.5 truncate text-xs text-white/45">
                {s.produto}
              </div>
            )}
          </div>

          <span className="shrink-0 text-right text-sm font-semibold text-[#1a8ceb]">
            R$ {s.custo.toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
};