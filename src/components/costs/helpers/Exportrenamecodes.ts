// ExportRenameCodes.ts
import { saveAs } from "file-saver";

export type RenameExportRow = {
  Código?: string | number | null;
  Marca?: string | null;
  Produto?: string | null;
  "Custo Atual"?: string | number | null;
  "Custo Antigo"?: string | number | null;
  NCM?: string | number | null;
  [key: string]: unknown;
};

function ensureXlsxExtension(filename: string): string {
  const normalized = String(filename || "renomeacao.xlsx").trim();
  if (normalized.toLowerCase().endsWith(".xlsx")) return normalized;
  return `${normalized}.xlsx`;
}

export type ExportProgressCallback = (percent: number) => void;

const CHUNK_SIZE = 500;

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Gera e faz download da planilha de renomeação de códigos processando em
 * lotes (chunks), liberando a thread principal entre cada lote para não
 * travar a UI. Não depende de Web Worker (evita problemas de bundling).
 */
export async function exportRenameCodesToXlsx(
  rows: RenameExportRow[],
  filename = "renomeacao.xlsx",
  onProgress?: ExportProgressCallback
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Nenhum custo encontrado para exportar.");
  }

  const XLSX = await import("xlsx-js-style");

  const headers = [
    "Código",
    "Novo Código",
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

  const newCodeStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "FFF2CC" } },
    numFmt: "@",
    alignment: { horizontal: "left", vertical: "center" },
  };

  const totalRows = rows.length;
  const data: any[][] = [headers];

  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      data.push([
        String(row["Código"] ?? ""),
        "",
        String(row["Marca"] ?? ""),
        String(row["Produto"] ?? ""),
        row["Custo Atual"] ?? "",
        row["Custo Antigo"] ?? "",
        String(row["NCM"] ?? ""),
      ]);
    }

    const percent = Math.round(((i + chunk.length) / totalRows) * 70);
    onProgress?.(percent);

    // Libera a thread para o navegador renderizar (não trava a UI)
    await yieldToUI();
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  headers.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle;
  });

  onProgress?.(75);
  await yieldToUI();

  for (let row = 1; row <= totalRows; row++) {
    const codigoRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    const novoRef = XLSX.utils.encode_cell({ r: row, c: 1 });

    if ((ws as any)[codigoRef]) {
      (ws as any)[codigoRef].t = "s";
      (ws as any)[codigoRef].z = "@";
    }

    if (!(ws as any)[novoRef]) {
      (ws as any)[novoRef] = { t: "s", v: "" };
    }

    (ws as any)[novoRef].s = newCodeStyle;

    if (row % CHUNK_SIZE === 0) {
      onProgress?.(75 + Math.round((row / totalRows) * 15));
      await yieldToUI();
    }
  }

  (ws as any)["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 38 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
  ];

  (ws as any)["!autofilter"] = { ref: `A1:G${totalRows + 1}` };

  onProgress?.(92);
  await yieldToUI();

  const instructions = XLSX.utils.aoa_to_sheet([
    ["RENOMEAÇÃO DE CÓDIGOS EM MASSA"],
    [],
    ["1. Não altere a coluna Código."],
    ['2. Preencha somente a coluna "Novo Código" nas linhas desejadas.'],
    ["3. Linhas sem Novo Código serão ignoradas."],
    ["4. A importação atualizará custos e Código 1 até Código 10 em Pikot shop e Sóbaquetas."],
    ["5. Quantidades, IDs, nomes, referências e percentuais serão preservados."],
  ]);

  (instructions as any)["!cols"] = [{ wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Renomeação");
  XLSX.utils.book_append_sheet(wb, instructions, "Instruções");

  onProgress?.(97);
  await yieldToUI();

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  onProgress?.(100);
  saveAs(blob, ensureXlsxExtension(filename));
}

export default exportRenameCodesToXlsx;
