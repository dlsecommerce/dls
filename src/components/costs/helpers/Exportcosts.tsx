// ExportCosts.tsx
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

function ensureXlsxExtension(filename: string): string {
  const normalized = String(filename || "custos.xlsx").trim();
  if (normalized.toLowerCase().endsWith(".xlsx")) return normalized;
  return `${normalized}.xlsx`;
}

export type ExportProgressCallback = (percent: number) => void;

const CHUNK_SIZE = 500;

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Gera e faz download do XLSX de custos processando em lotes,
 * liberando a thread principal entre cada lote para não travar a UI.
 * Não depende de Web Worker (evita problemas de bundling no Next.js).
 * Reporta progresso (0-100) via callback, se fornecido.
 */
export async function exportFilteredToXlsx(
  rows: CustoRow[],
  filename = "custos.xlsx",
  onProgress?: ExportProgressCallback
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Nenhum custo encontrado para exportar.");
  }

  const XLSX = await import("xlsx-js-style");

  const headers = [
    "Código",
    "Marca",
    "Produto",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const totalRows = rows.length;
  const data: any[][] = [headers];

  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      data.push([
        String(row["Código"] ?? ""),
        String(row["Marca"] ?? ""),
        String(row["Produto"] ?? ""),
        row["Custo Atual"] ?? "",
        row["Custo Antigo"] ?? "",
        String(row["NCM"] ?? ""),
      ]);
    }

    const percent = Math.round(((i + chunk.length) / totalRows) * 80);
    onProgress?.(percent);

    // Libera a thread para o navegador renderizar (não trava a UI)
    await yieldToUI();
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  headers.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle;
  });

  onProgress?.(85);
  await yieldToUI();

  for (let row = 1; row <= totalRows; row++) {
    const codigoRef = XLSX.utils.encode_cell({ r: row, c: 0 });

    if ((ws as any)[codigoRef]) {
      (ws as any)[codigoRef].t = "s";
      (ws as any)[codigoRef].z = "@";
    }

    if (row % CHUNK_SIZE === 0) {
      onProgress?.(85 + Math.round((row / totalRows) * 10));
      await yieldToUI();
    }
  }

  (ws as any)["!cols"] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 38 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
  ];

  (ws as any)["!autofilter"] = { ref: `A1:F${totalRows + 1}` };

  onProgress?.(96);
  await yieldToUI();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Custos");

  onProgress?.(98);
  await yieldToUI();

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeFilename = ensureXlsxExtension(filename);

  onProgress?.(100);
  saveAs(blob, safeFilename);

  try {
    await createNotification({
      title: "Planilha de custos exportada",
      message: `A planilha foi exportada com ${rows.length} custo(s).`,
      action: "status",
      entityType: "cost_export",
      link: "/dashboard/custos",
    });
  } catch (error) {
    console.error("Erro ao criar notificação da exportação:", error);
  }
}

export default exportFilteredToXlsx;
