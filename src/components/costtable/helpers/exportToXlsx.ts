import * as XLSX from "xlsx-js-style";

export type CustoRow = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Custo Atual"]: number | string;
  ["Custo Antigo"]: number | string;
  ["NCM"]: string;
};

/**
 * Exporta os dados filtrados da tabela de custos em formato XLSX estilizado.
 * - Cabeçalho azul #1A8CEB com texto branco e centralizado.
 * - Colunas: Código, Marca, Custo Atual, Custo Antigo, NCM.
 * - Gera automaticamente arquivo .xlsx.
 */
export function exportFilteredToXlsx(rows: CustoRow[], filename: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  const header = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

  // Normaliza e organiza os dados
  const normalized = rows.map((r) => ({
    "Código": r["Código"] ?? "",
    "Marca": r["Marca"] ?? "",
    "Custo Atual": Number(r["Custo Atual"] ?? 0),
    "Custo Antigo": Number(r["Custo Antigo"] ?? 0),
    "NCM": r["NCM"] ?? "",
  }));

  // Matriz: [header, ...dados]
  const data = [
    header,
    ...normalized.map((o) => [
      o["Código"],
      o["Marca"],
      o["Custo Atual"],
      o["Custo Antigo"],
      o["NCM"],
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // ===== Estilo do cabeçalho (linha 1) =====
  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const },
  };

  header.forEach((_, col) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[cellRef]) (ws as any)[cellRef].s = headerStyle;
  });

  // ===== Largura das colunas =====
  (ws as any)["!cols"] = [
    { wch: 16 }, // Código
    { wch: 20 }, // Marca
    { wch: 14 }, // Custo Atual
    { wch: 14 }, // Custo Antigo
    { wch: 14 }, // NCM
  ];

  // Cria o workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatorio");

  // Gera e salva o arquivo
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
