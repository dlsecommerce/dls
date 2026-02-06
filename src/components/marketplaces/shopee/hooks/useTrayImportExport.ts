"use client";

import { useCallback } from "react";
import type ExcelJSType from "exceljs"; // ✅ só tipo (não quebra bundler)
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      // ✅ AJUSTE MÍNIMO PRA FUNCIONAR NO NEXT:
      // carregar ExcelJS e file-saver só quando clicar em Exportar
      const excelJSImport = await import("exceljs");
      const ExcelJS: typeof ExcelJSType =
        ((excelJSImport as any).default ?? (excelJSImport as any)) as any;

      const fileSaverImport = await import("file-saver");
      const saveAs: any =
        (fileSaverImport as any).saveAs ??
        (fileSaverImport as any).default ??
        fileSaverImport;

      const data = dataToExport ?? rows;

      if (!data || data.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }

      // -----------------------------
      // Normaliza lojas e marcas
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

      // -----------------------------
      // Siglas de loja (PK / SB)
      // -----------------------------
      const mapLojaSigla = (nomeLoja: string) => {
        const loja = String(nomeLoja || "").trim().toLowerCase();
        if (loja.includes("sobaquetas") || loja === "sb") return "SB";
        if (loja.includes("pikot") || loja === "pk") return "PK";

        // fallback
        return String(nomeLoja || "")
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase())
          .join("");
      };

      // -----------------------------
      // Siglas de marca
      // -----------------------------
      const mapMarcaSigla = (marca: string) =>
        String(marca || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/[^A-Z0-9-]/g, "");

      const partes: string[] = [];

      if (lojasSelecionadas.length) {
        partes.push(...lojasSelecionadas.map(mapLojaSigla));
      }

      if (marcasSelecionadas.length) {
        partes.push(...marcasSelecionadas.map(mapMarcaSigla));
      }

      const middle = Array.from(new Set(partes)).filter(Boolean).join("-");

      const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });

      // ✅ Nome correto: SHOPEE
      const fileName =
        middle.length > 0
          ? `PRECIFICAÇÃO SHOPEE - ${middle}-RELATÓRIO - ${stamp}.xlsx`
          : `PRECIFICAÇÃO SHOPEE - RELATÓRIO - ${stamp}.xlsx`;

      // -----------------------------
      // EXCEL WORKBOOK
      // -----------------------------
      const workbook = new ExcelJS.Workbook();

      // ✅ força o Excel a recalcular as fórmulas ao abrir o arquivo
      workbook.calcProperties.fullCalcOnLoad = true;

      const sheet = workbook.addWorksheet("PRECIFICAÇÃO");

      const colors = {
        azulEscuro: "1A8CEB",
        azulClaro: "D6E9FF",
        laranjaEscuro: "F59E0B",
        laranjaClaro: "FFE6B3",
        verdeEscuro: "22C55E",
        verdeClaro: "C7F5C4",
        branco: "FFFFFF",
      };

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

      const styleTitle = (cell: ExcelJSType.Cell, color: string) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      };

      styleTitle(sheet.getCell("A1"), colors.azulEscuro);
      styleTitle(sheet.getCell("H1"), colors.azulEscuro);
      styleTitle(sheet.getCell("K1"), colors.laranjaEscuro);
      styleTitle(sheet.getCell("S1"), colors.verdeEscuro);

      const row2 = sheet.getRow(2);
      row2.eachCell((cell, col) => {
        let fillColor = colors.azulClaro;
        if (col >= 11 && col <= 17) fillColor = colors.laranjaClaro;
        if (col >= 19) fillColor = colors.verdeClaro;
        if (col === 18) fillColor = colors.branco;

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };

        cell.font = { bold: true, color: { argb: "000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      sheet.getRow(1).eachCell((cell) => (cell.border = undefined));

      // -----------------------------
      // Helper parse number (inclui string)
      // -----------------------------
      const parseNum = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;

        // aceita "12,34" ou "12.34" ou "1.234,56"
        const s = String(v).trim().replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

      // -----------------------------
      // Helper: seta fórmula + result (se vier do DB) ou só fórmula
      // -----------------------------
      const setFormula = (
        addr: string,
        formula: string,
        result?: number | null
      ) => {
        sheet.getCell(addr).value = {
          formula,
          ...(result !== null && result !== undefined ? { result } : {}),
        };
      };

      // -----------------------------
      // Helper: detecta loja (PK/SB) por nome/sigla (com ou sem acento)
      // -----------------------------
      const getImpostoPorLoja = (lojaVal: any) => {
        const raw = String(lojaVal || "").trim();
        const norm = raw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""); // remove acentos

        const isSB =
          norm === "sb" ||
          norm.includes("sobaquetas") ||
          norm.includes("sobaqueta") ||
          norm.includes("so baquetas") ||
          norm.includes("so-baquetas");

        const isPK =
          norm === "pk" ||
          norm.includes("pikot") ||
          norm.includes("pikot shop") ||
          norm.includes("pikotshop");

        // default PK se não identificar
        if (isSB) return 10;
        if (isPK) return 12;
        return 12;
      };

      data.forEach((row) => {
        const line = [
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
          row.Desconto ?? 0, // K
          row.Embalagem ?? 2.5, // L
          row.Frete ?? 0, // M
          row.Comissão ?? 0, // N
          row.Imposto ?? 0, // O
          row["Margem de Lucro"] ?? 0, // P
          row.Marketing ?? 0, // Q
          "", // R
          row.Custo ?? 0, // S
          null, // T
        ];

        const newRow = sheet.addRow(line);
        const rowNumber = newRow.number;

        newRow.eachCell((cell, col) => {
          if ([12, 13, 19, 20].includes(col)) {
            cell.numFmt = '_("R$"* #,##0.00_)';
          }

          if ([11, 14, 15, 16, 17].includes(col)) {
            cell.numFmt = '0.00 " %"';
          }

          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        // -----------------------------
        // Valores iniciais vindos do Supabase (se existirem)
        // -----------------------------
        const precoVendaDB = parseNum(row["Preço de Venda"]);

        const embDB = parseNum(row["Embalagem"]);
        const freteDB = parseNum(row["Frete"]);
        const comDB = parseNum(row["Comissão"]);
        const impDB = parseNum(row["Imposto"]);
        const lucroDB = parseNum(row["Margem de Lucro"]);
        const mktDB = parseNum(row["Marketing"]);

        // ✅ imposto por loja (PK=12 / SB=10), só usa se DB não vier
        const impostoLoja = getImpostoPorLoja(row.Loja);

        // ============================================================
        // ✅ Defaults por faixa (SEM circularidade)
        // Agora o PV estimado usa impostoLoja para escolher o frete/comissão default
        // ============================================================
        const PV1 = `((S${rowNumber}*(1-K${rowNumber}/100)+2.5+4)/(1-((20+${impostoLoja}+15+3)/100)))`;
        const PV2 = `((S${rowNumber}*(1-K${rowNumber}/100)+2.5+16)/(1-((14+${impostoLoja}+15+3)/100)))`;
        const PV3 = `((S${rowNumber}*(1-K${rowNumber}/100)+2.5+20)/(1-((14+${impostoLoja}+15+3)/100)))`;
        const PV4 = `((S${rowNumber}*(1-K${rowNumber}/100)+2.5+26)/(1-((14+${impostoLoja}+15+3)/100)))`;

        // ✅ Preço de Venda (T) — FÓRMULA INVARIANTE (recalcula ao editar qualquer campo)
        // Regra correta:
        // PV = (S*(1-K/100) + L + M) / (1 - (N+O+P+Q)/100)
        const formulaPrecoVendaInvariant = `ROUND((S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+M${rowNumber})/(1-((N${rowNumber}+O${rowNumber}+P${rowNumber}+Q${rowNumber})/100)),2)`;

        setFormula(`T${rowNumber}`, formulaPrecoVendaInvariant, precoVendaDB);

        // ✅ Embalagem (L) — 2,50 se não vier do DB
        if (embDB !== null) {
          sheet.getCell(`L${rowNumber}`).value = embDB;
        } else {
          sheet.getCell(`L${rowNumber}`).value = 2.5;
        }

        // ✅ Imposto (O) — SB=10 / PK=12 (se não vier do DB)
        if (impDB !== null) {
          sheet.getCell(`O${rowNumber}`).value = impDB;
        } else {
          sheet.getCell(`O${rowNumber}`).value = impostoLoja;
        }

        // ✅ Margem de Lucro (P) — 15% se não vier do DB
        if (lucroDB !== null) {
          sheet.getCell(`P${rowNumber}`).value = lucroDB;
        } else {
          sheet.getCell(`P${rowNumber}`).value = 15;
        }

        // ✅ Marketing (Q) — 3% se não vier do DB
        if (mktDB !== null) {
          sheet.getCell(`Q${rowNumber}`).value = mktDB;
        } else {
          sheet.getCell(`Q${rowNumber}`).value = 3;
        }

        // ✅ Frete (M) — default por faixa (se não vier do DB)
        if (freteDB !== null) {
          sheet.getCell(`M${rowNumber}`).value = freteDB;
        } else {
          const formulaFrete = `IF(${PV1}<=79.99,4,IF(${PV2}<=99.99,16,IF(${PV3}<=199.99,20,26)))`;
          setFormula(`M${rowNumber}`, formulaFrete, null);
        }

        // ✅ Comissão (N) — default por faixa (se não vier do DB)
        if (comDB !== null) {
          sheet.getCell(`N${rowNumber}`).value = comDB;
        } else {
          const formulaComissao = `IF(${PV1}<=79.99,20,14)`;
          setFormula(`N${rowNumber}`, formulaComissao, null);
        }

        // formatos (garantia)
        sheet.getCell(`L${rowNumber}`).numFmt = '_("R$"* #,##0.00_)';
        sheet.getCell(`M${rowNumber}`).numFmt = '_("R$"* #,##0.00_)';
        sheet.getCell(`T${rowNumber}`).numFmt = '_("R$"* #,##0.00_)';

        sheet.getCell(`N${rowNumber}`).numFmt = '0.00 " %"';
        sheet.getCell(`O${rowNumber}`).numFmt = '0.00 " %"';
        sheet.getCell(`P${rowNumber}`).numFmt = '0.00 " %"';
        sheet.getCell(`Q${rowNumber}`).numFmt = '0.00 " %"';
      });

      sheet.getRow(1).height = 25;
      sheet.getRow(2).height = 22;

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
