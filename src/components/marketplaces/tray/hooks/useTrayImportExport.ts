"use client";

import { useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      const data = dataToExport ?? rows;

      if (!data || data.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }

      // -----------------------------
      // Normaliza lojas e marcas
      // -----------------------------
      const lojasSelecionadas = Array.isArray(lojasFiltro)
        ? lojasFiltro
        : lojasFiltro
        ? [lojasFiltro]
        : [];

      const marcasSelecionadas = Array.isArray(marcasFiltro)
        ? marcasFiltro
        : marcasFiltro
        ? [marcasFiltro]
        : [];

      // -----------------------------
      // Siglas de loja (PK / SB)
      // -----------------------------
      const mapLojaSigla = (nomeLoja: string) => {
        const loja = String(nomeLoja || "").trim().toLowerCase();
        if (loja.includes("sobaquetas") || loja === "sb") return "SB";
        if (loja.includes("pikot") || loja === "pk") return "PK";

        // fallback
        return String(nomeLoja || "")
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase())
          .join("");
      };

      // -----------------------------
      // Siglas de marca (usa o texto “limpo”)
      // Ex: "VDR Relatório" -> "VDRRELATORIO" (ajustável)
      // -----------------------------
      const mapMarcaSigla = (marca: string) =>
        String(marca || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "")     // remove espaços
          .replace(/[^A-Z0-9-]/g, ""); // remove caracteres estranhos

      // monta lista do meio: LOJAS + MARCAS
      const partes: string[] = [];

      if (lojasSelecionadas.length) {
        partes.push(...lojasSelecionadas.map(mapLojaSigla));
      }

      if (marcasSelecionadas.length) {
        partes.push(...marcasSelecionadas.map(mapMarcaSigla));
      }

      // remove duplicados e vazios
      const middle = Array.from(new Set(partes)).filter(Boolean).join("-");

      const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });

      const fileName =
        middle.length > 0
          ? `PRECIFICAÇÃO TRAY - ${middle}-RELATÓRIO - ${stamp}.xlsx`
          : `PRECIFICAÇÃO TRAY - RELATÓRIO - ${stamp}.xlsx`;

      // -----------------------------
      // EXCEL WORKBOOK (seu código igual)
      // -----------------------------
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("PRECIFICAÇÃO");

      const colors = {
        azulEscuro: "1A8CEB",
        azulClaro: "D6E9FF",
        laranjaEscuro: "F59E0B",
        laranjaClaro: "FFE6B3",
        verdeEscuro: "22C55E",
        verdeClaro: "C7F5C4",
        branco: "FFFFFF",
      };

      const headers = [
        "ID",
        "Loja",
        "ID Bling",
        "Referência",
        "ID Tray",
        "ID Var",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Desconto",
        "Embalagem",
        "Frete",
        "Comissão",
        "Imposto",
        "Margem de Lucro",
        "Marketing",
        "",
        "Custo",
        "Preço de Venda",
      ];

      sheet.addRow([]);
      sheet.addRow(headers);
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 18 }));
      sheet.views = [{ state: "frozen", ySplit: 2 }];

      sheet.mergeCells("A1:G1");
      sheet.getCell("A1").value = "IDENTIFICAÇÃO";

      sheet.mergeCells("H1:J1");
      sheet.getCell("H1").value = "DESCRIÇÃO";

      sheet.mergeCells("K1:Q1");
      sheet.getCell("K1").value = "REGRAS DE PRECIFICAÇÃO";

      sheet.mergeCells("S1:T1");
      sheet.getCell("S1").value = "PREÇO";

      const styleTitle = (cell: ExcelJS.Cell, color: string) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      };

      styleTitle(sheet.getCell("A1"), colors.azulEscuro);
      styleTitle(sheet.getCell("H1"), colors.azulEscuro);
      styleTitle(sheet.getCell("K1"), colors.laranjaEscuro);
      styleTitle(sheet.getCell("S1"), colors.verdeEscuro);

      const row2 = sheet.getRow(2);
      row2.eachCell((cell, col) => {
        let fillColor = colors.azulClaro;
        if (col >= 11 && col <= 17) fillColor = colors.laranjaClaro;
        if (col >= 19) fillColor = colors.verdeClaro;
        if (col === 18) fillColor = colors.branco;

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };

        cell.font = { bold: true, color: { argb: "000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      sheet.getRow(1).eachCell((cell) => (cell.border = undefined));

      data.forEach((row) => {
        const line = [
          row.ID || "",
          row.Loja || "",
          row["ID Bling"] || "",
          row.Referência || "",
          row["ID Tray"] || "",
          row["ID Var"] || "",
          row.OD || "",
          row.Nome || "",
          row.Marca || "",
          row.Categoria || "",
          row.Desconto || 0,
          row.Embalagem || 2.5,
          row.Frete || 0,
          row.Comissão || 0,
          row.Imposto || 0,
          row["Margem de Lucro"] || 0,
          row.Marketing || 0,
          "",
          row.Custo || 0,
          null,
        ];

        const newRow = sheet.addRow(line);
        const rowNumber = newRow.number;

        newRow.eachCell((cell, col) => {
          if ([12, 13, 19].includes(col)) {
            cell.numFmt = '_("R$"* #,##0.00_)';
          }

          if ([11, 14, 15, 16, 17].includes(col)) {
            cell.numFmt = '0.00 " %"';
          }

          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        sheet.getCell(`T${rowNumber}`).value = {
          formula: `
            ROUND(
              (
                (S${rowNumber} * (1 - K${rowNumber}/100)) +
                M${rowNumber} +
                L${rowNumber}
              )
              /
              (
                1 - ((N${rowNumber} + O${rowNumber} + P${rowNumber} + Q${rowNumber})/100)
              )
            , 2)
          `.replace(/\s+/g, ""),
        };

        sheet.getCell(`T${rowNumber}`).numFmt = '_("R$"* #,##0.00_)';
      });

      sheet.getRow(1).height = 25;
      sheet.getRow(2).height = 22;

      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    },
    [rows, lojasFiltro, marcasFiltro]
  );

  return { handleExport };
}
