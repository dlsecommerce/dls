// 📄 src/components/costtable/helpers/exportFilteredToXlsx.ts
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";

/**
 * Tipo que representa uma linha da tabela de custos
 */
export type CustoRow = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Produto"]?: string;
  ["Custo Atual"]: number | string;
  ["Custo Antigo"]: number | string;
  ["NCM"]: string;
};

/**
 * Converte valores que podem vir como:
 * - number: 2500
 * - "2500"
 * - "2.500"
 * - "2.500,00"
 * - "2500,00"
 * - "126.97" (excel/US)
 * em number (ex: 2500).
 */
function parseCostToNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let raw = String(value).trim();
  if (!raw) return 0;

  raw = raw.replace(/[^\d.,-]/g, "");

  if (raw.includes(".") && !raw.includes(",")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1];

    if (/^\d{3}$/.test(last)) {
      const n = parseFloat(raw.replace(/\./g, ""));
      return Number.isFinite(n) ? n : 0;
    }

    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  if (raw.includes(",") && !raw.includes(".")) {
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  if (raw.includes(".") && raw.includes(",")) {
    const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Exporta os dados filtrados da tabela de custos em formato XLSX.
 * ⚙️ Otimizado para grandes volumes de dados:
 * - Divide a geração em partes para não travar a UI
 * - Cabeçalho azul estilizado (#1A8CEB)
 * - Mantém custos como NÚMERO no Excel
 * - Gera e baixa automaticamente o arquivo XLSX
 * - Cria notificação informativa após o download ser iniciado
 */
export async function exportFilteredToXlsx(rows: CustoRow[], filename: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  const header = [
    "Código",
    "Marca",
    "Produto",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

  const normalized = rows.map((r) => ({
    "Código": r["Código"] ?? "",
    "Marca": r["Marca"] ?? "",
    "Produto": r["Produto"] ?? "",
    "Custo Atual": parseCostToNumber(r["Custo Atual"]),
    "Custo Antigo": parseCostToNumber(r["Custo Antigo"]),
    "NCM": r["NCM"] ?? "",
  }));

  const headerStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: "1A8CEB" },
    },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const },
  };

  const moneyCellStyle = {
    numFmt: "#,##0.00",
    alignment: { horizontal: "right", vertical: "center" as const },
  };

  const generateSheetAsync = (): Promise<Blob> =>
    new Promise((resolve) => {
      setTimeout(() => {
        const data = [
          header,
          ...normalized.map((o) => [
            o["Código"],
            o["Marca"],
            o["Produto"],
            o["Custo Atual"],
            o["Custo Antigo"],
            o["NCM"],
          ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);

        header.forEach((_, col) => {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
          if ((ws as any)[cellRef]) {
            (ws as any)[cellRef].s = headerStyle;
          }
        });

        for (let r = 1; r <= normalized.length; r++) {
          const cAtualRef = XLSX.utils.encode_cell({ r, c: 3 });
          if ((ws as any)[cAtualRef]) {
            (ws as any)[cAtualRef].s = moneyCellStyle;
          }

          const cAntigoRef = XLSX.utils.encode_cell({ r, c: 4 });
          if ((ws as any)[cAntigoRef]) {
            (ws as any)[cAntigoRef].s = moneyCellStyle;
          }
        }

        (ws as any)["!cols"] = [
          { wch: 16 },
          { wch: 20 },
          { wch: 34 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio");

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([buffer], {
          type: "application/octet-stream",
        });

        resolve(blob);
      }, 50);
    });

  const blob = await generateSheetAsync();
  const safeFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`;

  saveAs(blob, safeFilename);

  await createNotification({
    title: "Relatório de custos exportado",
    message: `O relatório "${safeFilename}" foi exportado com ${rows.length} custo(s).`,
    action: "status",
    entityType: "cost_export",
    link: "/dashboard/custos",
  });
}