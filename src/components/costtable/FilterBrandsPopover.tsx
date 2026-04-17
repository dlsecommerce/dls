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
  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const limparTudo = () => {
    setSelectedBrands([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          className="relative w-[380px] border border-neutral-700 rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-xl space-y-4"
          side="bottom"
          align="start"
        >
          {/* ✕ fechar */}
          <button
            className="absolute right-4 top-4 text-green-500 hover:text-transparent bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-lg font-bold cursor-pointer transition-all hover:scale-110"
            title="Fechar"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>

          {/* 🏷️ Marca */}
          <div>
            <Label className="text-white text-sm mb-1 block">Marca</Label>

            <div className="max-h-48 overflow-auto pr-1 space-y-1">
              {allBrands.length === 0 ? (
                <p className="text-neutral-400 text-xs px-2">
                  Nenhum registro encontrado
                </p>
              ) : (
                allBrands.map((brand, idx) => {
                  const isChecked = selectedBrands.includes(brand);

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-neutral-200 text-sm px-2 py-[4px] rounded-md transition-all ${
                        isChecked
                          ? "bg-white/10 border border-green-500/40"
                          : "hover:bg-white/5"
                      } cursor-pointer hover:scale-[1.02]`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBrand(brand);
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleBrand(brand)}
                        className="border-neutral-600 cursor-pointer data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                      />
                      <span className="truncate" title={brand}>
                        {brand}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 🔘 Botões */}
          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              className="text-neutral-300 hover:text-white hover:scale-105 cursor-pointer"
              onClick={limparTudo}
            >
              Limpar
            </Button>

            <Button
              className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 cursor-pointer rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 🟢 Badges de marcas ativas */}
      <AnimatePresence>
        {selectedBrands.length > 0 && (
          <motion.div
            className="flex flex-wrap items-center gap-2 ml-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {selectedBrands.map((brand) => (
              <motion.div
                key={brand}
                className="flex items-center gap-1 bg-white/10 border border-green-500/50 text-white px-2 py-[3px] rounded-md text-xs cursor-pointer hover:bg-green-600/20 transition-all"
                onClick={() =>
                  setSelectedBrands(
                    selectedBrands.filter((b) => b !== brand)
                  )
                }
              >
                <span className="truncate max-w-[100px]">{brand}</span>
                <span className="text-[11px] font-bold ml-1 text-green-500">
                  ✕
                </span>
              </motion.div>
            ))}

            <Button
              variant="ghost"
              className="text-neutral-300 hover:text-white text-xs px-2 py-[3px] rounded-lg cursor-pointer hover:scale-105"
              onClick={limparTudo}
            >
              Limpar tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
