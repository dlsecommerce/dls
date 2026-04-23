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
import { Search } from "lucide-react";
import {
  CostFilters,
  DEFAULT_COST_FILTERS,
} from "@/components/costtable/types";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  filters: CostFilters;
  setFilters: React.Dispatch<React.SetStateAction<CostFilters>>;
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

      <Select value={value || undefined} onValueChange={onChange}>
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

function FilterInputBlock({
  label,
  value,
  onChange,
  placeholder = "Todos",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <FilterLabel label={label} />
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-text rounded-lg border border-neutral-700 bg-[#161616] text-white placeholder:text-white/25 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/20"
      />
    </div>
  );
}

export default function CostFiltersSidebar({
  search,
  setSearch,
  filters,
  setFilters,
}: Props) {
  const updateFilter = (key: keyof CostFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearch("");
    setFilters(DEFAULT_COST_FILTERS);
  };

  return (
    <div className="w-full bg-transparent px-4 py-4">
      <div className="w-full max-w-[220px] space-y-5">
        <div className="w-full">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Pesquisar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full cursor-text rounded-lg border border-neutral-700 bg-[#161616] pl-10 text-white placeholder:text-white/25 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/20"
            />
          </div>
        </div>

        <FilterSelectBlock
          label="Situação"
          value={filters.situacao}
          onChange={(v) => updateFilter("situacao", v)}
          options={["Todos", "Últimos Incluídos"]}
          placeholder="Todos"
        />

        <FilterSelectBlock
          label="NCM"
          value={filters.ncm}
          onChange={(v) => updateFilter("ncm", v)}
          options={["Com NCM", "Sem NCM"]}
          placeholder="Selecione"
        />

        <FilterInputBlock
          label="Marca"
          value={filters.marca}
          onChange={(v) => updateFilter("marca", v)}
          placeholder="Ex: Liverpool"
        />

        <div className="w-full pt-1">
          <Button
            type="button"
            className="h-10 w-full cursor-pointer rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white transition-all duration-200 hover:from-green-400 hover:to-green-500 hover:shadow-[0_0_14px_rgba(34,197,94,0.22)]"
          >
            Filtrar
          </Button>

          <div
            onClick={clearFilters}
            className="mt-3 cursor-pointer text-center text-green-400 transition hover:underline"
          >
            Limpar filtros
          </div>
        </div>
      </div>
    </div>
  );
}