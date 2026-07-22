"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { CostFilters } from "@/components/costtable/types";

type Props = {
  search: string;
  setSearch: (value: string) => void;

  filters: CostFilters;
  setFilters: React.Dispatch<React.SetStateAction<CostFilters>>;

  allBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;

  onApplyFilters: () => void;
  onClearFilters: () => void;

  isLoading?: boolean;
};

function FilterLabel({ label }: { label: string }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-neutral-200">
        {label}
      </span>
    </div>
  );
}

function FilterSelectBlock({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione uma opção",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <FilterLabel label={label} />

      <Select
        value={value || undefined}
        onValueChange={onChange}
      >
        <SelectTrigger
          className="
            h-11 w-full
            cursor-pointer
            rounded-lg
            border border-neutral-700
            bg-[#161616]
            px-4
            text-left text-sm text-white
            outline-none
            transition
            focus:ring-2
            focus:ring-green-500/20
          "
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          className="
            rounded-lg
            border border-neutral-700
            bg-[#1b1b1b]
            text-white
            shadow-xl
          "
        >
          {options.map((option) => (
            <SelectItem
              key={option}
              value={option}
              className="
                cursor-pointer
                rounded-md
                text-left
                text-white
                focus:bg-[#2a2a2a]
                focus:text-white
                data-[state=checked]:bg-[#2f2f2f]
                data-[state=checked]:text-white
              "
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function CostFiltersSidebar({
  search,
  setSearch,
  filters,
  setFilters,
  allBrands,
  selectedBrands,
  setSelectedBrands,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}: Props) {
  const updateFilter = (
    key: keyof CostFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      if (prev.includes(brand)) {
        return prev.filter((item) => item !== brand);
      }

      return [...prev, brand];
    });
  };

  const visibleBrands = React.useMemo(() => {
    const term = filters.marca
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!term) {
      return allBrands;
    }

    return allBrands.filter((brand) =>
      brand
        .toLocaleLowerCase("pt-BR")
        .includes(term)
    );
  }, [allBrands, filters.marca]);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    onApplyFilters();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-transparent px-3 py-4 lg:px-4"
    >
      <div className="w-full space-y-5 lg:max-w-[220px]">
        {/* PESQUISAR */}
        <div className="w-full">
          <div className="relative">
            <Search
              className="
                pointer-events-none
                absolute left-3 top-1/2
                h-4 w-4
                -translate-y-1/2
                text-neutral-400
              "
            />

            <Input
              placeholder="Pesquisar"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="
                h-11 w-full
                cursor-text
                rounded-lg
                border border-neutral-700
                bg-[#161616]
                pl-10
                text-white
                placeholder:text-white/25
                focus-visible:border-green-500
                focus-visible:ring-2
                focus-visible:ring-green-500/20
              "
            />
          </div>
        </div>

        {/* SITUAÇÃO */}
        <FilterSelectBlock
          label="Situação"
          value={filters.situacao}
          onChange={(value) =>
            updateFilter("situacao", value)
          }
          options={["Últimos Incluídos"]}
          placeholder="Todos"
        />

        {/* NCM */}
        <FilterSelectBlock
          label="NCM"
          value={filters.ncm}
          onChange={(value) =>
            updateFilter("ncm", value)
          }
          options={["Com NCM", "Sem NCM"]}
          placeholder="Selecione"
        />

        {/* MARCAS */}
        <div className="w-full">
          <FilterLabel label="Marca" />

          <Input
            value={filters.marca}
            placeholder="Digite ou selecione abaixo"
            onChange={(event) =>
              updateFilter(
                "marca",
                event.target.value
              )
            }
            className="
              h-11 w-full
              cursor-text
              rounded-lg
              border border-neutral-700
              bg-[#161616]
              text-white
              placeholder:text-white/25
              focus-visible:border-green-500
              focus-visible:ring-2
              focus-visible:ring-green-500/20
            "
          />

          <div
            className="
              mt-2
              overflow-hidden
              rounded-lg
              border border-neutral-700
              bg-[#121212]
            "
          >
            <div
              className="
                flex items-center justify-between
                border-b border-neutral-800
                px-3 py-2
              "
            >
              <span className="text-xs text-neutral-400">
                Selecione uma ou mais marcas
              </span>

              {selectedBrands.length > 0 && (
                <span
                  className="
                    rounded-full
                    bg-green-500/15
                    px-2 py-0.5
                    text-[11px]
                    font-medium
                    text-green-400
                  "
                >
                  {selectedBrands.length}
                </span>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto p-2">
              {visibleBrands.length > 0 ? (
                <div className="space-y-1">
                  {visibleBrands.map((brand) => {
                    const checked =
                      selectedBrands.includes(brand);

                    return (
                      <label
                        key={brand}
                        className="
                          flex cursor-pointer
                          items-center gap-2
                          rounded-md
                          px-2 py-2
                          text-sm text-neutral-200
                          transition
                          hover:bg-white/5
                        "
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleBrand(brand)
                          }
                          className="
                            h-4 w-4
                            shrink-0
                            cursor-pointer
                            rounded
                            border-neutral-600
                            bg-[#0f0f0f]
                            accent-green-500
                          "
                        />

                        <span
                          className="min-w-0 flex-1 truncate"
                          title={brand}
                        >
                          {brand}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p
                  className="
                    px-2 py-3
                    text-center
                    text-xs
                    text-neutral-500
                  "
                >
                  Nenhuma marca encontrada.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="w-full pt-2 lg:pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="
              h-11 w-full
              cursor-pointer
              rounded-lg
              bg-gradient-to-r
              from-green-500
              to-green-600
              text-white
              transition-all
              duration-200
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-60
              lg:h-10
              lg:hover:from-green-400
              lg:hover:to-green-500
              lg:hover:shadow-[0_0_14px_rgba(34,197,94,0.22)]
            "
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ) : (
              "Filtrar"
            )}
          </Button>

          <button
            type="button"
            onClick={onClearFilters}
            disabled={isLoading}
            className="
              mt-3 w-full
              cursor-pointer
              text-center
              text-sm
              text-green-400
              transition
              active:scale-[0.98]
              hover:underline
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </form>
  );
}
