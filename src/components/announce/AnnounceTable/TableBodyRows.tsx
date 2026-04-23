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

  return (
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

            return (
              <TableRow
                key={`${a.id}-${a.loja}-${a.id_tray}-${i}`}
                className={`border-b border-neutral-700 transition-colors ${
                  isSelected
                    ? "bg-white/10 hover:bg-white/20"
                    : "hover:bg-white/5"
                }`}
              >
                {/* CHECKBOX */}
                <TableCell className="w-[48px] text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(a)}
                    className="h-4 w-4 cursor-pointer accent-green-500"
                    style={{ accentColor: "#22c55e" }}
                  />
                </TableCell>

                {/* ID */}
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

                {/* LOJA */}
                <TableCell className="w-[120px] text-left text-neutral-300">
                  <span className="truncate">{a.loja || "-"}</span>
                </TableCell>

                {/* ID BLING */}
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

                {/* REFERÊNCIA */}
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

                {/* ID TRAY */}
                <TableCell className="w-[140px] text-left text-neutral-300">
                  <div className="group inline-flex max-w-full items-center gap-1">
                    <span className="truncate">{a.id_tray || "-"}</span>
                    {a.id_tray && (
                      <button
                        onClick={() => handleCopy(a.id_tray || "", `tray-${i}`)}
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

                {/* NOME */}
                <TableCell className="min-w-[260px] text-left text-neutral-300">
                  <div className="group inline-flex max-w-full items-center gap-1">
                    <span className="truncate">{a.nome || "-"}</span>
                    {a.nome && (
                      <button
                        onClick={() => handleCopy(a.nome || "", `nome-${i}`)}
                        className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
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

                {/* MARCA */}
                <TableCell className="w-[160px] text-left text-neutral-300">
                  <div className="group inline-flex max-w-full items-center gap-1">
                    <span className="truncate">{a.marca || "-"}</span>
                    {a.marca && (
                      <button
                        onClick={() => handleCopy(a.marca || "", `marca-${i}`)}
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

                {/* AÇÕES */}
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
  );
}