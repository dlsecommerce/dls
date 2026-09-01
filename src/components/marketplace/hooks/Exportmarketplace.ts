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
import type { Marketplace, MarketplaceFilters } from "@/components/marketplace/hooks/types";

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
  field?: string;
  message: string;
};

export type MarketplaceImportParseResult = {
  registros: MarketplaceImportRegistro[];
  previewRows: any[];
  warnings: string[];
  errors: string[];
  rowErrors: MarketplaceImportRowError[];
};

type ExportFiltros = Partial<MarketplaceFilters> & { brands?: string[] };

// ---------------------------------------------------------------------------
// Layout final da planilha (1-based)
// A-G: identificação (azul) | H: vazio | I,J,K: regras editáveis (verde)
// L: vazio | M: Custo | N: Preço de Venda (fórmula, recalcula em tempo real)
// ---------------------------------------------------------------------------
const COL = {
  ID: 1,           // A
  LOJA: 2,          // B
  CANAL: 3,         // C
  ID_BLING: 4,      // D
  REFERENCIA: 5,    // E
  PRODUTO: 6,       // F
  MARCA: 7,         // G
  // H (8) vazio
  COMISSAO: 9,       // I
  FRETE: 10,         // J
  MARGEM: 11,        // K
  // L (12) vazio
  CUSTO: 13,          // M
  PRECO_VENDA: 14,    // N
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const COLOR_BLUE = "1A8CEB";
const COLOR_GREEN = "C7F5C4";

export function useMarketplaceImportExport(
  rows: Marketplace[],
  filtros?: ExportFiltros
) {
  // -----------------------------
  // EXPORT
  // -----------------------------
  const handleExport = useCallback(
    async (dataToExport?: Marketplace[]) => {
      try {
        // -------------------------------------------------------------
        // Busca TODOS os registros que batem no filtro (sem paginação),
        // via RPC dedicada — não depende da página atual da tela.
        // -------------------------------------------------------------
        let data: Marketplace[];

        if (dataToExport && dataToExport.length > 0) {
          data = dataToExport;
        } else {
          const f = filtros || {};
          const storeParam = f.loja && f.loja !== "Todos" ? f.loja : null;
          const channelParam = f.canal && f.canal !== "Todos" ? f.canal : null;
          const tipoParam = f.tipo && f.tipo !== "Todos" ? f.tipo : null;
          const condicaoParam = f.condicao && f.condicao !== "Todos" ? f.condicao : null;
          const searchParam = f.produto || f.codigo || null;
          const situacaoParam = f.situacao || "Ativos";
          const brandsParam = f.brands && f.brands.length > 0 ? f.brands : null;

          const { data: fetched, error: fetchError } = await supabase
            .schema("newsystem")
            .rpc("fetch_all_marketplace_filtered", {
              p_store: storeParam,
              p_channel: channelParam,
              p_tipo: tipoParam,
              p_condicao: condicaoParam,
              p_search: searchParam,
              p_situacao: situacaoParam,
              p_brands: brandsParam,
            });

          if (fetchError) throw fetchError;
          data = (fetched ?? []) as Marketplace[];
        }

        if (!data || data.length === 0) {
          toastCustom.warning(
            "Nada para exportar",
            "Nenhum dado disponível para gerar relatório."
          );
          return;
        }

        // -----------------------------
        // Nome do arquivo
        // -----------------------------
        const partes: string[] = [];
        if (filtros?.loja && filtros.loja !== "Todos") partes.push(filtros.loja);
        if (filtros?.canal && filtros.canal !== "Todos") partes.push(filtros.canal);

        const middle = partes.join("-").toUpperCase();
        const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });
        const fileName =
          middle.length > 0
            ? `PRECIFICAÇÃO - MARKETPLACE - ${middle} - ${stamp}.xlsx`
            : `PRECIFICAÇÃO - MARKETPLACE - ${stamp}.xlsx`;

        // -------------------------------------------------------------
        // Busca imposto/marketing (não exibidos — embutidos na fórmula)
        // por anúncio, via function bulk.
        // -------------------------------------------------------------
        const ids = data.map((r) => r.id).filter(Boolean);

        const { data: regrasData, error: regrasError } = await supabase
          .schema("newsystem")
          .rpc("get_marketplace_pricing_rules_bulk", { p_marketplace_ids: ids });

        if (regrasError) {
          console.error("Erro ao buscar regras de precificação:", regrasError);
        }

        const regrasMap = new Map<string, { tax: number; marketing: number }>();
        (regrasData || []).forEach((r: any) => {
          regrasMap.set(r.marketplace_id, {
            tax: Number(r.out_imposto) || 0,
            marketing: Number(r.out_marketing) || 0,
          });
        });

        // -------------------------------------------------------------
        // Monta a planilha
        // -------------------------------------------------------------
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("MARKETPLACE");

        const headers = [
          "ID",              // A
          "Loja",            // B
          "Canal",           // C
          "ID Bling",        // D
          "Referência",      // E
          "Produto",         // F
          "Marca",           // G
          "",                // H (vazia)
          "Comissão",        // I
          "Frete",           // J
          "Margem de Lucro", // K
          "",                // L (vazia)
          "Custo",           // M
          "Preço de Venda",  // N
        ];

        sheet.addRow(headers);
        sheet.columns = headers.map((h) => ({
          header: h,
          key: h || `col_${Math.random()}`,
          width: h ? 18 : 4,
        }));
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        const BLUE_COLS = [1, 2, 3, 4, 5, 6, 7]; // A-G
        const GREEN_COLS = [9, 10, 11, 13, 14]; // I,J,K,M,N
        // colunas 8 (H) e 12 (L) ficam sem cor

        sheet.getRow(1).eachCell((cell, col) => {
          let fillColor: string | null = null;
          if (BLUE_COLS.includes(col)) fillColor = COLOR_BLUE;
          if (GREEN_COLS.includes(col)) fillColor = COLOR_GREEN;

          if (fillColor) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
          }

          cell.font = { bold: true, color: { argb: BLUE_COLS.includes(col) ? "FFFFFF" : "000000" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        data.forEach((row) => {
          const regras = regrasMap.get(row.id) || { tax: 0, marketing: 0 };

          const newRow = sheet.addRow([
            row.id || "",              // A
            row.store || "",           // B
            row.channel || "",         // C
            row.id_bling || "",        // D
            row.reference || "",       // E
            row.product || "",         // F
            row.mark || "",            // G
            "",                        // H (vazia)
            row.commission_rate ?? 0,  // I
            row.freight ?? 0,          // J
            row.profit_margin ?? 0,    // K
            "",                        // L (vazia)
            row.current_cost ?? 0,     // M
            null,                      // N (fórmula abaixo)
          ]);

          const rowNumber = newRow.number;

          newRow.eachCell((cell, col) => {
            if ([10, 13, 14].includes(col)) {
              // Frete (J), Custo (M), Preço (N)
              cell.numFmt = '_("R$"* #,##0.00_)';
            }
            if ([9, 11].includes(col)) {
              // Comissão (I), Margem (K)
              cell.numFmt = '0.00 " %"';
            }
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });

          // -----------------------------------------------------------
          // Fórmula Excel — recalcula em tempo real ao editar
          // Comissão (I), Frete (J) ou Margem (K).
          // Imposto e Marketing entram embutidos como constante da linha
          // (já vêm calculados pela get_marketplace_pricing_rules_bulk).
          // Reflete newsystem.fn_calc_marketplace_price (desconto já
          // aplicado dentro de Custo/current_cost).
          // -----------------------------------------------------------
          const impostoConst = regras.tax;
          const marketingConst = regras.marketing;

          sheet.getCell(`N${rowNumber}`).value = {
            formula: `ROUND((M${rowNumber}+J${rowNumber})/(1-((I${rowNumber}+K${rowNumber}+${impostoConst}+${marketingConst})/100)),2)`,
          };
          sheet.getCell(`N${rowNumber}`).numFmt = '_("R$"* #,##0.00_)';
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
    [rows, filtros]
  );

  // -----------------------------
  // IMPORT — ETAPA 1: leitura/validação
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

        if (!rawId && !rawLoja) return; // linha vazia

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

        const commissionRate = toNumber(row.getCell(COL.COMISSAO).value);
        const freight = toNumber(row.getCell(COL.FRETE).value);
        const profitMargin = toNumber(row.getCell(COL.MARGEM).value);
        const currentCost = toNumber(row.getCell(COL.CUSTO).value);
        const sellingPrice = toNumber(row.getCell(COL.PRECO_VENDA).value);

        if (
          commissionRate === null ||
          freight === null ||
          profitMargin === null ||
          currentCost === null ||
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
            field: "commission_rate",
            message: `Comissão fora do intervalo 0-100 na linha ${rowNumber}.`,
          });
          return;
        }

        if (profitMargin < 0 || profitMargin > 100) {
          rowErrors.push({
            row: rowNumber,
            field: "profit_margin",
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
  // IMPORT — ETAPA 2: envio efetivo
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
