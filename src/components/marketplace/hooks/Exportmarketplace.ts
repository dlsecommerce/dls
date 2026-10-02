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

export type ExportProgressCallback = (progress: {
  percent: number;
  current: number;
  total: number;
}) => void;

type ExportFiltros = Partial<MarketplaceFilters> & { brands?: string[] };

// ---------------------------------------------------------------------------
// Layout final da planilha (1-based) — usado no PARSE do import
// A-G: identificação (azul) | H: vazio | I,J,K: regras editáveis (verde)
// L: vazio | M: Custo | N: Preço de Venda (fórmula)
// ---------------------------------------------------------------------------
const COL = {
  ID: 1,
  LOJA: 2,
  CANAL: 3,
  ID_BLING: 4,
  REFERENCIA: 5,
  PRODUTO: 6,
  MARCA: 7,
  COMISSAO: 9,
  FRETE: 10,
  MARGEM: 11,
  CUSTO: 13,
  PRECO_VENDA: 14,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ✅ FIX: extrai o valor real da célula, tratando fórmulas (ExcelJS retorna
// { formula, result }), rich text ({ richText: [...] }) e hyperlinks
// ({ text, hyperlink }). Antes, nesses casos, `cell.value` virava um objeto
// e `String(valor)` resultava em "[object Object]", quebrando a validação
// do UUID e dos números silenciosamente.
function extractCellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;

  if (v === null || v === undefined) return null;

  if (typeof v === "object") {
    if ("result" in (v as any)) return (v as any).result ?? null;
    if ("richText" in (v as any)) {
      return (v as any).richText.map((r: any) => r.text).join("");
    }
    if ("text" in (v as any)) return (v as any).text;
  }

  return v;
}

// ✅ FIX: remove símbolos de moeda ("R$"), percentual ("%") e espaços antes
// de converter para número, e troca vírgula decimal por ponto. Antes,
// valores formatados como "R$ 341,59" ou "12,00 %" viravam NaN -> null,
// descartando a linha inteira sem explicar o motivo.
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let str = String(value).trim();
  str = str.replace(/[R$%\s]/g, "").replace(",", ".");

  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

export function useMarketplaceImportExport(
  rows: Marketplace[],
  filtros?: ExportFiltros,
  selectedIds?: string[] // ✅ NOVO — ids marcados na tabela (checkbox)
) {
  // -----------------------------------------------------------------------
  // EXPORT — geração 100% no servidor (streaming), ideal para grandes
  // volumes (ex.: 70k+ linhas). O cliente apenas dispara a requisição,
  // lê o stream de progresso/dados e salva o arquivo final.
  //
  // ✅ Suporta 2 modos, mutuamente exclusivos:
  //    - Seleção: se `selectedIds` tiver itens, exporta SÓ essas linhas.
  //    - Filtros: caso contrário, exporta pelo filtro aplicado na tela
  //      (comportamento original, sem alterações).
  // -----------------------------------------------------------------------
  const handleExport = useCallback(
    async (onProgress?: ExportProgressCallback, signal?: AbortSignal) => {
      try {
        onProgress?.({ percent: 0, current: 0, total: 0 });

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          toastCustom.error(
            "Sessão expirada",
            "Entre novamente no sistema para exportar."
          );
          return;
        }

        // ✅ Modo seleção ativo?
        const isSelectionMode = Array.isArray(selectedIds) && selectedIds.length > 0;

        // -----------------------------
        // Nome do arquivo
        // -----------------------------
        const partes: string[] = [];
        if (!isSelectionMode) {
          if (filtros?.loja && filtros.loja !== "Todos") partes.push(filtros.loja);
          if (filtros?.canal && filtros.canal !== "Todos") partes.push(filtros.canal);
        }

        const middle = partes
          .join("-")
          .toUpperCase()
          .replace(/[\\/:*?"<>|]/g, "");
        const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });

        const suffix = isSelectionMode ? "SELECIONADOS" : middle;

        const fileName =
          suffix.length > 0
            ? `PRECIFICAÇÃO - MARKETPLACE - ${suffix} - ${stamp}.xlsx`
            : `PRECIFICAÇÃO - MARKETPLACE - ${stamp}.xlsx`;

        // -----------------------------
        // Requisição streaming ao backend
        // -----------------------------
        const response = await fetch("/api/marketplace/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          // ✅ Se houver seleção, manda "ids". Senão, manda "filtros" (original)
          body: JSON.stringify(
            isSelectionMode ? { ids: selectedIds } : { filtros: filtros || {} }
          ),
          signal,
        });

        if (!response.ok || !response.body) {
          const errJson = await response.json().catch(() => null);
          throw new Error(errJson?.error || "Falha ao iniciar exportação.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const base64Parts: string[] = [];
        let total = 0;
        let serverErrorMessage: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line) continue;

            if (line.startsWith("PROGRESS:")) {
              const p = JSON.parse(line.slice(9));
              onProgress?.(p);
              total = p.total || total;
            } else if (line.startsWith("CHUNK:")) {
              base64Parts.push(line.slice(6));
            } else if (line.startsWith("ERROR:")) {
              const e = JSON.parse(line.slice(6));
              serverErrorMessage = e.message || "Erro ao gerar planilha.";
            } else if (line.startsWith("DONE:")) {
              const d = JSON.parse(line.slice(5));
              total = d.total || total;
            }
          }
        }

        if (serverErrorMessage) {
          if (serverErrorMessage.includes("Nenhum dado")) {
            toastCustom.warning("Nada para exportar", serverErrorMessage);
            return;
          }
          throw new Error(serverErrorMessage);
        }

        if (base64Parts.length === 0) {
          toastCustom.warning(
            "Nada para exportar",
            "Nenhum dado disponível para gerar relatório."
          );
          return;
        }

        // -----------------------------
        // Decodifica base64 -> bytes -> Blob -> download
        // -----------------------------
        const base64 = base64Parts.join("");
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        saveAs(
          new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          fileName
        );

        // Notificação em paralelo — não bloqueia o fluxo de download
        createNotification({
          title: "Relatório Marketplace exportado",
          message: `O relatório "${fileName}" foi exportado com ${total} anúncio(s).`,
          action: "status",
          entityType: "marketplace_pricing_export",
          link: "/dashboard/marketplaces",
        }).catch((err) => console.error("[export] notification error:", err));

        toastCustom.success(
          "Exportação concluída!",
          "O download da planilha foi iniciado."
        );
        playImportSuccessSound(0.4);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          toastCustom.warning(
            "Exportação cancelada",
            "O processo foi interrompido pelo usuário."
          );
          return;
        }
        toastCustom.error(
          "Erro ao exportar",
          err?.message || "Falha ao gerar planilha."
        );
        throw err;
      }
    },
    [filtros, selectedIds] // ✅ selectedIds nas deps
  );

  // -----------------------------
  // IMPORT — ETAPA 1: leitura/validação (client-side, arquivo pequeno)
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

      // ✅ FIX: loop explícito por índice em vez de `sheet.eachRow`.
      // `eachRow` depende do estado interno de "linhas sujas" do ExcelJS e,
      // dependendo de como o arquivo foi salvo/reaberto (Excel, Google
      // Sheets, LibreOffice), pode pular linhas válidas silenciosamente —
      // resultando em "0 registros" sem nenhum erro reportado.
      const totalRows = sheet.actualRowCount || sheet.rowCount;

      for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
        const row = sheet.getRow(rowNumber);

        const rawId = extractCellValue(row.getCell(COL.ID));
        const rawLoja = extractCellValue(row.getCell(COL.LOJA));

        if (!rawId && !rawLoja) continue; // linha vazia

        const id = rawId ? String(rawId).trim() : "";

        if (!id || !UUID_REGEX.test(id)) {
          rowErrors.push({
            row: rowNumber,
            message: `ID inválido ou ausente na linha ${rowNumber}.`,
          });
          continue;
        }

        if (idsVistos.has(id)) {
          rowErrors.push({
            row: rowNumber,
            message: `ID duplicado na linha ${rowNumber}: "${id}".`,
          });
          continue;
        }
        idsVistos.add(id);

        const commissionRate = toNumber(extractCellValue(row.getCell(COL.COMISSAO)));
        const freight = toNumber(extractCellValue(row.getCell(COL.FRETE)));
        const profitMargin = toNumber(extractCellValue(row.getCell(COL.MARGEM)));
        const currentCost = toNumber(extractCellValue(row.getCell(COL.CUSTO)));
        const sellingPrice = toNumber(extractCellValue(row.getCell(COL.PRECO_VENDA)));

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
          continue;
        }

        if (commissionRate < 0 || commissionRate > 100) {
          rowErrors.push({
            row: rowNumber,
            field: "commission_rate",
            message: `Comissão fora do intervalo 0-100 na linha ${rowNumber}.`,
          });
          continue;
        }

        if (profitMargin < 0 || profitMargin > 100) {
          rowErrors.push({
            row: rowNumber,
            field: "profit_margin",
            message: `Margem de lucro fora do intervalo 0-100 na linha ${rowNumber}.`,
          });
          continue;
        }

        if (freight < 0 || currentCost < 0 || sellingPrice < 0) {
          rowErrors.push({
            row: rowNumber,
            message: `Valores negativos não são permitidos na linha ${rowNumber}.`,
          });
          continue;
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
          channel: extractCellValue(row.getCell(COL.CANAL)) ?? "",
          id_bling: extractCellValue(row.getCell(COL.ID_BLING)) ?? "",
          reference: extractCellValue(row.getCell(COL.REFERENCIA)) ?? "",
          product: extractCellValue(row.getCell(COL.PRODUTO)) ?? "",
          mark: extractCellValue(row.getCell(COL.MARCA)) ?? "",
          ...registro,
        });
      }

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
