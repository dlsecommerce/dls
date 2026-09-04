"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
type Props = {
  allSelected: boolean;
  hasRows: boolean;
  situacao: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  selectedCount: number;
  selectingAll?: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: string) => void;
  onSort: (column: string) => void;
  onClearSelection: () => void;
  onSelectAllTable: () => void;
};

type SortHeaderProps = {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  align?: "left" | "center";
};

// ---------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------
const SITUACAO_OPTIONS = ["Todos", "Últimos incluídos"];

// ---------------------------------------------------------------------
// Subcomponente — cabeçalho ordenável
// ---------------------------------------------------------------------
function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
}: SortHeaderProps) {
  const isActive = sortColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      title={`Ordenar por ${label}`}
      className={`flex w-full cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors hover:text-white ${
        align === "center" ? "justify-center text-center" : "justify-start text-left"
      } ${isActive ? "text-[#1a8ceb]" : "text-neutral-500"}`}
    >
      <span className="truncate">{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-3 w-3 shrink-0 text-neutral-600" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="h-3 w-3 shrink-0 text-[#1a8ceb]" />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0 text-[#1a8ceb]" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------
export default function MarketplaceHeaderBar({
  allSelected,
  hasRows,
  situacao,
  sortColumn,
  sortDirection,
  selectedCount,
  selectingAll = false,
  onToggleSelectAll,
  onSituacaoChange,
  onSort,
  onClearSelection,
  onSelectAllTable,
}: Props) {
  const [openSituacao, setOpenSituacao] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const hasSelectedItems = selectedCount > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenSituacao(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <TableHeader className="[&_tr]:border-neutral-900">
      {/* ================================================================
          LINHA 1 — ações em massa (selecionar tudo / limpar)
          8 colunas: checkbox, ID Bling, Loja, Canal, Referência, Produto, Marca, Ações
      ================================================================= */}
      <TableRow className="border-b-0 hover:bg-transparent">
        <TableHead />
        <TableHead />
        <TableHead />
        <TableHead />
        <TableHead />
        <TableHead />
        <TableHead />

        <TableHead className="py-1">
          <div className="flex items-center justify-center gap-2">
            {hasRows && (
              <button
                type="button"
                onClick={onSelectAllTable}
                disabled={selectingAll}
                aria-label="Selecionar todos os registros filtrados"
                title="Selecionar todos os registros filtrados"
                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#1a8ceb]/30 text-[#1a8ceb] transition-colors hover:border-[#1a8ceb]/50 hover:bg-[#1a8ceb]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="h-4 w-4" />
                )}
              </button>
            )}

            {hasSelectedItems && (
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={`Limpar seleção (${selectedCount} selecionado${selectedCount > 1 ? "s" : ""})`}
                title="Limpar seleção"
                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-neutral-700 text-neutral-400 transition-colors hover:border-neutral-500 hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </TableHead>
      </TableRow>

      {/* ================================================================
          LINHA 2 — checkbox + filtro de situação + cabeçalhos ordenáveis
      ================================================================= */}
      <TableRow className="border-b border-neutral-800 hover:bg-transparent">
        {/* Coluna 1: checkbox "selecionar página" + filtro de situação */}
        <TableHead>
          <div className="flex items-center gap-1 overflow-visible">
            <input
              type="checkbox"
              checked={allSelected && hasRows}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
              aria-label="Selecionar todos os registros da página"
              className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
            />

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenSituacao((prev) => !prev)}
                aria-label="Filtrar por situação"
                aria-expanded={openSituacao}
                className="group flex h-5 w-5 cursor-pointer items-center justify-center transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              >
                <ChevronDown className="h-3.5 w-3.5 text-[#1a8ceb] transition-colors group-hover:text-white" />
              </button>

              {openSituacao && (
                <div className="absolute left-0 top-8 z-50 min-w-[160px] rounded-none border border-neutral-800 bg-[#0d0d0d] p-1 shadow-2xl">
                  {SITUACAO_OPTIONS.map((option) => {
                    const active = situacao === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          onSituacaoChange(option);
                          setOpenSituacao(false);
                        }}
                        className={`flex w-full cursor-pointer items-center px-2 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb] ${
                          active
                            ? "bg-neutral-900 text-[#1a8ceb]"
                            : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TableHead>

        {/* Coluna 2: ID Bling (ordenável) — coluna real no banco é "id_bling" */}
        <TableHead>
          <SortHeader
            label="ID Bling"
            column="id_bling"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 3: Loja (ordenável) */}
        <TableHead>
          <SortHeader
            label="Loja"
            column="store"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 4: Canal (ordenável) */}
        <TableHead>
          <SortHeader
            label="Canal"
            column="channel"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 5: Referência (ordenável) */}
        <TableHead>
          <SortHeader
            label="Referência"
            column="reference"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 6: Produto (ordenável) */}
        <TableHead>
          <SortHeader
            label="Produto"
            column="product"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 7: Marca (ordenável) — coluna real no banco é "mark" */}
        <TableHead>
          <SortHeader
            label="Marca"
            column="mark"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </TableHead>

        {/* Coluna 8: Ações (label estático) */}
        <TableHead className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Ações
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
