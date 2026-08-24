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
import { Announce } from "@/components/announce/hooks/types";
import AnnounceTableHeaderBar from "@/components/announce/Announceheader";

const COL_WIDTHS = [48, 120, 120, 140, 140, 0, 160, 160];

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
  rows: Announce[];
  loading: boolean;
  selectedRows: Announce[];
  setSelectedRows: React.Dispatch<React.SetStateAction<Announce[]>>;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  openEdit: (row: Announce) => void;
  openDeleteOne: (row: Announce) => void;

  // Props do header (repassadas para AnnounceTableHeaderBar)
  allSelected: boolean;
  situacao: string;
  appliedSituacao: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: string) => void;
  onSort: (column: string) => void;
  onDeleteSelected: () => void;
  onRestoreSelected: () => void;
  onClearSelection: () => void;
  onSelectAllTable: () => void;
  selectingAll?: boolean;
};

const getRowKey = (row: any) => String(row?.id ?? "").trim();

/* ─────────────────────────────────────────────
 * HELPER — detecta itens recentes ("Novos")
 * ───────────────────────────────────────────── */
const NEW_THRESHOLD_HOURS = 24 * 5; // 5 dias

function isRecent(createdAt?: string | null, hours = NEW_THRESHOLD_HOURS) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= hours * 60 * 60 * 1000;
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

const AnnounceTableRow = React.memo(
  function AnnounceTableRow({
    row,
    index,
    isSelected,
    copiedId,
    handleCopy,
    openEdit,
    openDeleteOne,
    onToggle,
  }: {
    row: Announce;
    index: number;
    isSelected: boolean;
    copiedId: string | null;
    handleCopy: (text: string, key: string) => void;
    openEdit: (row: Announce) => void;
    openDeleteOne: (row: Announce) => void;
    onToggle: (row: Announce, checked: boolean) => void;
  }) {
    const showNewBadge = isRecent((row as any)?.created_at);

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
            aria-label={`Selecionar anúncio ${row.code_id}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          />
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{row.code_id}</span>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{row.store}</span>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{row.id_bling || "-"}</span>
            <CopyBtn
              value={row.id_bling || ""}
              copyKey={`bling-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="ID Bling"
            />
          </div>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{row.reference || "-"}</span>
            <CopyBtn
              value={row.reference || ""}
              copyKey={`ref-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="referência"
            />
          </div>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{row.product || "-"}</span>
            {showNewBadge && <NewBadge />}
            <CopyBtn
              value={row.product || ""}
              copyKey={`produto-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="produto"
            />
          </div>
        </TableCell>

        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{row.mark || "-"}</span>
        </TableCell>

        <TableCell>
          <div className="flex justify-center gap-1">
            <IconBtn variant="edit" label={`Editar ${row.product}`} onClick={() => openEdit(row)}>
              <EditIcon className="h-3.5 w-3.5" />
            </IconBtn>

            <IconBtn
              variant="delete"
              label={`Excluir ${row.product}`}
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

export default function AnnounceDataTable({
  rows,
  loading,
  selectedRows,
  setSelectedRows,
  copiedId,
  handleCopy,
  openEdit,
  openDeleteOne,
  allSelected,
  situacao,
  appliedSituacao,
  sortColumn,
  sortDirection,
  onToggleSelectAll,
  onSituacaoChange,
  onSort,
  onDeleteSelected,
  onRestoreSelected,
  onClearSelection,
  onSelectAllTable,
  selectingAll,
}: Props) {
  const selectedKeys = React.useMemo(
    () => new Set(selectedRows.map((r) => getRowKey(r))),
    [selectedRows]
  );

  const toggleSelectedRow = useCallback(
    (row: Announce, checked: boolean) => {
      const rowKey = getRowKey(row);
      if (!rowKey) return;

      setSelectedRows((prev) => {
        if (checked) {
          const already = prev.some((r) => getRowKey(r) === rowKey);
          if (already) return prev;
          return [...prev, row];
        }

        return prev.filter((r) => getRowKey(r) !== rowKey);
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
          rows.map((a, i) => {
            const isSelected = selectedKeys.has(getRowKey(a));
            const showNewBadge = isRecent((a as any)?.created_at);

            return (
              <div
                key={`${a.id}-${i}`}
                className={`border p-3 transition-colors ${
                  isSelected ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/[0.05]" : "border-neutral-800 bg-[#0a0a0a]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      {a.store || "-"}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white">
                      <span className="truncate">{a.product || "-"}</span>
                      {showNewBadge && <NewBadge />}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectedRow(a, e.target.checked)}
                    aria-label={`Selecionar anúncio ${a.code_id}`}
                    className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-neutral-400">
                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Código</div>
                    <div className="mt-1 truncate text-white">{a.code_id || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Marca</div>
                    <div className="mt-1 truncate text-white">{a.mark || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">ID Bling</div>
                    <div className="mt-1 truncate text-white">{a.id_bling || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Referência</div>
                    <div className="mt-1 truncate text-white">{a.reference || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <IconBtn variant="edit" label={`Editar ${a.product}`} onClick={() => openEdit(a)}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </IconBtn>

                  <IconBtn variant="delete" label={`Excluir ${a.product}`} onClick={() => openDeleteOne(a)}>
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

            <AnnounceTableHeaderBar
              allSelected={allSelected}
              hasRows={rows.length > 0}
              situacao={situacao}
              appliedSituacao={appliedSituacao}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              selectedCount={selectedRows.length}
              onToggleSelectAll={onToggleSelectAll}
              onSituacaoChange={onSituacaoChange}
              onSort={onSort}
              onDeleteSelected={onDeleteSelected}
              onRestoreSelected={onRestoreSelected}
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
                rows.map((a, i) => (
                  <AnnounceTableRow
                    key={`${a.id}-${i}`}
                    row={a}
                    index={i}
                    isSelected={selectedKeys.has(getRowKey(a))}
                    copiedId={copiedId}
                    handleCopy={handleCopy}
                    openEdit={openEdit}
                    openDeleteOne={openDeleteOne}
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
