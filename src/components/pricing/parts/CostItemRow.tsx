import React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuggestionDropdown } from "./SuggestionDropdown";

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
};

type CostItemRowProps = {
  item: any;
  idx: number;
  composicao: any[];
  setComposicao: (items: any[]) => void;
  removerItem: (idx: number) => void;

  // Sugestões / Supabase
  campoAtivo: number | null;
  sugestoes: Sugestao[];
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement>;
  buscarSugestoesDebounced: any;
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

  // Necessário para fechar dropdown instantaneamente
  setSugestoes?: any;
  setCampoAtivo?: any;
};

const codeInputClass = `
  !h-10 !rounded-lg !border !border-white/10 !bg-[#070707] !px-3
  !text-sm !font-semibold !text-white !shadow-none !outline-none
  placeholder:!text-white/30
  focus:!border-[#1a8ceb]/70 focus:!ring-1 focus:!ring-[#1a8ceb]/30
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
`;

const cleanInnerInputClass = `
  !h-full !border-0 !bg-transparent !p-0
  !text-sm !font-semibold !text-white
  !shadow-none !outline-none
  placeholder:!text-white/25
  focus:!ring-0 focus:!outline-none
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
`;

const getRowTitle = (item: any) => {
  const codigo = String(item?.codigo || "").trim();

  if (codigo) return codigo;

  if (item?.descricao) return item.descricao;
  if (item?.produto) return item.produto;
  if (item?.nome) return item.nome;
  if (item?.label) return item.label;

  return "Novo custo";
};

const getRowDescription = (item: any) => {
  if (item?.produto) return item.produto;
  if (item?.descricao) return item.descricao;
  if (item?.nome) return item.nome;

  return "";
};

const getPrefix = (item: any) => {
  const tipo = String(item?.tipo || item?.codigo || "").toLowerCase();

  if (
    tipo.includes("imposto") ||
    tipo.includes("comissao") ||
    tipo.includes("comissão") ||
    tipo.includes("marketing") ||
    tipo.includes("margem")
  ) {
    return null;
  }

  return "R$";
};

const getSuffix = (item: any) => {
  const tipo = String(item?.tipo || item?.codigo || "").toLowerCase();

  if (
    tipo.includes("imposto") ||
    tipo.includes("comissao") ||
    tipo.includes("comissão") ||
    tipo.includes("marketing") ||
    tipo.includes("margem")
  ) {
    return "%";
  }

  return null;
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
  setSugestoes,
  setCampoAtivo,
}) => {
  const title = getRowTitle(item);
  const description = getRowDescription(item);
  const prefix = getPrefix(item);
  const suffix = getSuffix(item);

  return (
    <div className="group grid grid-cols-1 items-end gap-2 border-b border-white/10 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_92px_145px_auto] sm:gap-3">
      <div className="relative min-w-0 self-center">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {title}
          </span>

          {description && description !== title && (
            <span className="mt-0.5 block truncate text-xs font-medium text-white/45">
              {description}
            </span>
          )}
        </div>

        <div className="mt-2 sm:hidden">
          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][0] = el!;
            }}
            type="text"
            inputMode="text"
            placeholder="Código do custo"
            value={item.codigo || ""}
            onChange={(e) => {
              const value = e.target.value;

              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                codigo: value,
              };

              setComposicao(novo);

              if (value.trim() === "") {
                buscarSugestoesDebounced.cancel?.();
                setSugestoes?.([]);
                setCampoAtivo?.(null);
                return;
              }

              buscarSugestoesDebounced(value, idx);
              setCampoAtivo?.(idx);
            }}
            onKeyDown={(e) => {
              handleSugestoesKeys(e, idx);
              handleGridNav(e, idx, 0);
            }}
            className={codeInputClass}
          />

          <SuggestionDropdown
            isActive={campoAtivo === idx}
            sugestoes={sugestoes}
            listaRef={listaRef}
            indiceSelecionado={indiceSelecionado}
            onSelect={(codigo, custo, produto) =>
              selecionarSugestao(codigo, custo, idx, produto)
            }
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          Quantidade
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][1] = el!;
            }}
            type="text"
            inputMode="decimal"
            placeholder="1"
            value={item.quantidade || ""}
            onChange={(e) => {
              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                quantidade: toInternal(e.target.value),
              };

              setComposicao(novo);
            }}
            onKeyDown={(e) => handleGridNav(e, idx, 1)}
            className={`${cleanInnerInputClass} !text-center`}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          Custo Unitário
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          {prefix && (
            <span className="mr-1.5 text-sm font-semibold text-white/80">
              {prefix}
            </span>
          )}

          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][2] = el!;
            }}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={isEditing(`c-${idx}`) ? item.custo : toDisplay(item.custo)}
            onFocus={() => setEditing(`c-${idx}`, true)}
            onBlur={(e) => {
              setEditing(`c-${idx}`, false);

              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                custo: toInternal(e.target.value),
              };

              setComposicao(novo);
            }}
            onChange={(e) => {
              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                custo: toInternal(e.target.value),
              };

              setComposicao(novo);
            }}
            onKeyDown={(e) => handleGridNav(e, idx, 2)}
            className={`${cleanInnerInputClass} !text-right`}
          />

          {suffix && (
            <span className="ml-1.5 text-sm font-semibold text-white/55">
              {suffix}
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={() => removerItem(idx)}
        size="sm"
        variant="ghost"
        className="
          h-9 w-full cursor-pointer rounded-lg border border-red-500/20
          bg-red-500/10 p-0 text-red-400 transition-all
          hover:bg-red-500/20 hover:text-red-300
          active:scale-[0.96]
          sm:h-10 sm:w-10
        "
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="hidden">
        <Input
          ref={(el) => {
            if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
            inputRefs.current[idx][0] = el!;
          }}
          value={item.codigo || ""}
          onChange={() => {}}
        />
      </div>
    </div>
  );
};