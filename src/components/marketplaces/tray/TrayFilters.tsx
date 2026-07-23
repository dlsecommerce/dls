"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

import FilterMarcaCombobox from "@/components/marketplaces/tray/FilterMarcaCombobox";

import {
  TrayFilters,
  DEFAULT_TRAY_FILTERS,
} from "@/components/marketplaces/tray/types";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  filters: TrayFilters;
  setFilters: React.Dispatch<React.SetStateAction<TrayFilters>>;
  allMarcas: string[];
};

function FilterLabel({ label }: { label: string }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-neutral-200">{label}</span>
    </div>
  );
}

function FilterSelectBlock({
  label,
  value,
  onChange,
  options,
  placeholder = "Todos",
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

      <Select value={value || "Todos"} onValueChange={onChange}>
        <SelectTrigger
          className="
            h-11 w-full rounded-lg
            border border-neutral-700 bg-[#161616]
            px-4 text-left text-sm text-white
            outline-none transition
            cursor-pointer
            focus:ring-2 focus:ring-green-500/20
          "
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          className="
            rounded-lg border border-neutral-700
            bg-[#1b1b1b] text-white
            shadow-xl
          "
        >
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function TrayFiltersSidebar({
  search,
  setSearch,
  filters,
  setFilters,
  allMarcas,
}: Props) {
  // 🔹 Estado LOCAL — só aplica quando clicar em "Filtrar" ou apertar Enter
  const [localSearch, setLocalSearch] = useState(search);
  const [localFilters, setLocalFilters] = useState<TrayFilters>(filters);

  // Mantém sincronizado se os filtros globais mudarem externamente (ex: via URL)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateLocalFilter = (key: keyof TrayFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === "Todos" ? "" : value,
    }));
  };

  const applyFilters = () => {
    setSearch(localSearch);
    setFilters(localFilters);
  };

  const clearFilters = () => {
    setLocalSearch("");
    setLocalFilters(DEFAULT_TRAY_FILTERS);
    setSearch("");
    setFilters(DEFAULT_TRAY_FILTERS);
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") applyFilters();
  };

  return (
    <div
      className="
        w-full
        bg-transparent
        px-3 py-4 lg:px-4
      "
    >
      <div className="w-full lg:max-w-[220px] space-y-5">
        {/* SEARCH */}
        <div className="w-full">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <Input
              placeholder="Pesquisar"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleEnter}
              className="
                h-11 w-full cursor-text rounded-lg
                border border-neutral-700 bg-[#161616]
                pl-10 text-white placeholder:text-white/25
                focus-visible:border-green-500
                focus-visible:ring-2 focus-visible:ring-green-500/20
              "
            />
          </div>
        </div>

        {/* FILTROS */}
        <FilterSelectBlock
          label="Situação"
          value={localFilters.situacao}
          onChange={(v) => updateLocalFilter("situacao", v)}
          options={["Todos", "Últimos Incluídos"]}
          placeholder="Todos"
        />

        <FilterSelectBlock
          label="Tipo"
          value={localFilters.tipo}
          onChange={(v) => updateLocalFilter("tipo", v)}
          options={[
            "Todos",
            "Produtos",
            "Produtos simples",
            "Produtos com variações",
            "Variações",
          ]}
          placeholder="Todos"
        />

        <FilterSelectBlock
          label="Lojas Virtuais"
          value={localFilters.lojasVirtuais}
          onChange={(v) => updateLocalFilter("lojasVirtuais", v)}
          options={["Todos", "Pikot Shop", "Sóbaquetas"]}
          placeholder="Todos"
        />

        <FilterMarcaCombobox
          allMarcas={allMarcas}
          value={localFilters.marca}
          onChange={(v) => updateLocalFilter("marca", v)}
          onSubmit={applyFilters}
        />

        {/* AÇÕES */}
        <div className="w-full pt-2 space-y-3">
          <Button
            type="button"
            onClick={applyFilters}
            className="
               h-11 w-full rounded-lg
                cursor-pointer
                bg-green-500 text-white font-medium
                hover:bg-green-600
                  transition
                  active:scale-[0.98]
            "
          >
            Filtrar
          </Button>

          <div
            onClick={clearFilters}
            className="
              cursor-pointer
              text-center text-green-400
              active:scale-[0.98]
              transition
              hover:underline
            "
          >
            Limpar filtros
          </div>
        </div>
      </div>
    </div>
  );
}
