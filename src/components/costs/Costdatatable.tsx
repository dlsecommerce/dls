"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  CopyIcon,
  Pencil as EditIcon,
  Trash2 as TrashIcon,
  PackageSearch,
} from "lucide-react";
import type { Custo } from "@/components/costs/helpers/types";
import { formatBR, getCostKey } from "@/components/costs/hooks/utils";
import CostHeader from "@/components/costs/Costheader";

/* ─────────────────────────────────────────────
 * LAYOUT
 * 0 = coluna flexível (Produto). A largura mínima da tabela
 * é derivada das colunas fixas + a largura mínima do Produto.
 * ───────────────────────────────────────────── */
const COL_WIDTHS = [48, 140, 160, 0, 150, 150, 140, 180] as const;
const COL_COUNT = COL_WIDTHS.length;
const PRODUCT_MIN_WIDTH = 220;
const TABLE_MIN_WIDTH =
  COL_WIDTHS.reduce((acc, w) => acc + w, 0) + PRODUCT_MIN_WIDTH;

const DESKTOP_QUERY = "(min-width: 768px)";
const NEW_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias

/* ─────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────── */

function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function isRecent(createdAt?: string | null) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= NEW_THRESHOLD_MS;
}

/** Valor para exibição: "-" quando vazio, nunca "R$ 0,00" falso. */
const moneyOrDash = (v: unknown) =>
  v === null || v === undefined || v === "" ? "-" : `R$ ${formatBR(v)}`;

/** Valor para cópia: vazio quando não há custo. */
const moneyOrEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : `R$ ${formatBR(v)}`;

/* ─────────────────────────────────────────────
 * UI PEQUENA
 * ───────────────────────────────────────────── */

function ColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w, i) =>
        w === 0 ? <col key={i} /> : <col key={i} style={{ width: `${w}px` }} />
      )}
    </colgroup>
  );
}

function NewBadge() {
  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center rounded-none border border-[#1a8ceb]/40 bg-[#1a8ceb]/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-[#1a8ceb]"
      title="Adicionado recentemente"
    >
      Novo
    </span>
  );
}

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
        border border-transparent text-neutral-500
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
            text-[10px] font-medium text-[#1a8ceb] shadow-lg
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
          <TableCell colSpan={COL_COUNT} className="py-2.5">
            <div className="h-4 w-full animate-pulse bg-neutral-900" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyStateContent() {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <PackageSearch className="h-8 w-8 text-neutral-700" aria-hidden="true" />
      <p className="text-sm text-neutral-400">Nenhum registro encontrado</p>
      <p className="text-xs text-neutral-500">
        Tente ajustar os filtros ou limpar a busca.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * LINHA DESKTOP
 * Memoizada. Depende só de props estáveis: os callbacks
 * do pai devem ser estabilizados com useCallback.
 * ───────────────────────────────────────────── */

type RowProps = {
  row: Custo;
  rowKey: string | null;
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
};

const CostTableRow = React.memo(function CostTableRow({
  row,
  rowKey,
  isSelected,
  copiedId,
  handleCopy,
  openEdit,
  openDeleteOne,
  openCostEditor,
  onToggle,
}: RowProps) {
  const codigo = row["Código"] || "";
  const produto = row["Produto"] || "";
  const ncm = row["NCM"] || "";
  const base = rowKey ?? codigo ?? "sem-chave";
  const showNewBadge = isRecent(row.created_at);

  return (
    <TableRow
      className={`group border-b border-neutral-900 transition-colors ${
        isSelected
          ? "bg-[#1a8ceb]/[0.06] hover:bg-[#1a8ceb]/[0.09]"
          : "hover:bg-neutral-900/40"
      }`}
    >
      <TableCell className="text-center">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={rowKey === null}
          onChange={(e) => onToggle(row, e.target.checked)}
          aria-label={`Selecionar produto ${codigo}`}
          className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
        />
      </TableCell>

      <TableCell className="text-left text-[13px] text-neutral-300">
        <div className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate">{codigo}</span>
          <CopyBtn
            value={codigo}
            copyKey={`${base}:codigo`}
            copiedId={copiedId}
            handleCopy={handleCopy}
            label="código"
          />
        </div>
      </TableCell>

      <TableCell className="text-left text-[13px] text-neutral-300">
        <span className="block truncate">{row["Marca"] || "-"}</span>
      </TableCell>

      <TableCell className="text-left text-[13px] text-neutral-300">
        <div className="inline-flex max-w-full min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate">{produto}</span>
          {showNewBadge && <NewBadge />}
          <CopyBtn
            value={produto}
            copyKey={`${base}:produto`}
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
            aria-label={`Editar custo atual de ${produto}`}
            className="text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          >
            {moneyOrDash(row["Custo Atual"])}
          </button>
          <CopyBtn
            value={moneyOrEmpty(row["Custo Atual"])}
            copyKey={`${base}:custo-atual`}
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
          aria-label={`Editar custo antigo de ${produto}`}
          className="text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
        >
          {moneyOrDash(row["Custo Antigo"])}
        </button>
      </TableCell>

      <TableCell className="text-left text-[13px] text-neutral-300">
        <div className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate">{ncm}</span>
          <CopyBtn
            value={ncm}
            copyKey={`${base}:ncm`}
            copiedId={copiedId}
            handleCopy={handleCopy}
            label="NCM"
          />
        </div>
      </TableCell>

      <TableCell>
        <div className="flex justify-center gap-1">
          <IconBtn
            variant="edit"
            label={`Editar ${produto}`}
            onClick={() => openEdit(row)}
          >
            <EditIcon className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            variant="delete"
            label={`Excluir ${produto}`}
            onClick={() => openDeleteOne(row)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </TableCell>
    </TableRow>
  );
});

/* ─────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * Renderiza UMA árvore: cards no mobile, tabela no desktop.
 * ───────────────────────────────────────────── */

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
  const isDesktop = useIsDesktop();

  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedRows
          .map((r) => getCostKey(r))
          .filter((k): k is string => k !== null)
      ),
    [selectedRows]
  );

  const toggleSelectedRow = useCallback(
    (row: Custo, checked: boolean) => {
      const rowKey = getCostKey(row);
      if (rowKey === null) return;

      setSelectedRows((prev) => {
        const exists = prev.some((r) => getCostKey(r) === rowKey);
        if (checked === exists) return prev; // sem mudança: evita re-render
        return checked
          ? [...prev, row]
          : prev.filter((r) => getCostKey(r) !== rowKey);
      });
    },
    [setSelectedRows]
  );

  // Evita flash de layout errado antes de saber o breakpoint
  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="space-y-2 px-2 pb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`mskel-${i}`}
              className="h-28 animate-pulse border border-neutral-900 bg-neutral-950"
            />
          ))
        ) : rows.length === 0 ? (
          <EmptyStateContent />
        ) : (
          rows.map((c, i) => {
            const rowKey = getCostKey(c);
            const isSelected = rowKey !== null && selectedKeys.has(rowKey);
            const produto = c["Produto"] || "-";

            return (
              <div
                key={rowKey ?? `row-${i}`}
                className={`border p-3 transition-colors ${
                  isSelected
                    ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/[0.05]"
                    : "border-neutral-800 bg-[#0a0a0a]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      {c["Marca"] || "-"}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white">
                      <span className="truncate">{produto}</span>
                      {isRecent(c.created_at) && <NewBadge />}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={rowKey === null}
                    onChange={(e) => toggleSelectedRow(c, e.target.checked)}
                    aria-label={`Selecionar produto ${c["Código"]}`}
                    className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#1a8ceb] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-neutral-500">
                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide">Código</div>
                    <div className="mt-1 truncate text-white">{c["Código"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide">NCM</div>
                    <div className="mt-1 truncate text-white">{c["NCM"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide">Custo Atual</div>
                    <button
                      type="button"
                      onClick={(e) => openCostEditor(c, e, "Custo Atual")}
                      aria-label={`Editar custo atual de ${produto}`}
                      className="mt-1 block truncate text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                    >
                      {moneyOrDash(c["Custo Atual"])}
                    </button>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide">Custo Antigo</div>
                    <button
                      type="button"
                      onClick={(e) => openCostEditor(c, e, "Custo Antigo")}
                      aria-label={`Editar custo antigo de ${produto}`}
                      className="mt-1 block truncate text-[#1a8ceb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                    >
                      {moneyOrDash(c["Custo Antigo"])}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <IconBtn variant="edit" label={`Editar ${produto}`} onClick={() => openEdit(c)}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn variant="delete" label={`Excluir ${produto}`} onClick={() => openDeleteOne(c)}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="table-fixed" style={{ minWidth: `${TABLE_MIN_WIDTH}px` }}>
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
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="py-16">
                <EmptyStateContent />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c, i) => {
              const rowKey = getCostKey(c);
              const isSelected = rowKey !== null && selectedKeys.has(rowKey);

              return (
                <CostTableRow
                  key={rowKey ?? `row-${i}`}
                  row={c}
                  rowKey={rowKey}
                  isSelected={isSelected}
                  copiedId={copiedId}
                  handleCopy={handleCopy}
                  openEdit={openEdit}
                  openDeleteOne={openDeleteOne}
                  openCostEditor={openCostEditor}
                  onToggle={toggleSelectedRow}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
