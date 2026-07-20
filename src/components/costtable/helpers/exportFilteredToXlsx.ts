// 📄 src/components/costtable/helpers/exportCodeRenamesToXlsx.ts

import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";
import type { CustoRow } from "./exportFilteredToXlsx";

function parseCostToNumber(
  value: number | string | null | undefined
): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let raw = String(value).trim();

  if (!raw) return 0;

  raw = raw.replace(/[^\d.,-]/g, "");

  if (raw.includes(".") && !raw.includes(",")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1];

    if (/^\d{3}$/.test(last)) {
      const parsed = Number.parseFloat(raw.replace(/\./g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (raw.includes(",") && !raw.includes(".")) {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (raw.includes(".") && raw.includes(",")) {
    const parsed = Number.parseFloat(
      raw.replace(/\./g, "").replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function exportCodeRenamesToXlsx(
  rows: CustoRow[],
  filename = "renomeacao-codigos-custos.xlsx"
) {
  if (!rows?.length) {
    throw new Error("Nenhum custo encontrado para exportar.");
  }

  const header = [
    "Código",
    "Novo Código",
    "Marca",
    "Produto",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

  const data = [
    header,
    ...rows.map((row) => [
      String(row["Código"] ?? ""),
      "", // Campo que será preenchido pelo usuário
      String(row["Marca"] ?? ""),
      String(row["Produto"] ?? ""),
      parseCostToNumber(row["Custo Atual"]),
      parseCostToNumber(row["Custo Antigo"]),
      String(row["NCM"] ?? ""),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  const headerStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: "1A8CEB" },
    },
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
    },
    alignment: {
      horizontal: "center",
      vertical: "center" as const,
    },
  };

  const editableCellStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: "FFF2CC" },
    },
    alignment: {
      horizontal: "left",
      vertical: "center" as const,
    },
    numFmt: "@",
  };

  const codeCellStyle = {
    alignment: {
      horizontal: "left",
      vertical: "center" as const,
    },
    numFmt: "@",
  };

  const moneyCellStyle = {
    numFmt: "#,##0.00",
    alignment: {
      horizontal: "right",
      vertical: "center" as const,
    },
  };

  header.forEach((_, column) => {
    const cellReference = XLSX.utils.encode_cell({
      r: 0,
      c: column,
    });

    const cell = worksheet[cellReference];

    if (cell) {
      cell.s = headerStyle;
    }
  });

  for (let row = 1; row <= rows.length; row++) {
    const codigoAtualReference = XLSX.utils.encode_cell({
      r: row,
      c: 0,
    });

    const novoCodigoReference = XLSX.utils.encode_cell({
      r: row,
      c: 1,
    });

    const custoAtualReference = XLSX.utils.encode_cell({
      r: row,
      c: 4,
    });

    const custoAntigoReference = XLSX.utils.encode_cell({
      r: row,
      c: 5,
    });

    if (worksheet[codigoAtualReference]) {
      worksheet[codigoAtualReference].s = codeCellStyle;
      worksheet[codigoAtualReference].t = "s";
    }

    if (worksheet[novoCodigoReference]) {
      worksheet[novoCodigoReference].s = editableCellStyle;
      worksheet[novoCodigoReference].t = "s";
    }

    if (worksheet[custoAtualReference]) {
      worksheet[custoAtualReference].s = moneyCellStyle;
    }

    if (worksheet[custoAntigoReference]) {
      worksheet[custoAntigoReference].s = moneyCellStyle;
    }
  }

  worksheet["!cols"] = [
    { wch: 20 }, // Código
    { wch: 20 }, // Novo Código
    { wch: 20 }, // Marca
    { wch: 42 }, // Produto
    { wch: 14 }, // Custo Atual
    { wch: 14 }, // Custo Antigo
    { wch: 14 }, // NCM
  ];

  worksheet["!autofilter"] = {
    ref: `A1:G${rows.length + 1}`,
  };

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Renomeacao"
  );

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`;

  saveAs(blob, safeFilename);

  await createNotification({
    title: "Planilha de renomeação exportada",
    message: `A planilha foi exportada com ${rows.length} custo(s). Preencha apenas a coluna "Novo Código".`,
    action: "status",
    entityType: "cost_code_rename_export",
    link: "/dashboard/custos",
  });
}