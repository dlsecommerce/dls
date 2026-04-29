"use client";

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
          rows.map((c, i) => {
            const isSelected = selectedRows.some(
              (r) => r["Código"] === c["Código"]
            );

            return (
              <div
                key={`${c["Código"]}-${i}`}
                className={`rounded-2xl border p-3 transition-colors ${
                  isSelected
                    ? "border-green-500/40 bg-white/10"
                    : "border-neutral-700 bg-[#101010]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-green-400">
                      {c["Marca"] || "-"}
                    </div>

                    <div className="mt-1 flex min-w-0 items-center gap-1 text-base font-semibold text-white">
                      <span className="truncate">{c["Produto"] || "-"}</span>

                      {c["Produto"] && (
                        <button
                          onClick={() =>
                            handleCopy(c["Produto"] || "", `produto-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3.5 w-3.5 ${
                              copiedId === `produto-mobile-${i}`
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
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows([...selectedRows, c]);
                      } else {
                        setSelectedRows(
                          selectedRows.filter(
                            (r) => r["Código"] !== c["Código"]
                          )
                        );
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-green-500"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Código</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">
                        {c["Código"] || "-"}
                      </span>
                      {c["Código"] && (
                        <button
                          onClick={() =>
                            handleCopy(c["Código"] || "", `codigo-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `codigo-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">NCM</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">
                        {c["NCM"] || "-"}
                      </span>
                      {c["NCM"] && (
                        <button
                          onClick={() =>
                            handleCopy(c["NCM"] || "", `ncm-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `ncm-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Custo Atual</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openCostEditor(c, e)}
                        className="truncate text-[#22c55e] underline-offset-2 hover:underline cursor-pointer"
                      >
                        R$ {formatBR(c["Custo Atual"])}
                      </button>

                      <button
                        onClick={() =>
                          handleCopy(
                            `R$ ${formatBR(c["Custo Atual"])}`,
                            `custo-mobile-${i}`
                          )
                        }
                        className="shrink-0 cursor-pointer"
                        type="button"
                      >
                        <CopyIcon
                          className={`h-3 w-3 ${
                            copiedId === `custo-mobile-${i}`
                              ? "text-green-500"
                              : "text-neutral-400"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Custo Antigo</div>
                    <div className="mt-1 truncate text-white">
                      R$ {formatBR(c["Custo Antigo"])}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Marca</div>
                    <div className="mt-1 truncate text-white">
                      {c["Marca"] || "-"}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-neutral-800 bg-[#0f0f0f] p-2">
                    <div className="text-neutral-500">Produto</div>
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-white">
                        {c["Produto"] || "-"}
                      </span>
                      {c["Produto"] && (
                        <button
                          onClick={() =>
                            handleCopy(c["Produto"] || "", `produto-grid-mobile-${i}`)
                          }
                          className="shrink-0 cursor-pointer"
                          type="button"
                        >
                          <CopyIcon
                            className={`h-3 w-3 ${
                              copiedId === `produto-grid-mobile-${i}`
                                ? "text-green-500"
                                : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 cursor-pointer text-white hover:text-[#1a8ceb] active:scale-[0.98]"
                    onClick={() => openEdit(c)}
                    type="button"
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 cursor-pointer text-white hover:text-[#ef4444] active:scale-[0.98]"
                    onClick={() => openDeleteOne(c)}
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
        <div className="w-full overflow-x-auto lg:overflow-visible">
          <Table className="min-w-[1188px] table-fixed">
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex items-center justify-center py-16">
                      <Loader className="h-8 w-8 animate-spin text-neutral-400" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-neutral-400"
                  >
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, i) => {
                  const isSelected = selectedRows.some(
                    (r) => r["Código"] === c["Código"]
                  );

                  return (
                    <TableRow
                      key={`${c["Código"]}-${i}`}
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
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows([...selectedRows, c]);
                            } else {
                              setSelectedRows(
                                selectedRows.filter(
                                  (r) => r["Código"] !== c["Código"]
                                )
                              );
                            }
                          }}
                          className="h-4 w-4 cursor-pointer accent-green-500"
                        />
                      </TableCell>

                      {/* CÓDIGO */}
                      <TableCell className="w-[140px] text-center text-white">
                        <div className="group inline-flex items-center gap-1">
                          <span className="truncate">{c["Código"]}</span>
                          <button
                            onClick={() =>
                              handleCopy(c["Código"] || "", `codigo-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `codigo-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        </div>
                      </TableCell>

                      {/* MARCA */}
                      <TableCell className="w-[160px] text-left text-neutral-300">
                        <span className="truncate">{c["Marca"]}</span>
                      </TableCell>

                      {/* PRODUTO */}
                      <TableCell className="min-w-[280px] text-left text-neutral-300">
                        <div className="group inline-flex max-w-full items-center gap-1">
                          <span className="truncate">{c["Produto"]}</span>
                          <button
                            onClick={() =>
                              handleCopy(c["Produto"] || "", `produto-${i}`)
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `produto-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        </div>
                      </TableCell>

                      {/* CUSTO ATUAL */}
                      <TableCell className="w-[150px] text-center text-neutral-300">
                        <div className="group inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => openCostEditor(c, e)}
                            className="text-[#22c55e] underline-offset-2 hover:underline cursor-pointer"
                          >
                            R$ {formatBR(c["Custo Atual"])}
                          </button>

                          <button
                            onClick={() =>
                              handleCopy(
                                `R$ ${formatBR(c["Custo Atual"])}`,
                                `custo-${i}`
                              )
                            }
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `custo-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        </div>
                      </TableCell>

                      {/* CUSTO ANTIGO */}
                      <TableCell className="w-[150px] text-center text-neutral-300">
                        <span>R$ {formatBR(c["Custo Antigo"])}</span>
                      </TableCell>

                      {/* NCM */}
                      <TableCell className="w-[140px] text-center text-neutral-300">
                        <div className="group inline-flex items-center gap-1">
                          <span className="truncate">{c["NCM"]}</span>
                          <button
                            onClick={() => handleCopy(c["NCM"] || "", `ncm-${i}`)}
                            className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            type="button"
                          >
                            <CopyIcon
                              className={`h-3 w-3 ${
                                copiedId === `ncm-${i}`
                                  ? "text-green-500"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            />
                          </button>
                        </div>
                      </TableCell>

                      {/* AÇÕES */}
                      <TableCell className="w-[120px] text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer text-white hover:text-[#1a8ceb]"
                            onClick={() => openEdit(c)}
                            type="button"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer text-white hover:text-[#ef4444]"
                            onClick={() => openDeleteOne(c)}
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
      </div>
    </>
  );
}