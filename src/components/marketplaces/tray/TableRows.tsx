"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Row } from "@/components/marketplaces/tray/hooks/types";
import { toBR } from "@/components/marketplaces/tray/hooks/helpers";
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

  /* ============================================================
     CÉLULA EDITÁVEL
  ============================================================ */
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
      <td className="px-3 text-white text-center align-middle h-16 whitespace-nowrap">
        <div className="flex justify-center items-center gap-1 group h-full">
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

  /* ============================================================
     LOADER CENTRALIZADO
  ============================================================ */
  if (loading) {
    return (
      <tr>
        <td colSpan={15}>
          <div className="flex justify-center items-center h-28">
            <LoaderIcon className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        </td>
      </tr>
    );
  }

  /* ============================================================
     NENHUM RESULTADO
  ============================================================ */
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={15}>
          <div className="flex justify-center items-center h-40 text-neutral-400">
            Nenhum registro encontrado
          </div>
        </td>
      </tr>
    );
  }

  /* ============================================================
     RENDERIZAÇÃO DAS LINHAS
  ============================================================ */
  return (
    <>
      {rows.map((row, i) => (
        <tr
          key={`${row.Loja}-${row.ID}-${i}`}
          className="h-16 border-b border-neutral-700 hover:bg-white/10 transition-colors text-center"
        >
          {/* ID */}
          <td className="px-3 text-white">{row.ID}</td>

          {/* Loja */}
          <td className="px-3 text-neutral-300">{lojaLabel(row.Loja)}</td>

          {/* ID Tray */}
          <td className="px-3 text-neutral-300 break-words max-w-[120px]">
            <div className="flex flex-col items-center gap-1 group">
              <span>{row["ID Tray"] || "-"}</span>

              {row["ID Tray"] && (
                <button
                  onClick={() =>
                    handleCopy(String(row["ID Tray"]), `tray-${row.ID}`)
                  }
                  className="opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <CopyIcon
                    className={`w-3 h-3 ${
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
          <td className="px-3 text-neutral-300 break-words max-w-[140px]">
            {row.Marca}
          </td>

          {/* Referência */}
          <td className="px-3 text-neutral-300 break-all max-w-[150px]">
            <div className="flex flex-col items-center gap-1 group">
              <span>{row["Referência"] || "-"}</span>

              {row["Referência"] && (
                <button
                  onClick={() =>
                    handleCopy(String(row["Referência"]), `ref-${row.ID}`)
                  }
                  className="opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <CopyIcon
                    className={`w-3 h-3 ${
                      copiedId === `ref-${row.ID}`
                        ? "text-blue-500 scale-110"
                        : "text-white group-hover:text-blue-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </td>

          {/* CAMPOS EDITÁVEIS */}
          <CellEditable row={row} field="Desconto" suffix="%" />
          <CellEditable row={row} field="Embalagem" isMoney />
          <CellEditable row={row} field="Frete" isMoney />
          <CellEditable row={row} field="Comissão" suffix="%" />
          <CellEditable row={row} field="Imposto" suffix="%" />
          <CellEditable row={row} field="Margem de Lucro" suffix="%" />
          <CellEditable row={row} field="Marketing" suffix="%" />

          {/* Custo */}
          <td className="px-3 text-white">R$ {toBR(row.Custo)}</td>

          {/* Preço de Venda */}
          <td className="px-3 text-[#4ade80] font-semibold">
            <div className="flex justify-center gap-1 group">
              R$ {toBR(row["Preço de Venda"])}

              <button
                onClick={() =>
                  handleCopy(
                    String(toBR(row["Preço de Venda"])),
                    `preco-${row.ID}`
                  )
                }
                className="opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <CopyIcon
                  className={`w-3 h-3 ${
                    copiedId === `preco-${row.ID}`
                      ? "text-blue-500 scale-110"
                      : "text-white group-hover:text-blue-400"
                  }`}
                />
              </button>
            </div>
          </td>

          {/* AÇÕES */}
          <td className="px-3">
            <button
              onClick={() =>
                router.push(
                  `/dashboard/marketplaces/tray/details?id=${row.ID}&loja=${row.Loja}`
                )
              }
              className="text-white hover:text-[#1A8CEB] cursor-pointer"
            >
              <EditIcon
                className={`w-4 h-4 ${
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
