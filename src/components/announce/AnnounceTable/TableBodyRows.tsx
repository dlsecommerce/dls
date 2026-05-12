"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CopyIcon,
  Edit as EditIcon,
  Loader,
  Trash2 as TrashIcon,
} from "lucide-react";
import { Anuncio } from "@/components/announce/types/Announce";

type Props = {
  rows: Anuncio[];
  loading: boolean;
  selectedRows: Anuncio[];
  toggleRow: (row: Anuncio) => void;
  onEdit: (id: string, loja: string) => void;
  onDelete: (row: Anuncio) => void;
};

export default function TableBodyRows({
  rows,
  loading,
  selectedRows,
  toggleRow,
  onEdit,
  onDelete,
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderVariationBadge = (variationCount: number) => {
    if (variationCount <= 0) return null;

    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold leading-none text-green-400">
        {variationCount} {variationCount === 1 ? "variação" : "variações"}
      </span>
    );
  };

  return (
    <>
      <div className="md:hidden space-y-3 px-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-neutral-400">
            Nenhum registro encontrado
          </div>
        ) : (
          rows.map((a, i) => {
            const isSelected = selectedRows.some(
              (r) => `${r.loja}-${r.id}` === `${a.loja}-${a.id}`
            );

            const variationCount = Number((a as any).total_variacoes || 0);

            return (
              <div
                key={`${a.id}-${a.loja}-${a.id_tray}-${i}`}
                className={`rounded-2xl border p-3 transition-colors ${
                  isSelected
                    ? "border-green-500/40 bg-white/10"
                    : "border-neutral-700 bg-[#101010]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-green-400">
                      {a.loja || "-"}
                    </div>

                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-base font-semibold text-white">
                      <span className="max-w-full truncate">
                        {a.nome || "-"}
                      </span>

                      {renderVariationBadge(variationCount)}

                      {a.nome && (
                        <button
                          onClick={() =>
                            handleCopy(a.nome || "", `nome-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3.5 w-3.5 ${
                              copiedId === `nome-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(a)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-green-500"
                    style={{ accentColor: "#22c55e" }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">ID</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">{a.id || "-"}</span>
                      {a.id && (
                        <button
                          onClick={() =>
                            handleCopy(String(a.id), `id-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `id-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Marca</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">{a.marca || "-"}</span>
                      {a.marca && (
                        <button
                          onClick={() =>
                            handleCopy(a.marca || "", `marca-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `marca-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">ID Bling</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">{a.id_bling || "-"}</span>
                      {a.id_bling && (
                        <button
                          onClick={() =>
                            handleCopy(a.id_bling || "", `bling-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `bling-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Referência</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">
                        {a.referencia || "-"}
                      </span>
                      {a.referencia && (
                        <button
                          onClick={() =>
                            handleCopy(a.referencia || "", `ref-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `ref-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">ID Tray</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">{a.id_tray || "-"}</span>
                      {a.id_tray && (
                        <button
                          onClick={() =>
                            handleCopy(a.id_tray || "", `tray-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `tray-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Loja</div>
                    <div className="mt-1 truncate text-white">{a.loja || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 cursor-pointer text-white hover:text-[#1a8ceb] active:scale-[0.98]"
                    onClick={() => onEdit(String(a.id), a.loja)}
                    type="button"
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 cursor-pointer text-white hover:text-[#ef4444] active:scale-[0.98]"
                    onClick={() => onDelete(a)}
                    type="button"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[1248px] table-fixed">
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex items-center justify-center py-16">
                    <Loader className="h-8 w-8 animate-spin text-neutral-400" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-neutral-400"
                >
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a, i) => {
                const isSelected = selectedRows.some(
                  (r) => `${r.loja}-${r.id}` === `${a.loja}-${a.id}`
                );

                const variationCount = Number((a as any).total_variacoes || 0);

                return (
                  <TableRow
                    key={`${a.id}-${a.loja}-${a.id_tray}-${i}`}
                    className={`border-b border-neutral-700 transition-colors ${
                      isSelected
                        ? "bg-white/10 hover:bg-white/20"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <TableCell className="w-[48px] text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(a)}
                        className="h-4 w-4 cursor-pointer accent-green-500"
                        style={{ accentColor: "#22c55e" }}
                      />
                    </TableCell>

                    <TableCell className="w-[120px] text-center text-white">
                      <div className="group inline-flex items-center gap-1">
                        <span className="truncate">{a.id || "-"}</span>
                        {a.id && (
                          <button
                            onClick={() => handleCopy(String(a.id), `id-${i}`)}
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `id-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[120px] text-left text-neutral-300">
                      <span className="truncate">{a.loja || "-"}</span>
                    </TableCell>

                    <TableCell className="w-[140px] text-left text-neutral-300">
                      <div className="group inline-flex max-w-full items-center gap-1">
                        <span className="truncate">{a.id_bling || "-"}</span>
                        {a.id_bling && (
                          <button
                            onClick={() =>
                              handleCopy(a.id_bling || "", `bling-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `bling-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[140px] text-left text-neutral-300">
                      <div className="group inline-flex max-w-full items-center gap-1">
                        <span className="truncate">{a.referencia || "-"}</span>
                        {a.referencia && (
                          <button
                            onClick={() =>
                              handleCopy(a.referencia || "", `ref-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `ref-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[140px] text-left text-neutral-300">
                      <div className="group inline-flex max-w-full items-center gap-1">
                        <span className="truncate">{a.id_tray || "-"}</span>
                        {a.id_tray && (
                          <button
                            onClick={() =>
                              handleCopy(a.id_tray || "", `tray-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `tray-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="min-w-[260px] text-left text-neutral-300">
                      <div className="group inline-flex max-w-full items-center gap-2 align-middle">
                        <span className="max-w-[520px] truncate">
                          {a.nome || "-"}
                        </span>

                        {renderVariationBadge(variationCount)}

                        {a.nome && (
                          <button
                            onClick={() =>
                              handleCopy(a.nome || "", `nome-${i}`)
                            }
                            className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `nome-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[160px] text-left text-neutral-300">
                      <div className="group inline-flex max-w-full items-center gap-1">
                        <span className="truncate">{a.marca || "-"}</span>
                        {a.marca && (
                          <button
                            onClick={() =>
                              handleCopy(a.marca || "", `marca-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `marca-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[120px] text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer text-white hover:text-[#1a8ceb]"
                          onClick={() => onEdit(String(a.id), a.loja)}
                          type="button"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer text-white hover:text-[#ef4444]"
                          onClick={() => onDelete(a)}
                          type="button"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}