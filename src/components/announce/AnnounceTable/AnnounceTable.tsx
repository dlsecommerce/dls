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
  const data = useAnunciosData();

  const safeSelectedLoja = data.selectedLoja ?? [];
  const safeSelectedBrands = data.selectedBrands ?? [];
  const safeSelectedCategoria = data.selectedCategoria ?? [];

  // Hook de Import/Export conectado com filtros e seleção atual
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
            selectedRows={data.selectedRows}
            onDeleteSelected={() => {
              // abre confirmação (não executa delete direto)
              if (data.selectedRows.length === 0) return;
              data.setOpenDelete(true);
            }}
            onClearSelection={() => data.setSelectedRows([])}
            onMassEditOpen={() => {
              // garante que não vai "vazar" modal de delete por cima
              data.setOpenDelete(false);
              impExp.setOpenMassEdition(true);
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
                      loja === "PK"
                        ? "Pikot Shop"
                        : loja === "SB"
                        ? "Sóbaquetas"
                        : loja
                    )}`
                  )
                }
                onDelete={(row) => {
                  // abre confirmação (não executa delete direto)
                  data.setSelectedRows([row]);
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

      {/* Modal de exclusão */}
      <ConfirmDeleteModal
        open={data.openDelete}
        onOpenChange={data.setOpenDelete}
        count={data.selectedRows.length}
        selectedRows={data.selectedRows.map((r) => ({
          ID: String(r.id ?? r.ID ?? ""),
          Loja: String(r.loja ?? r.Loja ?? ""),
        }))}
        onAfterDelete={async () => {
          await data.loadAnuncios(data.currentPage);
          data.setSelectedRows([]);
        }}
      />

      {/* Mass Edition */}
      <MassEditionModal
        open={impExp.openMassEdition}
        onOpenChange={(v) => {
          // se fechar, ok; se abrir, garante que delete esteja fechado
          if (v) data.setOpenDelete(false);
          impExp.setOpenMassEdition(v);
        }}
        onImportInclusao={(file) => {
          // garantia extra: nunca deixar delete por cima do confirm import
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
        previewRows={impExp.previewRows}
        warnings={impExp.warnings}
        onConfirm={impExp.confirmImport}
        importing={impExp.importing}
        tipo={impExp.importMode}
      />
    </div>
  );
}
