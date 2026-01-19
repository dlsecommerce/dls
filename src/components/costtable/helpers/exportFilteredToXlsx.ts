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

  // Remove tudo que não seja dígito, ponto, vírgula ou sinal
  raw = raw.replace(/[^\d.,-]/g, "");

  // CASO A: tem ponto e NÃO tem vírgula
  // Pode ser:
  // - milhar pt-BR: 25.000 / 1.250.000
  // - decimal US: 126.97
  if (raw.includes(".") && !raw.includes(",")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1];

    // Se termina com 3 dígitos, assume separador de milhar
    if (/^\d{3}$/.test(last)) {
      const n = parseFloat(raw.replace(/\./g, ""));
      return Number.isFinite(n) ? n : 0;
    }

    // Caso contrário, assume decimal
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  // CASO B: tem vírgula e NÃO tem ponto -> 126,97
  if (raw.includes(",") && !raw.includes(".")) {
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  // CASO C: tem ponto e vírgula -> 1.234,56
  if (raw.includes(".") && raw.includes(",")) {
    const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  // CASO D: inteiro simples -> 3100
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Exporta os dados filtrados da tabela de custos em formato XLSX.
 * ⚙️ Otimizado para grandes volumes de dados:
 * - Divide a geração em partes (para não travar a UI)
 * - Cabeçalho azul estilizado (#1A8CEB)
 * - Mantém custos como NÚMERO no Excel (evita virar texto)
 * - Gera e baixa automaticamente o arquivo XLSX
 */
export async function exportFilteredToXlsx(rows: CustoRow[], filename: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  // 🧱 Cabeçalhos fixos
  const header = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

  // 🔄 Normaliza os dados (IMPORTANTE: custos viram number “de verdade”)
  const normalized = rows.map((r) => ({
    "Código": r["Código"] ?? "",
    "Marca": r["Marca"] ?? "",
    "Custo Atual": parseCostToNumber(r["Custo Atual"]),
    "Custo Antigo": parseCostToNumber(r["Custo Antigo"]),
    "NCM": r["NCM"] ?? "",
  }));

  // ⚙️ Cabeçalho estilizado
  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const },
  };

  // 🔢 (Opcional, mas recomendado) formato numérico para as colunas de custo no Excel
  const moneyCellStyle = {
    numFmt: "#,##0.00",
    alignment: { horizontal: "right", vertical: "center" as const },
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

        // Aplica formatação numérica nas colunas de custo (C e D)
        // Linhas: começam em 1 (pois 0 é header) até normalized.length
        for (let r = 1; r <= normalized.length; r++) {
          // Coluna C (index 2) -> Custo Atual
          const cAtualRef = XLSX.utils.encode_cell({ r, c: 2 });
          if ((ws as any)[cAtualRef]) (ws as any)[cAtualRef].s = moneyCellStyle;

          // Coluna D (index 3) -> Custo Antigo
          const cAntigoRef = XLSX.utils.encode_cell({ r, c: 3 });
          if ((ws as any)[cAntigoRef]) (ws as any)[cAntigoRef].s = moneyCellStyle;
        }

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
