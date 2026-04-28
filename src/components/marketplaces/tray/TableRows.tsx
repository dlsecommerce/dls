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

import { Row } from "@/components/marketplaces/tray/hooks/types";
import { toBR } from "@/components/marketplaces/tray/hooks/helpers";

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
  "h-9 px-0 text-center align-middle text-[11px] font-semibold text-neutral-500";

const BODY_CELL =
  "h-10 px-0 text-center align-middle text-[11px] font-medium text-neutral-300";

/* ============================================================
   COLGROUP (MESMO DO SHOPEE)
============================================================ */
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

/* ============================================================
   HEADER COM SORT
============================================================ */
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
      onClick={() => onSort(column)}
      className={`flex w-full items-center justify-center gap-1 text-[11px] font-semibold ${
        isActive ? "text-white" : "text-neutral-500"
      }`}
    >
      {label}

      {!isActive ? (
        <ArrowUpDown className="w-3 h-3" />
      ) : sortDirection === "asc" ? (
        <ChevronUp className="w-3 h-3 text-white" />
      ) : (
        <ChevronDown className="w-3 h-3 text-white" />
      )}
    </button>
  );
}

/* ============================================================
   TABLE PRINCIPAL
============================================================ */
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
        <TableRow className="border-b border-neutral-700">
          <TableHead className={HEADER_CELL}>
            <SortHeader
              label="ID"
              column="ID"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </TableHead>

          <TableHead className={HEADER_CELL}>Loja</TableHead>
          <TableHead className={HEADER_CELL}>Tray</TableHead>
          <TableHead className={HEADER_CELL}>Marca</TableHead>
          <TableHead className={HEADER_CELL}>Ref.</TableHead>

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

/* ============================================================
   TABLE ROWS EXPORT (MESMO PADRÃO)
============================================================ */
export const TableRows: React.FC<TableRowsProps> = (props) => {
  return (
    <ShadTable className="w-full table-fixed bg-transparent">
      <PricingColGroup />
      <RowsBody {...props} />
    </ShadTable>
  );
};

/* ============================================================
   BODY
============================================================ */
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
    loja === "PK" ? "Pikot Shop" : loja === "SB" ? "Sóbaquetas" : loja;

  const getDetailsId = (row: Row) => {
    const anyRow = row as any;
    return anyRow.id ?? row.ID;
  };

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
        <div className="group flex items-center justify-center gap-1">
          <span>{displayVal}</span>

          <button
            onClick={(e) => openEditor(row, field, isMoney, e)}
            className="opacity-0 group-hover:opacity-100"
          >
            <EditIcon className="w-3 h-3 text-green-500" />
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
            <div className="flex justify-center py-16">
              <LoaderIcon className="animate-spin" />
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
          <TableCell colSpan={15} className="text-center py-10 text-neutral-400">
            Nenhum registro encontrado
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {rows.map((row) => {
        const detailsId = getDetailsId(row);

        return (
          <TableRow
            key={`${row.Loja}-${row.ID}`}
            className="border-b border-neutral-700 hover:bg-white/5"
          >
            <TableCell className={`${BODY_CELL} text-white`}>
              {row.ID}
            </TableCell>

            <TableCell className={BODY_CELL}>
              {lojaLabel(row.Loja)}
            </TableCell>

            <TableCell className={BODY_CELL}>
              <div className="group flex justify-center gap-1">
                {row["ID Tray"] || "-"}

                {row["ID Tray"] && (
                  <button
                    onClick={() =>
                      handleCopy(String(row["ID Tray"]), `tray-${row.ID}`)
                    }
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <CopyIcon className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            </TableCell>

            <TableCell className={BODY_CELL}>{row.Marca}</TableCell>

            <TableCell className={BODY_CELL}>
              {row["Referência"]}
            </TableCell>

            <CellEditable row={row} field="Desconto" suffix="%" />
            <CellEditable row={row} field="Embalagem" isMoney />
            <CellEditable row={row} field="Frete" isMoney />
            <CellEditable row={row} field="Comissão" suffix="%" />
            <CellEditable row={row} field="Imposto" suffix="%" />
            <CellEditable row={row} field="Margem de Lucro" suffix="%" />
            <CellEditable row={row} field="Marketing" suffix="%" />

            <TableCell className={BODY_CELL}>
              R$ {toBR(row.Custo)}
            </TableCell>

            <TableCell className={`${BODY_CELL} text-green-400`}>
              R$ {toBR(row["Preço de Venda"])}
            </TableCell>

            <TableCell className="text-right pr-6">
              <button
                onClick={() => {
                  handleEditFull(row);
                  router.push(
                    `/dashboard/marketplaces/tray/details?id=${detailsId}&loja=${row.Loja}`
                  );
                }}
              >
                <EditIcon className="w-4 h-4 text-white" />
              </button>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}