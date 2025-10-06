"use client";
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

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
    else setSelectedBrands(selectedBrands.filter(x => x !== m));
  };

  return (
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
        className="w-80 border border-neutral-700 rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-xl"
        side="bottom"
        align="end"
      >
        <div className="mb-3">
          <Label className="text-white text-sm">Filtrar por Marcas</Label>
        </div>
        <div className="max-h-72 overflow-auto pr-2 space-y-2">
          {allBrands.map((m) => {
            const checked = selectedBrands.includes(m);
            return (
              <label key={m} className="flex items-center gap-3 text-gray-200 text-sm">
                <Checkbox
                  id={`brand-${m}`}
                  checked={checked}
                  onCheckedChange={(v) => toggle(m, v)}
                  className="border-neutral-600 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#7c3aed] data-[state=checked]:to-[#1a8ceb]"
                />
                <span className="truncate" title={m}>{m}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-between gap-2 mt-4">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white hover:scale-105"
            onClick={() => setSelectedBrands([])}
          >
            Limpar
          </Button>
          <Button
            className="bg-gradient-to-r from-[#7c3aed] to-[#1a8ceb] text-white hover:scale-105"
            onClick={() => onOpenChange(false)}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
