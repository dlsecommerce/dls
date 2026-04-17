"use client";

import React from "react";
import { TableHead, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortDir = "asc" | "desc";

type Props = {
  sortColumn?: string | null;
  sortDirection?: SortDir;
  onSort?: (col: string) => void;
};

export default function PricingHeaderRow({
  sortColumn = null,
  sortDirection = "asc",
  onSort,
}: Props) {
  const columns: {
    label: string;
    key: string;
    sortable?: boolean;
    align?: "left" | "center";
  }[] = [
    { label: "ID", key: "ID", sortable: true, align: "center" },
    { label: "Loja", key: "Loja", sortable: true, align: "center" },
    { label: "ID Tray", key: "ID Tray", sortable: true, align: "center" },
    { label: "Marca", key: "Marca", sortable: true, align: "center" },
    { label: "Referência", key: "Referência", sortable: true, align: "center" },
    { label: "Desconto (%)", key: "Desconto", sortable: false, align: "center" },
    { label: "Embalagem (R$)", key: "Embalagem", sortable: false, align: "center" },
    { label: "Frete (R$)", key: "Frete", sortable: false, align: "center" },
    { label: "Comissão (%)", key: "Comissão", sortable: false, align: "center" },
    { label: "Imposto (%)", key: "Imposto", sortable: false, align: "center" },
    { label: "Lucro (%)", key: "Lucro", sortable: false, align: "center" },
    { label: "Marketing (%)", key: "Marketing", sortable: false, align: "center" },
    { label: "Custo (R$)", key: "Custo", sortable: false, align: "center" },
    { label: "Preço de Venda (R$)", key: "Preço de Venda", sortable: false, align: "center" },
    { label: "Ações", key: "Ações", sortable: false, align: "center" },
  ];

  return (
    <TableRow className="text-neutral-400 text-sm border-b border-neutral-700 text-center align-middle">
      {columns.map(({ label, key, sortable, align }) => {
        const isActive = sortColumn === key && key !== "ID";
        const iconColor = isActive ? "text-white" : "text-neutral-500";
        const alignCls = align === "center" ? "text-center" : "text-left";
        const commonCls =
          "px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis select-none transition-colors align-middle";

        return (
          <TableHead
            key={key}
            onClick={() => (sortable && onSort ? onSort(key) : undefined)}
            className={[
              commonCls,
              alignCls,
              sortable
                ? isActive
                  ? "text-white cursor-pointer"
                  : "text-neutral-400 cursor-pointer hover:text-white"
                : "text-neutral-400",
            ].join(" ")}
          >
            <div
              className={[
                "flex items-center gap-1 leading-none",
                align === "center" ? "justify-center" : "justify-start",
                "truncate",
              ].join(" ")}
            >
              {label}
              {sortable &&
                (isActive ? (
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
