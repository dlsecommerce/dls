"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";

import ConfirmDeleteModal from "@/components/announce/AnnounceTable/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/announce/AnnounceTable/ConfirmImportModal";
import MassEditionModal from "@/components/announce/AnnounceTable/MassEditionModal";

import { useAnunciosData } from "@/components/announce/hooks/useAnunciosData";
import { useImportExport } from "@/components/announce/hooks/useImportExport";

import TopBar from "@/components/announce/AnnounceTable/TopBar";
import TableHeaderRow from "@/components/announce/AnnounceTable/TableHeader";
import TableBodyRows from "@/components/announce/AnnounceTable/TableBodyRows";

export default function AnnounceTable() {
  const router = useRouter();
  const data = useAnunciosData();

  const [loadingDelete, setLoadingDelete] = React.useState(false);

  const safeSelectedLoja = data.selectedLoja ?? [];
  const safeSelectedBrands = data.selectedBrands ?? [];
  const safeSelectedCategoria = data.selectedCategoria ?? [];

  const impExp = useImportExport(
    data.loadAnuncios,
    data.currentPage,
    {
      search: data.search,
      selectedStores: safeSelectedLoja,
    },
    data.selectedRows as any
  );

  const totalPages = Math.max(1, Math.ceil(data.totalItems / data.itemsPerPage));

  // normaliza texto para comparação sem acento
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

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

  // ✅ DELETE ÚNICO (serve pra massa e pra ícone)
  const handleDeleteSelected = async () => {
    if (!data.selectedRows?.length) {
      alert("Nenhum item selecionado para exclusão.");
      return;
    }

    setLoadingDelete(true);

    try {
      // agrupa por tabela|lojaCodigo
      const grouped = data.selectedRows.reduce<Record<string, string[]>>((acc, row: any) => {
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
      }, {});

      const entries = Object.entries(grouped);

      if (entries.length === 0) {
        alert("Nenhum anúncio válido para exclusão (verifique loja/ID).");
        return;
      }

      // 🔥 exclusão em paralelo por tabela
      await Promise.all(
        entries.map(async ([key, ids]) => {
          const [tabela, lojaCodigo] = key.split("|");
          const { error } = await supabase
            .from(tabela)
            .delete()
            .in("ID", ids)        // ⚠️ se no seu banco a coluna for "id", troque aqui
            .eq("Loja", lojaCodigo);

          if (error) throw error;
        })
      );

      // pós delete: fecha modal + recarrega + limpa seleção
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          {/* Top Bar */}
          <TopBar
            search={data.search}
            setSearch={data.setSearch}
            allBrands={data.allBrands}
            allLojas={data.allLojas}
            allCategorias={data.allCategorias}
            selectedBrands={safeSelectedBrands}
            selectedLoja={safeSelectedLoja}
            selectedCategoria={safeSelectedCategoria}
            setSelectedBrands={data.setSelectedBrands}
            setSelectedLoja={data.setSelectedLoja}
            setSelectedCategoria={data.setSelectedCategoria}
            filterOpen={data.filterOpen}
            setFilterOpen={data.setFilterOpen}
            fileInputRef={impExp.fileInputRef}
            onFileSelect={impExp.handleFileSelect}
            onExport={() => impExp.handleExport()}
            selectedCount={data.selectedRows.length}

            // ✅ agora só abre modal (não deleta)
            onDeleteSelected={() => {
              if (data.selectedRows.length === 0) return;
              data.setOpenDelete(true);
            }}

            onClearSelection={() => data.setSelectedRows([])}
            onMassEditOpen={() => {
              data.setOpenDelete(false);
              impExp.setOpenMassEdition(true);
            }}

            onImportOpen={() => {
              if (typeof (impExp as any).setImportMode === "function") {
                (impExp as any).setImportMode("inclusao");
              }
              impExp.fileInputRef.current?.click();
            }}

            onNew={() => router.push("/dashboard/anuncios/edit")}
          />

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableHeaderRow
                sortColumn={data.sortColumn}
                sortDirection={data.sortDirection}
                onSort={data.handleSort}
                allVisibleSelected={data.allVisibleSelected}
                toggleSelectAllVisible={data.toggleSelectAllVisible}
              />
            </TableHeader>

            <TableBody>
              <TableBodyRows
                rows={data.rows}
                loading={data.loading}
                selectedRows={data.selectedRows}
                toggleRow={data.toggleRow}
                onEdit={(id, loja) =>
                  router.push(
                    `/dashboard/anuncios/edit?id=${id}&loja=${encodeURIComponent(
                      loja === "PK" ? "Pikot Shop" : loja === "SB" ? "Sóbaquetas" : loja
                    )}`
                  )
                }

                // ✅ ícone: seleciona 1 e abre o mesmo modal
                onDelete={(row) => {
                  data.setSelectedRows([row as any]);
                  data.setOpenDelete(true);
                }}
              />
            </TableBody>
          </Table>
        </GlassmorphicCard>

        {/* Controles de página */}
        <div className="mt-2">
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

      {/* ✅ ÚNICO Modal de exclusão (burro) */}
      <ConfirmDeleteModal
        open={data.openDelete}
        onOpenChange={(v) => !loadingDelete && data.setOpenDelete(v)}
        count={data.selectedRows.length}
        loading={loadingDelete}
        onConfirm={handleDeleteSelected}
      />

      {/* Mass Edition */}
      <MassEditionModal
        open={impExp.openMassEdition}
        onOpenChange={(v) => {
          if (v) data.setOpenDelete(false);
          impExp.setOpenMassEdition(v);
        }}
        onImportInclusao={(file) => {
          data.setOpenDelete(false);
          impExp.handleFileDirect(file, "inclusao");
        }}
        onImportAlteracao={(file) => {
          data.setOpenDelete(false);
          impExp.handleFileDirect(file, "alteracao");
        }}
      />

      {/* Modal de confirmação da importação */}
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
