import React from "react";
import { Info } from "lucide-react";
import { CostItemRow } from "./CostItemRow";
import { AddCostButton } from "./AddCostButton";
import { TotalCostCard } from "./TotalCostCard";

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
};

type CostCompositionProps = {
  composicao: any[];
  setComposicao: (items: any[]) => void;
  custoTotal: number | string;
  adicionarItem: () => void;
  removerItem: (idx: number) => void;

  // Sugestões
  sugestoes: Sugestao[];
  campoAtivo: number | null;
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement>;
  buscarSugestoesDebounced: (termo: string, idx: number) => void;
  handleSugestoesKeys: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => void;
  selecionarSugestao: (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string
  ) => void;
  confirmarSugestaoPrimeira: (
    idx: number,
    codigo: string,
    custo: number,
    produto?: string
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
  const hasManyItems = composicao.length > 8;

  const listScrollClass = hasManyItems
    ? campoAtivo !== null
      ? "max-h-[300px] overflow-visible pr-1"
      : "max-h-[300px] overflow-y-auto pr-1 overscroll-contain scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
    : "overflow-visible";

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
          2.
        </span>

        <h2 className="text-base font-semibold text-white">
          Composição de Custo
        </h2>
      </div>

      <div className={`space-y-2 ${listScrollClass}`}>
        {composicao.length > 0 ? (
          composicao.map((item, idx) => (
            <CostItemRow
              key={`${item.codigo || "item"}-${idx}`}
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
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-5 text-center">
            <p className="text-sm font-medium text-white/75">
              Nenhum custo adicionado
            </p>

            <p className="mt-1 text-xs text-white/40">
              Adicione produtos para calcular o custo total.
            </p>
          </div>
        )}
      </div>

      <AddCostButton onClick={adicionarItem} />

      <TotalCostCard custoTotal={custoTotal} />

      <div className="mt-4 rounded-xl border border-white/10 bg-[#181818] px-4 py-3">
        <div className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />

          <p className="text-xs leading-relaxed text-white/45">
            Os valores de impostos e comissões podem variar conforme as
            políticas de cada marketplace.
          </p>
        </div>
      </div>
    </section>
  );
};