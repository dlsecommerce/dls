"use client";

import { useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(rows: any[]) {
  const handleExport = useCallback(async () => {
    if (!rows || rows.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const fileName = `PRECIFICAÇÃO - TRAY - ${format(
      new Date(),
      "dd-MM-yyyy HH'h'mm",
      { locale: ptBR }
    )}.xlsx`;

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

    // ✅ Cabeçalhos com nova ordem nas regras
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

    // 🧱 Mesclagem de blocos
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

    // Linha 2 (cabeçalhos)
    const row2 = sheet.getRow(2);
    row2.eachCell((cell, col) => {
      let fillColor = colors.azulClaro;
      if (col >= 11 && col <= 17) fillColor = colors.laranjaClaro;
      if (col >= 19) fillColor = colors.verdeClaro;
      if (col === 18) fillColor = colors.branco;

      cell.fill = fillColor
        ? {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
          }
        : undefined;

      cell.font = { bold: true, color: { argb: "000000" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = undefined; // 🔹 remove bordas da linha 2
    });

    // 🔹 Remove bordas também da linha 1
    sheet.getRow(1).eachCell((cell) => (cell.border = undefined));

    // 📊 Inserção de dados
    rows.forEach((row) => {
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
        row.Embalagem || 0,
        row.Frete || 0,
        row.Comissão || 0,
        row.Imposto || 0,
        row["Margem de Lucro"] || 0,
        row.Marketing || 0,
        "",
        row.Custo || 0,
        row["Preço de Venda"] || 0,
      ];

      const newRow = sheet.addRow(line);

      newRow.eachCell((cell, col) => {
        // 💰 Moedas — R$
        if ([12, 13, 19, 20].includes(col)) {
          cell.numFmt =
            '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"??_);_(@_)';
        }

        // 📈 Percentuais — sempre 0,00%
        if ([11, 14, 15, 16, 17].includes(col)) {
          let val = Number(cell.value);
          if (isNaN(val)) val = 0;
          cell.value = val;
          cell.numFmt = '0.00"%"'; // ✅ sempre duas casas, inclusive para 0 ou vazio
        }

        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  }, [rows]);

  return { handleExport };
}
