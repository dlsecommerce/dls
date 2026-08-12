"use client";

import React, { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CopyIcon,
  Pencil as EditIcon,
  Trash2 as TrashIcon,
  PackageSearch,
} from "lucide-react";
import { Custo } from "@/components/costs/helpers/types";
import { formatBR } from "@/components/costs/hooks/utils";
import CostHeader from "@/components/costs/Costheader";

const COL_WIDTHS = [48, 140, 160, 0, 150, 150, 140, 180]; 

function ColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w, i) =>
        w === 0 ? <col key={i} /> : <col key={i} style={{ width: `${w}px` }} />
      )}
    </colgroup>
  );
}

type Props = {
  rows: Custo[];
  loading: boolean;
  selectedRows: Custo[];
  setSelectedRows: React.Dispatch<React.SetStateAction<Custo[]>>;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  openEdit: (row: Custo) => void;
  openDeleteOne: (row: Custo) => void;
  openCostEditor: (
    row: Custo,
    e: React.MouseEvent,
    field?: "Custo Atual" | "Custo Antigo"
  ) => void;

  // Props do header (repassadas para CostHeader)
  allSelected: boolean;
  situacao: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: string) => void;
  onSort: (column: string) => void;
  onDeleteSelected: () => void;
  onOpenAdjustments: () => void;
  onClearSelection: () => void;
  onSelectAllTable: () => void;
  selectingAll?: boolean;
};

const getCostKey = (row: any) => {
  return String(row?.["Código"] ?? row?.codigo ?? row?.id ?? "").trim();
};

function IconBtn({
  onClick,
  variant,
  label,
  children,
}: {
  onClick: () => void;
  variant: "edit" | "delete";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`
        flex h-8 w-8 items-center justify-center
        border border-transparent
        text-neutral-500
        transition-colors
        hover:border-neutral-800 hover:bg-neutral-900
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
        ${variant === "edit" ? "hover:text-[#1a8ceb]" : "hover:text-red-500"}
      `}
    >
      {children}
    </button>
  );
}

function CopyBtn({
  value,
  copyKey,
  copiedId,
  handleCopy,
  label,
}: {
  value: string;
  copyKey: string;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  label: string;
}) {
  if (!value) return null;

  const isCopied = copiedId === copyKey;

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => handleCopy(value, copyKey)}
        aria-label={`Copiar ${label}`}
        title={`Copiar ${label}`}
        className="
          cursor-pointer opacity-0 transition-opacity
          group-hover:opacity-100
          focus-visible:opacity-100 focus-visible:outline-none
          focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
        "
      >
        <CopyIcon
          className={`h-3 w-3 ${
            isCopied ? "text-[#1a8ceb]" : "text-neutral-500 hover:text-[#1a8ceb]"
          }`}
        />
      </button>

      {isCopied && (
        <span
          role="status"
          className="
            absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap
            border border-[#1a8ceb]/40 bg-[#0d0d0d] px-2 py-0.5
            text-[10px] font-medium text-[#1a8ceb]
            shadow-lg
          "
        >
          Copiado!
        </span>
      )}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`} className="border-b border-neutral-900">
          <TableCell colSpan={8} className="py-2.5">
            <div className="h-4 w-full animate-pulse bg-neutral-900" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={8} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <PackageSearch className="h-8 w-8 text-neutral-700" aria-hidden="true" />
          <p className="text-sm text-neutral-400">Nenhum registro encontrado</p>
          <p className="text-xs text-neutral-500">
            Tente ajustar os filtros ou limpar a busca.
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

const CostTableRow = React.memo(
  function CostTableRow({
    row,
    index,
    isSelected,
    copiedId,
    handleCopy,
    openEdit,
    openDeleteOne,
    openCostEditor,
    onToggle,
  }: {
    row: Custo;
    index: number;
    isSelected: boolean;
    copiedId: string | null;
    handleCopy: (text: string, key: string) => void;
    openEdit: (row: Custo) => void;
    openDeleteOne: (row: Custo) => void;
    openCostEditor: (
      row: Custo,
      e: React.MouseEvent,
      field?: "Custo Atual" | "Custo Antigo"
    ) => void;
    onToggle: (row: Custo, checked: boolean) => void;
  }) {
    return (
      <TableRow
        className={`group border-b border-neutral-900 transition-colors ${
          isSelected ? "bg-[#1a8ceb]/[0.06] hover:bg-[#1a8ceb]/[0.09]" : "hover:bg-neutral-900/40"
        }`}
      >
        <TableCell className="text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggle(row, e.target.checked)}
            aria-label={`Selecionar produto ${row["Código"]}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          />
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex items-center gap-1.5">
            <span className="truncate">{row["Código"]}</span>
            <CopyBtn
              value={row["Código"] || ""}
              copyKey={`codigo-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="código"
            />
          </div>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-400">
          <span className="truncate">{row["Marca"]}</span>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{row["Produto"]}</span>
            <CopyBtn
              value={row["Produto"] || ""}
              copyKey={`produto-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="produto"
            />
          </div>
        </TableCell>

        <TableCell className="text-right text-[13px] tabular-nums">
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => openCostEditor(row, e, "Custo Atual")}
              aria-label={`Editar custo atual de ${row["Produto"]}`}
              className="
                text-[#1a8ceb] underline-offset-2 hover:underline
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
              "
            >
              R$ {formatBR(row["Custo Atual"])}
            </button>

            <CopyBtn
              value={`R$ ${formatBR(row["Custo Atual"])}`}
              copyKey={`custo-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="custo atual"
            />
          </div>
        </TableCell>

        <TableCell className="text-right text-[13px] tabular-nums">
          <button
            type="button"
            onClick={(e) => openCostEditor(row, e, "Custo Antigo")}
            aria-label={`Editar custo antigo de ${row["Produto"]}`}
            className="
              text-[#1a8ceb] underline-offset-2 hover:underline hover:text-[#1a8ceb]/80
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
            "
          >
            R$ {formatBR(row["Custo Antigo"])}
          </button>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-400">
          <div className="inline-flex items-center gap-1.5">
            <span className="truncate">{row["NCM"]}</span>
            <CopyBtn
              value={row["NCM"] || ""}
              copyKey={`ncm-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="NCM"
            />
          </div>
        </TableCell>

        <TableCell>
          <div className="flex justify-center gap-1">
            <IconBtn variant="edit" label={`Editar ${row["Produto"]}`} onClick={() => openEdit(row)}>
              <EditIcon className="h-3.5 w-3.5" />
            </IconBtn>

            <IconBtn
              variant="delete"
              label={`Excluir ${row["Produto"]}`}
              onClick={() => openDeleteOne(row)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.isSelected === next.isSelected &&
    prev.copiedId === next.copiedId
);

export default function CostDataTable({
  rows,
  loading,
  selectedRows,
  setSelectedRows,
  copiedId,
  handleCopy,
  openEdit,
  openDeleteOne,
  openCostEditor,
  allSelected,
  situacao,
  sortColumn,
  sortDirection,
  onToggleSelectAll,
  onSituacaoChange,
  onSort,
  onDeleteSelected,
  onOpenAdjustments,
  onClearSelection,
  onSelectAllTable,
  selectingAll,
}: Props) {
  const selectedKeys = React.useMemo(
    () => new Set(selectedRows.map((r) => getCostKey(r))),
    [selectedRows]
  );

  const toggleSelectedRow = useCallback(
    (row: Custo, checked: boolean) => {
      const rowKey = getCostKey(row);
      if (!rowKey) return;

      setSelectedRows((prev) => {
        if (checked) {
          const already = prev.some((r) => getCostKey(r) === rowKey);
          if (already) return prev;
          return [...prev, row];
        }

        return prev.filter((r) => getCostKey(r) !== rowKey);
      });
    },
    [setSelectedRows]
  );

  return (
    <>
      {/* MOBILE */}
      <div className="md:hidden space-y-2 px-2 pb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`mskel-${i}`} className="h-28 animate-pulse border border-neutral-900 bg-neutral-950" />
          ))
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <PackageSearch className="h-8 w-8 text-neutral-700" aria-hidden="true" />
            <p className="text-sm text-neutral-400">Nenhum registro encontrado</p>
            <p className="text-xs text-neutral-500">Tente ajustar os filtros.</p>
          </div>
        ) : (
          rows.map((c, i) => {
            const isSelected = selectedKeys.has(getCostKey(c));

            return (
              <div
                key={`${c["Código"]}-${i}`}
                className={`border p-3 transition-colors ${
                  isSelected ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/[0.05]" : "border-neutral-800 bg-[#0a0a0a]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      {c["Marca"] || "-"}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white">
                      <span className="truncate">{c["Produto"] || "-"}</span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectedRow(c, e.target.checked)}
                    aria-label={`Selecionar produto ${c["Código"]}`}
                    className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-neutral-400">
                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Código</div>
                    <div className="mt-1 truncate text-white">{c["Código"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">NCM</div>
                    <div className="mt-1 truncate text-white">{c["NCM"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Custo Atual</div>
                    <button
                      type="button"
                      onClick={(e) => openCostEditor(c, e, "Custo Atual")}
                      aria-label={`Editar custo atual de ${c["Produto"]}`}
                      className="mt-1 truncate text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                    >
                      R$ {formatBR(c["Custo Atual"])}
                    </button>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Custo Antigo</div>
                    <button
                      type="button"
                      onClick={(e) => openCostEditor(c, e, "Custo Antigo")}
                      aria-label={`Editar custo antigo de ${c["Produto"]}`}
                      className="mt-1 truncate text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                    >
                      R$ {formatBR(c["Custo Antigo"])}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <IconBtn variant="edit" label={`Editar ${c["Produto"]}`} onClick={() => openEdit(c)}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </IconBtn>

                  <IconBtn variant="delete" label={`Excluir ${c["Produto"]}`} onClick={() => openDeleteOne(c)}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto lg:overflow-visible">
          <Table className="min-w-[1188px] table-fixed">
            <ColGroup />

            <CostHeader
              allSelected={allSelected}
              hasRows={rows.length > 0}
              situacao={situacao}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              selectedCount={selectedRows.length}
              onToggleSelectAll={onToggleSelectAll}
              onSituacaoChange={onSituacaoChange}
              onSort={onSort}
              onDeleteSelected={onDeleteSelected}
              onOpenAdjustments={onOpenAdjustments}
              onClearSelection={onClearSelection}
              onSelectAllTable={onSelectAllTable}
              selectingAll={selectingAll}
            />

            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : rows.length === 0 ? (
                <EmptyState />
              ) : (
                rows.map((c, i) => (
                  <CostTableRow
                    key={`${c["Código"]}-${i}`}
                    row={c}
                    index={i}
                    isSelected={selectedKeys.has(getCostKey(c))}
                    copiedId={copiedId}
                    handleCopy={handleCopy}
                    openEdit={openEdit}
                    openDeleteOne={openDeleteOne}
                    openCostEditor={openCostEditor}
                    onToggle={toggleSelectedRow}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
