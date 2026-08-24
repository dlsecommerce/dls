"use client";

const SugestoesDropdown = ({
  sugestoes,
  indiceSelecionado,
  selecionarSugestao,
  idx,
}: any) => {
  return (
    <div
      className="absolute z-50 mt-1 bg-[#0f0f0f] border border-white/10 rounded-md shadow-lg w-full max-h-40 overflow-y-auto"
    >
      {sugestoes.map((s: any, i: number) => (
        <div
          key={i}
          onClick={() => selecionarSugestao(s.codigo, s.custo, idx)}
          className={`px-2 py-1 text-xs text-white cursor-pointer flex justify-between ${
            i === indiceSelecionado
              ? "bg-[#1a8ceb]/30"
              : "hover:bg-[#1a8ceb]/20"
          }`}
        >
          <span>{s.codigo}</span>
          <span className="text-[#1a8ceb]">R$ {s.custo.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

export default SugestoesDropdown;
