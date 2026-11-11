"use client";

import {
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import {
  DEFAULT_COST_FILTERS,
  SITUACAO_OPTIONS,
  Situacao,
} from "@/components/costs/hooks/types";

type Props = {
  allSelected: boolean;
  someSelectedOnPage: boolean;
  hasRows: boolean;
  situacao: Situacao;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  selectedCount: number;
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: Situacao) => void;
  onSort: (column: string) => void;
  onDeleteSelected: () => void;
  onOpenAdjustments: () => void;
  onClearSelection: () => void;
  onSelectAllTable: () => void;
  selectingAll?: boolean;
};

function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
}) {
  const isActive = sortColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      title={`Ordenar por ${label}`}
      aria-label={`Ordenar por ${label}`}
      className={`flex w-full cursor-pointer items-center justify-start gap-1 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors hover:text-white ${
        isActive ? "text-[#1a8ceb]" : "text-neutral-500"
      }`}
    >
      <span className="truncate">{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-3 w-3 shrink-0 text-neutral-600" aria-hidden="true" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="h-3 w-3 shrink-0 text-[#1a8ceb]" aria-hidden="true" />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0 text-[#1a8ceb]" aria-hidden="true" />
      )}
    </button>
  );
}

function SituacaoMenu({
  situacao,
  onChange,
}: {
  situacao: Situacao;
  onChange: (value: Situacao) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isDefault = situacao === DEFAULT_COST_FILTERS.situacao;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Filtrar por situação. Atual: ${situacao}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Situação: ${situacao}`}
        className="group relative flex h-5 w-5 cursor-pointer items-center justify-center transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-colors group-hover:text-white ${
            open ? "rotate-180" : ""
          } text-[#1a8ceb]`}
          aria-hidden="true"
        />
        {!isDefault && (
          <span
            className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 bg-[#1a8ceb]"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Situação"
          className="absolute left-0 top-7 z-50 min-w-[160px] border border-neutral-800 bg-[#0d0d0d] p-1 shadow-2xl"
        >
          {SITUACAO_OPTIONS.map((option) => {
            const active = situacao === option;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
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
  );
}

export default function CostHeader({
  allSelected,
  someSelectedOnPage,
  hasRows,
  situacao,
  sortColumn,
  sortDirection,
  selectedCount,
  onToggleSelectAll,
  onSituacaoChange,
  onSort,
  onDeleteSelected,
  onOpenAdjustments,
  onClearSelection,
  onSelectAllTable,
  selectingAll = false,
}: Props) {
  const pageCheckRef = useRef<HTMLInputElement | null>(null);
  const hasSelectedItems = selectedCount > 0;

  useEffect(() => {
    if (pageCheckRef.current) {
      pageCheckRef.current.indeterminate = !allSelected && someSelectedOnPage;
    }
  }, [allSelected, someSelectedOnPage]);

  return (
    <TableHeader className="[&_tr]:border-neutral-900">
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
                aria-label="Selecionar todos os produtos filtrados"
                title="Selecionar todos os produtos filtrados"
                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#1a8ceb]/30 text-[#1a8ceb] transition-colors hover:border-[#1a8ceb]/50 hover:bg-[#1a8ceb]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
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
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAdjustments}
              aria-label="Abrir ajustes em massa"
              title="Ajustes em massa"
              className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#1a8ceb]/30 text-[#1a8ceb] transition-colors hover:border-[#1a8ceb]/50 hover:bg-[#1a8ceb]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M20 7h-9" />
                <path d="M14 17H5" />
                <circle cx="17" cy="17" r="3" />
                <circle cx="7" cy="7" r="3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={!hasSelectedItems}
              aria-label={
                hasSelectedItems
                  ? `Excluir ${selectedCount} selecionado(s)`
                  : "Selecione itens para excluir"
              }
              title={
                hasSelectedItems
                  ? selectedCount === 1
                    ? "Excluir selecionado"
                    : "Excluir selecionados"
                  : "Selecione itens"
              }
              className={`flex h-8 w-8 items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 ${
                hasSelectedItems
                  ? "cursor-pointer border-red-500/30 text-red-500 hover:border-red-500/50 hover:bg-red-500/10"
                  : "cursor-not-allowed border-neutral-800 text-neutral-600"
              }`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </TableHead>
      </TableRow>

      <TableRow className="border-b border-neutral-800 hover:bg-transparent">
        <TableHead>
          <div className="flex items-center gap-1 overflow-visible">
            <input
              ref={pageCheckRef}
              type="checkbox"
              aria-label="Selecionar todos os produtos da página"
              className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              checked={allSelected && hasRows}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
            />

            <SituacaoMenu situacao={situacao} onChange={onSituacaoChange} />
          </div>
        </TableHead>

        <TableHead>
          <SortHeader label="Código" column="Código" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead>
          <SortHeader label="Marca" column="Marca" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead>
          <SortHeader label="Produto" column="Produto" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead>
          <SortHeader label="Custo Atual" column="Custo Atual" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead>
          <SortHeader label="Custo Antigo" column="Custo Antigo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead>
          <SortHeader label="NCM" column="NCM" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
        </TableHead>

        <TableHead className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Ações
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
