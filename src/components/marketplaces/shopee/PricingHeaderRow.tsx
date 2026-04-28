"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Row } from "@/components/marketplaces/shopee/hooks/types";
import { toBR } from "@/components/marketplaces/shopee/hooks/helpers";
import {
  Edit as EditIcon,
  Copy as CopyIcon,
  Loader as LoaderIcon,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type SortDirection = "asc" | "desc";

type Props = {
  rows: Row[];
  loading: boolean;
  copiedId: string | null;
  editedId: string | null;
  handleCopy: (text: string, key: string) => void;
  openEditor: (
    row: Row,
    field: keyof Row,
    isMoney: boolean,
    e: React.MouseEvent
  ) => void;
  handleEditFull: (row: Row) => void;
};

const HEADER_CELL =
  "h-9 px-0.5 text-center align-middle text-[11px] font-semibold leading-none text-neutral-500";

const BODY_CELL =
  "h-10 px-0.5 text-center align-middle text-[11px] font-medium leading-none text-neutral-300";

function SortHeader({
  label,
  column,
  sortField,
  sortDirection,
  onSort,
}: any) {
  const isActive = sortField === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex w-full items-center justify-center gap-0.5 text-[11px] font-semibold leading-none ${
        isActive ? "text-white" : "text-neutral-500"
      }`}
    >
      <span className="truncate">{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-3 w-3 text-neutral-500" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="h-3 w-3 text-white" />
      ) : (
        <ChevronDown className="h-3 w-3 text-white" />
      )}
    </button>
  );
}

export default function Table({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}: Props) {
  const [sortField, setSortField] = useState<keyof Row>("ID");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  const handleSort = (field: keyof Row) => {
    if (sortField === field) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    const A = a[sortField];
    const B = b[sortField];

    if (typeof A === "number" && typeof B === "number") {
      return sortDirection === "asc" ? A - B : B - A;
    }

    return sortDirection === "asc"
      ? String(A ?? "").localeCompare(String(B ?? ""))
      : String(B ?? "").localeCompare(String(A ?? ""));
  });

  return (
    <ShadTable className="w-full table-fixed">
      <colgroup>
        <col className="w-[4%]" />
        <col className="w-[5.5%]" />
        <col className="w-[6%]" />
        <col className="w-[7%]" />
        <col className="w-[8%]" />
        <col className="w-[6.5%]" />
        <col className="w-[7%]" />
        <col className="w-[6%]" />
        <col className="w-[6.5%]" />
        <col className="w-[6%]" />
        <col className="w-[6.5%]" />
        <col className="w-[6%]" />
        <col className="w-[6%]" />
        <col className="w-[7%]" />
        <col className="w-[2%]" />
      </colgroup>

      <TableHeader>
        <TableRow className="border-b border-neutral-700">
          <TableHead className={HEADER_CELL}>
            <SortHeader label="ID" column="ID" {...{ sortField, sortDirection, onSort: handleSort }} />
          </TableHead>
          <TableHead className={HEADER_CELL}>
            <SortHeader label="Loja" column="Loja" {...{ sortField, sortDirection, onSort: handleSort }} />
          </TableHead>
          <TableHead className={HEADER_CELL}>
            <SortHeader label="Tray" column="ID Tray" {...{ sortField, sortDirection, onSort: handleSort }} />
          </TableHead>
          <TableHead className={HEADER_CELL}>
            <SortHeader label="Marca" column="Marca" {...{ sortField, sortDirection, onSort: handleSort }} />
          </TableHead>
          <TableHead className={HEADER_CELL}>
            <SortHeader label="Ref." column="Referência" {...{ sortField, sortDirection, onSort: handleSort }} />
          </TableHead>

          <TableHead className={HEADER_CELL}>Desc.</TableHead>
          <TableHead className={HEADER_CELL}>Emb.</TableHead>
          <TableHead className={HEADER_CELL}>Frete</TableHead>
          <TableHead className={HEADER_CELL}>Com.</TableHead>
          <TableHead className={HEADER_CELL}>Imp.</TableHead>
          <TableHead className={HEADER_CELL}>Lucro</TableHead>
          <TableHead className={HEADER_CELL}>Mkt.</TableHead>
          <TableHead className={HEADER_CELL}>Custo</TableHead>
          <TableHead className={HEADER_CELL}>Venda</TableHead>
          <TableHead className={HEADER_CELL}>Aç.</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={15}>
              <div className="flex justify-center py-16">
                <LoaderIcon className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            </TableCell>
          </TableRow>
        ) : sortedRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={15} className="py-10 text-center text-neutral-400">
              Nenhum registro
            </TableCell>
          </TableRow>
        ) : (
          sortedRows.map((row) => (
            <TableRow key={`${row.Loja}-${row.ID}`} className="border-b border-neutral-700 hover:bg-white/5">
              <TableCell className={`${BODY_CELL} text-white`}>{row.ID}</TableCell>
              <TableCell className={BODY_CELL}>{row.Loja}</TableCell>

              <TableCell className={BODY_CELL}>
                <div className="flex items-center justify-center gap-1">
                  <span className="truncate">{row["ID Tray"]}</span>
                  {row["ID Tray"] && (
                    <CopyIcon
                      onClick={() => handleCopy(String(row["ID Tray"]), `t-${row.ID}`)}
                      className="h-2.5 w-2.5 cursor-pointer opacity-60 hover:text-green-400"
                    />
                  )}
                </div>
              </TableCell>

              <TableCell className={BODY_CELL}>{row.Marca}</TableCell>
              <TableCell className={BODY_CELL}>{row["Referência"]}</TableCell>

              <TableCell className={BODY_CELL}>{toBR(row.Desconto)}%</TableCell>
              <TableCell className={BODY_CELL}>R$ {toBR(row.Embalagem)}</TableCell>
              <TableCell className={BODY_CELL}>R$ {toBR(row.Frete)}</TableCell>
              <TableCell className={BODY_CELL}>{toBR(row.Comissão)}%</TableCell>
              <TableCell className={BODY_CELL}>{toBR(row.Imposto)}%</TableCell>
              <TableCell className={BODY_CELL}>{toBR(row["Margem de Lucro"])}%</TableCell>
              <TableCell className={BODY_CELL}>{toBR(row.Marketing)}%</TableCell>
              <TableCell className={`${BODY_CELL} text-white`}>R$ {toBR(row.Custo)}</TableCell>

              <TableCell className={`${BODY_CELL} text-green-400 font-semibold`}>
                R$ {toBR(row["Preço de Venda"])}
              </TableCell>

              <TableCell className={BODY_CELL}>
                <EditIcon
                  onClick={() => handleEditFull(row)}
                  className="h-3.5 w-3.5 cursor-pointer hover:text-blue-400"
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </ShadTable>
  );
}