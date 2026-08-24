"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, ChevronDown, Check } from "lucide-react";
import {
  MarketplaceFilters as MarketplaceFiltersType,
  SITUACAO_OPTIONS,
  STORE_OPTIONS,
  TIPO_OPTIONS,
  CONDICAO_OPTIONS,
} from "@/components/marketplace/hooks/types";

type Props = {
  filters: MarketplaceFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<MarketplaceFiltersType>>;

  allBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;

  allChannels: string[];

  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
};

function FieldLabel({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
    >
      {label}
    </label>
  );
}

const inputClass = `
  h-10 w-full rounded-none border border-neutral-800 bg-[#0a0a0a]
  text-sm text-white placeholder:text-neutral-500
  focus-visible:border-[#1a8ceb]/60 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/40
`;

const selectTriggerClass = `
  h-10 w-full cursor-pointer rounded-none border border-neutral-800 bg-[#0a0a0a]
  px-3 text-left text-sm text-white outline-none transition-colors
  focus:border-[#1a8ceb]/60 focus:ring-0
  focus-visible:ring-1 focus-visible:ring-[#ffffff]/40
`;

const selectContentClass = `
  min-w-[180px] rounded-none border border-neutral-800 bg-[#0d0d0d] p-1 shadow-2xl
`;

function selectItemClass(isActive: boolean) {
  return `
    relative cursor-pointer rounded-none py-2 pl-3 pr-3 text-sm transition-colors
    focus:bg-neutral-900 data-[state=checked]:font-medium [&_svg]:hidden
    ${isActive ? "text-[#1a8ceb] data-[state=checked]:text-[#1a8ceb]" : "text-[#ffffff]/70 hover:text-[#1a8ceb]"}
  `;
}

const norm = (v: string) => v.trim().toLocaleLowerCase("pt-BR");

const isMercadoLivre = (canal: string) => norm(canal).includes("mercado livre");

/** Dropdown de marcas com múltipla seleção (idêntico ao usado em anúncios) */
function BrandMultiSelect({
  allBrands,
  selectedBrands,
  setSelectedBrands,
}: {
  allBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addBrand = React.useCallback(
    (brand: string) => {
      const trimmed = brand.trim();
      if (!trimmed) return;
      const official = allBrands.find((b) => norm(b) === norm(trimmed));
      if (!official) return;
      setSelectedBrands((prev) =>
        prev.some((b) => norm(b) === norm(official)) ? prev : [...prev, official]
      );
    },
    [allBrands, setSelectedBrands]
  );

  const removeBrand = React.useCallback(
    (brand: string) => setSelectedBrands((prev) => prev.filter((b) => norm(b) !== norm(brand))),
    [setSelectedBrands]
  );

  const clearAllBrands = React.useCallback(() => setSelectedBrands([]), [setSelectedBrands]);

  const toggleBrand = React.useCallback(
    (brand: string) => {
      const already = selectedBrands.some((b) => norm(b) === norm(brand));
      already ? removeBrand(brand) : addBrand(brand);
    },
    [selectedBrands, addBrand, removeBrand]
  );

  const visibleBrands = React.useMemo(() => {
    const term = norm(searchTerm);
    if (!term) return allBrands;
    return allBrands.filter((b) => norm(b).includes(term));
  }, [allBrands, searchTerm]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (visibleBrands.length === 1) {
        addBrand(visibleBrands[0]);
        setSearchTerm("");
      }
      return;
    }
    if (e.key === "Backspace" && searchTerm === "" && selectedBrands.length > 0) {
      removeBrand(selectedBrands[selectedBrands.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={`
          flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5
          rounded-none border bg-[#0a0a0a] px-2 py-1.5 transition-colors
          ${open ? "border-[#1a8ceb]/60" : "border-neutral-800 hover:border-neutral-700"}
        `}
      >
        {selectedBrands.map((brand) => (
          <button
            key={brand}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeBrand(brand);
            }}
            title={`Remover ${brand}`}
            className="flex cursor-pointer items-center gap-1 border border-[#1a8ceb]/40 bg-[#1a8ceb]/10 px-2 py-0.5 text-[12px] text-[#1a8ceb] transition-colors hover:bg-[#1a8ceb]/20"
          >
            {brand}
          </button>
        ))}

        <input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={selectedBrands.length === 0 ? "Ex: Liverpool, SKP" : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
        />

        {selectedBrands.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAllBrands();
            }}
            className="shrink-0 cursor-pointer text-neutral-500 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto border border-neutral-800 bg-[#0d0d0d] shadow-2xl"
        >
          {visibleBrands.length > 0 ? (
            visibleBrands.map((brand) => {
              const checked = selectedBrands.some((b) => norm(b) === norm(brand));
              return (
                <button
                  type="button"
                  key={brand}
                  role="option"
                  aria-selected={checked}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleBrand(brand);
                  }}
                  className={`
                    flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-[13px]
                    transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
                    ${checked ? "text-[#1a8ceb]" : "text-neutral-300"}
                  `}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className={`h-3 w-3 shrink-0 border ${checked ? "border-[#1a8ceb] bg-[#1a8ceb]" : "border-neutral-700"}`} />
                    <span className="truncate">{brand}</span>
                  </span>
                  {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-3 text-center text-xs text-neutral-500">Nenhuma marca encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceFilters({
  filters,
  setFilters,
  allBrands,
  selectedBrands,
  setSelectedBrands,
  allChannels,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}: Props) {
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [situacaoOpen, setSituacaoOpen] = React.useState(false);
  const [canalOpen, setCanalOpen] = React.useState(false);
  const [tipoOpen, setTipoOpen] = React.useState(false);
  const [lojaOpen, setLojaOpen] = React.useState(false);
  const [condicaoOpen, setCondicaoOpen] = React.useState(false);

  const showCondicaoFilter = isMercadoLivre(filters.canal);

  const updateFilter = (key: keyof MarketplaceFiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Se o usuário trocar de canal e não for mais Mercado Livre, reseta a condição
  React.useEffect(() => {
    if (!showCondicaoFilter && filters.condicao !== "Todos") {
      setFilters((prev) => ({ ...prev, condicao: "Todos" }));
    }
  }, [showCondicaoFilter, filters.condicao, setFilters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApplyFilters();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, isOpen: boolean) => {
    if (e.key === "Enter" && !isOpen) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const hasActiveFilters =
    filters.situacao !== "Ativos" ||
    filters.loja !== "Todos" ||
    filters.canal !== "Todos" ||
    filters.tipo !== "Todos" ||
    filters.condicao !== "Todos" ||
    filters.codigo.trim() !== "" ||
    filters.produto.trim() !== "" ||
    selectedBrands.length > 0;

  return (
    <div className="border border-neutral-900 bg-[#0a0a0a]">
      <form ref={formRef} onSubmit={handleSubmit} className="w-full px-4 py-4">
        <div className="flex flex-col gap-3">
          {/* LINHA 1 — Código, Produto, Marca, Situação, Tipo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* CÓDIGO */}
            <div>
              <FieldLabel label="Código" htmlFor="filtro-codigo" />
              <Input
                id="filtro-codigo"
                placeholder="Ex: PAI-TN 5AM, VAR-Q10 MK2"
                value={filters.codigo}
                onChange={(e) => updateFilter("codigo", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* NOME DO PRODUTO */}
            <div>
              <FieldLabel label="Nome do Produto" htmlFor="filtro-produto" />
              <Input
                id="filtro-produto"
                placeholder="Ex: Baqueta 5A, Caixa de Som"
                value={filters.produto}
                onChange={(e) => updateFilter("produto", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* MARCA */}
            <div>
              <FieldLabel label="Marca" htmlFor="filtro-marca" />
              <BrandMultiSelect
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
              />
            </div>

            {/* SITUAÇÃO */}
            <div>
              <FieldLabel label="Situação" htmlFor="filtro-situacao" />
              <Select
                value={filters.situacao}
                onValueChange={(v) => updateFilter("situacao", v)}
                open={situacaoOpen}
                onOpenChange={setSituacaoOpen}
              >
                <SelectTrigger id="filtro-situacao" onKeyDown={(e) => handleTriggerKeyDown(e, situacaoOpen)} className={selectTriggerClass}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className={selectContentClass}>
                  {SITUACAO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className={selectItemClass(filters.situacao === option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TIPO */}
            <div>
              <FieldLabel label="Tipo" htmlFor="filtro-tipo" />
              <Select
                value={filters.tipo}
                onValueChange={(v) => updateFilter("tipo", v)}
                open={tipoOpen}
                onOpenChange={setTipoOpen}
              >
                <SelectTrigger id="filtro-tipo" onKeyDown={(e) => handleTriggerKeyDown(e, tipoOpen)} className={selectTriggerClass}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className={selectContentClass}>
                  {TIPO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className={selectItemClass(filters.tipo === option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* LINHA 2 — Canais, Loja, Condição (só quando canal = Mercado Livre) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* CANAIS */}
            <div>
              <FieldLabel label="Canais" htmlFor="filtro-canal" />
              <Select
                value={filters.canal}
                onValueChange={(v) => updateFilter("canal", v)}
                open={canalOpen}
                onOpenChange={setCanalOpen}
              >
                <SelectTrigger id="filtro-canal" onKeyDown={(e) => handleTriggerKeyDown(e, canalOpen)} className={selectTriggerClass}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className={selectContentClass}>
                  <SelectItem value="Todos" className={selectItemClass(filters.canal === "Todos")}>
                    Todos
                  </SelectItem>
                  {allChannels.map((option) => (
                    <SelectItem key={option} value={option} className={selectItemClass(filters.canal === option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LOJA */}
            <div>
              <FieldLabel label="Loja" htmlFor="filtro-loja" />
              <Select
                value={filters.loja}
                onValueChange={(v) => updateFilter("loja", v)}
                open={lojaOpen}
                onOpenChange={setLojaOpen}
              >
                <SelectTrigger id="filtro-loja" onKeyDown={(e) => handleTriggerKeyDown(e, lojaOpen)} className={selectTriggerClass}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className={selectContentClass}>
                  {STORE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className={selectItemClass(filters.loja === option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CONDIÇÃO — exclusivo Mercado Livre */}
            {showCondicaoFilter && (
              <div>
                <FieldLabel label="Condição" htmlFor="filtro-condicao" />
                <Select
                  value={filters.condicao}
                  onValueChange={(v) => updateFilter("condicao", v)}
                  open={condicaoOpen}
                  onOpenChange={setCondicaoOpen}
                >
                  <SelectTrigger id="filtro-condicao" onKeyDown={(e) => handleTriggerKeyDown(e, condicaoOpen)} className={selectTriggerClass}>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className={selectContentClass}>
                    {CONDICAO_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className={selectItemClass(filters.condicao === option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                disabled={isLoading}
                aria-label="Limpar filtros"
                className="flex h-9 cursor-pointer items-center gap-1.5 px-3 text-[13px] text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              aria-label="Aplicar filtros"
              className="flex h-9 min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-none border border-[#1a8ceb] bg-[#1a8ceb] px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1579d1] hover:border-[#1579d1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Filtrar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
