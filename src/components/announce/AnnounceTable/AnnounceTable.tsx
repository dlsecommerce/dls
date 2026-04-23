"use client";

import React from "react";
import { useRouter } from "next/navigation";

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

export default function AnnounceTable() {
  const router = useRouter();

  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const [filters, setFilters] =
    React.useState<AnuncioFilters>(DEFAULT_ANUNCIO_FILTERS);

  const data = useAnunciosData(filters);

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

          const id = String(row.id ?? row.ID ?? "").trim();
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

      await createNotification({
        title:
          selectedRowsSnapshot.length === 1
            ? "Anúncio excluído"
            : "Anúncios excluídos",
        message: deleteMessage,
        action: "delete",
        entityType: "announcement",
      });

      data.setOpenDelete(false);
      data.setSelectedRows([]);
      await data.loadAnuncios(data.currentPage);
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir anúncios: " + (err?.message || err));
    } finally {
      setLoadingDelete(false);
    }
  };

  const allSelected =
    data.rows.length > 0 && data.selectedRows.length === data.rows.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      data.setSelectedRows(data.rows as any);
    } else {
      data.setSelectedRows([]);
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
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside>
          <div className="fixed left-0 top-24 w-[220px] bg-[#0b0b0c]">
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
          <div className="px-4 py-4">
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
                toggleRow={data.toggleRow}
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

            <div className="mt-2 px-2 pb-4">
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

        <aside className="relative">
          <div className="fixed right-5 top-23 w-[300px] bg-[#0b0b0c]">
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