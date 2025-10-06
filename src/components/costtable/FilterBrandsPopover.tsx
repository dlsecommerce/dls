"use client";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  allBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: (v: string[]) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function FiltroMarcasPopover({
  allBrands,
  selectedBrands,
  setSelectedBrands,
  open,
  onOpenChange,
}: Props) {
  const toggle = (m: string, checked: boolean | string) => {
    const v = !!checked;
    if (v) setSelectedBrands([...new Set([...selectedBrands, m])]);
    else setSelectedBrands(selectedBrands.filter((x) => x !== m));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* === BOTÃO FILTROS === */}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="cursor-pointer border-neutral-700 hover:scale-105 transition-all text-white rounded-xl"
          >
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="relative w-80 border border-neutral-700 rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-xl"
          side="bottom"
          align="start"
        >
          {/* === BOTÃO ✕ ROXO NO CANTO SUPERIOR DIREITO === */}
          <button
            className="absolute right-4 top-4 text-white hover:text-transparent bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] bg-clip-text text-lg font-bold cursor-pointer transition-all hover:scale-110 hover:drop-shadow-[0_0_6px_#7c3aed]"
            title="Fechar"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>

          <div className="mb-3 pr-6">
            <Label className="text-white text-sm">Filtrar por Marcas</Label>
          </div>

          <div className="max-h-72 overflow-auto pr-2 space-y-2">
            {allBrands.map((m) => {
              const checked = selectedBrands.includes(m);
              return (
                <label
                  key={m}
                  className="flex items-center gap-3 text-gray-200 text-sm cursor-pointer"
                >
                  <Checkbox
                    id={`brand-${m}`}
                    checked={checked}
                    onCheckedChange={(v) => toggle(m, v)}
                    className="border-neutral-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#7c3aed] data-[state=checked]:to-[#6d28d9]"
                  />
                  <span className="truncate" title={m}>
                    {m}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-between gap-2 mt-4">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white hover:scale-105 cursor-pointer"
              onClick={() => setSelectedBrands([])}
            >
              Limpar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:scale-105 cursor-pointer rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* === BADGES DE MARCAS SELECIONADAS === */}
      <AnimatePresence>
        {selectedBrands.length > 0 && (
          <motion.div
            className="flex flex-wrap items-center gap-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {selectedBrands.map((brand) => (
              <motion.div
                key={brand}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1 bg-white/10 border border-[#7c3aed]/50 text-white px-2 py-[3px] rounded-md text-xs cursor-pointer hover:bg-[#7c3aed]/20 transition"
                onClick={() =>
                  setSelectedBrands(selectedBrands.filter((b) => b !== brand))
                }
                title={`Remover filtro: ${brand}`}
              >
                <span className="truncate max-w-[100px]">{brand}</span>
                {/* === “X” ROXO NOS BADGES === */}
                <span className="text-[11px] font-bold ml-1 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] bg-clip-text text-transparent">
                  ✕
                </span>
              </motion.div>
            ))}

            {/* === BOTÃO LIMPAR TUDO === */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white text-xs px-2 py-[3px] rounded-lg cursor-pointer hover:scale-105"
                onClick={() => setSelectedBrands([])}
              >
                Limpar tudo
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
