import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuggestionDropdown } from "./SuggestionDropdown";

type CostItemRowProps = {
  item: any;
  idx: number;
  composicao: any[];
  setComposicao: (items: any[]) => void;
  removerItem: (idx: number) => void;

  // Sugestões / Supabase
  campoAtivo: number | null;
  sugestoes: { codigo: string; custo: number }[];
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement>;
  buscarSugestoesDebounced: (termo: string, idx: number) => void;
  handleSugestoesKeys: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => void;
  selecionarSugestao: (codigo: string, custo: number, idx: number) => void;

  // Navegação / refs
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

export const CostItemRow: React.FC<CostItemRowProps> = ({
  item,
  idx,
  composicao,
  setComposicao,
  removerItem,
  campoAtivo,
  sugestoes,
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
    <div className="relative grid grid-cols-3 gap-2 mb-1 p-1.5 rounded-lg bg-black/30 border border-white/10">
      {/* Código */}
      <div className="relative">
        <Label className="text-neutral-400 text-[10px] block mb-1">
          Código
        </Label>
        <Input
          ref={(el) => {
            if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
            inputRefs.current[idx][0] = el!;
          }}
          type="text"
          placeholder="SKU"
          value={item.codigo}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].codigo = e.target.value;
            setComposicao(novo);
            buscarSugestoesDebounced(e.target.value, idx);
          }}
          onKeyDown={(e) => {
            handleSugestoesKeys(e, idx);
            handleGridNav(e, idx, 0);
          }}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
        />

        <SuggestionDropdown
          isActive={campoAtivo === idx}
          sugestoes={sugestoes}
          listaRef={listaRef}
          indiceSelecionado={indiceSelecionado}
          onSelect={(codigo, custo) => selecionarSugestao(codigo, custo, idx)}
        />
      </div>

      {/* Quantidade */}
      <div>
        <Label className="text-neutral-400 text-[10px] block mb-1">
          Quantidade
        </Label>
        <Input
          ref={(el) => {
            if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
            inputRefs.current[idx][1] = el!;
          }}
          type="text"
          placeholder="1"
          value={
            isEditing(`q-${idx}`) ? item.quantidade : toDisplay(item.quantidade)
          }
          onFocus={() => setEditing(`q-${idx}`, true)}
          onBlur={(e) => {
            setEditing(`q-${idx}`, false);
            const novo = [...composicao];
            novo[idx].quantidade = toInternal(e.target.value);
            setComposicao(novo);
          }}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].quantidade = toInternal(e.target.value);
            setComposicao(novo);
          }}
          onKeyDown={(e) => handleGridNav(e, idx, 1)}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
        />
      </div>

      {/* Custo */}
      <div>
        <Label className="text-neutral-400 text-[10px] block mb-1">
          Custo (R$)
        </Label>
        <Input
          ref={(el) => {
            if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
            inputRefs.current[idx][2] = el!;
          }}
          type="text"
          placeholder="100"
          value={isEditing(`c-${idx}`) ? item.custo : toDisplay(item.custo)}
          onFocus={() => setEditing(`c-${idx}`, true)}
          onBlur={(e) => {
            setEditing(`c-${idx}`, false);
            const novo = [...composicao];
            novo[idx].custo = toInternal(e.target.value);
            setComposicao(novo);
          }}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].custo = toInternal(e.target.value);
            setComposicao(novo);
          }}
          onKeyDown={(e) => handleGridNav(e, idx, 2)}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
        />
      </div>

      {idx >= 1 && (
        <Button
          onClick={() => removerItem(idx)}
          size="sm"
          variant="ghost"
          className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2
                     w-5 h-5 p-0 flex items-center justify-center 
                     bg-red-500/20 hover:bg-red-500/40 text-red-400 
                     border border-red-500/30 rounded-full shadow-sm 
                     transition-all cursor-pointer"
          title="Remover linha"
        >
          ×
        </Button>
      )}
    </div>
  );
};
