// 📄 src/components/costtable/helpers/exportFilteredToXlsx.ts

import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";

export type CustoRow = {
  Código?: string | number | null;
  Marca?: string | null;
  Produto?: string | null;
  "Custo Atual"?: string | number | null;
  "Custo Antigo"?: string | number | null;
  NCM?: string | number | null;
  [key: string]: unknown;
};

function parseCostToNumber(
  value: number | string | null | undefined
): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let raw = String(value).trim();

  if (!raw) return 0;

  raw = raw
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");

  if (!raw) return 0;

  /*
   * Formato brasileiro:
   * 1.234,56
   */
  if (raw.includes(".") && raw.includes(",")) {
    const parsed = Number.parseFloat(
      raw.replace(/\./g, "").replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : 0;
  }

  /*
   * Formato com vírgula decimal:
   * 1234,56
   */
  if (raw.includes(",") && !raw.includes(".")) {
    const parsed = Number.parseFloat(
      raw.replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : 0;
  }

  /*
   * Formato com ponto.
   *
   * 1234.56 = decimal
   * 1.234 = milhar
   */
  if (raw.includes(".") && !raw.includes(",")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1];

    if (/^\d{3}$/.test(last)) {
      const parsed = Number.parseFloat(
        raw.replace(/\./g, "")
      );

      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(
  value: unknown
): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\u00a0/g, " ")
    .trim();
}

function ensureXlsxExtension(
  filename: string
): string {
  const normalized = String(
    filename || "custos.xlsx"
  ).trim();

  if (
    normalized
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return normalized;
  }

  return `${normalized}.xlsx`;
}

export async function exportFilteredToXlsx(
  rows: CustoRow[],
  filename = "custos.xlsx"
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "Nenhum custo encontrado para exportar."
    );
  }

  const header = [
    "Código",
    "Marca",
    "Produto",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

  const data = [
    header,

    ...rows.map((row) => [
      normalizeText(row["Código"]),
      normalizeText(row["Marca"]),
      normalizeText(row["Produto"]),
      parseCostToNumber(row["Custo Atual"]),
      parseCostToNumber(row["Custo Antigo"]),
      normalizeText(row["NCM"]),
    ]),
  ];

  const worksheet =
    XLSX.utils.aoa_to_sheet(data);

  const headerStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: {
        rgb: "1A8CEB",
      },
    },

    font: {
      bold: true,
      color: {
        rgb: "FFFFFF",
      },
    },

    alignment: {
      horizontal: "center",
      vertical: "center" as const,
    },

    border: {
      top: {
        style: "thin",
        color: {
          rgb: "D9EAF7",
        },
      },

      bottom: {
        style: "thin",
        color: {
          rgb: "D9EAF7",
        },
      },

      left: {
        style: "thin",
        color: {
          rgb: "D9EAF7",
        },
      },

      right: {
        style: "thin",
        color: {
          rgb: "D9EAF7",
        },
      },
    },
  };

  const textCellStyle = {
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

  /*
   * Aplica estilo ao cabeçalho.
   */
  header.forEach((_, column) => {
    const cellReference =
      XLSX.utils.encode_cell({
        r: 0,
        c: column,
      });

    const cell =
      worksheet[cellReference];

    if (cell) {
      cell.s = headerStyle;
    }
  });

  /*
   * Aplica formatos às linhas de dados.
   */
  for (
    let rowIndex = 1;
    rowIndex <= rows.length;
    rowIndex++
  ) {
    const codigoReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 0,
      });

    const marcaReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 1,
      });

    const produtoReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 2,
      });

    const custoAtualReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 3,
      });

    const custoAntigoReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 4,
      });

    const ncmReference =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: 5,
      });

    if (worksheet[codigoReference]) {
      worksheet[codigoReference].s =
        textCellStyle;

      worksheet[codigoReference].t =
        "s";

      worksheet[codigoReference].z =
        "@";
    }

    if (worksheet[marcaReference]) {
      worksheet[marcaReference].s =
        textCellStyle;
    }

    if (worksheet[produtoReference]) {
      worksheet[produtoReference].s =
        textCellStyle;
    }

    if (
      worksheet[custoAtualReference]
    ) {
      worksheet[
        custoAtualReference
      ].s = moneyCellStyle;

      worksheet[
        custoAtualReference
      ].t = "n";
    }

    if (
      worksheet[custoAntigoReference]
    ) {
      worksheet[
        custoAntigoReference
      ].s = moneyCellStyle;

      worksheet[
        custoAntigoReference
      ].t = "n";
    }

    if (worksheet[ncmReference]) {
      worksheet[ncmReference].s =
        textCellStyle;

      worksheet[ncmReference].t =
        "s";

      worksheet[ncmReference].z =
        "@";
    }
  }

  /*
   * Largura das colunas.
   */
  worksheet["!cols"] = [
    {
      wch: 22,
    },
    {
      wch: 20,
    },
    {
      wch: 42,
    },
    {
      wch: 16,
    },
    {
      wch: 16,
    },
    {
      wch: 14,
    },
  ];

  /*
   * Altura do cabeçalho.
   */
  worksheet["!rows"] = [
    {
      hpt: 24,
    },
  ];

  /*
   * Filtro automático.
   */
  worksheet["!autofilter"] = {
    ref: `A1:F${rows.length + 1}`,
  };

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Custos"
  );

  const buffer = XLSX.write(
    workbook,
    {
      bookType: "xlsx",
      type: "array",
    }
  );

  const blob = new Blob(
    [buffer],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  const safeFilename =
    ensureXlsxExtension(filename);

  saveAs(
    blob,
    safeFilename
  );

  /*
   * A falha na notificação não deve impedir
   * a exportação da planilha.
   */
  try {
    await createNotification({
      title:
        "Planilha de custos exportada",

      message:
        `A planilha foi exportada com ${rows.length} custo(s).`,

      action:
        "status",

      entityType:
        "cost_export",

      link:
        "/dashboard/custos",
    });
  } catch (error) {
    console.error(
      "Erro ao criar notificação da exportação:",
      error
    );
  }
}

export default exportFilteredToXlsx;