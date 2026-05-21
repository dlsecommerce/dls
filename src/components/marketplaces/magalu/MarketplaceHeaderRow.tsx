"use client";

import React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

type SortDir = "asc" | "desc";

type Props = {
  sortColumn?: string | null;
  sortDirection?: SortDir;
  onSort?: (col: string) => void;
};

const TABLE_GRID =
  "grid-cols-[4%_5.5%_7%_9%_12%_6.5%_7%_6%_6.5%_6%_6.5%_6%_6%_8%_4%]";

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
  sortDirection: SortDir;
  onSort?: (column: string) => void;
}) {
  const isActive = sortColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort?.(column)}
      className={`flex w-full min-w-0 cursor-pointer items-center justify-center gap-0.5 text-[11px] font-semibold leading-none transition hover:text-white ${
        isActive ? "text-white" : "text-neutral-500"
      }`}
      title={`Ordenar por ${label}`}
    >
      <span className="min-w-0 truncate">{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-3 w-3 shrink-0 text-neutral-500" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="h-3 w-3 shrink-0 text-white" />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0 text-white" />
      )}
    </button>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-center text-center">
      {children}
    </div>
  );
}

export default function MarketplaceHeaderRow({
  sortColumn = null,
  sortDirection = "asc",
  onSort,
}: Props) {
  const columns = [
    { label: "ID", key: "ID", sortable: true },
    { label: "Loja", key: "Loja", sortable: true },
    { label: "Tray", key: "ID Tray", sortable: true },
    { label: "Marca", key: "Marca", sortable: true },
    { label: "Referência", key: "Referência", sortable: true },

    { label: "Desconto", key: "Desconto", sortable: false },
    { label: "Embalagem", key: "Embalagem", sortable: false },
    { label: "Frete", key: "Frete", sortable: false },
    { label: "Comissão", key: "Comissão", sortable: false },
    { label: "Imposto", key: "Imposto", sortable: false },
    { label: "Lucro", key: "Margem de Lucro", sortable: false },
    { label: "Marketing", key: "Marketing", sortable: false },
    { label: "Custo", key: "Custo", sortable: false },
    { label: "Venda", key: "Preço de Venda", sortable: false },
    { label: "Ações", key: "Ações", sortable: false },
  ];

  return (
    <div className="border-b border-neutral-700 bg-transparent">
      <div className={`grid ${TABLE_GRID} w-full items-center gap-0 px-0 py-2`}>
        {columns.map(({ label, key, sortable }) => (
          <HeaderCell key={key}>
            {key === "Ações" ? (
              <div className="w-full pr-6 text-right text-[11px] font-semibold leading-none text-neutral-500">
                {label}
              </div>
            ) : sortable ? (
              <SortHeader
                label={label}
                column={key}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            ) : (
              <div className="min-w-0 truncate text-[11px] font-semibold leading-none text-neutral-500">
                {label}
              </div>
            )}
          </HeaderCell>
        ))}
      </div>
    </div>
  );
}