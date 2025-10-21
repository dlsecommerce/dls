"use client";

import React from "react";
import { useRouter } from "next/navigation";
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

  // 🔹 Hook principal: dados, filtros, ordenação, etc.
  const data = useAnunciosData();

  // 🔹 Hook de import/export
  const impExp = useImportExport(data.loadAnuncios, data.currentPage);

  // 🔹 Cálculo de páginas
  const totalPages = Math.max(1, Math.ceil(data.totalItems / data.itemsPerPage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          {/* === Barra Superior === */}
          <TopBar
            search={data.search}
            setSearch={data.setSearch}
            allBrands={data.allBrands}
            allLojas={data.allLojas}
            allCategorias={data.allCategorias}
            selectedBrands={data.selectedBrands}
            selectedLoja={data.selectedLoja}
            selectedCategoria={data.selectedCategoria}
            setSelectedBrands={data.setSelectedBrands}
            setSelectedLoja={data.setSelectedLoja}
            setSelectedCategoria={data.setSelectedCategoria}
            filterOpen={data.filterOpen}
            setFilterOpen={data.setFilterOpen}
            fileInputRef={impExp.fileInputRef}
            onFileSelect={impExp.handleFileSelect}
            onExport={() => impExp.handleExport(data.rows)}
            selectedCount={data.selectedRows.length}
            onDeleteSelected={() => data.setOpenDelete(true)}
            onClearSelection={() => data.setSelectedRows([])}
            onMassEditOpen={() => impExp.setOpenImport(true)}
            onNew={() => router.push("/dashboard/anuncios/edit")}
          />

          {/* === Tabela === */}
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
                // ✅ Passa o id + loja correta (PK/SB → nome completo)
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
                  data.setSelectedRows([row]);
                  data.setOpenDelete(true);
                }}
              />
            </TableBody>
          </Table>
        </GlassmorphicCard>

        {/* === Controles de Paginação === */}
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

      {/* === Modais === */}
      <ConfirmDeleteModal
        open={data.openDelete}
        onOpenChange={data.setOpenDelete}
        count={data.selectedRows.length}
        onConfirm={data.deleteSelected}
        loading={data.deleting}
      />

      <MassEditionModal
        open={impExp.openImport}
        onOpenChange={impExp.setOpenImport}
        onExportModeloAlteracao={() => impExp.handleExport(data.rows)}
      />

      <ConfirmImportModal
        open={impExp.openImport}
        onOpenChange={impExp.setOpenImport}
        count={impExp.importCount}
        onConfirm={impExp.confirmImport}
        loading={impExp.importing}
        preview={impExp.previewRows}
        warnings={impExp.warnings}
      />
    </div>
  );
}
