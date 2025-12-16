"use client";

import { useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string | string[],
  categoriaFiltro?: string
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      const data = dataToExport ?? rows;

      if (!data || data.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }

      // ---------------------------------------------------------
      // 🔥 NORMALIZA LISTA DE LOJAS
      // ---------------------------------------------------------
      const lojasSelecionadas = Array.isArray(lojasFiltro)
        ? lojasFiltro
        : lojasFiltro
        ? [lojasFiltro]
        : [];

      // ---------------------------------------------------------
      // 🔥 MAPEAMENTO OFICIAL DAS SIGLAS
      // ---------------------------------------------------------
      const mapSigla = (nomeLoja: string) => {
        const loja = nomeLoja.toLowerCase();

        if (loja.includes("sobaquetas") || loja === "sb") return "SB";
        if (loja.includes("pikot") || loja === "pk") return "PK";

        // fallback — primeira letra de cada palavra
        return nomeLoja
          .split(" ")
          .map((w) => w[0]?.toUpperCase())
          .join("");
      };

      // ---------------------------------------------------------
      // 🔥 SE TIVER MAIS DE UMA LOJA, JUNTA ASSIM: PK_SB
      // ---------------------------------------------------------
      let siglaLoja = "";

      if (lojasSelecionadas.length === 1) {
        siglaLoja = mapSigla(lojasSelecionadas[0]);
      } else if (lojasSelecionadas.length > 1) {
        siglaLoja = lojasSelecionadas.map(mapSigla).join("_");
      }

      const categoriaPart = categoriaFiltro
        ? " - " + categoriaFiltro.toUpperCase().replace(/\s+/g, "")
        : "";

      const prefixo = siglaLoja ? ` - ${siglaLoja}${categoriaPart}` : "";

      // ---------------------------------------------------------
      // 🔥 NOME FINAL DO ARQUIVO
      // ---------------------------------------------------------
      const fileName = `PRECIFICAÇÃO${prefixo} - TRAY - ${format(
        new Date(),
        "dd-MM-yyyy HH'h'mm",
        { locale: ptBR }
      )}.xlsx`;

      // ---------------------------------------------------------
      // EXCEL WORKBOOK
      // ---------------------------------------------------------
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

      // ---------------------------------------------------------
      // INSERÇÃO DOS DADOS
      // ---------------------------------------------------------
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
      saveAs(new Blob([buffer]), fileName);
    },

    [rows, lojasFiltro, categoriaFiltro]
  );

  return { handleExport };
}
