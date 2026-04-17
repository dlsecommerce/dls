"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Layers, Loader } from "lucide-react";
import FiltroAnunciosPopover from "@/components/marketplaces/tray/FiltroAnunciosPopover";

type TopBarProps = {
  search: string;
  setSearch: (v: string) => void;

  onExport: () => Promise<void> | void;   // ✅ permite async
  exporting?: boolean;                    // ✅ novo
  exportLabel?: string;                   // ✅ opcional (ex: "Exportar")

  onMassEditOpen: () => void;

  selectedCount?: number;
  onDeleteSelected?: () => void;
  onClearSelection?: () => void;

  selectedLoja: string[];
  setSelectedLoja: (v: string[]) => void;
  selectedBrands: string[];
  setSelectedBrands: (v: string[]) => void;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
};

export default function TopBarLite({
  search,
  setSearch,
  onExport,
  exporting = false,
  exportLabel = "Exportar",
  onMassEditOpen,
  selectedCount = 0,
  onDeleteSelected,
  onClearSelection,
  selectedLoja,
  setSelectedLoja,
  selectedBrands,
  setSelectedBrands,
  filterOpen,
  setFilterOpen,
}: TopBarProps) {
  return (
    <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
        <Input
          placeholder="Buscar por ID, ID Bling, Marca ou Referência..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl focus-visible:ring-0 focus-visible:border-green-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FiltroAnunciosPopover
          selectedLoja={selectedLoja}
          setSelectedLoja={setSelectedLoja}
          selectedBrands={selectedBrands}
          setSelectedBrands={setSelectedBrands}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />

        {/* 📦 Exportar com loader */}
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer disabled:opacity-60 disabled:hover:scale-100"
          onClick={(e) => {
            e.preventDefault();
            onExport();
          }}
        >
          {exporting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              {exportLabel}
            </>
          )}
        </Button>

        <Button
          className="bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
          onClick={onMassEditOpen}
        >
          <Layers className="w-4 h-4 mr-2" /> Edição em Massa
        </Button>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-2 text-sm text-neutral-300">
            <span>
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </span>

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-blue-400 hover:text-blue-300 transition"
              >
                Limpar
              </button>
            )}

            {onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="text-red-400 hover:text-red-300 transition"
              >
                Excluir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
