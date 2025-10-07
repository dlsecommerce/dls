// 📄 src/components/costtable/helpers/exportFilteredToXlsx.ts
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

/**
 * Tipo que representa uma linha da tabela de custos
 */
export type CustoRow = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Custo Atual"]: number | string;
  ["Custo Antigo"]: number | string;
  ["NCM"]: string;
};

/**
 * Exporta os dados filtrados da tabela de custos em formato XLSX.
 * ⚙️ Otimizado para grandes volumes de dados:
 * - Divide a geração em partes (para não travar a UI)
 * - Cabeçalho azul estilizado (#1A8CEB)
 * - Gera e baixa automaticamente o arquivo XLSX
 */
export async function exportFilteredToXlsx(rows: CustoRow[], filename: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  // 🧱 Cabeçalhos fixos
  const header = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

  // 🔄 Normaliza os dados
  const normalized = rows.map((r) => ({
    "Código": r["Código"] ?? "",
    "Marca": r["Marca"] ?? "",
    "Custo Atual": Number(r["Custo Atual"] ?? 0),
    "Custo Antigo": Number(r["Custo Antigo"] ?? 0),
    "NCM": r["NCM"] ?? "",
  }));

  // ⚙️ Cabeçalho estilizado
  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const },
  };

  // 🔹 Função auxiliar para gerar planilha sem travar a UI
  const generateSheetAsync = (): Promise<Blob> =>
    new Promise((resolve) => {
      setTimeout(() => {
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

        // Aplica estilo no cabeçalho
        header.forEach((_, col) => {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
          if ((ws as any)[cellRef]) (ws as any)[cellRef].s = headerStyle;
        });

        // Define largura das colunas
        (ws as any)["!cols"] = [
          { wch: 16 },
          { wch: 20 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio");

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        resolve(blob);
      }, 50); // ⏳ dá tempo do navegador respirar (UI não trava)
    });

  // 🧾 Gera e baixa o arquivo
  const blob = await generateSheetAsync();
  const safeFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  saveAs(blob, safeFilename);
}
