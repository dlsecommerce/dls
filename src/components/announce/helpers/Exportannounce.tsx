// ExportAnnounce.tsx
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";
import { supabase } from "@/integrations/supabase/client";

export type AnnounceRow = {
  Loja?: string | null;
  "ID Bling"?: string | number | null;
  Referência?: string | null;
  Produto?: string | null;
  Marca?: string | null;
  "Code ID"?: string | number | null;
  "Parent ID"?: string | null;
  [key: string]: unknown;
};

function ensureXlsxExtension(filename: string): string {
  const normalized = String(filename || "announce.xlsx").trim();
  if (normalized.toLowerCase().endsWith(".xlsx")) return normalized;
  return `${normalized}.xlsx`;
}

export type ExportProgressCallback = (percent: number) => void;

const CHUNK_SIZE = 500;

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Gera e faz download do XLSX de anúncios processando em lotes,
 * liberando a thread principal entre cada lote para não travar a UI.
 * Reporta progresso (0-100) via callback, se fornecido.
 */
export async function exportAnnounceToXlsx(
  rows: AnnounceRow[],
  filename = "announce.xlsx",
  onProgress?: ExportProgressCallback
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Nenhum anúncio encontrado para exportar.");
  }

  const XLSX = await import("xlsx-js-style");

  const headers = ["Loja", "ID Bling", "Referência", "Produto", "Marca", "Code ID", "Parent ID"];

  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const totalRows = rows.length;
  const data: any[][] = [headers];

  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      data.push([
        String(row["Loja"] ?? ""),
        String(row["ID Bling"] ?? ""),
        String(row["Referência"] ?? ""),
        String(row["Produto"] ?? ""),
        String(row["Marca"] ?? ""),
        row["Code ID"] ?? "",
        String(row["Parent ID"] ?? ""),
      ]);
    }

    const percent = Math.round(((i + chunk.length) / totalRows) * 80);
    onProgress?.(percent);

    await yieldToUI();
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  headers.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle;
  });

  onProgress?.(85);
  await yieldToUI();

  // Referência e ID Bling sempre como texto (evita perda de zeros à esquerda)
  for (let row = 1; row <= totalRows; row++) {
    const idBlingRef = XLSX.utils.encode_cell({ r: row, c: 1 });
    const referenciaRef = XLSX.utils.encode_cell({ r: row, c: 2 });
    const parentIdRef = XLSX.utils.encode_cell({ r: row, c: 6 });

    [idBlingRef, referenciaRef, parentIdRef].forEach((ref) => {
      if ((ws as any)[ref]) {
        (ws as any)[ref].t = "s";
        (ws as any)[ref].z = "@";
      }
    });

    if (row % CHUNK_SIZE === 0) {
      onProgress?.(85 + Math.round((row / totalRows) * 10));
      await yieldToUI();
    }
  }

  (ws as any)["!cols"] = [
    { wch: 22 }, // Loja
    { wch: 16 }, // ID Bling
    { wch: 20 }, // Referência
    { wch: 40 }, // Produto
    { wch: 18 }, // Marca
    { wch: 12 }, // Code ID
    { wch: 38 }, // Parent ID
  ];

  (ws as any)["!autofilter"] = { ref: `A1:G${totalRows + 1}` };

  onProgress?.(96);
  await yieldToUI();

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Announce");

  onProgress?.(98);
  await yieldToUI();

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeFilename = ensureXlsxExtension(filename);

  onProgress?.(100);
  saveAs(blob, safeFilename);

  try {
    await createNotification({
      title: "Planilha de anúncios exportada",
      message: `A planilha foi exportada com ${rows.length} anúncio(s).`,
      action: "status",
      entityType: "announce_export",
      link: "/dashboard/announce",
    });
  } catch (error) {
    console.error("Erro ao criar notificação da exportação:", error);
  }
}

// ---------------------------------------------------------------------
// ✅ NOVO — Planilha modelo (gerada 100% no client, mesmo padrão
// visual do export normal). Usada pelo botão "Baixar planilha modelo".
// Não depende de nenhum arquivo estático em /public.
// ---------------------------------------------------------------------
export async function exportAnnounceModelo(): Promise<void> {
  const XLSX = await import("xlsx-js-style");

  const headers = ["Loja", "ID Bling", "Referência", "Produto", "Marca", "Código ID"];
  const exampleRow = [
    "Pikot Shop",
    "16653222561",
    "FIS-19784",
    "Cooktop a Gás Fischer 5 Bocas Tripla Chama",
    "Fischer",
    "",
  ];

  const headerStyle = {
    fill: { type: "pattern", patternType: "solid", fgColor: { rgb: "1A8CEB" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  headers.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle;
  });

  // Referência e ID Bling como texto (evita perda de zeros à esquerda)
  ["B2", "C2"].forEach((ref) => {
    if ((ws as any)[ref]) {
      (ws as any)[ref].t = "s";
      (ws as any)[ref].z = "@";
    }
  });

  (ws as any)["!cols"] = [
    { wch: 15 }, // Loja
    { wch: 16 }, // ID Bling
    { wch: 18 }, // Referência
    { wch: 42 }, // Produto
    { wch: 16 }, // Marca
    { wch: 12 }, // Código ID
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const timePart = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");

  saveAs(blob, `MODELO - PLANILHA - ${datePart} ${timePart}.xlsx`);
}

// ---------------------------------------------------------------------
// Busca no servidor + export — usado quando os dados não vêm
// já filtrados/prontos em memória (ex.: exportar tudo, ou por loja)
// ---------------------------------------------------------------------
async function ensureValidSession(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema antes de exportar.");
  }
  return data.session.access_token;
}

function buildTimestampedFileName(prefix: string, extension: string): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const timePart = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
  return `${prefix} - ${datePart} ${timePart}.${extension}`;
}

type RawAnnounceRow = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  code_id: number | null;
};

function mapRawToDisplayRow(row: RawAnnounceRow): AnnounceRow {
  return {
    Loja: row.store,
    "ID Bling": row.id_bling,
    Referência: row.reference,
    Produto: row.product,
    Marca: row.mark,
    "Code ID": row.code_id,
  };
}

type ExportStreamEvent =
  | { type: "progress"; percent: number; processed?: number }
  | { type: "done"; percent: number; fileName: string; mimeType: string; fileBase64: string }
  | { type: "error"; error: string; code?: string | null };

/**
 * Converte uma string base64 em Blob, sem passar por atob em blocos
 * grandes de uma vez (evita travar a UI com strings muito longas).
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Busca os anúncios direto da API (respeitando RLS/sessão) e gera
 * o download. A API responde em streaming NDJSON (uma linha JSON
 * por evento), reportando progresso REAL conforme processa no
 * servidor (busca no banco + geração do arquivo), e entrega o
 * arquivo final (em base64) no último evento ("done").
 */
export async function exportAnnounceFromApi(
  options: {
    store?: string;
    format?: "xlsx" | "csv";
    signal?: AbortSignal;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<void> {
  const { store, format = "xlsx", signal } = options;

  onProgress?.(0);

  const accessToken = await ensureValidSession();

  const params = new URLSearchParams();
  if (store) params.set("store", store);
  params.set("format", format);

  const response = await fetch(`/api/announce/export?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Não foi possível exportar os anúncios.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      const event = JSON.parse(line) as ExportStreamEvent;

      if (event.type === "progress") {
        onProgress?.(event.percent);
        await yieldToUI();
      } else if (event.type === "error") {
        throw new Error(event.error);
      } else if (event.type === "done") {
        onProgress?.(100);

        const blob = base64ToBlob(event.fileBase64, event.mimeType);
        saveAs(blob, event.fileName);

        try {
          await createNotification({
            title: "Planilha de anúncios exportada",
            message: store
              ? `A planilha da loja "${store}" foi exportada com sucesso.`
              : "A planilha de anúncios foi exportada com sucesso.",
            action: "status",
            entityType: "announce_export",
            link: "/dashboard/announce",
          });
        } catch (error) {
          console.error("Erro ao criar notificação da exportação:", error);
        }
      }
    }
  }
}

export { mapRawToDisplayRow, buildTimestampedFileName };
export default exportAnnounceToXlsx;
