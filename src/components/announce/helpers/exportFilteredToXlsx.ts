// 📄 src/components/anunciotable/helpers/exportFilteredToXlsx.ts
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { RowShape } from "./importFromXlsxOrCsv";

export async function exportFilteredToXlsx(rows: RowShape[], filename?: string) {
  if (!rows || rows.length === 0) {
    alert("Nenhum dado encontrado para exportar.");
    return;
  }

  // 🕒 Nome dinâmico com data e hora
  const agora = new Date();
  const dataHora = agora
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/[/:]/g, "-")
    .replace(", ", "_");

  const safeFilename =
    filename && filename.trim().length > 0
      ? (filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
      : `ANÚNCIOS - RELATÓRIO - ${dataHora}.xlsx`;

  // ==============================
  // ESTRUTURA DE COLUNAS
  // ==============================
  const identificacao = ["ID", "Loja", "ID Bling", "ID Tray", "Referência", "ID Var", "OD"];
  const descricao = ["Nome", "Marca", "Categoria", "Peso", "Altura", "Largura", "Comprimento"];
  const composicao: string[] = [];
  for (let i = 1; i <= 10; i++) composicao.push(`Código ${i}`, `Quantidade ${i}`);
  const header = [...identificacao, ...descricao, ...composicao];

  // ==============================
  // NORMALIZAÇÃO DE DADOS
  // ==============================
  const normalized = rows.map((r) => {
    const rowObj: Record<string, any> = {};
    header.forEach((h) => {
      const keyMatch = Object.keys(r).find(
        (k) => k.trim().toLowerCase() === h.trim().toLowerCase()
      );
      rowObj[h] = keyMatch ? (r as any)[keyMatch] ?? "" : "";
    });
    return header.map((h) => rowObj[h]);
  });

  // ==============================
  // ESTILO E CABEÇALHO
  // ==============================
  const blues = ["D6E9FF", "B3D9FF", "80C1FF", "4DA9FF", "1A91FF", "007BFF", "005FCC", "004799"];
  const headerStyle = (col: number) => ({
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: blues[col % blues.length] } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" as const, wrapText: true },
  });

  // Cabeçalhos agrupados
  const groupHeader = Array(header.length).fill("");
  groupHeader[0] = "IDENTIFICAÇÃO";
  groupHeader[identificacao.length] = "DESCRIÇÃO";
  groupHeader[identificacao.length + descricao.length] = "COMPOSIÇÃO DE CUSTOS";

  const data = [groupHeader, header, ...normalized];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Mescla as células de grupo
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: identificacao.length - 1 } },
    { s: { r: 0, c: identificacao.length }, e: { r: 0, c: identificacao.length + descricao.length - 1 } },
    { s: { r: 0, c: identificacao.length + descricao.length }, e: { r: 0, c: header.length - 1 } },
  ];

  const groupStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "0A66CC" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 13 },
    alignment: { horizontal: "center", vertical: "center" as const },
  };
  [0, identificacao.length, identificacao.length + descricao.length].forEach((c) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if ((ws as any)[ref]) (ws as any)[ref].s = groupStyle;
  });

  // Aplica gradiente aos cabeçalhos
  header.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 1, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle(col);
  });

  ws["!cols"] = header.map(() => ({ wch: 15 }));

  // ==============================
  // GERAR E BAIXAR ARQUIVO
  // ==============================
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Anúncios");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });

  saveAs(blob, safeFilename);
}
