"use client";

import React from "react";
import { Row } from "@/components/marketplaces/hooks/types";
import { toBR } from "@/components/marketplaces/hooks/helpers";
import {
  Edit as EditIcon,
  Copy as CopyIcon,
  Loader as LoaderIcon,
} from "lucide-react";

type Props = {
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

export const TableRows: React.FC<Props> = ({
  rows,
  loading,
  copiedId,
  editedId,
  handleCopy,
  openEditor,
  handleEditFull,
}) => {
  const lojaLabel = (loja: string) =>
    loja === "PK" ? "Pikot Shop" : loja === "SB" ? "Sóbaquetas" : loja;

  // 🔧 Célula editável
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

  // ⏳ Loader
  if (loading) {
    return (
      <tr className="h-16">
        <td colSpan={15} className="text-center text-neutral-400 py-6 align-middle">
          <div className="flex items-center justify-center gap-2">
            <LoaderIcon className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        </td>
      </tr>
    );
  }

  // 🔍 Nenhum registro
  if (rows.length === 0) {
    return (
      <tr className="h-16">
        <td colSpan={15} className="text-center text-neutral-400 py-6 align-middle">
          Nenhum registro encontrado
        </td>
      </tr>
    );
  }

  // 🧾 Linhas reais (sem fantasmas)
  return (
    <>
      {rows.map((row, i) => (
        <tr
          key={`${row.Loja}-${row.ID}-${i}`}
          className="h-16 border-b border-neutral-700 hover:bg-white/10 transition-colors text-center align-middle"
        >
          {/* ID e LOJA */}
          <td className="px-3 text-white align-middle h-16">{row.ID}</td>
          <td className="px-3 text-neutral-300 align-middle h-16">
            {lojaLabel(row.Loja)}
          </td>

          {/* ID Tray */}
          <td className="px-3 text-neutral-300 align-middle h-16">
            <div className="flex justify-center items-center gap-1 group leading-none h-full">
              {row["ID Tray"] || "-"}
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
          <td className="px-3 text-neutral-300 align-middle h-16 whitespace-nowrap">
            {row.Marca}
          </td>

          {/* Referência */}
          <td className="px-3 text-neutral-300 align-middle h-16 whitespace-nowrap">
            <div className="flex justify-center items-center gap-1 group leading-none h-full">
              {row["Referência"] || "-"}
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

          {/* Preço de venda */}
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
              onClick={() => handleEditFull(row)}
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
