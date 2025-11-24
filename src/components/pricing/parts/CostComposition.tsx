import React from "react";
import { CostItemRow } from "./CostItemRow";
import { AddCostButton } from "./AddCostButton";
import { TotalCostCard } from "./TotalCostCard";

type CostCompositionProps = {
  composicao: any[];
  setComposicao: (items: any[]) => void;
  custoTotal: number | string;
  adicionarItem: () => void;
  removerItem: (idx: number) => void;

  // Sugestões
  sugestoes: { codigo: string; custo: number }[];
  campoAtivo: number | null;
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement>;
  buscarSugestoesDebounced: (termo: string, idx: number) => void;
  handleSugestoesKeys: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => void;
  selecionarSugestao: (codigo: string, custo: number, idx: number) => void;
  confirmarSugestaoPrimeira: (
    idx: number,
    codigo: string,
    custo: number
  ) => void;

  // Navegação
  inputRefs: React.MutableRefObject<HTMLInputElement[][]>;
  handleGridNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => void;

  // Formatação / edição
  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;
};

export const CostComposition: React.FC<CostCompositionProps> = ({
  composicao,
  setComposicao,
  custoTotal,
  adicionarItem,
  removerItem,
  sugestoes,
  campoAtivo,
  indiceSelecionado,
  listaRef,
  buscarSugestoesDebounced,
  handleSugestoesKeys,
  selecionarSugestao,
  inputRefs,
  handleGridNav,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
}) => {
  return (
    <>
      <div
        className={`space-y-1.5 ${
          composicao.length > 10
            ? "max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
            : ""
        }`}
      >
        {composicao.map((item, idx) => (
          <CostItemRow
            key={idx}
            item={item}
            idx={idx}
            composicao={composicao}
            setComposicao={setComposicao}
            removerItem={removerItem}
            campoAtivo={campoAtivo}
            sugestoes={sugestoes}
            indiceSelecionado={indiceSelecionado}
            listaRef={listaRef}
            buscarSugestoesDebounced={buscarSugestoesDebounced}
            handleSugestoesKeys={handleSugestoesKeys}
            selecionarSugestao={selecionarSugestao}
            inputRefs={inputRefs}
            handleGridNav={handleGridNav}
            isEditing={isEditing}
            setEditing={setEditing}
            toDisplay={toDisplay}
            toInternal={toInternal}
          />
        ))}
      </div>

      <AddCostButton onClick={adicionarItem} />
      <TotalCostCard custoTotal={custoTotal} />
    </>
  );
};
