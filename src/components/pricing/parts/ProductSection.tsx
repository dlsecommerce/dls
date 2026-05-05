// components/precificacao/parts/ProductSection.tsx

import React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuggestionDropdown } from "./SuggestionDropdown";

type SugestaoProduto = {
  codigo: string;
  custo: number;
  produto?: string;
};

type TipoBuscaProduto = "codigo" | "descricao";

type ProductSectionProps = {
  codigo: string;
  setCodigo: (value: string) => void;

  descricao: string;
  setDescricao: (value: string) => void;

  sugestoesProduto?: SugestaoProduto[];
  produtoSugestaoAtiva?: boolean;
  indiceProdutoSelecionado?: number;
  listaProdutoRef?: React.RefObject<HTMLDivElement>;

  buscarSugestoesProdutoDebounced?: (
    termo: string,
    tipo: TipoBuscaProduto
  ) => void;

  handleProdutoSugestoesKeys?: (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;

  selecionarProdutoSugestao?: (
    codigo: string,
    custo: number,
    produto?: string
  ) => void;

  onAdicionarProduto?: () => void;
};

export const ProductSection: React.FC<ProductSectionProps> = ({
  codigo,
  setCodigo,
  descricao,
  setDescricao,

  sugestoesProduto = [],
  produtoSugestaoAtiva = false,
  indiceProdutoSelecionado = -1,
  listaProdutoRef,

  buscarSugestoesProdutoDebounced,
  handleProdutoSugestoesKeys,
  selecionarProdutoSugestao,

  onAdicionarProduto,
}) => {
  const fallbackListaRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = listaProdutoRef || fallbackListaRef;

  const [campoBuscaAtivo, setCampoBuscaAtivo] =
    React.useState<TipoBuscaProduto | null>(null);

  const canAdd = codigo.trim() !== "" || descricao.trim() !== "";

  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    setCampoBuscaAtivo("codigo");
    buscarSugestoesProdutoDebounced?.(value, "codigo");
  };

  const handleCodigoFocus = () => {
    setCampoBuscaAtivo("codigo");

    if (codigo.trim()) {
      buscarSugestoesProdutoDebounced?.(codigo, "codigo");
    }
  };

  const handleDescricaoChange = (value: string) => {
    setDescricao(value);
    setCampoBuscaAtivo("descricao");
    buscarSugestoesProdutoDebounced?.(value, "descricao");
  };

  const handleDescricaoFocus = () => {
    setCampoBuscaAtivo("descricao");

    if (descricao.trim()) {
      buscarSugestoesProdutoDebounced?.(descricao, "descricao");
    }
  };

  const handleSelect = (
    codigoSelecionado: string,
    custoSelecionado: number,
    produtoSelecionado?: string
  ) => {
    selecionarProdutoSugestao?.(
      codigoSelecionado,
      custoSelecionado,
      produtoSelecionado
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
          1.
        </span>

        <h2 className="text-base font-semibold text-white">Produto</h2>
      </div>

      <div className="space-y-4">
        <div className="relative z-[140]">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Código / SKU
          </label>

          <div className="flex overflow-hidden rounded-lg border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
            <Input
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              onFocus={handleCodigoFocus}
              onKeyDown={handleProdutoSugestoesKeys}
              placeholder="Ex: TN 5AM"
              className="
                h-10 flex-1 rounded-none border-0 bg-transparent px-3
                text-sm font-semibold text-white shadow-none outline-none
                placeholder:text-white/20
                focus-visible:ring-0 focus-visible:ring-offset-0
              "
            />

            <Button
              type="button"
              onClick={onAdicionarProduto}
              disabled={!canAdd}
              variant="ghost"
              className="
                h-10 w-10 cursor-pointer rounded-none border-l border-white/10
                bg-transparent p-0 text-[#1a8ceb]
                hover:bg-[#1a8ceb]/10 hover:text-[#4da7f0]
                active:scale-[0.96]
                disabled:cursor-not-allowed disabled:opacity-35
              "
              title="Adicionar na composição"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <SuggestionDropdown
            isActive={produtoSugestaoAtiva && campoBuscaAtivo === "codigo"}
            sugestoes={sugestoesProduto}
            listaRef={dropdownRef}
            indiceSelecionado={indiceProdutoSelecionado}
            onSelect={handleSelect}
          />
        </div>

        <div className="relative z-[130]">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Descrição
          </label>

          <Input
            value={descricao}
            onChange={(e) => handleDescricaoChange(e.target.value)}
            onFocus={handleDescricaoFocus}
            onKeyDown={handleProdutoSugestoesKeys}
            placeholder="Ex: TENNESSEE 5A MARFIM MADEIRA"
            className="
              h-10 rounded-lg border-white/10 bg-[#070707] px-3
              text-sm font-semibold text-white shadow-none outline-none
              placeholder:text-white/20
              focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
              focus-visible:ring-0 focus-visible:ring-offset-0
            "
          />

          <SuggestionDropdown
            isActive={
              produtoSugestaoAtiva && campoBuscaAtivo === "descricao"
            }
            sugestoes={sugestoesProduto}
            listaRef={dropdownRef}
            indiceSelecionado={indiceProdutoSelecionado}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </section>
  );
};