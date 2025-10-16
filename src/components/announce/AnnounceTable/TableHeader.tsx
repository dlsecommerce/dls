"use client";

import React from "react";
import { TableHead, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

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
  const columns = ["ID", "Loja", "ID Bling", "ID Tray", "Referência", "Nome", "Marca", "Ações"];

  return (
    <TableRow className="border-neutral-700">
      {/* Checkbox Selecionar Todos */}
      <TableHead className="w-[40px] text-center">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => toggleSelectAllVisible(e.target.checked)}
          className="accent-[#22c55e] w-4 h-4 cursor-pointer"
        />
      </TableHead>

      {columns.map((col) => (
        <TableHead
          key={col}
          onClick={() => (col === "Ações" ? null : onSort(col))}
          className={`font-semibold select-none transition-colors text-center ${
            col === "Ações"
              ? "text-neutral-400"
              : sortColumn === col
              ? "text-white cursor-pointer"
              : "text-neutral-400 cursor-pointer hover:text-white"
          }`}
        >
          <div className="flex items-center gap-1 justify-center">
            {col}
            {col !== "Ações" && (
              <ArrowUpDown
                className={`h-3 w-3 transition-colors ${
                  sortColumn === col ? "text-white" : "text-neutral-500"
                }`}
              />
            )}
          </div>
        </TableHead>
      ))}
    </TableRow>
  );
}
