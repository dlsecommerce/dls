// components/precificacao/parts/ProductSection.tsx

import React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuggestionDropdown } from "./SuggestionDropdown";
import { AnnounceRateSearch } from "./Announceratesearch";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import type { Calculo } from "../PricingCalculatorModern";
import type { ManualFlags } from "@/components/costs/hooks/usechannelpricing";

type SugestaoProduto = {
  codigo: string;
  custo: number;
  produto?: string;
  marca?: string;
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
    produto?: string,
    marca?: string
  ) => void;

  onAdicionarProduto?: () => void;

  onHoverProdutoIndex?: (index: number) => void;
  onCloseSugestoesProduto?: () => void;

  // ✅ NOVO — usados pelo AnnounceRateSearch para puxar comissão/frete
  // de ML Clássico/Premium a partir de um anúncio já existente.
  store: string;
  setCalculo: (
    key: ChannelKey,
    updater: (prev: Calculo) => Calculo
  ) => void;
  setManualFlag: (
    key: ChannelKey,
    field: keyof ManualFlags,
    value: boolean
  ) => void;
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

  onHoverProdutoIndex,
  onCloseSugestoesProduto,

  store,
  setCalculo,
  setManualFlag,
}) => {
  const fallbackListaRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = listaProdutoRef || fallbackListaRef;

  // ✅ NOVO — refs de âncora, usadas pelo portal do SuggestionDropdown
  // para calcular a posição correta (fixed) fora da árvore com overflow.
  const codigoWrapperRef = React.useRef<HTMLDivElement>(null);
  const descricaoWrapperRef = React.useRef<HTMLDivElement>(null);

  const [campoBuscaAtivo, setCampoBuscaAtivo] =
    React.useState<TipoBuscaProduto | null>(null);

  const [isSearching, setIsSearching] = React.useState(false);
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const canAdd = codigo.trim() !== "" || descricao.trim() !== "";

  const termoBuscaAtivo =
    campoBuscaAtivo === "codigo"
      ? codigo
      : campoBuscaAtivo === "descricao"
        ? descricao
        : "";

  React.useEffect(() => {
    setIsSearching(false);
  }, [sugestoesProduto]);

  React.useEffect(() => {
    if (!produtoSugestaoAtiva) {
      setIsSearching(false);
    }
  }, [produtoSugestaoAtiva]);

  React.useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const dispararLoading = () => {
    setIsSearching(true);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 4000);
  };

  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    setCampoBuscaAtivo("codigo");

    if (value.trim()) {
      dispararLoading();
    } else {
      setIsSearching(false);
    }

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

    if (value.trim()) {
      dispararLoading();
    } else {
      setIsSearching(false);
    }

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
    produtoSelecionado?: string,
    marcaSelecionada?: string
  ) => {
    setIsSearching(false);

    selecionarProdutoSugestao?.(
      codigoSelecionado,
      custoSelecionado,
      produtoSelecionado,
      marcaSelecionada
    );
  };

  const handleClose = () => {
    setIsSearching(false);
    onCloseSugestoesProduto?.();
  };

  return (
    <section className="rounded border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#1a8ceb] text-xs font-bold text-white">
          1.
        </span>

        <h2 className="text-base font-semibold text-white">Produto</h2>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Código / SKU
          </label>

          {/* ✅ ref adicionada aqui — é a âncora usada pelo portal */}
          <div
            ref={codigoWrapperRef}
            className="flex overflow-hidden rounded border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30"
          >
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
            termoBusca={campoBuscaAtivo === "codigo" ? termoBuscaAtivo : ""}
            isLoading={campoBuscaAtivo === "codigo" && isSearching}
            onHoverIndex={onHoverProdutoIndex}
            onClose={handleClose}
            anchorRef={codigoWrapperRef}
          />
        </div>

        <div className="relative">
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Descrição
          </label>

          {/* ✅ ref adicionada aqui — é a âncora usada pelo portal */}
          <div ref={descricaoWrapperRef}>
            <Input
              value={descricao}
              onChange={(e) => handleDescricaoChange(e.target.value)}
              onFocus={handleDescricaoFocus}
              onKeyDown={handleProdutoSugestoesKeys}
              placeholder="Ex: TENNESSEE 5A MARFIM MADEIRA"
              className="
                h-10 rounded border-white/10 bg-[#070707] px-3
                text-sm font-semibold text-white shadow-none outline-none
                placeholder:text-white/20
                focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
                focus-visible:ring-0 focus-visible:ring-offset-0
              "
            />
          </div>

          <SuggestionDropdown
            isActive={produtoSugestaoAtiva && campoBuscaAtivo === "descricao"}
            sugestoes={sugestoesProduto}
            listaRef={dropdownRef}
            indiceSelecionado={indiceProdutoSelecionado}
            onSelect={handleSelect}
            termoBusca={campoBuscaAtivo === "descricao" ? termoBuscaAtivo : ""}
            isLoading={campoBuscaAtivo === "descricao" && isSearching}
            onHoverIndex={onHoverProdutoIndex}
            onClose={handleClose}
            anchorRef={descricaoWrapperRef}
          />
        </div>

        {/* ✅ NOVO — busca de anúncio pra puxar comissão/frete de
            ML Clássico/Premium direto, sem digitar manualmente. */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Anúncios
          </label>

          <AnnounceRateSearch
            store={store}
            setCalculo={setCalculo}
            setManualFlag={setManualFlag}
          />
        </div>
      </div>
    </section>
  );
};
