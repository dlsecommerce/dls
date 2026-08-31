"use client";

import { useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { unlockAudio, playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";
import { createNotification } from "@/lib/createNotification";

export type MarketplaceImportRegistro = {
  id: string;
  current_cost: number;
  freight: number;
  commission_rate: number;
  profit_margin: number;
  selling_price: number;
};

export type MarketplaceImportRowError = {
  row: number;
  message: string;
};

export type MarketplaceImportParseResult = {
  registros: MarketplaceImportRegistro[];
  previewRows: any[];
  warnings: string[];
  errors: string[];
  rowErrors: MarketplaceImportRowError[];
};

// Índices das colunas na planilha (1-based, seguindo o export).
const COL = {
  ID: 1,
  LOJA: 2,
  CANAL: 3,
  ID_BLING: 4,
  REFERENCIA: 5,
  PRODUTO: 6,
  MARCA: 7,
  CUSTO: 8,
  FRETE: 9,
  COMISSAO: 10,
  MARGEM: 11,
  PRECO_VENDA: 12,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function useMarketplaceImportExport(
  rows: any[],
  lojasFiltro?: string[] | string,
  marcasFiltro?: string[] | string
) {
  // -----------------------------
  // EXPORT
  // -----------------------------
  const handleExport = useCallback(
    async (dataToExport?: any[]) => {
      try {
        const data = dataToExport ?? rows;

        if (!data || data.length === 0) {
          toastCustom.warning(
            "Nada para exportar",
            "Nenhum dado disponível para gerar relatório."
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

        const mapMarcaSigla = (marca: string) =>
          String(marca || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "")
            .replace(/[^A-Z0-9-]/g, "");

        const partes = Array.from(
          new Set([...lojasSelecionadas, ...marcasSelecionadas.map(mapMarcaSigla)])
        ).filter(Boolean);

        const middle = partes.join("-");
        const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });
        const fileName =
          middle.length > 0
            ? `MARKETPLACE - ${middle} - RELATÓRIO - ${stamp}.xlsx`
            : `MARKETPLACE - RELATÓRIO - ${stamp}.xlsx`;

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("MARKETPLACE");

        const colors = {
          azulEscuro: "1A8CEB",
          azulClaro: "D6E9FF",
          verdeEscuro: "22C55E",
          verdeClaro: "C7F5C4",
        };

        const headers = [
          "ID",
          "Loja",
          "Canal",
          "ID Bling",
          "Referência",
          "Produto",
          "Marca",
          "Custo",
          "Frete",
          "Comissão",
          "Margem de Lucro",
          "Preço de Venda",
        ];

        sheet.addRow(headers);
        sheet.columns = headers.map((h) => ({ header: h, key: h, width: 18 }));
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        const row1 = sheet.getRow(1);
        row1.eachCell((cell, col) => {
          const editable = col >= 8; // Custo, Frete, Comissão, Margem, Preço
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: editable ? colors.verdeClaro : colors.azulClaro },
          };
          cell.font = { bold: true, color: { argb: "000000" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        data.forEach((row) => {
          const newRow = sheet.addRow([
            row.id || "",
            row.store || "",
            row.channel || "",
            row.id_bling || "",
            row.reference || "",
            row.product || "",
            row.mark || "",
            row.current_cost ?? 0,
            row.freight ?? 0,
            row.commission_rate ?? 0,
            row.profit_margin ?? 0,
            row.selling_price ?? 0,
          ]);

          newRow.eachCell((cell, col) => {
            if ([8, 9, 12].includes(col)) {
              cell.numFmt = '_("R$"* #,##0.00_)';
            }
            if ([10, 11].includes(col)) {
              cell.numFmt = '0.00 " %"';
            }
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });
        });

        sheet.getRow(1).height = 24;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          fileName
        );

        await createNotification({
          title: "Relatório Marketplace exportado",
          message: `O relatório "${fileName}" foi exportado com ${data.length} anúncio(s).`,
          action: "status",
          entityType: "marketplace_pricing_export",
          link: "/dashboard/marketplaces",
        });

        toastCustom.success(
          "Exportação concluída!",
          "O download da planilha foi iniciado."
        );
        playImportSuccessSound(0.4);
      } catch (err: any) {
        toastCustom.error(
          "Erro ao exportar",
          err?.message || "Falha ao gerar planilha."
        );
      }
    },
    [rows, lojasFiltro, marcasFiltro]
  );

  // -----------------------------
  // IMPORT — ETAPA 1: leitura/validação (para preview no modal)
  // -----------------------------
  const parseImportFile = useCallback(
    async (file: File): Promise<MarketplaceImportParseResult> => {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        throw new Error("Planilha vazia ou inválida.");
      }

      const registros: MarketplaceImportRegistro[] = [];
      const previewRows: any[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];
      const rowErrors: MarketplaceImportRowError[] = [];
      const idsVistos = new Set<string>();

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // header

        const rawId = row.getCell(COL.ID).value;
        const rawLoja = row.getCell(COL.LOJA).value;

        // Linha totalmente vazia — ignora silenciosamente.
        if (!rawId && !rawLoja) return;

        const id = rawId ? String(rawId).trim() : "";

        if (!id || !UUID_REGEX.test(id)) {
          rowErrors.push({
            row: rowNumber,
            message: `ID inválido ou ausente na linha ${rowNumber}.`,
          });
          return;
        }

        if (idsVistos.has(id)) {
          rowErrors.push({
            row: rowNumber,
            message: `ID duplicado na linha ${rowNumber}: "${id}".`,
          });
          return;
        }
        idsVistos.add(id);

        const currentCost = toNumber(row.getCell(COL.CUSTO).value);
        const freight = toNumber(row.getCell(COL.FRETE).value);
        const commissionRate = toNumber(row.getCell(COL.COMISSAO).value);
        const profitMargin = toNumber(row.getCell(COL.MARGEM).value);
        const sellingPrice = toNumber(row.getCell(COL.PRECO_VENDA).value);

        if (
          currentCost === null ||
          freight === null ||
          commissionRate === null ||
          profitMargin === null ||
          sellingPrice === null
        ) {
          rowErrors.push({
            row: rowNumber,
            message: `Valores numéricos inválidos na linha ${rowNumber} (ID "${id}").`,
          });
          return;
        }

        if (commissionRate < 0 || commissionRate > 100) {
          rowErrors.push({
            row: rowNumber,
            message: `Comissão fora do intervalo 0-100 na linha ${rowNumber}.`,
          });
          return;
        }

        if (profitMargin < 0 || profitMargin > 100) {
          rowErrors.push({
            row: rowNumber,
            message: `Margem de lucro fora do intervalo 0-100 na linha ${rowNumber}.`,
          });
          return;
        }

        if (freight < 0 || currentCost < 0 || sellingPrice < 0) {
          rowErrors.push({
            row: rowNumber,
            message: `Valores negativos não são permitidos na linha ${rowNumber}.`,
          });
          return;
        }

        const registro: MarketplaceImportRegistro = {
          id,
          current_cost: Number(currentCost.toFixed(2)),
          freight: Number(freight.toFixed(2)),
          commission_rate: Number(commissionRate.toFixed(2)),
          profit_margin: Number(profitMargin.toFixed(2)),
          selling_price: Number(sellingPrice.toFixed(2)),
        };

        registros.push(registro);

        previewRows.push({
          id,
          store: rawLoja ?? "",
          channel: row.getCell(COL.CANAL).value ?? "",
          id_bling: row.getCell(COL.ID_BLING).value ?? "",
          reference: row.getCell(COL.REFERENCIA).value ?? "",
          product: row.getCell(COL.PRODUTO).value ?? "",
          mark: row.getCell(COL.MARCA).value ?? "",
          ...registro,
        });
      });

      if (registros.length === 0 && rowErrors.length === 0) {
        errors.push("Nenhum registro válido encontrado na planilha.");
      }

      if (rowErrors.length > 0) {
        warnings.push(
          `${rowErrors.length} linha(s) com erro serão ignoradas na importação.`
        );
      }

      return { registros, previewRows, warnings, errors, rowErrors };
    },
    []
  );

  // -----------------------------
  // IMPORT — ETAPA 2: envio efetivo (após confirmação no modal)
  // -----------------------------
  const sendImport = useCallback(
    async (registros: MarketplaceImportRegistro[]) => {
      if (!registros || registros.length === 0) {
        toastCustom.warning(
          "Nada para importar",
          "Nenhum registro válido para enviar."
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toastCustom.error(
          "Sessão expirada",
          "Entre novamente no sistema para importar."
        );
        return;
      }

      const response = await fetch("/api/marketplace/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ registros }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Falha ao importar a planilha.");
      }

      const updatedCount = result?.resultado?.updated ?? registros.length;

      await createNotification({
        title: "Importação de Marketplace concluída",
        message: `${updatedCount} anúncio(s) atualizado(s).`,
        action: "status",
        entityType: "marketplace_pricing_import",
        link: "/dashboard/marketplaces",
      });

      toastCustom.success(
        "Importação concluída!",
        `${updatedCount} registro(s) atualizado(s) com sucesso.`
      );
      playImportSuccessSound(0.4);

      return result;
    },
    []
  );

  // -----------------------------
  // IMPORT — versão direta (sem preview), mantida por compatibilidade
  // -----------------------------
  const handleImport = useCallback(
    async (file: File) => {
      try {
        const { registros, rowErrors } = await parseImportFile(file);

        if (registros.length === 0) {
          toastCustom.warning(
            "Nada para importar",
            "Nenhum registro válido encontrado na planilha."
          );
          return;
        }

        if (rowErrors.length > 0) {
          toastCustom.warning(
            "Algumas linhas foram ignoradas",
            `${rowErrors.length} linha(s) com erro não foram importadas.`
          );
        }

        await sendImport(registros);
      } catch (err: any) {
        toastCustom.error(
          "Erro ao importar",
          err?.message || "Falha ao processar a planilha."
        );
      }
    },
    [parseImportFile, sendImport]
  );

  return {
    handleExport,
    handleImport,
    parseImportFile,
    sendImport,
    unlockAudio,
  };
}
