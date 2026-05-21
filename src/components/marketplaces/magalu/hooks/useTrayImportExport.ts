"use client";

import { useCallback } from "react";
import type ExcelJSType from "exceljs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { unlockAudio, playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";
import { createNotification } from "@/lib/createNotification";

export function useTrayImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string,
) {
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      try {
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
          toastCustom.warning(
            "Nada para exportar",
            "Nenhum dado disponível para gerar relatório.",
          );
          return;
        }

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

        const mapLojaSigla = (nomeLoja: string) => {
          const loja = String(nomeLoja || "").trim().toLowerCase();

          if (loja.includes("sobaquetas") || loja === "sb") return "SB";
          if (loja.includes("pikot") || loja === "pk") return "PK";

          return String(nomeLoja || "")
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase())
            .join("");
        };

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

        const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", {
          locale: ptBR,
        });

        const fileName =
          middle.length > 0
            ? `PRECIFICAÇÃO MAGALU - ${middle}-RELATÓRIO - ${stamp}.xlsx`
            : `PRECIFICAÇÃO MAGALU - RELATÓRIO - ${stamp}.xlsx`;

        const workbook = new ExcelJS.Workbook();

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
          "ID Bing",
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

        sheet.columns = headers.map((h) => ({
          header: h,
          key: h,
          width: 18,
        }));

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

        sheet.getRow(1).eachCell((cell) => {
          cell.border = undefined;
        });

        const setFormula = (addr: string, formula: string) => {
          sheet.getCell(addr).value = { formula };
        };

        const getImpostoPorLoja = (lojaVal: any) => {
          const raw = String(lojaVal || "").trim();

          const norm = raw
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

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

          if (isSB) return 10;
          if (isPK) return 12;

          return 12;
        };

        data.forEach((row) => {
          const margemAtual =
            row["Margem de Lucro"] ??
            row.MargemDeLucro ??
            row.margemDeLucro ??
            null;

          const line = [
            row.ID || "",
            row.Loja || "",
            row["ID Bing"] || "",
            row.Referência || "",
            row["ID Tray"] || "",
            row["ID Var"] || "",
            row.OD || "",
            row.Nome || "",
            row.Marca || "",
            row.Categoria || "",
            row.Desconto ?? 0,
            null,
            null,
            null,
            null,
            margemAtual,
            null,
            "",
            row.Custo ?? 0,
            null,
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

          sheet.getCell(`L${rowNumber}`).value = 3;
          sheet.getCell(`O${rowNumber}`).value = impostoLoja;

          sheet.getCell(`P${rowNumber}`).value =
            margemAtual === undefined || margemAtual === ""
              ? null
              : margemAtual;

          sheet.getCell(`Q${rowNumber}`).value = 3;

          const embalagemSafe = `IF(L${rowNumber}="",0,L${rowNumber})`;
          const impostoSafe = `IF(O${rowNumber}="",0,O${rowNumber})`;
          const margemSafe = `IF(P${rowNumber}="",0,P${rowNumber})`;
          const marketingSafe = `IF(Q${rowNumber}="",0,Q${rowNumber})`;

          const PV1 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+4)/(1-((20+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;
          const PV2 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+16)/(1-((14+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;
          const PV3 = `((S${rowNumber}*(1-K${rowNumber}/100)+${embalagemSafe}+20)/(1-((14+${impostoSafe}+${margemSafe}+${marketingSafe})/100)))`;

          const formulaFrete = `IF(${PV1}<=79.99,4,IF(${PV2}<=99.99,16,IF(${PV3}<=199.99,20,26)))`;
          setFormula(`M${rowNumber}`, formulaFrete);

          const formulaComissao = `IF(${PV1}<=79.99,20,14)`;
          setFormula(`N${rowNumber}`, formulaComissao);

          const formulaPrecoVendaInvariant = `ROUND((S${rowNumber}*(1-K${rowNumber}/100)+L${rowNumber}+M${rowNumber})/(1-((N${rowNumber}+O${rowNumber}+IF(P${rowNumber}="",0,P${rowNumber})+Q${rowNumber})/100)),2)`;
          setFormula(`T${rowNumber}`, formulaPrecoVendaInvariant);

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
          fileName,
        );

        await createNotification({
          title: "Relatório Magalu exportado",
          message: `O relatório "${fileName}" foi exportado com ${data.length} anúncio(s).`,
          action: "status",
          entityType: "magalu_pricing_export",
          link: "/dashboard/marketplaces/magalu",
        });

        toastCustom.success(
          "Exportação concluída!",
          "O download da planilha foi iniciado.",
        );

        playImportSuccessSound(0.4);
      } catch (err: any) {
        toastCustom.error(
          "Erro ao exportar",
          err?.message || "Falha ao gerar planilha.",
        );
      }
    },
    [rows, lojasFiltro, marcasFiltro],
  );

  return { handleExport, unlockAudio };
}