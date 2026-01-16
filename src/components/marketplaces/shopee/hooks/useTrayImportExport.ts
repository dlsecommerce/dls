"use client";

import { useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      const data = dataToExport ?? rows;

      if (!data || data.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }

      // -----------------------------
      // Normaliza filtros
      // -----------------------------
      const lojasSelecionadas = Array.isArray(lojasFiltro)
        ? lojasFiltro
        : lojasFiltro
        ? [lojasFiltro]
        : [];

      const marcasSelecionadas = Array.isArray(marcasFiltro)
        ? marcasFiltro
        : marcasFiltro
        ? [marcasFiltro]
        : [];

      const mapLojaSigla = (nome: string) => {
        const n = String(nome || "").toLowerCase();
        if (n.includes("sobaquetas") || n === "sb") return "SB";
        if (n.includes("pikot") || n === "pk") return "PK";
        return String(nome || "")
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase())
          .join("");
      };

      const mapMarcaSigla = (marca: string) =>
        String(marca || "")
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/[^A-Z0-9-]/g, "");

      const middle = Array.from(
        new Set([
          ...lojasSelecionadas.map(mapLojaSigla),
          ...marcasSelecionadas.map(mapMarcaSigla),
        ])
      )
        .filter(Boolean)
        .join("-");

      const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", {
        locale: ptBR,
      });

      const fileName = middle
        ? `PRECIFICAÇÃO SHOPEE - ${middle}-RELATÓRIO - ${stamp}.xlsx`
        : `PRECIFICAÇÃO SHOPEE - RELATÓRIO - ${stamp}.xlsx`;

      // -----------------------------
      // Workbook
      // -----------------------------
      const workbook = new ExcelJS.Workbook();

      // ✅ força o Excel a recalcular as fórmulas ao abrir o arquivo
      workbook.calcProperties.fullCalcOnLoad = true;

      const sheet = workbook.addWorksheet("PRECIFICAÇÃO");

      const headers = [
        "ID",
        "Loja",
        "ID Bling",
        "Referência",
        "ID Tray",
        "ID Var",
        "OD",
        "Nome",
        "Marca",
        "Categoria",
        "Desconto",
        "Embalagem",
        "Frete",
        "Comissão",
        "Imposto",
        "Margem de Lucro",
        "Marketing",
        "",
        "Custo",
        "Preço de Venda",
      ];

      sheet.addRow([]);
      sheet.addRow(headers);
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 18 }));
      sheet.views = [{ state: "frozen", ySplit: 2 }];

      sheet.mergeCells("A1:G1");
      sheet.getCell("A1").value = "IDENTIFICAÇÃO";

      sheet.mergeCells("H1:J1");
      sheet.getCell("H1").value = "DESCRIÇÃO";

      sheet.mergeCells("K1:Q1");
      sheet.getCell("K1").value = "REGRAS DE PRECIFICAÇÃO";

      sheet.mergeCells("S1:T1");
      sheet.getCell("S1").value = "PREÇO";

      // -----------------------------
      // Helper parse BR
      // -----------------------------
      const parseBR = (v: any, fallback = 0): number => {
        if (v === null || v === undefined || v === "") return fallback;
        if (typeof v === "number") return v;
        const s = String(v).replace(/\./g, "").replace(",", ".");
        return Number(s) || fallback;
      };

      // -----------------------------
      // Dados
      // -----------------------------
      data.forEach((row) => {
        const desconto = parseBR(row.Desconto, 0);
        const embalagem = parseBR(row.Embalagem, 2.5);
        const frete = parseBR(row.Frete, 0);
        const comissao = parseBR(row.Comissão, 0);
        const imposto = parseBR(row.Imposto, 0);
        const lucro = parseBR(row["Margem de Lucro"], 0);
        const marketing = parseBR(row.Marketing, 0);
        const custo = parseBR(row.Custo, 0);

        const newRow = sheet.addRow([
          row.ID || "",
          row.Loja || "",
          row["ID Bling"] || "",
          row.Referência || "",
          row["ID Tray"] || "",
          row["ID Var"] || "",
          row.OD || "",
          row.Nome || "",
          row.Marca || "",
          row.Categoria || "",
          desconto, // K
          embalagem, // L
          frete, // M
          comissao, // N
          imposto, // O
          lucro, // P
          marketing, // Q
          "", // R (coluna vazia)
          custo, // S
          null, // T
        ]);

        const r = newRow.number;

        // Formatação moeda (Embalagem, Frete, Custo)
        [12, 13, 19].forEach((c) => {
          sheet.getCell(r, c).numFmt = '_("R$"* #,##0.00_)';
        });

        // Formatação percentuais (Desconto, Comissão, Imposto, Margem, Marketing)
        [11, 14, 15, 16, 17].forEach((c) => {
          sheet.getCell(r, c).numFmt = '0.00 " %"';
        });

        // -----------------------------
        // PREÇO DE VENDA (T)
        // ✅ Fórmula em PT-BR (SE / ARRED) + separador ";"
        // -----------------------------
        sheet.getCell(`T${r}`).value = {
          formula: `
            ARRED(
              SE(
                (S${r}*(1-K${r}/100)+L${r}+M${r})>500;
                (S${r}*(1-K${r}/100)+L${r}+100)/
                  (1-((O${r}+P${r}+Q${r})/100));
                (S${r}*(1-K${r}/100)+L${r}+M${r})/
                  (1-((N${r}+O${r}+P${r}+Q${r})/100))
              );
              2
            )
          `.replace(/\s+/g, ""),
        };

        sheet.getCell(`T${r}`).numFmt = '_("R$"* #,##0.00_)';
      });

      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    },
    [rows, lojasFiltro, marcasFiltro]
  );

  return { handleExport };
}
