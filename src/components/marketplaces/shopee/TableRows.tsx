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

type MarketplaceTableProps = {
  rows: Row[];
  loading: boolean;
  copiedId: string | null;
  editedId: string | null;
  handleCopy: (text: string, uniqueKey: string) => void;
  openEditor: (
    row: Row,
    field: keyof Row,
    isMoney: boolean,
    e: React.MouseEvent
  ) => void;
  handleEditFull: (row: Row) => void;
};

type TableRowsProps = MarketplaceTableProps;

const HEADER_CELL =
  "h-9 px-0 text-center align-middle text-[11px] font-semibold leading-none text-neutral-500";

const BODY_CELL =
  "h-10 px-0 text-center align-middle text-[11px] font-medium leading-none text-neutral-300";

function PricingColGroup() {
  return (
    <colgroup>
      <col className="w-[4%]" />
      <col className="w-[5.5%]" />
      <col className="w-[7%]" />
      <col className="w-[9%]" />
      <col className="w-[12%]" />
      <col className="w-[6.5%]" />
      <col className="w-[7%]" />
      <col className="w-[6%]" />
      <col className="w-[6.5%]" />
      <col className="w-[6%]" />
      <col className="w-[6.5%]" />
      <col className="w-[6%]" />
      <col className="w-[6%]" />
      <col className="w-[8%]" />
      <col className="w-[4%]" />
    </colgroup>
  );
}

function SortHeader({
  label,
  column,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string;
  column: keyof Row;
  sortField: keyof Row;
  sortDirection: SortDirection;
  onSort: (column: keyof Row) => void;
}) {
  const isActive = sortField === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
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

export const Table: React.FC<MarketplaceTableProps> = ({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}) => {
  const [sortField, setSortField] = useState<keyof Row>("ID");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: keyof Row) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === "number" && typeof valB === "number") {
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }

    return sortDirection === "asc"
      ? String(valA ?? "").localeCompare(String(valB ?? ""))
      : String(valB ?? "").localeCompare(String(valA ?? ""));
  });

  return (
    <ShadTable className="w-full table-fixed bg-transparent">
      <PricingColGroup />

      <TableHeader>
        <TableRow className="border-b border-neutral-700 bg-transparent hover:bg-transparent">
          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="ID"
              column="ID"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableHead>

          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="Loja"
              column="Loja"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableHead>

          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="Tray"
              column="ID Tray"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableHead>

          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="Marca"
              column="Marca"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableHead>

          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="Ref."
              column="Referência"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
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
          <TableHead className="h-9 px-0 pr-6 text-right align-middle text-[11px] font-semibold leading-none text-neutral-500">
            Aç.
          </TableHead>
        </TableRow>
      </TableHeader>

      <RowsBody
        rows={sortedRows}
        loading={loading}
        copiedId={copiedId}
        editedId={editedId}
        handleCopy={handleCopy}
        openEditor={openEditor}
        handleEditFull={handleEditFull}
      />
    </ShadTable>
  );
};

export const TableRows: React.FC<TableRowsProps> = ({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}) => {
  return (
    <ShadTable className="w-full table-fixed bg-transparent">
      <PricingColGroup />

      <RowsBody
        rows={rows}
        loading={loading}
        copiedId={copiedId}
        editedId={editedId}
        handleCopy={handleCopy}
        openEditor={openEditor}
        handleEditFull={handleEditFull}
      />
    </ShadTable>
  );
};

function RowsBody({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}: TableRowsProps) {
  const router = useRouter();

  const lojaLabel = (loja: string) =>
    loja === "PK" ? "Pikot" : loja === "SB" ? "Sóbaq." : loja;

  const CellEditable = ({
    row,
    field,
    isMoney = false,
    suffix = "",
  }: {
    row: Row;
    field: keyof Row;
    isMoney?: boolean;
    suffix?: string;
  }) => {
    const rawValue = row[field] ?? 0;

    const displayVal = isMoney
      ? `R$ ${toBR(rawValue as number)}`
      : `${toBR(rawValue as number)}${suffix}`;

    return (
      <TableCell className={`${BODY_CELL} text-white`}>
        <div className="group flex min-w-0 items-center justify-center gap-0.5">
          <span className="min-w-0 truncate">{displayVal}</span>

          <button
            type="button"
            onClick={(e) => openEditor(row, field, isMoney, e)}
            title="Editar"
            className="shrink-0 cursor-pointer opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <EditIcon className="h-3 w-3 text-green-500" />
          </button>
        </div>
      </TableCell>
    );
  };

  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={15}>
            <div className="flex items-center justify-center py-16">
              <LoaderIcon className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={15}
            className="py-10 text-center text-neutral-400"
          >
            Nenhum registro encontrado
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {rows.map((row) => (
        <TableRow
          key={`${row.Loja}-${row.ID}`}
          className="border-b border-neutral-700 text-center transition-colors hover:bg-white/5"
        >
          <TableCell className={`${BODY_CELL} text-white`}>
            <span className="block min-w-0 truncate">{row.ID || "-"}</span>
          </TableCell>

          <TableCell className={BODY_CELL}>
            <span className="block min-w-0 truncate">
              {lojaLabel(row.Loja) || "-"}
            </span>
          </TableCell>

          <TableCell className={BODY_CELL}>
            <div className="group flex min-w-0 items-center justify-center gap-0.5">
              <span className="min-w-0 truncate">{row["ID Tray"] || "-"}</span>

              {row["ID Tray"] && (
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(String(row["ID Tray"]), `tray-${row.ID}`)
                  }
                  className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <CopyIcon
                    className={`h-2.5 w-2.5 ${
                      copiedId === `tray-${row.ID}`
                        ? "scale-110 text-green-500"
                        : "text-white group-hover:text-green-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </TableCell>

          <TableCell className={BODY_CELL}>
            <span className="block min-w-0 truncate">{row.Marca || "-"}</span>
          </TableCell>

          <TableCell className={BODY_CELL}>
            <div className="group flex min-w-0 items-center justify-center gap-0.5">
              <span className="min-w-0 truncate">
                {row["Referência"] || "-"}
              </span>

              {row["Referência"] && (
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(String(row["Referência"]), `ref-${row.ID}`)
                  }
                  className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <CopyIcon
                    className={`h-2.5 w-2.5 ${
                      copiedId === `ref-${row.ID}`
                        ? "scale-110 text-green-500"
                        : "text-white group-hover:text-green-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </TableCell>

          <CellEditable row={row} field="Desconto" suffix="%" />
          <CellEditable row={row} field="Embalagem" isMoney />
          <CellEditable row={row} field="Frete" isMoney />
          <CellEditable row={row} field="Comissão" suffix="%" />
          <CellEditable row={row} field="Imposto" suffix="%" />
          <CellEditable row={row} field="Margem de Lucro" suffix="%" />
          <CellEditable row={row} field="Marketing" suffix="%" />

          <TableCell className={`${BODY_CELL} text-white`}>
            <span className="block min-w-0 truncate">R$ {toBR(row.Custo)}</span>
          </TableCell>

          <TableCell className={`${BODY_CELL} font-semibold text-green-400`}>
            <div className="group flex min-w-0 items-center justify-center gap-0.5">
              <span className="min-w-0 truncate">
                R$ {toBR(row["Preço de Venda"])}
              </span>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    String(toBR(row["Preço de Venda"])),
                    `preco-${row.ID}`
                  )
                }
                className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
              >
                <CopyIcon
                  className={`h-2.5 w-2.5 ${
                    copiedId === `preco-${row.ID}`
                      ? "scale-110 text-green-500"
                      : "text-white group-hover:text-green-400"
                  }`}
                />
              </button>
            </div>
          </TableCell>

          <TableCell className="h-10 px-0 pr-8 text-right align-middle">
            <button
              type="button"
              onClick={() => {
                handleEditFull(row);
                router.push(
                  `/dashboard/marketplaces/tray/details?id=${row.ID}&loja=${row.Loja}`
                );
              }}
              className="inline-flex cursor-pointer items-center justify-end text-white transition hover:text-[#1A8CEB]"
            >
              <EditIcon
                className={`h-3.5 w-3.5 ${
                  editedId === `${row.Loja}-${row.ID}`
                    ? "scale-110 text-[#1A8CEB]"
                    : ""
                }`}
              />
            </button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}