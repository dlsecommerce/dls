"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Menu, SlidersHorizontal, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import AnnounceActions from "@/components/announce/Announceactions";
import AnnounceDataTable from "@/components/announce/Announcedatatable";
import AnnounceFilters from "@/components/announce/Announcefilters";
import AnnounceLocation from "@/components/announce/Announcelocation";
import ConfirmDelete from "@/components/announce/Confirmdelete";
import ConfirmImportModal, { RowError } from "@/components/announce/Confirmimport";
import { Controls } from "@/components/announce/Controls";
import ExportProgressToast from "@/components/announce/Exportprogresstoast";
import ImportProgressToast from "@/components/announce/Importprogresstoast";

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

import {
  importAnnounceFromXlsxOrCsv,
  ImportProgress,
} from "@/components/announce/helpers/Importannounce";

import { exportAnnounceFromApi } from "@/components/announce/helpers/Exportannounce";

const MODELO_URL = "/templates/announce_modelo.xlsx";

function buildModeloFileName(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const timePart = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
  return `PLANILHA - MODELO ${datePart} ${timePart}.xlsx`;
}

export default function Announce() {
  const router = useRouter();

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

  /* ── ORDENAÇÃO (enviada ao banco) ── */
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const sortByField: AnnounceSortField = (sortColumn as AnnounceSortField) ?? "created_at";
  const sortDirValue: AnnounceSortDir = sortColumn ? sortDirection : "desc";

  const {
    announces,
    loading,
    error,
    refetch,
    handleDelete,
    handleDeleteSelected,
    handleRestoreSelected,
    deleting,

    // paginação server-side
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,

    // seleção total (id + deleted_at, sem paginar)
    fetchAllMatchingIds,
  } = useAnnounce({
    store: storeValue,
    search: appliedFilters.codigo || appliedFilters.produto || undefined,
    type: TIPO_TO_FILTER_VALUE[appliedFilters.tipo] as AnnounceTypeFilter,
    situacao: appliedFilters.situacao as AnnounceSituacaoFilter,
    sortBy: sortByField,
    sortDir: sortDirValue,
    marks: appliedBrands, // filtro de marca agora resolvido no banco
  });

  // A página já vem filtrada, ordenada e paginada pelo servidor.
  const paginatedRows = announces;

  /* ── LISTA DE MARCAS (dropdown) — busca independente da paginação ── */
  const [allBrands, setAllBrands] = React.useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setBrandsLoading(true);

    fetchDistinctBrands()
      .then((brands) => {
        if (active) setAllBrands(brands);
      })
      .catch(() => {
        // silencioso: dropdown apenas fica vazio em caso de falha
      })
      .finally(() => {
        if (active) setBrandsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // currentPage (1-based, pra UI) <-> page (0-based, pro hook)
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

  /* ── SELEÇÃO ─────────────────────────────────
   * `selectedRows` guarda objetos completos quando vêm da página atual,
   * mas ao usar "selecionar tudo" guardamos apenas `{ id, deleted_at }`
   * (linhas "fantasma"), suficiente para exclusão em lote — o
   * `deleted_at` é o que decide, dentro do hook, se cada item deve ser
   * movido para a lixeira (soft delete) ou excluído permanentemente
   * (hard delete). Isso evita trazer os 15.700 registros completos
   * pro client.
   * ─────────────────────────────────────────── */
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
    // Qualquer interação manual desfaz o modo "selecionar tudo o conjunto filtrado"
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

  /* ── "Selecionar tudo" real: busca `id` + `deleted_at` de TODOS os
   * registros que casam com o filtro atual (sem trazer o dataset
   * completo), e cria linhas "fantasma" com esses dois campos —
   * suficientes para o hook decidir soft/hard delete corretamente
   * mesmo no filtro "Todos" (que mistura ativos e excluídos). ── */
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

  /* ── EXCLUSÃO ─────────────────────────────────
   * O hook já faz update otimista no estado local ao excluir
   * (não precisa de refetch aqui) — só limpamos a seleção local
   * da tela para refletir o resultado imediatamente.
   * ─────────────────────────────────────────── */
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

  /* ── RESTAURAÇÃO ───────────────────────────────
   * Só faz sentido para itens com deleted_at != null.
   * O hook já filtra internamente quem pode ser restaurado
   * e faz update otimista no estado local.
   * ─────────────────────────────────────────── */
  const restoreSelectedRows = async () => {
    await handleRestoreSelected(selectedRows as any[], () => {
      setSelectedRows([]);
      setSelectAllMatchingActive(false);
    });
  };

  /* ── EXPORTAÇÃO ─────────────────────────────── */
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

    setExporting(true);
    setExportProgressOpen(true);
    setExportProgress(0);
    setExportProgressCount(0);

    try {
      await exportAnnounceFromApi(
        { store: storeValue, format: "xlsx", signal: controller.signal },
        (percent) => {
          // Progresso real reportado pelo helper (bytes recebidos),
          // sem simulação artificial por tempo.
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
      // Mantém o toast visível brevemente em 100% antes de fechar
      setTimeout(() => {
        if (!cancelExportRef.current) setExportProgressOpen(false);
      }, 1500);
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

  /* ── IMPORTAÇÃO ─────────────────────────────── */
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
    setImporting(true);
    setWarnings([]);
    setImportErrors([]);
    setImportRowErrors([]);
    setPreviewRows([]);
    setImportCount(0);

    try {
      const result: any = await importAnnounceFromXlsxOrCsv(file, true);

      setPendingFile(file);
      setPreviewRows(result.data.slice(0, 50));
      setImportCount(result.data.length);
      setWarnings(result.warnings ?? []);
      setImportErrors(result.errors ?? []);
      // Se o helper de importação já retornar erros amarrados a linha/coluna,
      // eles são usados para destacar as células na tabela de preview.
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
        importMode // ← modo (inclusão/alteração) repassado ao helper,
                    //   que por sua vez envia ao backend em cada lote.
      );

      setImportProgress(100);
      setImportProgressCount(result.data.length);

      // ── TOASTS DE RESULTADO ──────────────────────────────────
      // Regra: apenas dois estados visuais importam ao usuário:
      //  - VERMELHO (erro): quando houver qualquer registro rejeitado
      //    (regra de negócio, dado inválido, ou falha técnica).
      //  - AZUL (sucesso): quando houver registros importados/alterados
      //    com sucesso.
      // Warnings neutros (dedupe, contagem, etc.) não geram toast —
      // ficam disponíveis apenas dentro do modal de importação.
      const hasErrors = (result.errosCount ?? 0) > 0 || (result.errors?.length ?? 0) > 0;
      const importedCount = result.importados ?? 0;

      if (hasErrors) {
        const totalErros = result.errosCount ?? result.errors?.length ?? 0;
        toast.error(
          `${totalErros} registro(s) não foram processados. Veja os detalhes no resumo da importação.`,
          { duration: 8000 }
        );
      }

      if (importedCount > 0) {
        toast.success(
          importMode === "alteracao"
            ? `${importedCount} anúncio(s) alterado(s) com sucesso.`
            : `${importedCount} anúncio(s) importado(s) com sucesso.`,
          {
            duration: 6000,
            style: {
              background: "#0a1a2e",
              border: "1px solid #1a8ceb",
              color: "#e6f2ff",
            },
            className: "border-[#1a8ceb]",
          }
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
      toast.error(message, { duration: 8000 });
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgressOpen(false), 1500);
    }
  };

  const [openFiltersMobile, setOpenFiltersMobile] = React.useState(false);
  const [openActionsMobile, setOpenActionsMobile] = React.useState(false);

  const handleEdit = (row: AnnounceRow) => {
    router.push(
      `/dashboard/anuncios/edit?id=${row.id}&loja=${encodeURIComponent(row.store)}`
    );
  };

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
                openEdit={handleEdit}
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
              onOpenCreate={() => router.push("/dashboard/anuncios/edit")}
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
                  router.push("/dashboard/anuncios/edit");
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
          importProgressCount > 0 ? `${importProgressCount} anúncio(s)` : undefined
        }
        onClose={() => setImportProgressOpen(false)}
      />
    </div>
  );
}
