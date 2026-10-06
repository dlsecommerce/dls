"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Menu, SlidersHorizontal, X as XIcon, Download } from "lucide-react";

import AnnounceActions from "@/components/announce/Announceactions";
import AnnounceDataTable from "@/components/announce/Announcedatatable";
import AnnounceFilters from "@/components/announce/Announcefilters";
import AnnounceLocation from "@/components/announce/Announcelocation";
import ConfirmDelete from "@/components/announce/Confirmdelete";
import ConfirmImportModal, { RowError, ImportResult } from "@/components/announce/Confirmimport";
import ImportComposicaoModal, {
  ImportMode as ComposicaoImportMode,
} from "@/components/announce/Importcomposicaomodal";
import { Controls } from "@/components/announce/Controls";
import ExportProgressToast from "@/components/announce/Exportprogresstoast";
import ImportProgressToast from "@/components/announce/Importprogresstoast";
import ExportComposicaoProgressToast from "@/components/announce/Exportprogresstoast";
import ProductEditModal from "@/components/announce/Producteditmodal";
import ValidateAds from "@/components/announce/ValidateAds";

import {
  Announce as AnnounceRow,
  AnnounceFilters as AnnounceFiltersType,
  DEFAULT_ANUNCIO_FILTERS,
  TIPO_TO_FILTER_VALUE,
  TipoOption,
} from "@/components/announce/hooks/types";

import {
  useAnnounce,
  fetchDistinctBrands,
  AnnounceTypeFilter,
  AnnounceSituacaoFilter,
  AnnounceSortField,
  AnnounceSortDir,
} from "@/components/announce/hooks/useannounce";

import { useChannels } from "@/components/announce/hooks/usechannels";

import {
  importAnnounceFromXlsxOrCsv,
  ImportProgress,
} from "@/components/announce/helpers/Importannounce";

import {
  exportAnnounceFromApi,
  exportAnnounceModelo,
} from "@/components/announce/helpers/Exportannounce";

import { playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────
 * HELPERS — Autenticação para chamadas fetch manuais
 * ───────────────────────────────────────────── */

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema.");
  }

  return token;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Extrai o nome real do arquivo a partir do header Content-Disposition
 * enviado pelo servidor (ex: "COMPOSIÇÃO - 16-09-2026 10h41min.xlsx").
 */
function extractFilenameFromHeader(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // segue para o fallback abaixo
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return asciiMatch?.[1] ?? null;
}

type BlingLoja = "sobaquetas" | "pikot";

/** Converte o filtro de loja ("Pikot Shop", "Sóbaquetas"...) para o valor que a rota espera. */
function getBlingLoja(store?: string): BlingLoja {
  return store?.toLowerCase().includes("pikot") ? "pikot" : "sobaquetas";
}

/* ─────────────────────────────────────────────
 * Erros da importação de COMPOSIÇÃO
 * ───────────────────────────────────────────── */

type ComposicaoRowError = {
  linha: number | null;
  idBling: string | null;
  store: string | null;
  reference: string | null;
  code: string | null;
  motivo: string;
  origem: "validacao" | "banco";
};

function buildComposicaoRowErrors(result: any): ComposicaoRowError[] {
  const rows: ComposicaoRowError[] = [];

  const skipped = Array.isArray(result?.skippedDetails) ? result.skippedDetails : [];
  for (const item of skipped) {
    rows.push({
      linha: item?.linha ?? null,
      idBling: item?.id_bling ?? item?.idBling ?? null,
      store: item?.store ?? null,
      reference: item?.reference ?? null,
      code: item?.code ?? null,
      motivo: item?.motivo ?? item?.message ?? "Linha rejeitada na validação.",
      origem: "validacao",
    });
  }

  const dbErrors = Array.isArray(result?.errors) ? result.errors : [];
  for (const item of dbErrors) {
    if (typeof item === "string") {
      rows.push({
        linha: null,
        idBling: null,
        store: null,
        reference: null,
        code: null,
        motivo: item,
        origem: "banco",
      });
      continue;
    }

    rows.push({
      linha: item?.linha ?? null,
      idBling: item?.id_bling ?? item?.idBling ?? null,
      store: item?.store ?? null,
      reference: item?.reference ?? null,
      code: item?.code ?? null,
      motivo: item?.motivo ?? item?.message ?? "Erro ao processar no banco.",
      origem: "banco",
    });
  }

  return rows;
}

function downloadComposicaoErrorsCsv(rows: ComposicaoRowError[]) {
  const header = ["Linha", "ID Bling", "Loja", "Referência", "Código", "Origem", "Motivo"];
  const lines = rows.map((r) =>
    [
      r.linha ?? "",
      r.idBling ?? "",
      r.store ?? "",
      r.reference ?? "",
      r.code ?? "",
      r.origem === "validacao" ? "Validação" : "Banco de dados",
      r.motivo,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );

  const csv = "\uFEFF" + [header.join(";"), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `erros-importacao-composicao-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ComposicaoErrorsModal({
  open,
  onClose,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  rows: ComposicaoRowError[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div className="absolute left-1/2 top-1/2 flex max-h-[85vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col border border-neutral-800 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">
              Importação de composição
            </p>
            <h2 className="text-lg font-semibold text-white">
              {rows.length} linha(s) com erro
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadComposicaoErrorsCsv(rows)}
              className="flex h-9 items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium uppercase tracking-wide text-neutral-300 hover:border-[#1a8ceb]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
            >
              <Download className="h-3.5 w-3.5 text-[#1a8ceb]" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-9 w-9 items-center justify-center border border-neutral-800 text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0a0a0a]">
              <tr className="border-b border-neutral-900 text-neutral-500">
                <th className="px-3 py-2 font-medium">Linha</th>
                <th className="px-3 py-2 font-medium">ID Bling</th>
                <th className="px-3 py-2 font-medium">Loja</th>
                <th className="px-3 py-2 font-medium">Referência</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-neutral-900/60 text-neutral-300">
                  <td className="px-3 py-2">{r.linha ?? "—"}</td>
                  <td className="px-3 py-2">{r.idBling ?? "—"}</td>
                  <td className="px-3 py-2">{r.store ?? "—"}</td>
                  <td className="px-3 py-2">{r.reference ?? "—"}</td>
                  <td className="px-3 py-2">{r.code ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.origem === "validacao"
                          ? "text-amber-400"
                          : "text-red-400"
                      }
                    >
                      {r.origem === "validacao" ? "Validação" : "Banco"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Announce() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = React.useState<AnnounceFiltersType>(
    DEFAULT_ANUNCIO_FILTERS
  );
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = React.useState<AnnounceFiltersType>(
    DEFAULT_ANUNCIO_FILTERS
  );
  const [appliedBrands, setAppliedBrands] = React.useState<string[]>([]);

  const storeValue =
    appliedFilters.loja !== "Todos" ? appliedFilters.loja : undefined;

  // Loja usada nos botões "Bling" e "Fretes Mercado Livre".
  const blingLoja = getBlingLoja(storeValue);

  // ✅ Exportação Bling (toast fica na página, igual às outras exportações)
  const [exportingBling, setExportingBling] = React.useState(false);
  const [blingOpen, setBlingOpen] = React.useState(false);
  const [blingProgress, setBlingProgress] = React.useState(0);
  const [blingCurrent, setBlingCurrent] = React.useState<number | undefined>();
  const [blingTotal, setBlingTotal] = React.useState<number | undefined>();

  const handleExportBling = async () => {
    if (exportingBling) return;

    setExportingBling(true);
    setBlingProgress(0);
    setBlingCurrent(undefined);
    setBlingTotal(undefined);
    setBlingOpen(true);

    try {
      const token = await getAccessToken();

      const r = await fetch(
        `/api/announce/export?source=bling&loja=${blingLoja}&format=xlsx`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!r.ok || !r.body) {
        throw new Error(await extractErrorMessage(r, "Erro ao exportar."));
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let buffer = "";
      let fileName = "bling-anuncios.xlsx";
      let mimeType = "application/octet-stream";
      let finished = false;
      let lastTotal: number | undefined;

      const handleLine = (line: string) => {
        if (!line.trim()) return; // ignora o preâmbulo de espaços
        const msg = JSON.parse(line);

        if (msg.type === "progress") {
          setBlingProgress(msg.percent);
          if (typeof msg.current === "number") setBlingCurrent(msg.current);
          if (typeof msg.total === "number") {
            lastTotal = msg.total;
            setBlingTotal(msg.total);
          }
        } else if (msg.type === "chunk") {
          chunks[msg.index] = msg.data;
        } else if (msg.type === "error") {
          throw new Error(msg.error);
        } else if (msg.type === "done") {
          fileName = msg.fileName;
          mimeType = msg.mimeType;
          finished = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      if (buffer.trim()) handleLine(buffer);
      if (!finished) throw new Error("Exportação interrompida.");

      const bin = atob(chunks.join(""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setBlingProgress(100);
      if (lastTotal !== undefined) setBlingCurrent(lastTotal);
    } catch (err: any) {
      console.error("Erro ao exportar planilha Bling:", err);
      setBlingProgress(0);
      setBlingOpen(false);
      toastCustom.error(err?.message ?? "Não foi possível exportar a planilha Bling.");
    } finally {
      setExportingBling(false);
      setTimeout(() => {
        setBlingOpen(false);
        setBlingProgress(0);
        setBlingCurrent(undefined);
        setBlingTotal(undefined);
      }, 2000); // deixa o 100% visível
    }
  };

  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const sortByField: AnnounceSortField | undefined =
    sortColumn as AnnounceSortField | undefined;
  const sortDirValue: AnnounceSortDir | undefined = sortColumn
    ? sortDirection
    : undefined;

  const {
    announces,
    loading,
    error,
    refetch,
    handleDelete,
    handleDeleteSelected,
    handleRestoreSelected,
    deleting,

    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,

    fetchAllMatchingIds,
  } = useAnnounce({
    store: storeValue,
    search: appliedFilters.codigo || appliedFilters.produto || undefined,
    type: TIPO_TO_FILTER_VALUE[appliedFilters.tipo] as AnnounceTypeFilter,
    situacao: appliedFilters.situacao as AnnounceSituacaoFilter,
    sortBy: sortByField,
    sortDir: sortDirValue,
    marks: appliedBrands,
  });

  const paginatedRows = announces;

  const [allBrands, setAllBrands] = React.useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = React.useState(false);

  const { channels: availableChannels, loading: loadingChannels } = useChannels();

  React.useEffect(() => {
    let active = true;
    setBrandsLoading(true);

    fetchDistinctBrands()
      .then((brands) => {
        if (active) setAllBrands(brands);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBrandsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentPage = page + 1;

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setAppliedBrands(selectedBrands);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_ANUNCIO_FILTERS);
    setSelectedBrands([]);
    setAppliedFilters(DEFAULT_ANUNCIO_FILTERS);
    setAppliedBrands([]);
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
    setPage(0);
  };

  const [selectedRows, setSelectedRows] = React.useState<AnnounceRow[]>([]);
  const [selectAllMatchingActive, setSelectAllMatchingActive] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const currentPageIds = React.useMemo(
    () => new Set(paginatedRows.map((r) => r.id)),
    [paginatedRows]
  );

  const allSelected =
    paginatedRows.length > 0 &&
    Array.from(currentPageIds).every((id) =>
      selectedRows.some((r) => r.id === id)
    );

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAllMatchingActive(false);

    if (checked) {
      setSelectedRows((prev) => {
        const map = new Map(prev.map((r) => [r.id, r]));
        paginatedRows.forEach((r) => map.set(r.id, r as any));
        return Array.from(map.values());
      });
    } else {
      setSelectedRows((prev) => prev.filter((r) => !currentPageIds.has(r.id)));
    }
  };

  const [selectingAll, setSelectingAll] = React.useState(false);

  const handleSelectAllTable = async () => {
    setSelectingAll(true);
    try {
      const rows = await fetchAllMatchingIds();
      setSelectedRows(
        rows.map((r) => ({ id: r.id, deleted_at: r.deleted_at } as any))
      );
      setSelectAllMatchingActive(true);
    } catch (err) {
      // erro já tratado/logado dentro do hook via toast, se necessário
    } finally {
      setSelectingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedRows([]);
    setSelectAllMatchingActive(false);
  };

  const [openDelete, setOpenDelete] = React.useState(false);

  const deleteSelected = async () => {
    if (selectedRows.length === 1) {
      await handleDelete(selectedRows[0] as any, () => {
        setSelectedRows([]);
        setSelectAllMatchingActive(false);
      });
    } else if (selectedRows.length > 1) {
      await handleDeleteSelected(selectedRows as any[], () => {
        setSelectedRows([]);
        setSelectAllMatchingActive(false);
      });
    }
    setOpenDelete(false);
  };

  const restoreSelectedRows = async () => {
    await handleRestoreSelected(selectedRows as any[], () => {
      setSelectedRows([]);
      setSelectAllMatchingActive(false);
    });
  };

  const [exporting, setExporting] = React.useState(false);
  const [exportProgressOpen, setExportProgressOpen] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [exportProgressCount, setExportProgressCount] = React.useState(0);
  const cancelExportRef = React.useRef(false);
  const totalCountRef = React.useRef(totalCount);
  const exportAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  const handleExport = async () => {
    cancelExportRef.current = false;
    const controller = new AbortController();
    exportAbortRef.current = controller;

    const hasSelection = selectedRows.length > 0;
    const selectedIds = selectedRows.map((r) => r.id);

    setExporting(true);
    setExportProgressOpen(true);
    setExportProgress(0);
    setExportProgressCount(0);

    if (hasSelection) {
      totalCountRef.current = selectedIds.length;
    }

    try {
      await exportAnnounceFromApi(
        {
          ids: hasSelection ? selectedIds : undefined,
          store: hasSelection ? undefined : storeValue,
          format: "xlsx",
          signal: controller.signal,
        },
        (percent) => {
          if (cancelExportRef.current) return;
          setExportProgress(percent);
          setExportProgressCount(
            Math.round((percent / 100) * totalCountRef.current)
          );
        }
      );

      if (!cancelExportRef.current) {
        setExportProgress(100);
        setExportProgressCount(totalCountRef.current);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Erro ao exportar anúncios:", err);
      }
      setExportProgress(0);
    } finally {
      setExporting(false);
      setTimeout(() => {
        if (!cancelExportRef.current) setExportProgressOpen(false);
      }, 1500);
    }
  };

  const handleExportModelo = async () => {
    try {
      await exportAnnounceModelo();
    } catch (err) {
      console.error("Erro ao gerar planilha modelo:", err);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Exportação de fretes do Mercado Livre
  const [exportingFretesML, setExportingFretesML] = React.useState(false);
  const [fretesOpen, setFretesOpen] = React.useState(false);
  const [fretesProgress, setFretesProgress] = React.useState(0);
  const [fretesCurrent, setFretesCurrent] = React.useState<number | undefined>();
  const [fretesTotal, setFretesTotal] = React.useState<number | undefined>();

  const handleExportFretesML = async () => {
    if (exportingFretesML) return;
    setExportingFretesML(true);
    setFretesProgress(0);
    setFretesCurrent(undefined);
    setFretesTotal(undefined);
    setFretesOpen(true);

    try {
      await exportAnnounceFromApi(
        { source: "frete", loja: blingLoja, format: "xlsx" },
        (percent, current, total) => {
          setFretesProgress(percent);
          if (typeof current === "number") setFretesCurrent(current);
          if (typeof total === "number") setFretesTotal(total);
        }
      );
      setFretesProgress(100);
    } catch (err: any) {
      console.error("Erro ao exportar fretes ML:", err);
      setFretesProgress(0);
      setFretesOpen(false);
      toastCustom.error(
        err?.message ?? "Não foi possível exportar os fretes do Mercado Livre."
      );
    } finally {
      setExportingFretesML(false);
      setTimeout(() => {
        setFretesOpen(false);
        setFretesProgress(0);
        setFretesCurrent(undefined);
        setFretesTotal(undefined);
      }, 2000);
    }
  };

  const [exportingModeloComposicao, setExportingModeloComposicao] = React.useState(false);

  const handleExportModeloComposicao = async () => {
    if (exportingModeloComposicao) return;
    setExportingModeloComposicao(true);

    try {
      const token = await getAccessToken();

      const hasSelection = selectedRows.length > 0;
      const searchTerm = appliedFilters.codigo || appliedFilters.produto || undefined;

      let res: Response;

      if (hasSelection) {
        res = await fetch("/api/composicao/export-modelo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: selectedRows.map((r) => r.id) }),
        });
      } else {
        const params = new URLSearchParams();
        if (storeValue) params.set("store", storeValue);
        if (searchTerm) params.set("search", searchTerm);
        params.set("type", TIPO_TO_FILTER_VALUE[appliedFilters.tipo] as string);
        if (appliedBrands.length > 0) params.set("marks", appliedBrands.join(","));

        res = await fetch(`/api/composicao/export-modelo?${params.toString()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(res, "Falha ao gerar planilha modelo de composição.")
        );
      }

      const blob = await res.blob();

      const filename =
        extractFilenameFromHeader(res.headers.get("Content-Disposition")) ??
        "modelo-composicao.xlsx";

      downloadBlob(blob, filename);
    } catch (err: any) {
      console.error("Erro ao gerar modelo de composição:", err);
      toastCustom.error(
        err?.message ?? "Não foi possível gerar a planilha modelo de composição."
      );
    } finally {
      setExportingModeloComposicao(false);
    }
  };

  const [exportingComposicao, setExportingComposicao] = React.useState(false);
  const [exportComposicaoProgressOpen, setExportComposicaoProgressOpen] = React.useState(false);
  const [exportComposicaoProgress, setExportComposicaoProgress] = React.useState(0);

  const handleExportComposicao = async () => {
    if (exportingComposicao) return;
    setExportingComposicao(true);
    setExportComposicaoProgressOpen(true);
    setExportComposicaoProgress(0);

    try {
      setExportComposicaoProgress(30);

      const token = await getAccessToken();

      const hasSelection = selectedRows.length > 0;
      const searchTerm = appliedFilters.codigo || appliedFilters.produto || undefined;

      let res: Response;

      if (hasSelection) {
        res = await fetch("/api/composicao/export", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: selectedRows.map((r) => r.id) }),
        });
      } else {
        const params = new URLSearchParams();
        if (storeValue) params.set("store", storeValue);
        if (searchTerm) params.set("search", searchTerm);
        params.set("type", TIPO_TO_FILTER_VALUE[appliedFilters.tipo] as string);
        if (appliedBrands.length > 0) params.set("marks", appliedBrands.join(","));

        res = await fetch(`/api/composicao/export?${params.toString()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setExportComposicaoProgress(70);

      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Falha ao exportar composições."));
      }

      const blob = await res.blob();

      const filename =
        extractFilenameFromHeader(res.headers.get("Content-Disposition")) ??
        "composicoes.xlsx";

      downloadBlob(blob, filename);
      setExportComposicaoProgress(100);
    } catch (err: any) {
      console.error("Erro ao exportar composições:", err);
      toastCustom.error(err?.message ?? "Não foi possível exportar as composições.");
      setExportComposicaoProgress(0);
    } finally {
      setExportingComposicao(false);
      setTimeout(() => setExportComposicaoProgressOpen(false), 1500);
    }
  };

  const [importingComposicao, setImportingComposicao] = React.useState(false);
  const [composicaoProgressOpen, setComposicaoProgressOpen] = React.useState(false);
  const [composicaoProgress, setComposicaoProgress] = React.useState(0);
  const [composicaoProgressCount, setComposicaoProgressCount] = React.useState(0);

  const [composicaoErrorsModalOpen, setComposicaoErrorsModalOpen] = React.useState(false);
  const [composicaoErrorRows, setComposicaoErrorRows] = React.useState<ComposicaoRowError[]>([]);

  const [composicaoModalOpen, setComposicaoModalOpen] = React.useState(false);
  const [pendingComposicaoFile, setPendingComposicaoFile] = React.useState<File | null>(
    null
  );

  const handleSelectComposicaoFile = (file: File) => {
    setPendingComposicaoFile(file);
    setComposicaoModalOpen(true);
  };

  const handleImportComposicao = async (
    file: File,
    mode: ComposicaoImportMode
  ) => {
    setImportingComposicao(true);
    setComposicaoProgressOpen(true);
    setComposicaoProgress(0);
    setComposicaoProgressCount(0);
    setComposicaoErrorRows([]);

    try {
      const token = await getAccessToken();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      setComposicaoProgress(30);

      const res = await fetch("/api/composicao/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setComposicaoProgress(80);

      const result = await res.json();

      if (!res.ok || !result.success) {
        const detailed = buildComposicaoRowErrors(result);
        setComposicaoProgress(0);

        toastCustom.error(
          detailed.length > 0
            ? `${detailed.length} linha(s) com erro na importação de composição.`
            : result?.error ?? "Não foi possível importar a composição."
        );

        if (detailed.length > 0) {
          setComposicaoErrorRows(detailed);
          setComposicaoErrorsModalOpen(true);
        }
        return;
      }

      setComposicaoProgress(100);
      setComposicaoProgressCount(result.processed ?? 0);

      if (result.processed > 0) {
        playImportSuccessSound();
        toastCustom.success(
          mode === "replace"
            ? `${result.processed} composição(ões) substituída(s) com sucesso.`
            : `${result.processed} composição(ões) atualizada(s) com sucesso.`
        );
      }

      const detailed = buildComposicaoRowErrors(result);
      if (detailed.length > 0) {
        toastCustom.error(`${detailed.length} linha(s) não foram processadas.`);
        setComposicaoErrorRows(detailed);
        setComposicaoErrorsModalOpen(true);
      }

      refetch();
    } catch (err: any) {
      console.error("Erro ao importar composição:", err);
      setComposicaoProgress(0);
      toastCustom.error(
        err?.message ?? "Não foi possível importar a composição."
      );
    } finally {
      setImportingComposicao(false);
      setTimeout(() => setComposicaoProgressOpen(false), 1500);
    }
  };

  const handleConfirmImportComposicao = async (mode: ComposicaoImportMode) => {
    if (!pendingComposicaoFile) {
      setComposicaoModalOpen(false);
      return;
    }

    await handleImportComposicao(pendingComposicaoFile, mode);

    setComposicaoModalOpen(false);
    setPendingComposicaoFile(null);
  };

  const [openImport, setOpenImport] = React.useState(false);
  const [importCount, setImportCount] = React.useState(0);
  const [previewRows, setPreviewRows] = React.useState<any[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importRowErrors, setImportRowErrors] = React.useState<RowError[]>([]);
  const [importMode, setImportMode] = React.useState<"inclusao" | "alteracao">(
    "inclusao"
  );
  const [importProgressOpen, setImportProgressOpen] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importProgressCount, setImportProgressCount] = React.useState(0);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(
    null
  );
  const [importChannels, setImportChannels] = React.useState<string[]>([]);

  const [importChannelRowAssignments, setImportChannelRowAssignments] =
    React.useState<Record<string, number[]>>({});

  const runImportPreview = async (
    file: File,
    tipo: "inclusao" | "alteracao"
  ) => {
    setImportMode(tipo);
    setImporting(true);
    setWarnings([]);
    setImportErrors([]);
    setImportRowErrors([]);
    setPreviewRows([]);
    setImportCount(0);
    setImportResult(null);
    setImportChannelRowAssignments({});

    try {
      const result: any = await importAnnounceFromXlsxOrCsv(file, true);

      const autoAssignments: Record<string, number[]> = {};
      const canaisNaoEncontrados = new Set<string>();
      const nomesValidos = new Set(
        (availableChannels ?? []).map((c: any) =>
          String(c?.name ?? c).trim().toLowerCase()
        )
      );

      result.data.forEach((row: any, idx: number) => {
        const canaisLinha: string[] = Array.isArray(row.channelsFromSheet)
          ? row.channelsFromSheet
          : [];

        for (const canal of canaisLinha) {
          const canalNormalizado = canal.trim();
          const existeNaLista = nomesValidos.has(canalNormalizado.toLowerCase());

          if (!existeNaLista) {
            canaisNaoEncontrados.add(canalNormalizado);
            continue;
          }

          if (!autoAssignments[canalNormalizado]) {
            autoAssignments[canalNormalizado] = [];
          }
          autoAssignments[canalNormalizado].push(idx);
        }
      });

      const warningsFinais = [...(result.warnings ?? [])];

      if (canaisNaoEncontrados.size > 0) {
        warningsFinais.push(
          `Os seguintes canais informados na planilha não foram reconhecidos e serão ignorados: ${Array.from(
            canaisNaoEncontrados
          ).join(", ")}. Verifique se o nome está exatamente igual ao cadastrado no sistema.`
        );
      }

      if (Object.keys(autoAssignments).length > 0) {
        setImportChannelRowAssignments(autoAssignments);
      }

      setPendingFile(file);
      setPreviewRows(result.data.slice(0, 50));
      setImportCount(result.data.length);
      setWarnings(warningsFinais);
      setImportErrors(result.errors ?? []);
      setImportRowErrors(result.rowErrors ?? []);
      setOpenImport(true);
    } catch (err: any) {
      setWarnings([]);
      setImportErrors([err?.message ?? "Não foi possível ler o arquivo."]);
      setImportRowErrors([]);
      setPreviewRows([]);
      setImportCount(0);
      setOpenImport(true);
    } finally {
      setImporting(false);
    }
  };

  const handleImportInclusao = async (file: File) => {
    await runImportPreview(file, "inclusao");
  };

  const handleImportAlteracao = async (file: File) => {
    await runImportPreview(file, "alteracao");
  };

  const confirmImport = async () => {
    if (!pendingFile) {
      setOpenImport(false);
      return;
    }

    setImporting(true);
    setImportProgressOpen(true);
    setImportProgress(0);
    setImportProgressCount(0);
    setImportResult(null);

    try {
      const result: any = await importAnnounceFromXlsxOrCsv(
        pendingFile,
        false,
        (progress: ImportProgress) => {
          const percent =
            progress.total > 0
              ? Math.round((progress.processed / progress.total) * 100)
              : 0;
          setImportProgress(percent);
          setImportProgressCount(progress.processed);
        },
        importMode,
        importChannels,
        importChannelRowAssignments
      );

      setImportProgress(100);
      setImportProgressCount(result.data.length);

      const hasErrors = (result.errosCount ?? 0) > 0 || (result.errors?.length ?? 0) > 0;
      const importedCount = result.importados ?? 0;
      const rejeitadosCount =
        result.rejeitados ?? Math.max((result.total ?? 0) - importedCount, 0);

      setImportResult({
        total: result.total ?? result.data.length,
        importados: importedCount,
        rejeitados: rejeitadosCount,
      });

      if (hasErrors) {
        const totalErros = result.errosCount ?? result.errors?.length ?? 0;
        toastCustom.error(
          `${totalErros} registro(s) não foram processados.`,
          "Veja os detalhes no resumo da importação."
        );
      }

      if (importedCount > 0) {
        playImportSuccessSound();

        toastCustom.success(
          importMode === "alteracao"
            ? `${importedCount} anúncio(s) alterado(s) com sucesso.`
            : `${importedCount} anúncio(s) importado(s) com sucesso.`
        );
      }

      setWarnings(result.warnings ?? []);
      setImportErrors(result.errors ?? []);
      setImportRowErrors(result.rowErrors ?? []);

      setOpenImport(false);
      setPendingFile(null);
      refetch();
    } catch (err: any) {
      const message = err?.message ?? "Não foi possível importar os anúncios.";
      setImportErrors([message]);
      toastCustom.error(message);
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgressOpen(false), 1500);
    }
  };

  const [openFiltersMobile, setOpenFiltersMobile] = React.useState(false);
  const [openActionsMobile, setOpenActionsMobile] = React.useState(false);
  const [openValidateAds, setOpenValidateAds] = React.useState(false);

  const editId = searchParams.get("id");
  const editLoja = searchParams.get("loja");
  const isCreating = searchParams.has("new");
  const isEditOpen = searchParams.has("id") || isCreating;

  const openEditModal = React.useCallback(
    (row: AnnounceRow) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      params.set("id", String(row.id));
      params.set("loja", row.store);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const openCreateModal = React.useCallback(() => {
    const storeParaNovo = storeValue ?? "Pikot Shop";

    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.set("new", "1");
    params.set("loja", storeParaNovo);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, storeValue]);

  const closeEditModal = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.delete("loja");
    params.delete("new");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const handleDeleteOne = (row: AnnounceRow) => {
    setSelectedRows([row]);
    setSelectAllMatchingActive(false);
    setOpenDelete(true);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedRows.length === 0) return;
    setOpenDelete(true);
  };

  const handleSituacaoChange = (value: string) => {
    setFilters((prev) => ({ ...prev, situacao: value }));
    setAppliedFilters((prev) => ({ ...prev, situacao: value }));
    setSortColumn(null);
    setSortDirection("asc");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 selection:bg-[#1a8ceb]/20">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="border-b border-neutral-900 bg-[#050505] px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between gap-2">
              <AnnounceLocation
                path={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Anúncios" },
                ]}
              />

              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setOpenFiltersMobile(true)}
                  aria-label="Abrir filtros"
                  className="flex h-9 items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium uppercase tracking-wide text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#1a8ceb]" />
                  Filtros
                </button>

                <button
                  type="button"
                  onClick={() => setOpenActionsMobile(true)}
                  aria-label="Abrir ações"
                  className="flex h-9 items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 text-xs font-medium uppercase tracking-wide text-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                >
                  <Menu className="h-3.5 w-3.5 text-[#1a8ceb]" />
                  Ações
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 lg:px-6">
            <div className="hidden lg:block">
              <AnnounceFilters
                filters={filters}
                setFilters={setFilters}
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={loading || brandsLoading}
              />
            </div>

            <div className="mt-3 overflow-hidden border border-neutral-900 bg-[#0a0a0a] lg:mt-0 lg:border-t-0">
              <AnnounceDataTable
                rows={paginatedRows as any}
                loading={loading}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                copiedId={copiedId}
                handleCopy={handleCopy}
                openEdit={openEditModal}
                openDeleteOne={handleDeleteOne}
                allSelected={allSelected}
                situacao={filters.situacao}
                appliedSituacao={appliedFilters.situacao}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggleSelectAll={handleToggleSelectAll}
                onSituacaoChange={handleSituacaoChange}
                onSort={handleSort}
                onDeleteSelected={handleDeleteSelectedClick}
                onRestoreSelected={restoreSelectedRows}
                onClearSelection={handleClearSelection}
                onSelectAllTable={handleSelectAllTable}
                selectingAll={selectingAll}
              />

              <div className="border-t border-neutral-900 pb-24 lg:pb-0">
                <Controls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={pageSize}
                  totalItems={totalCount}
                  onPageChange={(p) => setPage(p - 1)}
                  onItemsPerPageChange={(v) => {
                    setPageSize(v);
                    setPage(0);
                  }}
                  selectedCount={selectedRows.length}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:block border-l border-neutral-900">
          <div className="fixed right-0 top-0 h-screen w-[280px] overflow-y-auto bg-[#050505] pt-24">
            <div className="px-5 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a8ceb]/80">
                Ações
              </span>
            </div>

            <AnnounceActions
              exporting={exporting}
              handleExport={handleExport}
              onOpenCreate={openCreateModal}
              onExportModelo={handleExportModelo}
              onImportInclusao={handleImportInclusao}
              onImportAlteracao={handleImportAlteracao}
              onValidarComposicao={() => setOpenValidateAds(true)}
              onExportModeloComposicao={handleExportModeloComposicao}
              onExportComposicao={handleExportComposicao}
              onImportComposicao={handleSelectComposicaoFile}
              onExportBling={handleExportBling}
              exportingBling={exportingBling}
              onExportFretesML={handleExportFretesML}
              exportingFretesML={exportingFretesML}
              totalCount={totalCount}
            />
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setOpenActionsMobile(true)}
        aria-label="Abrir ações"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[#1a8ceb]/40 bg-[#0a0a0a] text-[#1a8ceb] active:scale-95 lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {openFiltersMobile && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenFiltersMobile(false)}
            aria-label="Fechar filtros"
          />

          <div className="absolute left-0 top-0 h-full w-[92vw] max-w-[420px] overflow-y-auto border-r border-neutral-900 bg-[#050505] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-900 bg-[#050505]/95 px-4 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#1a8ceb]/80">
                  Refinar busca
                </p>
                <h2 className="text-lg font-semibold text-white">Filtros</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpenFiltersMobile(false)}
                aria-label="Fechar filtros"
                className="flex h-9 w-9 items-center justify-center border border-neutral-800 text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <AnnounceFilters
              filters={filters}
              setFilters={setFilters}
              allBrands={allBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={loading || brandsLoading}
            />
          </div>
        </div>
      )}

      {openActionsMobile && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenActionsMobile(false)}
            aria-label="Fechar ações"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-y-auto border-t border-neutral-900 bg-[#050505] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-900 bg-[#050505]/95 px-4 py-4">
              <div className="mx-auto mb-3 h-1 w-10 bg-neutral-800" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#1a8ceb]/80">
                    Central de ações
                  </p>
                  <h2 className="text-lg font-semibold text-white">Ações</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenActionsMobile(false)}
                  aria-label="Fechar ações"
                  className="flex h-9 w-9 items-center justify-center border border-neutral-800 text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <AnnounceActions
                exporting={exporting}
                handleExport={() => {
                  setOpenActionsMobile(false);
                  handleExport();
                }}
                onOpenCreate={() => {
                  setOpenActionsMobile(false);
                  openCreateModal();
                }}
                onExportModelo={() => {
                  setOpenActionsMobile(false);
                  handleExportModelo();
                }}
                onImportInclusao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportInclusao(file);
                }}
                onImportAlteracao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportAlteracao(file);
                }}
                onValidarComposicao={() => {
                  setOpenActionsMobile(false);
                  setOpenValidateAds(true);
                }}
                onExportModeloComposicao={() => {
                  setOpenActionsMobile(false);
                  handleExportModeloComposicao();
                }}
                onExportComposicao={() => {
                  setOpenActionsMobile(false);
                  handleExportComposicao();
                }}
                onImportComposicao={(file) => {
                  setOpenActionsMobile(false);
                  handleSelectComposicaoFile(file);
                }}
                onExportBling={() => {
                  setOpenActionsMobile(false);
                  handleExportBling();
                }}
                onExportFretesML={() => {
                  setOpenActionsMobile(false);
                  handleExportFretesML();
                }}
                exportingBling={exportingBling}
                exportingFretesML={exportingFretesML}
                totalCount={totalCount}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDelete
        open={openDelete}
        onOpenChange={setOpenDelete}
        count={selectedRows.length}
        onConfirm={deleteSelected}
        loading={deleting}
        title="Excluir Anúncio(s)"
        itemLabel="anúncio selecionado"
        itemLabelPlural="anúncios selecionados"
      />

      <ConfirmImportModal
        open={openImport}
        onOpenChange={(open) => {
          setOpenImport(open);
          if (!open) {
            setPendingFile(null);
            setImportResult(null);
            setImportChannelRowAssignments({});
          }
        }}
        count={importCount}
        preview={previewRows}
        warnings={warnings}
        errors={importErrors}
        rowErrors={importRowErrors}
        onConfirm={confirmImport}
        loading={importing}
        tipo={importMode}
        result={importResult}
        availableChannels={availableChannels}
        selectedChannels={importChannels}
        onChannelsChange={setImportChannels}
        channelRowAssignments={importChannelRowAssignments}
        onChannelRowAssignmentsChange={setImportChannelRowAssignments}
      />

      <ImportComposicaoModal
        open={composicaoModalOpen}
        onOpenChange={(open) => {
          setComposicaoModalOpen(open);
          if (!open) setPendingComposicaoFile(null);
        }}
        onConfirm={handleConfirmImportComposicao}
        loading={importingComposicao}
        fileName={pendingComposicaoFile?.name}
      />

      <ComposicaoErrorsModal
        open={composicaoErrorsModalOpen}
        onClose={() => setComposicaoErrorsModalOpen(false)}
        rows={composicaoErrorRows}
      />

      <ExportProgressToast
        open={exportProgressOpen}
        percent={exportProgress}
        current={exportProgressCount}
        total={totalCountRef.current}
        onClose={() => {
          cancelExportRef.current = true;
          exportAbortRef.current?.abort();
          setExportProgressOpen(false);
        }}
      />

      <ExportProgressToast
        open={blingOpen}
        percent={blingProgress}
        title="Exportando planilha Bling..."
        current={blingCurrent}
        total={blingTotal}
        onClose={() => setBlingOpen(false)}
      />

      <ExportProgressToast
        open={fretesOpen}
        percent={fretesProgress}
        title="Exportando fretes Mercado Livre..."
        current={fretesCurrent}
        total={fretesTotal}
        itemLabel="fretes"
        onClose={() => setFretesOpen(false)}
      />

      <ImportProgressToast
        open={importProgressOpen}
        percent={importProgress}
        message={
          importProgressCount > 0 ? `${importProgressCount} anúncio(s)` : undefined
        }
        onClose={() => setImportProgressOpen(false)}
      />

      <ImportProgressToast
        open={composicaoProgressOpen}
        percent={composicaoProgress}
        title="Importando composição..."
        message={
          composicaoProgressCount > 0
            ? `${composicaoProgressCount} composição(ões)`
            : undefined
        }
        onClose={() => setComposicaoProgressOpen(false)}
      />

      <ExportComposicaoProgressToast
        open={exportComposicaoProgressOpen}
        percent={exportComposicaoProgress}
        onClose={() => setExportComposicaoProgressOpen(false)}
      />

      <ValidateAds
        open={openValidateAds}
        onClose={() => setOpenValidateAds(false)}
      />

      {isEditOpen && (
        <ProductEditModal
          id={isCreating ? undefined : editId ?? undefined}
          loja={editLoja ?? undefined}
          onClose={closeEditModal}
          onSaved={() => {
            closeEditModal();
            refetch();
          }}
        />
      )}
    </div>
  );
}
