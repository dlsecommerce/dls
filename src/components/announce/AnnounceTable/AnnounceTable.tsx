"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, SlidersHorizontal, X as XIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";

import ConfirmDeleteModal from "@/components/announce/AnnounceTable/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/announce/AnnounceTable/ConfirmImportModal";

import { useAnunciosData } from "@/components/announce/hooks/useAnunciosData";
import { useImportExport } from "@/components/announce/hooks/useImportExport";

import AnnounceTableHeaderBar from "@/components/announce/AnnounceTable/AnnounceTableHeaderBar";
import TableBodyRows from "@/components/announce/AnnounceTable/TableBodyRows";
import AnunciosFiltersSidebar from "@/components/announce/AnnounceTable/AnunciosFiltersSidebar";
import AnunciosActionsSidebar from "@/components/announce/AnnounceTable/AnunciosActionsSidebar";

import {
  AnuncioFilters,
  DEFAULT_ANUNCIO_FILTERS,
} from "@/components/announce/AnnounceTable/types";

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getRowKey = (row: any) => {
  const loja = String(row?.loja ?? row?.Loja ?? "").trim();

  const id = String(
    row?.idReal ??
      row?.id ??
      row?.ID ??
      row?.id_tray ??
      row?.["ID Tray"] ??
      row?.referencia ??
      row?.["Referência"] ??
      ""
  ).trim();

  return `${loja}-${id}`;
};

export default function AnnounceTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);

  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  const initialFilters: AnuncioFilters = {
    ...DEFAULT_ANUNCIO_FILTERS,
    situacao:
      searchParams.get("situacao") ?? DEFAULT_ANUNCIO_FILTERS.situacao,
    categoria:
      searchParams.get("categoria") ?? DEFAULT_ANUNCIO_FILTERS.categoria,
    tipo: searchParams.get("tipo") ?? DEFAULT_ANUNCIO_FILTERS.tipo,
    lojasVirtuais:
      searchParams.get("loja") ?? DEFAULT_ANUNCIO_FILTERS.lojasVirtuais,
    marca: searchParams.get("marca") ?? DEFAULT_ANUNCIO_FILTERS.marca,
  };

  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const [filters, setFilters] = React.useState<AnuncioFilters>(initialFilters);

  const [openFiltersMobile, setOpenFiltersMobile] = React.useState(false);
  const [openActionsMobile, setOpenActionsMobile] = React.useState(false);

  const data = useAnunciosData(filters);

  React.useEffect(() => {
    data.setSearch(initialSearch);
    data.setCurrentPage(initialPage);
    data.setItemsPerPage(initialPerPage);
    data.setSortColumn(initialSortColumn);
    data.setSortDirection(initialSortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams();

    if (data.search) params.set("search", data.search);
    if (filters.marca) params.set("marca", filters.marca);

    if (
      filters.situacao &&
      filters.situacao !== DEFAULT_ANUNCIO_FILTERS.situacao
    ) {
      params.set("situacao", filters.situacao);
    }

    if (
      filters.categoria &&
      filters.categoria !== DEFAULT_ANUNCIO_FILTERS.categoria
    ) {
      params.set("categoria", filters.categoria);
    }

    if (filters.tipo && filters.tipo !== DEFAULT_ANUNCIO_FILTERS.tipo) {
      params.set("tipo", filters.tipo);
    }

    if (
      filters.lojasVirtuais &&
      filters.lojasVirtuais !== DEFAULT_ANUNCIO_FILTERS.lojasVirtuais
    ) {
      params.set("loja", filters.lojasVirtuais);
    }

    if (data.currentPage > 1) params.set("page", String(data.currentPage));
    if (data.itemsPerPage !== 50) {
      params.set("perPage", String(data.itemsPerPage));
    }

    if (data.sortColumn) params.set("sortColumn", data.sortColumn);
    if (data.sortColumn && data.sortDirection !== "asc") {
      params.set("sortDirection", data.sortDirection);
    }

    const nextUrl = params.toString() ? `?${params.toString()}` : "?";
    router.replace(nextUrl, { scroll: false });
  }, [
    data.search,
    filters,
    data.currentPage,
    data.itemsPerPage,
    data.sortColumn,
    data.sortDirection,
    router,
  ]);

  const impExp = useImportExport(
    data.loadAnuncios,
    data.currentPage,
    {
      search: data.search,
      selectedStores:
        filters.lojasVirtuais && filters.lojasVirtuais !== "Todos"
          ? [filters.lojasVirtuais]
          : [],
      selectedBrands:
        filters.marca && filters.marca.trim() ? [filters.marca] : [],
      selectedCategorias:
        filters.categoria && filters.categoria !== "Todos"
          ? [filters.categoria]
          : [],
    },
    data.selectedRows as any
  );

  const totalPages = Math.max(1, Math.ceil(data.totalItems / data.itemsPerPage));

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const resolveTabelaELojaCodigo = (lojaRaw: string) => {
    const lojaz = normalize(String(lojaRaw || "").trim());

    if (lojaz.includes("pikot") || lojaz === "pk") {
      return { tabela: "anuncios_pk", lojaCodigo: "PK" as const };
    }

    if (lojaz.includes("sobaquetas") || lojaz === "sb") {
      return { tabela: "anuncios_sb", lojaCodigo: "SB" as const };
    }

    return { tabela: "", lojaCodigo: "" as const };
  };

  const getAnnouncementLabel = (row: any) => {
    return (
      row?.Nome ||
      row?.nome ||
      row?.["Referência"] ||
      row?.referencia ||
      row?.ID ||
      row?.id ||
      "anúncio"
    );
  };

  const buildDeleteMessage = (rows: any[]) => {
    if (rows.length === 1) {
      const label = getAnnouncementLabel(rows[0]);
      return `O anúncio "${label}" foi excluído do sistema.`;
    }

    const labels = rows
      .slice(0, 3)
      .map((row) => `"${getAnnouncementLabel(row)}"`);

    if (rows.length <= 3) {
      return `Os anúncios ${labels.join(", ")} foram excluídos do sistema.`;
    }

    return `Os anúncios ${labels.join(", ")} e mais ${
      rows.length - 3
    } foram excluídos do sistema.`;
  };

  const selectedKeys = React.useMemo(() => {
    return new Set(data.selectedRows.map((row: any) => getRowKey(row)));
  }, [data.selectedRows]);

  const currentPageKeys = React.useMemo(() => {
    return data.rows.map((row: any) => getRowKey(row));
  }, [data.rows]);

  const allSelected =
    data.rows.length > 0 &&
    currentPageKeys.every((key) => selectedKeys.has(key));

  const handleToggleRow = (row: any) => {
    data.setSelectedRows((prev: any[]) => {
      const rowKey = getRowKey(row);
      const alreadySelected = prev.some((item) => getRowKey(item) === rowKey);

      if (alreadySelected) {
        return prev.filter((item) => getRowKey(item) !== rowKey);
      }

      return [...prev, row];
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      data.setSelectedRows((prev: any[]) => {
        const map = new Map<string, any>();

        prev.forEach((row) => {
          map.set(getRowKey(row), row);
        });

        data.rows.forEach((row: any) => {
          map.set(getRowKey(row), row);
        });

        return Array.from(map.values());
      });

      return;
    }

    data.setSelectedRows((prev: any[]) => {
      const pageKeys = new Set(currentPageKeys);
      return prev.filter((row) => !pageKeys.has(getRowKey(row)));
    });
  };

  const handleDeleteSelected = async () => {
    if (!data.selectedRows?.length) {
      alert("Nenhum item selecionado para exclusão.");
      return;
    }

    setLoadingDelete(true);

    try {
      const selectedRowsSnapshot = [...data.selectedRows];
      const deleteMessage = buildDeleteMessage(selectedRowsSnapshot);

      const grouped = selectedRowsSnapshot.reduce<Record<string, string[]>>(
        (acc, row: any) => {
          const lojaRaw = String(row.loja ?? row.Loja ?? "").trim();
          const { tabela, lojaCodigo } = resolveTabelaELojaCodigo(lojaRaw);

          if (!tabela || !lojaCodigo) {
            console.warn("❌ Loja não reconhecida:", lojaRaw, row);
            return acc;
          }

          const id = String(row.idReal ?? row.id ?? row.ID ?? "").trim();
          if (!id) return acc;

          const key = `${tabela}|${lojaCodigo}`;
          (acc[key] ||= []).push(id);
          return acc;
        },
        {}
      );

      const entries = Object.entries(grouped);

      if (entries.length === 0) {
        alert("Nenhum anúncio válido para exclusão (verifique loja/ID).");
        return;
      }

      console.time("TEMPO DELETE SUPABASE");

      await Promise.all(
        entries.map(async ([key, ids]) => {
          const [tabela, lojaCodigo] = key.split("|");

          const { error } = await supabase
            .from(tabela)
            .delete()
            .in("ID", ids)
            .eq("Loja", lojaCodigo);

          if (error) throw error;
        })
      );

      console.timeEnd("TEMPO DELETE SUPABASE");

      /**
       * A exclusão real terminou aqui.
       * Agora já pode fechar o modal e limpar seleção.
       */
      data.setOpenDelete(false);
      data.setSelectedRows([]);

      /**
       * Não trava mais a exclusão esperando criar notificação.
       */
      createNotification({
        title:
          selectedRowsSnapshot.length === 1
            ? "Anúncio excluído"
            : "Anúncios excluídos",
        message: deleteMessage,
        action: "delete",
        entityType: "announcement",
        entityId:
          selectedRowsSnapshot.length === 1
            ? String(
                selectedRowsSnapshot[0]?.idReal ??
                  selectedRowsSnapshot[0]?.id ??
                  selectedRowsSnapshot[0]?.ID ??
                  ""
              )
            : undefined,
        link: "/dashboard/anuncios",
      }).catch((err) => {
        console.warn("Erro ao criar notificação:", err);
      });

      /**
       * Não trava mais o modal esperando recarregar a tabela.
       */
      data.loadAnuncios(data.currentPage).catch((err: any) => {
        console.warn("Erro ao recarregar anúncios:", err);
      });
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir anúncios: " + (err?.message || err));
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleSituacaoChange = (value: string) => {
    setFilters((prev) => ({ ...prev, situacao: value }));
  };

  const handleRefresh = () => {
    data.loadAnuncios(data.currentPage);
  };

  const handleDeleteFromHeader = () => {
    if (data.selectedRows.length === 0) return;
    data.setOpenDelete(true);
  };

  const handleSort = (column: string) => {
    if (data.sortColumn !== column) {
      data.setSortColumn(column);
      data.setSortDirection("asc");
    } else if (data.sortDirection === "asc") {
      data.setSortDirection("desc");
    } else {
      data.setSortColumn(null);
      data.setSortDirection("asc");
    }

    data.setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] p-0">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="fixed left-0 top-24 h-screen w-[220px] overflow-y-auto bg-[#0b0b0c]">
            <AnunciosFiltersSidebar
              search={data.search}
              setSearch={data.setSearch}
              filters={filters}
              setFilters={setFilters}
              allCategorias={data.allCategorias}
            />
          </div>
        </aside>

        <section className="min-w-0 bg-[#0b0b0c]">
          <div className="px-3 py-4 lg:px-4">
            <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setOpenFiltersMobile(true)}
                className="flex h-11 items-center gap-2 rounded-full border border-neutral-700 bg-[#161616] px-4 text-sm font-medium text-white shadow-lg active:scale-[0.98]"
              >
                <SlidersHorizontal className="h-4 w-4 text-green-400" />
                Filtros
              </button>

              <button
                type="button"
                onClick={() => setOpenActionsMobile(true)}
                className="flex h-11 items-center gap-2 rounded-full border border-neutral-700 bg-[#161616] px-4 text-sm font-medium text-white shadow-lg active:scale-[0.98]"
              >
                <Menu className="h-4 w-4 text-green-400" />
                Ações
              </button>
            </div>

            <AnnounceTableHeaderBar
              allSelected={allSelected}
              hasRows={data.rows.length > 0}
              situacao={filters.situacao}
              sortColumn={data.sortColumn}
              sortDirection={data.sortDirection}
              selectedCount={data.selectedRows.length}
              onToggleSelectAll={handleToggleSelectAll}
              onSituacaoChange={handleSituacaoChange}
              onRefresh={handleRefresh}
              onSort={handleSort}
              onDeleteSelected={handleDeleteFromHeader}
            />

            <GlassmorphicCard className="overflow-hidden rounded-none border border-neutral-700 bg-[#101010] shadow-none border-t-0">
              <TableBodyRows
                rows={data.rows}
                loading={data.loading}
                selectedRows={data.selectedRows}
                toggleRow={handleToggleRow}
                onEdit={(id, loja) =>
                  router.push(
                    `/dashboard/anuncios/edit?id=${id}&loja=${encodeURIComponent(
                      loja === "PK"
                        ? "Pikot Shop"
                        : loja === "SB"
                          ? "Sóbaquetas"
                          : loja
                    )}`
                  )
                }
                onDelete={(row) => {
                  data.setSelectedRows([row as any]);
                  data.setOpenDelete(true);
                }}
              />
            </GlassmorphicCard>

            <div className="mt-2 px-2 pb-24 lg:pb-4">
              <TableControls
                currentPage={data.currentPage}
                totalPages={totalPages}
                itemsPerPage={data.itemsPerPage}
                totalItems={data.totalItems}
                onPageChange={(p) =>
                  data.setCurrentPage(Math.max(1, Math.min(totalPages, p)))
                }
                onItemsPerPageChange={(n) => {
                  data.setItemsPerPage(n);
                  data.setCurrentPage(1);
                }}
                selectedCount={data.selectedRows.length}
              />
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:block">
          <div className="fixed right-5 top-23 h-screen w-[300px] overflow-y-auto bg-[#0b0b0c]">
            <AnunciosActionsSidebar
              exporting={Boolean((impExp as any).exporting)}
              onOpenCreate={() => router.push("/dashboard/anuncios/edit")}
              onExport={() => impExp.handleExport()}
              onImportInclusao={(file) => {
                impExp.handleFileDirect(file, "inclusao");
              }}
              onImportAlteracao={(file) => {
                impExp.handleFileDirect(file, "alteracao");
              }}
            />
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setOpenActionsMobile(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[0_0_24px_rgba(34,197,94,0.35)] active:scale-95 lg:hidden"
        aria-label="Abrir ações"
      >
        <Menu className="h-6 w-6" />
      </button>

      {openFiltersMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenFiltersMobile(false)}
            aria-label="Fechar filtros"
          />

          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto border-r border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-[#0b0b0c] px-4 py-4">
              <div>
                <p className="text-sm text-neutral-400">Refinar busca</p>
                <h2 className="text-lg font-semibold text-white">Filtros</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpenFiltersMobile(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white active:scale-95"
                aria-label="Fechar filtros"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <AnunciosFiltersSidebar
              search={data.search}
              setSearch={data.setSearch}
              filters={filters}
              setFilters={setFilters}
              allCategorias={data.allCategorias}
            />
          </div>
        </div>
      )}

      {openActionsMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenActionsMobile(false)}
            aria-label="Fechar ações"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0b0b0c] px-4 py-4">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-400">Central de ações</p>
                  <h2 className="text-lg font-semibold text-white">Ações</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenActionsMobile(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white active:scale-95"
                  aria-label="Fechar ações"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <AnunciosActionsSidebar
                exporting={Boolean((impExp as any).exporting)}
                onOpenCreate={() => {
                  setOpenActionsMobile(false);
                  router.push("/dashboard/anuncios/edit");
                }}
                onExport={() => {
                  setOpenActionsMobile(false);
                  impExp.handleExport();
                }}
                onImportInclusao={(file) => {
                  setOpenActionsMobile(false);
                  impExp.handleFileDirect(file, "inclusao");
                }}
                onImportAlteracao={(file) => {
                  setOpenActionsMobile(false);
                  impExp.handleFileDirect(file, "alteracao");
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={data.openDelete}
        onOpenChange={(v) => !loadingDelete && data.setOpenDelete(v)}
        count={data.selectedRows.length}
        loading={loadingDelete}
        onConfirm={handleDeleteSelected}
      />

      <ConfirmImportModal
        open={impExp.openConfirmImport}
        onOpenChange={impExp.setOpenConfirmImport}
        count={impExp.importCount}
        preview={impExp.previewRows}
        warnings={impExp.warnings}
        errors={(impExp as any).errors ?? []}
        onConfirm={impExp.confirmImport}
        loading={impExp.importing}
        tipo={impExp.importMode}
      />
    </div>
  );
}