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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function useMarketplaceImportExport(
  rows: Marketplace[],
  filtros?: ExportFiltros
) {
  // -----------------------------------------------------------------------
  // EXPORT — geração 100% no servidor (streaming), ideal para grandes
  // volumes (ex.: 70k+ linhas). O cliente apenas dispara a requisição,
  // lê o stream de progresso/dados e salva o arquivo final.
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

        // -----------------------------
        // Nome do arquivo
        // -----------------------------
        const partes: string[] = [];
        if (filtros?.loja && filtros.loja !== "Todos") partes.push(filtros.loja);
        if (filtros?.canal && filtros.canal !== "Todos") partes.push(filtros.canal);

        const middle = partes
          .join("-")
          .toUpperCase()
          .replace(/[\\/:*?"<>|]/g, "");
        const stamp = format(new Date(), "dd-MM-yyyy HH'h'mm", { locale: ptBR });
        const fileName =
          middle.length > 0
            ? `PRECIFICAÇÃO - MARKETPLACE - ${middle} - ${stamp}.xlsx`
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
          body: JSON.stringify({ filtros: filtros || {} }),
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
    [filtros]
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
