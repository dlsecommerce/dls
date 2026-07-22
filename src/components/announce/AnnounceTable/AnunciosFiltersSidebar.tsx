"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import {
  AnuncioFilters,
  DEFAULT_ANUNCIO_FILTERS,
} from "@/components/announce/AnnounceTable/types";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  filters: AnuncioFilters;
  setFilters: React.Dispatch<React.SetStateAction<AnuncioFilters>>;
  allCategorias: string[];
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

/*
  Combobox de Marca: input "Digite ou selecione abaixo" +
  dropdown com checkboxes para multiseleção.
  Usa filters.marca como string separada por vírgula.
*/
function FilterMarcaCombobox({
  allMarcas,
  value,
  onChange,
  onSubmit,
}: {
  allMarcas: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionadas = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const marcasFiltradas = allMarcas.filter((m) =>
    m.toLowerCase().includes(busca.toLowerCase())
  );

  const toggleMarca = (marca: string) => {
    const jaTem = selecionadas.includes(marca);
    const novas = jaTem
      ? selecionadas.filter((m) => m !== marca)
      : [...selecionadas, marca];

    onChange(novas.join(", "));
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={containerRef}>
      <FilterLabel label="Marca" />

      <Input
        value={busca}
        onFocus={() => setOpen(true)}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Digite ou selecione abaixo"
        className="
          h-11 w-full cursor-text rounded-lg
          border border-neutral-700 bg-[#161616]
          text-white placeholder:text-white/25
          focus-visible:border-green-500
          focus-visible:ring-2 focus-visible:ring-green-500/20
        "
      />

      {open && (
        <div
          className="
            mt-2 max-h-48 w-full overflow-y-auto
            rounded-lg border border-neutral-700 bg-[#161616]
            p-2 space-y-1
          "
        >
          <span className="block px-2 py-1 text-xs text-neutral-500">
            Selecione uma ou mais marcas
          </span>

          {marcasFiltradas.length === 0 ? (
            <span className="block px-2 py-1 text-xs text-white/40">
              Nenhuma marca encontrada.
            </span>
          ) : (
            marcasFiltradas.map((marca) => {
              const checked = selecionadas.includes(marca);

              return (
                <label
                  key={marca}
                  className="
                    flex items-center gap-2 rounded-md px-2 py-1.5
                    text-sm text-neutral-200 cursor-pointer
                    hover:bg-white/5
                  "
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleMarca(marca)}
                    className="
                      border-neutral-600
                      data-[state=checked]:bg-green-500
                      data-[state=checked]:border-green-500
                    "
                  />
                  <span className="truncate">{marca}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AnunciosFiltersSidebar({
  search,
  setSearch,
  filters,
  setFilters,
  allCategorias,
  allMarcas,
}: Props) {
  // Estado local (staging) — só aplica ao clicar em Filtrar / Enter
  const [localSearch, setLocalSearch] = useState(search);
  const [localFilters, setLocalFilters] = useState<AnuncioFilters>(filters);

  // Sincroniza local quando o pai muda por fora (ex: URL, "Limpar filtros")
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateLocalFilter = (key: keyof AnuncioFilters, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setSearch(localSearch);
    setFilters(localFilters);
  };

  const clearFilters = () => {
    setLocalSearch("");
    setLocalFilters(DEFAULT_ANUNCIO_FILTERS);
    setSearch("");
    setFilters(DEFAULT_ANUNCIO_FILTERS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  };

  return (
    <div
      className="
        w-full
        bg-transparent
        px-3 py-4 lg:px-4
      "
      onKeyDown={handleKeyDown}
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
          label="Categoria"
          value={localFilters.categoria}
          onChange={(v) => updateLocalFilter("categoria", v)}
          options={["Todos", ...allCategorias]}
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
