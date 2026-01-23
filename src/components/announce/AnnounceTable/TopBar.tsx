"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Upload,
  Download,
  Layers,
  Loader,
  Trash2 as TrashIcon,
} from "lucide-react";

import FiltroAnunciosPopover from "@/components/announce/AnnounceTable/FiltroAnunciosPopover";

type TopBarProps = {
  search: string;
  setSearch: (v: string) => void;

  allBrands: string[];
  allLojas: string[];
  allCategorias: string[];
  selectedBrands: string[];
  selectedLoja: string[];
  selectedCategoria: string[];
  setSelectedBrands: (v: string[]) => void;
  setSelectedLoja: (v: string[]) => void;
  setSelectedCategoria: (v: string[]) => void;

  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;

  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;

  onExport: () => Promise<void> | void;
  exporting?: boolean;
  exportLabel?: string;

  selectedCount: number;
  onDeleteSelected: () => void; // ✅ agora só ABRE o modal no pai
  onClearSelection: () => void;

  onMassEditOpen: () => void;

  // opcional (como você já usa no pai)
  onImportOpen?: () => void;

  onNew: () => void;
};

export default function TopBar(props: TopBarProps) {
  const exporting = props.exporting ?? false;
  const exportLabel = props.exportLabel ?? "Exportar";

  return (
    <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
      {/* 🔍 Busca */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
        <Input
          placeholder="Buscar por nome, marca, ID Bling, ID Tray, referência..."
          value={props.search}
          onChange={(e) => props.setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl focus-visible:ring-0 focus-visible:border-green-500"
        />
      </div>

      {/* 🎛️ Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <FiltroAnunciosPopover
          allBrands={props.allBrands}
          allLojas={props.allLojas}
          allCategorias={props.allCategorias}
          selectedBrands={props.selectedBrands}
          setSelectedBrands={props.setSelectedBrands}
          selectedLoja={props.selectedLoja}
          setSelectedLoja={props.setSelectedLoja}
          selectedCategoria={props.selectedCategoria}
          setSelectedCategoria={props.setSelectedCategoria}
          open={props.filterOpen}
          onOpenChange={props.setFilterOpen}
        />

        {/* Input oculto */}
        <input
          ref={props.fileInputRef}
          type="file"
          accept=".csv, .xlsx"
          className="hidden"
          onChange={(e) => props.onFileSelect(e)}
        />

        {/* 📤 Importar */}
        <Button
          variant="outline"
          className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
          onClick={() => (props.onImportOpen ? props.onImportOpen() : props.fileInputRef.current?.click())}
        >
          <Upload className="w-4 h-4 mr-2" />
          Importar
        </Button>

        {/* 📦 Exportar */}
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer disabled:opacity-60 disabled:hover:scale-100"
          onClick={(e) => {
            e.preventDefault();
            props.onExport();
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

        {/* 🗑️ Seleção */}
        {props.selectedCount > 0 && (
          <>
            <Button
              variant="outline"
              className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
              onClick={props.onDeleteSelected}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Excluir Selecionados
            </Button>

            <Button
              variant="outline"
              className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
              onClick={props.onClearSelection}
            >
              Desmarcar Todos
            </Button>
          </>
        )}

        {/* 🧩 Edição em Massa */}
        <Button
          className="bg-gradient-to-r from-[#1A8CEB] to-[#0d64ab] hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
          onClick={props.onMassEditOpen}
        >
          <Layers className="w-4 h-4 mr-2" />
          Edição em Massa
        </Button>

        {/* ➕ Novo */}
        <Button
          className="bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
          onClick={props.onNew}
        >
          + Novo Cadastro
        </Button>
      </div>
    </div>
  );
}
