"use client";

import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  allSelected: boolean;
  hasRows: boolean;
  situacao: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  selectedCount: number;
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: string) => void;
  onRefresh: () => void;
  onSort: (column: string) => void;
  onDeleteSelected: () => void;
};

const TABLE_GRID =
  "grid-cols-[48px_140px_160px_minmax(280px,1fr)_150px_150px_140px_120px]";

const SITUACAO_OPTIONS = ["Todos", "Últimos Incluídos"];

function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  align?: "left" | "center";
}) {
  const isActive = sortColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex w-full cursor-pointer items-center gap-1 text-sm font-semibold transition hover:text-white ${
        align === "center"
          ? "justify-center text-center"
          : "justify-start text-left"
      } ${isActive ? "text-white" : "text-neutral-500"}`}
      title={`Ordenar por ${label}`}
    >
      <span className="truncate">{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white" />
      )}
    </button>
  );
}

function HeaderCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`flex min-w-0 items-center ${
        align === "center" ? "justify-center text-center" : "justify-start"
      }`}
    >
      {children}
    </div>
  );
}

export default function CostTableHeaderBar({
  allSelected,
  hasRows,
  situacao,
  sortColumn,
  sortDirection,
  selectedCount,
  onToggleSelectAll,
  onSituacaoChange,
  onRefresh,
  onSort,
  onDeleteSelected,
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
    <div className="border-b border-neutral-700 bg-transparent">
      {/* TOPO */}
      <div className={`grid ${TABLE_GRID} items-start gap-0 px-0 pt-3.5 pb-3`}>
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-green-500"
            style={{ accentColor: "#22c55e" }}
            checked={allSelected && hasRows}
            onChange={(e) => onToggleSelectAll(e.target.checked)}
          />
        </div>

        <div className="col-span-2 -ml-3 flex items-start gap-0.5">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenSituacao((prev) => !prev)}
              className="group flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm bg-transparent transition hover:bg-white/5"
            >
              <ChevronDown className="h-3.5 w-3.5 text-green-500 transition group-hover:text-white" />
            </button>

            {openSituacao && (
              <div className="absolute left-0 top-8 z-50 min-w-[160px] rounded-lg border border-neutral-700 bg-[#161616] p-1 shadow-xl">
                {SITUACAO_OPTIONS.map((option) => {
                  const active = situacao === option;

                  return (
                    <button
                      key={option}
                      onClick={() => {
                        onSituacaoChange(option);
                        setOpenSituacao(false);
                      }}
                      className={`flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-left text-sm transition ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-neutral-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="group -mt-[1px] flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm bg-transparent transition hover:bg-white/5"
          >
            <RotateCw className="h-4 w-4 text-green-500 transition group-hover:text-white" />
          </button>
        </div>

        <div />
        <div />
        <div />
        <div />

        {/* BOTÃO EXCLUIR SELECIONADOS */}
        <div className="flex items-center justify-center pl-12 -mt-2">
          <button
            type="button"
            onClick={hasSelectedItems ? onDeleteSelected : undefined}
            disabled={!hasSelectedItems}
            title={
              hasSelectedItems
                ? selectedCount === 1
                  ? "Excluir selecionado"
                  : "Excluir selecionados"
                : "Selecione itens para excluir"
            }
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
              hasSelectedItems
                ? "cursor-pointer border-red-500/30 bg-white/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                : "cursor-not-allowed border-white/10 bg-white/[0.03] text-neutral-500"
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HEADER */}
      <div className={`grid ${TABLE_GRID} items-center gap-0 px-4 pb-3`}>
        <div />

        <HeaderCell align="center">
          <SortHeader
            label="Código"
            column="Código"
            align="center"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell>
          <SortHeader
            label="Marca"
            column="Marca"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell>
          <SortHeader
            label="Produto"
            column="Produto"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell align="center">
          <SortHeader
            label="Custo Atual"
            column="Custo Atual"
            align="center"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell align="center">
          <SortHeader
            label="Custo Antigo"
            column="Custo Antigo"
            align="center"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell align="center">
          <SortHeader
            label="NCM"
            column="NCM"
            align="center"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        </HeaderCell>

        <HeaderCell align="center">
          <div className="text-sm font-semibold text-neutral-500">
            Ações
          </div>
        </HeaderCell>
      </div>
    </div>
  );
}