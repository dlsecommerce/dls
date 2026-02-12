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
      // Helper: seta fórmula
      // -----------------------------
      const setFormula = (addr: string, formula: string) => {
        sheet.getCell(addr).value = { formula };
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
          null, // L (vai ser regra)
          null, // M (vai ser regra)
          null, // N (vai ser regra)
          null, // O (vai ser regra)
          null, // P (EDITÁVEL - não preencher)
          null, // Q (vai ser regra)
          "", // R
          row.Custo ?? 0, // S
          null, // T (fórmula)
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

        const impostoLoja = getImpostoPorLoja(row.Loja);

        // ============================================================
        // ✅ APLICAR REGRAS (com campos EDITÁVEIS)
        // - L, O e Q recebem default, mas o usuário pode editar depois
        // - P (Margem) fica em branco (editável)
        // ============================================================

        // L (Embalagem) = 2,5 (editável na planilha)
        sheet.getCell(`L${rowNumber}`).value = 2.5;

        // O (Imposto) = por loja (editável na planilha)
        sheet.getCell(`O${rowNumber}`).value = impostoLoja;

        // P (Margem) = EDITÁVEL (não preencher)
        sheet.getCell(`P${rowNumber}`).value = null;

        // Q (Marketing) = 3 (editável na planilha)
        sheet.getCell(`Q${rowNumber}`).value = 3;

        // ============================================================
        // ✅ PVs estimados para decidir faixa (SEM circularidade)
        // IMPORTANTE:
        // - Agora os PVs usam as CÉLULAS (K, L, O, P, Q, S)
        // - Então, se você alterar desconto/embalagem/imposto/margem/marketing/custo,
        //   a faixa (Frete/Comissão) muda automaticamente conforme a regra.
        // ============================================================
        const embalagemSafe = `IF(L${rowNumber}="",0,L${rowNumber})`;
        const impostoSafe = `IF(O${rowNumber}="",0,O${rowNumber})`;
        const margemSafe = `IF(P${rowNumber}="",0,P${rowNumber})`;
        const marketingSafe = `IF(Q${rowNumber}="",0,Q${rowNumber})`;

        // Faixa 1: PV <= 79,99 -> Frete 4 / Comissão 20%
        const PV1 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+4)/(1-((20+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;

        // Faixa 2: PV <= 99,99 -> Frete 16 / Comissão 14%
        const PV2 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+16)/(1-((14+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;

        // Faixa 3: PV <= 199,99 -> Frete 20 / Comissão 14%
        const PV3 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+20)/(1-((14+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;

        // Faixa 4: PV > 199,99 -> Frete 26 / Comissão 14%
        const PV4 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+26)/(1-((14+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;

        // ============================================================
        // ✅ REGRAS SHOPEE (atualizam automaticamente conforme os percentuais)
        // ============================================================

        // M (Frete) = por faixa (com base nos PVs estimados)
        const formulaFrete = `IF(${PV1}<=79.99,4,IF(${PV2}<=99.99,16,IF(${PV3}<=199.99,20,26)))`;
        setFormula(`M${rowNumber}`, formulaFrete);

        // N (Comissão) = por faixa (mesma regra do seu código)
        const formulaComissao = `IF(${PV1}<=79.99,20,14)`;
        setFormula(`N${rowNumber}`, formulaComissao);

        // ============================================================
        // ✅ PREÇO DE VENDA (recalcula ao editar qualquer campo)
        // - Margem editável (P): se vazia, considera 0
        // ============================================================
        const formulaPrecoVendaInvariant = `ROUND((S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+M${rowNumber})/(1-((N${rowNumber}+O${rowNumber}+IF(P${rowNumber}="",0,P${rowNumber})+Q${rowNumber})/100)),2)`;
        setFormula(`T${rowNumber}`, formulaPrecoVendaInvariant);

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
