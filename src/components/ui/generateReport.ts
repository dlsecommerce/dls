import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// 🔹 Tipagem para os dados recebidos
export interface ReportItem {
  id?: string;
  idBling?: string;
  referencia?: string;
  idTray?: string;
  nome?: string;
  marca?: string;
  // se futuramente quiser, pode adicionar peso, altura, largura etc.
}

// 🔹 Função para gerar relatório filtrado
export const generateReport = (filteredData: ReportItem[]) => {
  const headers = [
    "Banco de Dados",
    "ID Geral",
    "ID Bling",
    "Referência",
    "ID Tray",
    "ID Var",
    "OD",
    "Nome",
    "Marca",
    "Categoria",
    "Peso",
    "Altura",
    "Largura",
    "Comprimento",
    "Código 1", "Quantidade 1",
    "Código 2", "Quantidade 2",
    "Código 3", "Quantidade 3",
    "Código 4", "Quantidade 4",
    "Código 5", "Quantidade 5",
    "Código 6", "Quantidade 6",
    "Código 7", "Quantidade 7",
    "Código 8", "Quantidade 8",
    "Código 9", "Quantidade 9",
    "Código 10", "Quantidade 10",
  ];

  const rows = filteredData.map((item) => [
    "", // B.Dados
    item.id || "",
    item.idBling || "",
    item.referencia || "",
    item.idTray || "",
    "", // ID Var
    "", // OD
    item.nome || "",
    item.marca || "",
    "", "", "", "", "", // Categoria / Peso / Altura / Largura / Comp.
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

  const now = new Date();
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const ano = now.getFullYear();
  const hora = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const seg = String(now.getSeconds()).padStart(2, "0");

  const fileName = `ANUNCIOS - Relatório - Dia${dia}-${mes}-${ano} ${hora}-${min}-${seg}.xlsx`;

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, fileName);
};
