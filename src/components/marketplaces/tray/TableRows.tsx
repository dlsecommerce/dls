"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Row } from "@/components/marketplaces/hooks/types";
import { toBR } from "@/components/marketplaces/hooks/helpers";
import {
  Edit as EditIcon,
  Copy as CopyIcon,
  Loader as LoaderIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/* ============================================================
   COMPONENTE PRINCIPAL DA TABELA
============================================================ */
export const Table: React.FC<{
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
}> = ({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}) => {
  const [sortField, setSortField] = useState<keyof Row>("ID");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-neutral-800 text-white h-14 border-b border-neutral-700 select-none">
          <th
            className="cursor-pointer px-3 text-center"
            onClick={() => handleSort("ID")}
          >
            <div className="flex justify-center items-center gap-1">
              ID
              {sortField === "ID" &&
                (sortDirection === "asc" ? (
                  <ArrowUp className="w-4 h-4 text-blue-400" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-blue-400" />
                ))}
            </div>
          </th>
          <th>Loja</th>
          <th>ID Tray</th>
          <th>Marca</th>
          <th>Referência</th>
          <th>Desconto</th>
          <th>Embalagem</th>
          <th>Frete</th>
          <th>Comissão</th>
          <th>Imposto</th>
          <th>Margem de Lucro</th>
          <th>Marketing</th>
          <th>Custo</th>
          <th>Preço de Venda</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>
        <TableRows
          rows={sortedRows}
          loading={loading}
          copiedId={copiedId}
          editedId={editedId}
          handleCopy={handleCopy}
          openEditor={openEditor}
          handleEditFull={handleEditFull}
        />
      </tbody>
    </table>
  );
};

/* ============================================================
   COMPONENTE DE LINHAS
============================================================ */
type TableRowsProps = {
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

export const TableRows: React.FC<TableRowsProps> = ({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
}) => {
  const router = useRouter();

  const lojaLabel = (loja: string) =>
    loja === "PK" ? "Pikot Shop" : loja === "SB" ? "Sóbaquetas" : loja;

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
    const displayVal = isMoney
      ? `R$ ${toBR(Number(row[field] || 0))}`
      : `${toBR(Number(row[field] || 0))}${suffix}`;

    return (
      <td className="px-3 text-white text-center align-middle h-16 whitespace-nowrap">
        <div className="flex justify-center items-center gap-1 group leading-none h-full">
          <span className="text-white">{displayVal}</span>
          <button
            onClick={(e) => openEditor(row, field, isMoney, e)}
            title="Editar"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            <EditIcon className="w-3.5 h-3.5 text-white group-hover:text-[#1A8CEB]" />
          </button>
        </div>
      </td>
    );
  };

  if (loading) {
    return (
      <tr className="h-16">
        <td
          colSpan={15}
          className="text-center text-neutral-400 py-6 align-middle"
        >
          <div className="flex items-center justify-center gap-2">
            <LoaderIcon className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        </td>
      </tr>
    );
  }

  if (rows.length === 0) {
    return (
      <tr className="h-16">
        <td
          colSpan={15}
          className="text-center text-neutral-400 py-6 align-middle"
        >
          Nenhum registro encontrado
        </td>
      </tr>
    );
  }

  return (
    <>
      {rows.map((row, i) => (
        <tr
          key={`${row.Loja}-${row.ID}-${i}`}
          className="h-16 border-b border-neutral-700 hover:bg-white/10 transition-colors text-center align-middle"
        >
          {/* ID */}
          <td className="px-3 text-white align-middle break-all max-w-[90px]">
            {row.ID}
          </td>

          {/* Loja */}
          <td className="px-3 text-neutral-300 align-middle h-16 whitespace-nowrap">
            {lojaLabel(row.Loja)}
          </td>

          {/* ID Tray */}
          <td className="px-3 text-neutral-300 align-middle break-words max-w-[120px]">
            <div className="flex flex-col justify-center items-center gap-1 group leading-none h-full">
              <span className="break-all text-center">
                {row["ID Tray"] || "-"}
              </span>
              {row["ID Tray"] && (
                <button
                  onClick={() =>
                    handleCopy(String(row["ID Tray"]), `tray-${row.ID}`)
                  }
                  title="Copiar"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <CopyIcon
                    className={`w-3 h-3 transition-all duration-300 ${
                      copiedId === `tray-${row.ID}`
                        ? "text-blue-500 scale-110"
                        : "text-white group-hover:text-blue-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </td>

          {/* Marca */}
          <td className="px-3 text-neutral-300 align-middle break-words max-w-[140px] text-center">
            {row.Marca}
          </td>

          {/* Referência */}
          <td className="px-3 text-neutral-300 align-middle break-all max-w-[150px]">
            <div className="flex flex-col justify-center items-center gap-1 group leading-none h-full text-center">
              <span className="break-all">{row["Referência"] || "-"}</span>
              {row["Referência"] && (
                <button
                  onClick={() =>
                    handleCopy(String(row["Referência"]), `ref-${row.ID}`)
                  }
                  title="Copiar"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <CopyIcon
                    className={`w-3 h-3 transition-all duration-300 ${
                      copiedId === `ref-${row.ID}`
                        ? "text-blue-500 scale-110"
                        : "text-white group-hover:text-blue-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </td>

          {/* Campos editáveis */}
          <CellEditable row={row} field="Desconto" suffix="%" />
          <CellEditable row={row} field="Embalagem" isMoney />
          <CellEditable row={row} field="Frete" isMoney />
          <CellEditable row={row} field="Comissão" suffix="%" />
          <CellEditable row={row} field="Imposto" suffix="%" />
          <CellEditable row={row} field="Margem de Lucro" suffix="%" />
          <CellEditable row={row} field="Marketing" suffix="%" />

          {/* Custo */}
          <td className="px-3 text-white whitespace-nowrap align-middle h-16">
            R$ {toBR(row.Custo || 0)}
          </td>

          {/* Preço de Venda */}
          <td className="px-3 whitespace-nowrap text-[#4ade80] font-semibold align-middle h-16">
            <div className="flex justify-center items-center gap-1 group leading-none h-full">
              R$ {toBR(row["Preço de Venda"] || 0)}
              <button
                onClick={() =>
                  handleCopy(
                    String(toBR(row["Preço de Venda"] || 0)),
                    `preco-${row.ID}`
                  )
                }
                title="Copiar"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <CopyIcon
                  className={`w-3 h-3 transition-all duration-300 ${
                    copiedId === `preco-${row.ID}`
                      ? "text-blue-500 scale-110"
                      : "text-white group-hover:text-blue-400"
                  }`}
                />
              </button>
            </div>
          </td>

          {/* Ações */}
          <td className="px-3 whitespace-nowrap align-middle h-16">
            <button
              onClick={() => {
                // Correção: sempre enviar PK ou SB
                router.push(
                  `/dashboard/marketplaces/tray/details?id=${row.ID}&loja=${row.Loja}`
                );
              }}
              title="Editar detalhes"
              className="cursor-pointer text-white hover:text-[#1A8CEB] transition-colors"
            >
              <EditIcon
                className={`w-4 h-4 inline-block transition-all duration-300 ${
                  editedId === `${row.Loja}-${row.ID}`
                    ? "text-[#1A8CEB] scale-110"
                    : ""
                }`}
              />
            </button>
          </td>
        </tr>
      ))}
    </>
  );
};
