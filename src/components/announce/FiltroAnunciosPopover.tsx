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
  allLojas: string[];
  allBrands: string[];
  allCategorias: string[];

  selectedLoja: string[];
  setSelectedLoja: (v: string[]) => void;

  selectedBrands: string[];
  setSelectedBrands: (v: string[]) => void;

  selectedCategoria: string[];
  setSelectedCategoria: (v: string[]) => void;

  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function FiltroAnunciosPopover({
  allLojas,
  allBrands,
  allCategorias,
  selectedLoja,
  setSelectedLoja,
  selectedBrands,
  setSelectedBrands,
  selectedCategoria,
  setSelectedCategoria,
  open,
  onOpenChange,
}: Props) {
  const toggle = (
    current: string[],
    set: (v: string[]) => void,
    value: string,
    checked: boolean | string
  ) => {
    const v = checked === true;
    if (v) set([...new Set([...current, value])]);
    else set(current.filter((x) => x !== value));
  };

  const limparTudo = () => {
    setSelectedLoja([]);
    setSelectedBrands([]);
    setSelectedCategoria([]);
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
          className="relative w-[380px] border border-neutral-700 rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-xl space-y-4"
          side="bottom"
          align="start"
        >
          {/* === FECHAR === */}
          <button
            className="absolute right-4 top-4 text-green-500 hover:text-transparent bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-lg font-bold cursor-pointer transition-all hover:scale-110 hover:drop-shadow-[0_0_6px_#22c55e]"
            title="Fechar"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>

          {/* === Loja === */}
          <div>
            <Label className="text-white text-sm mb-1 block">Loja</Label>
            <div className="max-h-28 overflow-auto pr-1 space-y-1 pl-1">
              {allLojas.map((loja) => (
                <label
                  key={loja}
                  className="flex items-center gap-2 text-gray-200 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={!!selectedLoja.includes(loja)}
                    onCheckedChange={(v) =>
                      toggle(selectedLoja, setSelectedLoja, loja, v)
                    }
                    className="border-neutral-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                  />
                  {loja}
                </label>
              ))}
            </div>
          </div>

          {/* === Marca === */}
          <div>
            <Label className="text-white text-sm mb-1 block">Marca</Label>
            <div className="max-h-28 overflow-auto pr-1 space-y-1">
              {allBrands.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 text-gray-200 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={!!selectedBrands.includes(m)}
                    onCheckedChange={(v) =>
                      toggle(selectedBrands, setSelectedBrands, m, v)
                    }
                    className="border-neutral-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                  />
                  <span className="truncate" title={m}>
                    {m}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* === Categoria === */}
          <div>
            <Label className="text-white text-sm mb-1 block">Categoria</Label>
            <div className="max-h-28 overflow-auto pr-1 space-y-1 pl-1">
              {allCategorias.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 text-gray-200 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={!!selectedCategoria.includes(cat)}
                    onCheckedChange={(v) =>
                      toggle(selectedCategoria, setSelectedCategoria, cat, v)
                    }
                    className="border-neutral-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          {/* === BOTÕES === */}
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white hover:scale-105 cursor-pointer"
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

      {/* === BADGES DOS FILTROS AO LADO === */}
      <AnimatePresence>
        {(selectedLoja.length > 0 ||
          selectedBrands.length > 0 ||
          selectedCategoria.length > 0) && (
          <motion.div
            className="flex flex-wrap items-center gap-2 ml-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {[...selectedLoja, ...selectedBrands, ...selectedCategoria].map(
              (item) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-1 bg-white/10 border border-green-500/50 text-white px-2 py-[3px] rounded-md text-xs cursor-pointer hover:bg-green-600/20 transition"
                  onClick={() => {
                    setSelectedLoja(selectedLoja.filter((l) => l !== item));
                    setSelectedBrands(selectedBrands.filter((b) => b !== item));
                    setSelectedCategoria(selectedCategoria.filter((c) => c !== item));
                  }}
                  title={`Remover filtro: ${item}`}
                >
                  <span className="truncate max-w-[100px]">{item}</span>
                  <span className="text-[11px] font-bold ml-1 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                    ✕
                  </span>
                </motion.div>
              )
            )}

            {/* Botão limpar tudo */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white text-xs px-2 py-[3px] rounded-lg cursor-pointer hover:scale-105"
                onClick={limparTudo}
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
