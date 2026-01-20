"use client";

import { useCallback } from "react";
import type ExcelJSType from "exceljs"; // ✅ só tipo (não quebra bundler)
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      // ✅ AJUSTE MÍNIMO PRA FUNCIONAR NO NEXT:
      // carregar ExcelJS e file-saver só quando clicar em Exportar
      const excelJSImport = await import("exceljs");
      const ExcelJS: typeof ExcelJSType =
        ((excelJSImport as any).default ?? (excelJSImport as any)) as any;

      const fileSaverImport = await import("file-saver");
      const saveAs: any =
        (fileSaverImport as any).saveAs ??
        (fileSaverImport as any).default ??
        fileSaverImport;

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
      // Siglas de marca
      // -----------------------------
      const mapMarcaSigla = (marca: string) =>
        String(marca || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/[^A-Z0-9-]/g, "");

      const partes: string[] = [];

      if (lojasSelecionadas.length) {
        partes.push(...lojasSelecionadas.map(mapLojaSigla));
      }

      if (marcasSelecionadas.length) {
        partes.push(...marcasSelecionadas.map(mapMarcaSigla));
      }

      const middle = Array.from(new Set(partes)).filter(Boolean).join("-");

      const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });

      // ✅ Nome correto: SHOPEE
      const fileName =
        middle.length > 0
          ? `PRECIFICAÇÃO SHOPEE - ${middle}-RELATÓRIO - ${stamp}.xlsx`
          : `PRECIFICAÇÃO SHOPEE - RELATÓRIO - ${stamp}.xlsx`;

      // -----------------------------
      // EXCEL WORKBOOK
      // -----------------------------
      const workbook = new ExcelJS.Workbook();

      // ✅ força o Excel a recalcular as fórmulas ao abrir o arquivo
      workbook.calcProperties.fullCalcOnLoad = true;

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

      const styleTitle = (cell: ExcelJSType.Cell, color: string) => {
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

      // -----------------------------
      // Helper parse number (inclui string)
      // -----------------------------
      const parseNum = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;

        // aceita "12,34" ou "12.34"
        const s = String(v).trim().replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

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
          row.Desconto ?? 0, // K
          row.Embalagem ?? 2.5, // L
          row.Frete ?? 0, // M
          row.Comissão ?? 0, // N
          row.Imposto ?? 0, // O
          row["Margem de Lucro"] ?? 0, // P
          row.Marketing ?? 0, // Q
          "", // R
          row.Custo ?? 0, // S
          null, // T
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

        // ✅ valor inicial vindo do Supabase (se existir)
        const precoVendaDB = parseNum(row["Preço de Venda"]);

        // ✅ Fórmula SEMPRE (pra recalcular ao editar)
        const formulaInvariant = `
          ROUND(
            IF(
              (S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+M${rowNumber})>500,
              (S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+100)/
                (1-((O${rowNumber}+P${rowNumber}+Q${rowNumber})/100)),
              (S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+M${rowNumber})/
                (1-((N${rowNumber}+O${rowNumber}+P${rowNumber}+Q${rowNumber})/100))
            ),
            2
          )
        `.replace(/\s+/g, "");

        sheet.getCell(`T${rowNumber}`).value = {
          formula: formulaInvariant,
          ...(precoVendaDB !== null ? { result: precoVendaDB } : {}),
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
