"use client";

import React from "react";
import { TableHead, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type Props = {
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (col: string) => void;
  allVisibleSelected: boolean;
  toggleSelectAllVisible: (checked: boolean) => void;
};

export default function TableHeaderRow({
  sortColumn,
  sortDirection,
  onSort,
  allVisibleSelected,
  toggleSelectAllVisible,
}: Props) {
  const columns = [
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "Referência",
    "Nome",
    "Marca",
    "Ações",
  ];

  return (
    <TableRow className="border-neutral-700">
      {/* Checkbox Selecionar Todos com cor personalizada #1A8CEB */}
      <TableHead className="w-[40px] text-center">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => toggleSelectAllVisible(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-[#1A8CEB] [accent-color:#1A8CEB]"
          style={{ accentColor: "#1A8CEB" }}
        />
      </TableHead>

      {columns.map((col) => {
        const isSortable = col !== "Ações";
        const isManuallySorted = sortColumn === col && col !== "ID"; // ID não entra automaticamente como ativa
        const iconColor = isManuallySorted ? "text-white" : "text-neutral-500";

        return (
          <TableHead
            key={col}
            onClick={() => (isSortable ? onSort(col) : null)}
            className={`font-semibold select-none transition-colors text-center ${
              isSortable
                ? isManuallySorted
                  ? "text-white cursor-pointer"
                  : "text-neutral-400 cursor-pointer hover:text-white"
                : "text-neutral-400"
            }`}
          >
            <div className="flex items-center gap-1 justify-center">
              {col}
              {isSortable &&
                (isManuallySorted ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className={`h-3 w-3 ${iconColor}`} />
                  ) : (
                    <ArrowDown className={`h-3 w-3 ${iconColor}`} />
                  )
                ) : (
                  <ArrowUpDown className={`h-3 w-3 ${iconColor}`} />
                ))}
            </div>
          </TableHead>
        );
      })}
    </TableRow>
  );
}
