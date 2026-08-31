"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Menu, SlidersHorizontal, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import MarketplaceActions from "@/components/marketplace/Marketplaceactions";
import MarketplaceDataTable from "@/components/marketplace/Marketplacedatatable";
import MarketplaceFilters from "@/components/marketplace/Marketplacefilters";
import MarketplaceLocation from "@/components/marketplace/Marketplacelocation";
import ConfirmImportModal, { RowError } from "@/components/marketplace/Confirmimport";
import { Controls } from "@/components/marketplace/Controls";
import ExportProgressToast from "@/components/marketplace/Exportprogresstoast";
import ImportProgressToast from "@/components/marketplace/Importprogresstoast";
import CreateChannelModal from "@/components/marketplace/Createchannel";
import MarketplacePricingModal from "@/components/marketplace/edit/Compositionmodal";

import {
  Marketplace as MarketplaceRow,
  MarketplaceFilters as MarketplaceFiltersType,
  DEFAULT_MARKETPLACE_FILTERS,
} from "@/components/marketplace/hooks/types";

import {
  useMarketplace,
  fetchDistinctChannels,
  fetchDistinctBrands,
  MarketplaceSituacaoFilter,
  MarketplaceTipoFilter,
  MarketplaceCondicaoFilter,
  MarketplaceSortField,
  MarketplaceSortDir,
} from "@/components/marketplace/hooks/usemarketplace";

import { useMarketplaceImportExport } from "@/components/marketplace/hooks/Exportmarketplace";

const MODELO_URL = "/templates/marketplace_modelo.xlsx";

function buildModeloFileName(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const timePart = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
  return `PLANILHA - MODELO ${datePart} ${timePart}.xlsx`;
}

/* ─────────────────────────────────────────────
 * Sincronização de filtros com a URL.
 * OBS: usamos "store_filter" (em vez de "loja") para não
 * colidir com o param "loja" usado pelo modal de edição.
 * ───────────────────────────────────────────── */

const FILTER_PARAM_KEYS = [
  "situacao",
  "store_filter",
  "canal",
  "tipo",
  "condicao",
  "codigo",
  "produto",
  "marcas",
] as const;

function filtersToSearchParams(
  filters: MarketplaceFiltersType,
  brands: string[]
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.situacao !== "Ativos") params.set("situacao", filters.situacao);
  if (filters.loja !== "Todos") params.set("store_filter", filters.loja);
  if (filters.canal !== "Todos") params.set("canal", filters.canal);
  if (filters.tipo !== "Todos") params.set("tipo", filters.tipo);
  if (filters.condicao && filters.condicao !== "Todos")
    params.set("condicao", filters.condicao);
  if (filters.codigo) params.set("codigo", filters.codigo);
  if (filters.produto) params.set("produto", filters.produto);
  if (brands.length > 0) params.set("marcas", brands.join(","));
  return params;
}

function searchParamsToFilters(
  params: URLSearchParams
): { filters: MarketplaceFiltersType; brands: string[] } {
  return {
    filters: {
      situacao: params.get("situacao") ?? "Ativos",
      loja: params.get("store_filter") ?? "Todos",
      canal: params.get("canal") ?? "Todos",
      tipo: params.get("tipo") ?? "Todos",
      condicao: params.get("condicao") ?? "Todos",
      codigo: params.get("codigo") ?? "",
      produto: params.get("produto") ?? "",
    },
    brands: params.get("marcas")?.split(",").filter(Boolean) ?? [],
  };
}

export default function Marketplace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Inicializa filtros a partir da URL (sobrevive a refresh e é compartilhável).
  // Só roda na primeira renderização — deps vazio propositalmente.
  const initialFromUrl = React.useMemo(
    () => searchParamsToFilters(searchParams),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [filters, setFilters] = React.useState<MarketplaceFiltersType>(
    initialFromUrl.filters
  );
  const [appliedFilters, setAppliedFilters] = React.useState<MarketplaceFiltersType>(
    initialFromUrl.filters
  );

  // MARCA (múltipla seleção)
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>(
    initialFromUrl.brands
  );
  const [appliedBrands, setAppliedBrands] = React.useState<string[]>(
    initialFromUrl.brands
  );
  const [allBrands, setAllBrands] = React.useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = React.useState(false);

  const storeValue =
    appliedFilters.loja !== "Todos" ? appliedFilters.loja : undefined;

  const channelValue =
    appliedFilters.canal !== "Todos" ? appliedFilters.canal : undefined;

  const tipoValue =
    appliedFilters.tipo !== "Todos"
      ? (appliedFilters.tipo as MarketplaceTipoFilter)
      : undefined;

  // Condição (Clássico/Premium) — só faz sentido quando o canal é Mercado Livre;
  // o hook já ignora esse parâmetro para os demais canais, mas evitamos
  // mandar "Todos" desnecessariamente.
  const condicaoValue =
    appliedFilters.condicao && appliedFilters.condicao !== "Todos"
      ? (appliedFilters.condicao as MarketplaceCondicaoFilter)
      : undefined;

  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const sortByField: MarketplaceSortField | undefined =
    sortColumn as MarketplaceSortField | undefined;
  const sortDirValue: MarketplaceSortDir | undefined = sortColumn
    ? sortDirection
    : undefined;

  const {
    marketplaces,
    loading,
    error,
    refetch,

    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,

    fetchAllMatchingIds,
  } = useMarketplace({
    store: storeValue,
    channel: channelValue,
    tipo: tipoValue,
    condicao: condicaoValue,
    search: appliedFilters.codigo || appliedFilters.produto || undefined,
    situacao: appliedFilters.situacao as MarketplaceSituacaoFilter,
    brands: appliedBrands.length > 0 ? appliedBrands : undefined,
    sortBy: sortByField,
    sortDir: sortDirValue,
  });

  const paginatedRows = marketplaces;

  const [allChannels, setAllChannels] = React.useState<string[]>([]);
  const [channelsLoading, setChannelsLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setChannelsLoading(true);

    fetchDistinctChannels()
      .then((channels) => {
        if (active) setAllChannels(channels);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChannelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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

  // Sincroniza os filtros aplicados com a URL, preservando outros params
  // (como id/loja/new usados pelo modal de edição).
  const syncFiltersToUrl = React.useCallback(
    (nextFilters: MarketplaceFiltersType, nextBrands: string[]) => {
      const current = new URLSearchParams(searchParams.toString());
      const filterParams = filtersToSearchParams(nextFilters, nextBrands);

      FILTER_PARAM_KEYS.forEach((key) => current.delete(key));
      filterParams.forEach((value, key) => current.set(key, value));

      const query = current.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setAppliedBrands(selectedBrands);
    setPage(0);
    syncFiltersToUrl(filters, selectedBrands);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_MARKETPLACE_FILTERS);
    setAppliedFilters(DEFAULT_MARKETPLACE_FILTERS);
    setSelectedBrands([]);
    setAppliedBrands([]);
    setPage(0);
    syncFiltersToUrl(DEFAULT_MARKETPLACE_FILTERS, []);
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

  const [selectedRows, setSelectedRows] = React.useState<MarketplaceRow[]>([]);
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

  // Hook de import/export (planilha Excel do marketplace).
  const {
    handleExport: exportXlsx,
    parseImportFile,
    sendImport,
  } = useMarketplaceImportExport(marketplaces, appliedFilters.loja, appliedBrands);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportXlsx();
    } finally {
      setExporting(false);
    }
  };

  const handleExportModelo = async () => {
    const a = document.createElement("a");
    a.href = MODELO_URL;
    a.download = buildModeloFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const runImportPreview = async (
    file: File,
    tipo: "inclusao" | "alteracao"
  ) => {
    setImportMode(tipo);

    try {
      const result = await parseImportFile(file);

      setImportCount(result.registros.length);
      setPreviewRows(result.previewRows);
      setWarnings(result.warnings);
      setImportErrors(result.errors);
      setImportRowErrors(result.rowErrors as RowError[]);
      setPendingFile(file);
      setOpenImport(true);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao processar a planilha.");
    }
  };

  const handleImportInclusao = async (file: File) => {
    await runImportPreview(file, "inclusao");
  };

  const handleImportAlteracao = async (file: File) => {
    await runImportPreview(file, "alteracao");
  };

  const confirmImport = async () => {
    if (!pendingFile) return;

    setImporting(true);
    try {
      const result = await parseImportFile(pendingFile);
      await sendImport(result.registros);
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao importar a planilha.");
    } finally {
      setImporting(false);
      setOpenImport(false);
      setPendingFile(null);
    }
  };

  const [openFiltersMobile, setOpenFiltersMobile] = React.useState(false);
  const [openActionsMobile, setOpenActionsMobile] = React.useState(false);

  // Modal de criação de canal (substitui o antigo fluxo de criação de item único)
  const [openCreateChannel, setOpenCreateChannel] = React.useState(false);

  const editId = searchParams.get("id");
  const editLoja = searchParams.get("loja");
  const isCreating = searchParams.has("new");
  const isEditOpen = searchParams.has("id") || isCreating;

  const openEditModal = React.useCallback(
    (row: MarketplaceRow) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      params.set("id", String(row.id));
      params.set("loja", row.store);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // "+ Novo Marketplace" agora abre o modal de criação de canal
  // (duplica todos os anúncios de Pikot Shop e Sóbaquetas para o novo canal).
  const openCreateModal = React.useCallback(() => {
    setOpenCreateChannel(true);
  }, []);

  const closeEditModal = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    params.delete("loja");
    params.delete("new");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const handleSituacaoChange = (value: string) => {
    setFilters((prev) => ({ ...prev, situacao: value }));
    setAppliedFilters((prev) => ({ ...prev, situacao: value }));
    setSortColumn(null);
    setSortDirection("asc");
    setPage(0);
    syncFiltersToUrl({ ...appliedFilters, situacao: value }, appliedBrands);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 selection:bg-[#1a8ceb]/20">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="border-b border-neutral-900 bg-[#050505] px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between gap-2">
              <MarketplaceLocation
                path={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Marketplace" },
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
              <MarketplaceFilters
                filters={filters}
                setFilters={setFilters}
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                allChannels={allChannels}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={loading || channelsLoading || brandsLoading}
              />
            </div>

            <div className="mt-3 overflow-hidden border border-neutral-900 bg-[#0a0a0a] lg:mt-0 lg:border-t-0">
              <MarketplaceDataTable
                rows={paginatedRows as any}
                loading={loading}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                copiedId={copiedId}
                handleCopy={handleCopy}
                openEdit={openEditModal}
                allSelected={allSelected}
                situacao={filters.situacao}
                appliedSituacao={appliedFilters.situacao}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggleSelectAll={handleToggleSelectAll}
                onSituacaoChange={handleSituacaoChange}
                onSort={handleSort}
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

            <MarketplaceActions
              exporting={exporting}
              handleExport={handleExport}
              onOpenCreate={openCreateModal}
              onExportModelo={handleExportModelo}
              onImportInclusao={handleImportInclusao}
              onImportAlteracao={handleImportAlteracao}
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

            <MarketplaceFilters
              filters={filters}
              setFilters={setFilters}
              allBrands={allBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              allChannels={allChannels}
              onApplyFilters={() => {
                handleApplyFilters();
                setOpenFiltersMobile(false);
              }}
              onClearFilters={handleClearFilters}
              isLoading={loading || channelsLoading || brandsLoading}
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
              <MarketplaceActions
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
                totalCount={totalCount}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmImportModal
        open={openImport}
        onOpenChange={(open) => {
          setOpenImport(open);
          if (!open) setPendingFile(null);
        }}
        count={importCount}
        preview={previewRows}
        warnings={warnings}
        errors={importErrors}
        rowErrors={importRowErrors}
        onConfirm={confirmImport}
        loading={importing}
        tipo={importMode}
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

      <ImportProgressToast
        open={importProgressOpen}
        percent={importProgress}
        message={
          importProgressCount > 0 ? `${importProgressCount} marketplace(s)` : undefined
        }
        onClose={() => setImportProgressOpen(false)}
      />

      <CreateChannelModal
        open={openCreateChannel}
        onClose={() => setOpenCreateChannel(false)}
        onSuccess={refetch}
      />

      <MarketplacePricingModal
        open={isEditOpen && !isCreating}
        onClose={closeEditModal}
        marketplaceId={editId}
        onSuccess={refetch}
      />
    </div>
  );
}
