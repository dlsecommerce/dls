// 📄 src/components/anunciotable/helpers/exportFilteredToXlsx.ts
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

/**
 * Tipo que representa uma linha da tabela de anúncios
 */
export type AnuncioRow = {
  ["ID (Supabase)"]: string;
  ["ID Geral"]: string;
  ["ID Bling"]: string;
  ["Referência"]: string;
  ["ID Tray"]: string;
  ["ID Var"]: string;
  ["OD"]: string;
  ["Tipo Anúncio"]: string;
  ["Nome"]: string;
  ["Marca"]: string;
  ["Status"]: string;
  ["Categoria"]: string;
  ["Marketplace"]: string;
  ["Peso"]: number | string;
  ["Altura"]: number | string;
  ["Largura"]: number | string;
  ["Comprimento"]: number | string;
  ["Código 1"]: string;
  ["Quant. 1"]: number;
  ["Código 2"]: string;
  ["Quant. 2"]: number;
  ["Código 3"]: string;
  ["Quant. 3"]: number;
  ["Código 4"]: string;
  ["Quant. 4"]: number;
  ["Código 5"]: string;
  ["Quant. 5"]: number;
  ["Código 6"]: string;
  ["Quant. 6"]: number;
  ["Código 7"]: string;
  ["Quant. 7"]: number;
  ["Código 8"]: string;
  ["Quant. 8"]: number;
  ["Código 9"]: string;
  ["Quant. 9"]: number;
  ["Código 10"]: string;
  ["Quant. 10"]: number;
};

/**
 * Exporta dados filtrados da tabela de anúncios para XLSX.
 * 🔹 Mantém o estilo azul gradiente do cabeçalho.
 */
export async function exportFilteredToXlsx(rows: AnuncioRow[], filename: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  // Cabeçalhos organizados
  const header = [
    "ID (Supabase)",
    "ID Geral",
    "ID Bling",
    "Referência",
    "ID Tray",
    "ID Var",
    "OD",
    "Tipo Anúncio",
    "Nome",
    "Marca",
    "Status",
    "Categoria",
    "Marketplace",
    "Peso",
    "Altura",
    "Largura",
    "Comprimento",
    "Código 1",
    "Quant. 1",
    "Código 2",
    "Quant. 2",
    "Código 3",
    "Quant. 3",
    "Código 4",
    "Quant. 4",
    "Código 5",
    "Quant. 5",
    "Código 6",
    "Quant. 6",
    "Código 7",
    "Quant. 7",
    "Código 8",
    "Quant. 8",
    "Código 9",
    "Quant. 9",
    "Código 10",
    "Quant. 10",
  ];

  const normalized = rows.map((r) =>
    header.map((h) => r[h as keyof AnuncioRow] ?? "")
  );

  const gradientBlues = [
    "1A8CEB",
    "1877E0",
    "156AD4",
    "135FC8",
    "1154BC",
  ];

  // Gradiente de azul dinâmico por coluna
  const headerStyle = (col: number) => ({
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: gradientBlues[col % gradientBlues.length] },
    },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const },
  });

  const data = [header, ...normalized];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Aplica cores
  header.forEach((_, col) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[cellRef]) (ws as any)[cellRef].s = headerStyle(col);
  });

  ws["!cols"] = header.map(() => ({ wch: 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Anúncios");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const safeFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`;

  saveAs(blob, safeFilename);
}
