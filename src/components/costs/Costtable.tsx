// CostDataTable.tsx
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CopyIcon,
  Pencil as EditIcon,
  Loader2,
  Trash2 as TrashIcon,
} from "lucide-react";
import { Custo } from "@/components/costtable/types";
import { formatBR } from "@/components/costtable/utils";

type Props = {
  rows: Custo[];
  loading: boolean;
  selectedRows: Custo[];
  setSelectedRows: React.Dispatch<React.SetStateAction<Custo[]>>;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  openEdit: (row: Custo) => void;
  openDeleteOne: (row: Custo) => void;
  openCostEditor: (row: Custo, e: React.MouseEvent) => void;
};

const getCostKey = (row: any) => {
  return String(row?.["Código"] ?? row?.codigo ?? row?.id ?? "").trim();
};

function IconBtn({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant: "edit" | "delete";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex h-8 w-8 items-center justify-center
        border border-transparent
        text-neutral-500
        transition-colors
        hover:border-neutral-800 hover:bg-neutral-900
        ${variant === "edit" ? "hover:text-amber-500" : "hover:text-red-500"}
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
}: {
  value: string;
  copyKey: string;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
}) {
  if (!value) return null;

  return (
    <button
      type="button"
      onClick={() => handleCopy(value, copyKey)}
      className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
    >
      <CopyIcon
        className={`h-3 w-3 ${
          copiedId === copyKey ? "text-amber-500" : "text-neutral-500 hover:text-amber-500"
        }`}
      />
    </button>
  );
}

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
}: Props) {
  const isRowSelected = (row: Custo) => {
    const rowKey = getCostKey(row);
    return selectedRows.some((selected) => getCostKey(selected) === rowKey);
  };

  const toggleSelectedRow = (row: Custo, checked: boolean) => {
    const rowKey = getCostKey(row);

    if (!rowKey) return;

    setSelectedRows((prev) => {
      if (checked) {
        const alreadySelected = prev.some(
          (selected) => getCostKey(selected) === rowKey
        );

        if (alreadySelected) return prev;

        return [...prev, row];
      }

      return prev.filter((selected) => getCostKey(selected) !== rowKey);
    });
  };

  return (
    <>
      {/* MOBILE */}
      <div className="md:hidden space-y-2 px-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">
            Nenhum registro encontrado
          </div>
        ) : (
          rows.map((c, i) => {
            const isSelected = isRowSelected(c);

            return (
              <div
                key={`${c["Código"]}-${i}`}
                className={`border p-3 transition-colors ${
                  isSelected
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-neutral-800 bg-[#0a0a0a]"
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
                    className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-neutral-400">
                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-600">Código</div>
                    <div className="mt-1 truncate text-white">{c["Código"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-600">NCM</div>
                    <div className="mt-1 truncate text-white">{c["NCM"] || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-600">Custo Atual</div>
                    <button
                      type="button"
                      onClick={(e) => openCostEditor(c, e)}
                      className="mt-1 truncate text-amber-500 underline-offset-2 hover:underline"
                    >
                      R$ {formatBR(c["Custo Atual"])}
                    </button>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-600">Custo Antigo</div>
                    <div className="mt-1 truncate text-white">R$ {formatBR(c["Custo Antigo"])}</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <IconBtn variant="edit" onClick={() => openEdit(c)}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </IconBtn>

                  <IconBtn variant="delete" onClick={() => openDeleteOne(c)}>
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
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-neutral-500">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, i) => {
                  const isSelected = isRowSelected(c);

                  return (
                    <TableRow
                      key={`${c["Código"]}-${i}`}
                      className={`group border-b border-neutral-900 transition-colors ${
                        isSelected ? "bg-amber-500/[0.05] hover:bg-amber-500/[0.08]" : "hover:bg-neutral-900/40"
                      }`}
                    >
                      <TableCell className="w-[48px] text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectedRow(c, e.target.checked)}
                          className="h-3.5 w-3.5 cursor-pointer accent-amber-500"
                        />
                      </TableCell>

                      <TableCell className="w-[140px] text-left font-mono text-[13px] text-neutral-300">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="truncate">{c["Código"]}</span>
                          <CopyBtn
                            value={c["Código"] || ""}
                            copyKey={`codigo-${i}`}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="w-[160px] text-left text-[13px] text-neutral-400">
                        <span className="truncate">{c["Marca"]}</span>
                      </TableCell>

                      <TableCell className="min-w-[280px] text-left text-[13px] text-neutral-300">
                        <div className="inline-flex max-w-full items-center gap-1.5">
                          <span className="truncate">{c["Produto"]}</span>
                          <CopyBtn
                            value={c["Produto"] || ""}
                            copyKey={`produto-${i}`}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="w-[150px] text-right font-mono text-[13px] tabular-nums">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => openCostEditor(c, e)}
                            className="text-amber-500 underline-offset-2 hover:underline"
                          >
                            R$ {formatBR(c["Custo Atual"])}
                          </button>

                          <CopyBtn
                            value={`R$ ${formatBR(c["Custo Atual"])}`}
                            copyKey={`custo-${i}`}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="w-[150px] text-right font-mono text-[13px] tabular-nums text-neutral-500">
                        R$ {formatBR(c["Custo Antigo"])}
                      </TableCell>

                      <TableCell className="w-[140px] text-left text-[13px] text-neutral-400">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="truncate">{c["NCM"]}</span>
                          <CopyBtn
                            value={c["NCM"] || ""}
                            copyKey={`ncm-${i}`}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="w-[100px]">
                        <div className="flex justify-center gap-1">
                          <IconBtn variant="edit" onClick={() => openEdit(c)}>
                            <EditIcon className="h-3.5 w-3.5" />
                          </IconBtn>

                          <IconBtn variant="delete" onClick={() => openDeleteOne(c)}>
                            <TrashIcon className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
