// components/precificacao/parts/AnunciosSection.tsx

import React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuggestionDropdown } from "./SuggestionDropdown";

type SugestaoAnuncio = {
  codigo: string;
  custo: number;
  produto?: string;
  anuncio?: string;
  descricao?: string;
};

type TipoBuscaAnuncio = "codigo" | "descricao";

type AnunciosSectionProps = {
  codigo: string;
  setCodigo: (value: string) => void;

  descricao: string;
  setDescricao: (value: string) => void;

  sugestoesAnuncio?: SugestaoAnuncio[];
  anuncioSugestaoAtiva?: boolean;
  indiceAnuncioSelecionado?: number;
  listaAnuncioRef?: React.RefObject<HTMLDivElement>;

  buscarSugestoesAnuncioDebounced?: (
    termo: string,
    tipo: TipoBuscaAnuncio
  ) => void;

  handleAnuncioSugestoesKeys?: (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;

  selecionarAnuncioSugestao?: (
    codigo: string,
    custo: number,
    produto?: string
  ) => void;

  onAdicionarAnuncio?: () => void;
};

export const AnunciosSection: React.FC<AnunciosSectionProps> = ({
  codigo,
  setCodigo,
  descricao,
  setDescricao,

  sugestoesAnuncio = [],
  anuncioSugestaoAtiva = false,
  indiceAnuncioSelecionado = -1,
  listaAnuncioRef,

  buscarSugestoesAnuncioDebounced,
  handleAnuncioSugestoesKeys,
  selecionarAnuncioSugestao,

  onAdicionarAnuncio,
}) => {
  const fallbackListaRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = listaAnuncioRef || fallbackListaRef;

  const [campoBuscaAtivo, setCampoBuscaAtivo] =
    React.useState<TipoBuscaAnuncio | null>(null);

  const canAdd = codigo.trim() !== "" || descricao.trim() !== "";

  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    setCampoBuscaAtivo("codigo");
    buscarSugestoesAnuncioDebounced?.(value, "codigo");
  };

  const handleCodigoFocus = () => {
    setCampoBuscaAtivo("codigo");

    if (codigo.trim()) {
      buscarSugestoesAnuncioDebounced?.(codigo, "codigo");
    }
  };

  const handleDescricaoChange = (value: string) => {
    setDescricao(value);
    setCampoBuscaAtivo("descricao");
    buscarSugestoesAnuncioDebounced?.(value, "descricao");
  };

  const handleDescricaoFocus = () => {
    setCampoBuscaAtivo("descricao");

    if (descricao.trim()) {
      buscarSugestoesAnuncioDebounced?.(descricao, "descricao");
    }
  };

  const handleSelect = (
    codigoSelecionado: string,
    custoSelecionado: number,
    produtoSelecionado?: string
  ) => {
    selecionarAnuncioSugestao?.(
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

        <h2 className="text-base font-semibold text-white">Anúncio</h2>
      </div>

      <div className="space-y-4">
        <div className="relative z-[140]">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Código / SKU do Anúncio
          </label>

          <div className="flex overflow-hidden rounded-lg border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
            <Input
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              onFocus={handleCodigoFocus}
              onKeyDown={handleAnuncioSugestoesKeys}
              placeholder="Ex: MLB123456789"
              className="
                h-10 flex-1 rounded-none border-0 bg-transparent px-3
                text-sm font-semibold text-white shadow-none outline-none
                placeholder:text-white/20
                focus-visible:ring-0 focus-visible:ring-offset-0
              "
            />

            <Button
              type="button"
              onClick={onAdicionarAnuncio}
              disabled={!canAdd}
              variant="ghost"
              className="
                h-10 w-10 cursor-pointer rounded-none border-l border-white/10
                bg-transparent p-0 text-[#1a8ceb]
                hover:bg-[#1a8ceb]/10 hover:text-[#4da7f0]
                active:scale-[0.96]
                disabled:cursor-not-allowed disabled:opacity-35
              "
              title="Adicionar anúncio"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <SuggestionDropdown
            isActive={anuncioSugestaoAtiva && campoBuscaAtivo === "codigo"}
            sugestoes={sugestoesAnuncio}
            listaRef={dropdownRef}
            indiceSelecionado={indiceAnuncioSelecionado}
            onSelect={handleSelect}
          />
        </div>

        <div className="relative z-[130]">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Título / Descrição do Anúncio
          </label>

          <Input
            value={descricao}
            onChange={(e) => handleDescricaoChange(e.target.value)}
            onFocus={handleDescricaoFocus}
            onKeyDown={handleAnuncioSugestoesKeys}
            placeholder="Ex: Violão Tennessee 5A Marfim Madeira"
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
              anuncioSugestaoAtiva && campoBuscaAtivo === "descricao"
            }
            sugestoes={sugestoesAnuncio}
            listaRef={dropdownRef}
            indiceSelecionado={indiceAnuncioSelecionado}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </section>
  );
};