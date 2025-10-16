"use client";

import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader, CopyIcon, Edit as EditIcon, Trash2 as TrashIcon } from "lucide-react";
import { Anuncio } from "@/components/announce/types/Announce";

type Props = {
  rows: Anuncio[];
  loading: boolean;
  selectedRows: Anuncio[];
  toggleRow: (row: Anuncio) => void;
  onEdit: (id: string) => void;
  onDelete: (row: Anuncio) => void;
};

export default function TableBodyRows({ rows, loading, selectedRows, toggleRow, onEdit, onDelete }: Props) {
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={9}>
          <div className="flex justify-center items-center py-16">
            <Loader className="animate-spin h-8 w-8 text-neutral-400" />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9}>
          <div className="py-10 text-center text-neutral-400">
            Nenhum anúncio encontrado com os filtros atuais.
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {rows.map((a) => {
        const isSelected = selectedRows.some((r) => r.id === a.id);
        return (
          <TableRow
            key={`${a.id}-${a.loja}-${a.id_tray}`}
            className={`border-b border-neutral-700 transition-colors ${
              isSelected ? "bg-white/10 hover:bg-white/20" : "hover:bg-white/5"
            }`}
          >
            <TableCell className="text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRow(a)}
                className="accent-[#22c55e] w-4 h-4 cursor-pointer"
              />
            </TableCell>

            <TableCell className="text-white text-center">{a.id}</TableCell>
            <TableCell className="text-neutral-300 text-center">{a.loja}</TableCell>

            {/* ID Bling */}
            <TableCell className="text-neutral-300 text-center">
              <div className="flex justify-center items-center gap-1">
                {a.id_bling || "-"}
                {a.id_bling && (
                  <button
                    onClick={() => handleCopy(a.id_bling || "")}
                    title="Copiar"
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <CopyIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            </TableCell>

            {/* ID Tray */}
            <TableCell className="text-neutral-300 text-center">
              <div className="flex justify-center items-center gap-1">
                {a.id_tray || "-"}
                {a.id_tray && (
                  <button
                    onClick={() => handleCopy(a.id_tray || "")}
                    title="Copiar"
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <CopyIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            </TableCell>

            {/* Referência */}
            <TableCell className="text-neutral-300 text-center">
              <div className="flex justify-center items-center gap-1">
                {a.referencia || "-"}
                {a.referencia && (
                  <button
                    onClick={() => handleCopy(a.referencia || "")}
                    title="Copiar"
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <CopyIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            </TableCell>

            <TableCell className="text-neutral-300 text-center">{a.nome}</TableCell>
            <TableCell className="text-neutral-300 text-center">{a.marca}</TableCell>

            {/* Ações */}
            <TableCell className="flex justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-[#1a8ceb] hover:scale-105 transition-all cursor-pointer"
                onClick={() => onEdit(a.id)}
              >
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-[#ef4444] hover:scale-105 transition-all cursor-pointer"
                onClick={() => onDelete(a)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
