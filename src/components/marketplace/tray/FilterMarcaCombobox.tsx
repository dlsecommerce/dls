"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  allMarcas: string[];
  value: string; // marcas selecionadas, separadas por vírgula
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export default function FilterMarcaCombobox({
  allMarcas,
  value,
  onChange,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionadas = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const marcasFiltradas = allMarcas.filter((m) =>
    m.toLowerCase().includes(busca.toLowerCase()),
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
      <div className="mb-2">
        <span className="text-sm font-medium text-neutral-200">Marca</span>
      </div>

      <Input
        value={busca}
        onFocus={() => setOpen(true)}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
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
