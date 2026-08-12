"use client";

import React from "react";

import { Controls } from "@/components/costs/Controls";
import NewCost from "@/components/costs/Newcost";
import ConfirmDelete from "@/components/costs/Confirmdelete";
import ConfirmImport from "@/components/costs/Confirmimport";
import CostFilters from "@/components/costs/Costfilters";
import CostActions from "@/components/costs/Costactions";
import CostAdjustmentsModal from "@/components/costs/Costadjustmentsmodal";
import CostLocation from "@/components/costs/Costlocation";
import CostTable from "@/components/costs/Costdatatable";
import { FloatingEditor } from "@/components/costs/Floatingeditor";
import ExportProgressToast from "@/components/costs/Exportprogresstoast";

import { useCosts } from "@/components/costs/hooks/usecosts";

import { Check as CheckIcon, X as XIcon, Menu, SlidersHorizontal } from "lucide-react";

export default function Costs() {
  const {
    rows,
    totalItems,
    loading,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    filters,
    setFilters,
    allBrands,
    selectedBrands,
    setSelectedBrands,
    applyingFilters,
    handleApplyFilters,
    handleClearFilters,
    appliedFilters,
    setAppliedFilters,

    sortColumn,
    sortDirection,
    handleSortColumn,

    selectedRows,
    setSelectedRows,
    setSelectedRowsUnique,
    allSelected,
    handleToggleSelectAll,
    handleSelectAllFiltered,
    selectingAll,
    copiedId,
    handleCopy,

    openNew,
    setOpenNew,
    mode,
    form,
    setForm,
    openCreate,
    openEdit,
    saveForm,

    editing,
    setEditing,
    savingEdit,
    openCostEditor,
    confirmCostEdit,
    cancelCostEdit,

    openDelete,
    setOpenDelete,
    deleting,
    deleteSelected,

    exporting,
    handleExport,
    handleExportModeloInclusao,
    handleExportModeloAlteracao,
    handleExportRenomeacaoCodigos,
    exportProgressOpen,
    setExportProgressOpen,
    exportProgress,
    exportProgressCount,
    cancelExportRef,

    openImport,
    setOpenImport,
    importCount,
    previewRows,
    importing,
    warnings,
    importTipo,
    handleImportInclusao,
    handleImportAlteracao,
    confirmImport,

    renamingCodes,
    openRenamePreview,
    setOpenRenamePreview,
    renameRows,
    setRenameRows,
    renameWarnings,
    setRenameWarnings,
    renameErrors,
    setRenameErrors,
    renameFileName,
    setRenameFileName,
    handleImportRenomeacaoCodigos,
    confirmRenomeacaoCodigos,

    openAdjustments,
    setOpenAdjustments,
    applyingAdjustments,
    handleApplyAdjustments,

    openFiltersMobile,
    setOpenFiltersMobile,
    openActionsMobile,
    setOpenActionsMobile,
  } = useCosts();

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 selection:bg-[#1a8ceb]/20">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Conteúdo principal */}
        <section className="min-w-0">
          {/* Cabeçalho: breadcrumb + mobile actions */}
          <div className="border-b border-neutral-900 bg-[#050505] px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between gap-2">
              <CostLocation path={["Dashboard", "Precificação", "Custos"]} />

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
            {/* Filtros (desktop) */}
            <div className="hidden lg:block">
              <CostFilters
                filters={filters}
                setFilters={setFilters}
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={loading || applyingFilters}
              />
            </div>

            {/* Card unificado: header + tabela + controls */}
            <div className="mt-3 overflow-hidden border border-neutral-900 bg-[#0a0a0a] lg:mt-0 lg:border-t-0">
              <CostTable
                rows={rows}
                loading={loading}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRowsUnique}
                copiedId={copiedId}
                handleCopy={handleCopy}
                openEdit={openEdit}
                openCostEditor={openCostEditor}
                openDeleteOne={(row) => {
                  setSelectedRows([row]);
                  setOpenDelete(true);
                }}
                allSelected={allSelected}
                situacao={appliedFilters.situacao}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggleSelectAll={handleToggleSelectAll}
                onSituacaoChange={(value) => {
                  setFilters((prev) => ({ ...prev, situacao: value }));
                  setAppliedFilters((prev) => ({ ...prev, situacao: value }));
                  setCurrentPage(1);
                }}
                onSort={handleSortColumn}
                onDeleteSelected={() => setOpenDelete(true)}
                onOpenAdjustments={() => setOpenAdjustments(true)}
                onClearSelection={() => setSelectedRows([])}
                onSelectAllTable={handleSelectAllFiltered}
                selectingAll={selectingAll}
              />

              <div className="border-t border-neutral-900 pb-24 lg:pb-0">
                <Controls
                  currentPage={currentPage}
                  totalPages={Math.max(1, Math.ceil(totalItems / itemsPerPage))}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={(p) => setCurrentPage(p)}
                  onItemsPerPageChange={(v) => {
                    setItemsPerPage(v);
                    setCurrentPage(1);
                  }}
                  selectedCount={selectedRows.length}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar direita: Ações */}
        <aside className="relative hidden lg:block border-l border-neutral-900">
          <div className="fixed right-0 top-0 h-screen w-[280px] overflow-y-auto bg-[#050505] pt-24">
            <div className="px-5 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a8ceb]/80">
                Ações
              </span>
            </div>

            <CostActions
              exporting={exporting || renamingCodes}
              handleExport={handleExport}
              onOpenCreate={openCreate}
              onExportModeloInclusao={handleExportModeloInclusao}
              onExportModeloAlteracao={handleExportModeloAlteracao}
              onExportRenomeacaoCodigos={handleExportRenomeacaoCodigos}
              onImportInclusao={handleImportInclusao}
              onImportAlteracao={handleImportAlteracao}
              onImportRenomeacaoCodigos={handleImportRenomeacaoCodigos}
              totalCount={totalItems}
            />
          </div>
        </aside>
      </div>

      {/* Botão flutuante de ações no mobile */}
      <button
        type="button"
        onClick={() => setOpenActionsMobile(true)}
        aria-label="Abrir ações"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[#1a8ceb]/40 bg-[#0a0a0a] text-[#1a8ceb] active:scale-95 lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Painel de filtros - mobile */}
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

            <CostFilters
              filters={filters}
              setFilters={setFilters}
              allBrands={allBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={loading || applyingFilters}
            />
          </div>
        </div>
      )}

      {/* Painel de ações - mobile */}
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
              <CostActions
                exporting={exporting || renamingCodes}
                handleExport={handleExport}
                onOpenCreate={() => {
                  setOpenActionsMobile(false);
                  openCreate();
                }}
                onExportModeloInclusao={handleExportModeloInclusao}
                onExportModeloAlteracao={handleExportModeloAlteracao}
                onExportRenomeacaoCodigos={handleExportRenomeacaoCodigos}
                onImportInclusao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportInclusao(file);
                }}
                onImportAlteracao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportAlteracao(file);
                }}
                onImportRenomeacaoCodigos={(file) => {
                  setOpenActionsMobile(false);
                  handleImportRenomeacaoCodigos(file);
                }}
                totalCount={totalItems}
              />
            </div>
          </div>
        </div>
      )}

      <NewCost
        open={openNew}
        onOpenChange={setOpenNew}
        mode={mode}
        form={form}
        setForm={setForm}
        onSave={saveForm}
      />

      <ConfirmDelete
        open={openDelete}
        onOpenChange={setOpenDelete}
        count={selectedRows.length}
        onConfirm={deleteSelected}
        loading={deleting}
      />

      <ConfirmImport
        open={openImport}
        onOpenChange={setOpenImport}
        count={importCount}
        onConfirm={confirmImport}
        loading={importing}
        preview={previewRows}
        warnings={warnings}
        tipo={importTipo}
      />
      
      <CostAdjustmentsModal
        open={openAdjustments}
        onOpenChange={setOpenAdjustments}
        selectedRows={selectedRows}
        onApply={handleApplyAdjustments}
        applying={applyingAdjustments}
      />

      <ExportProgressToast
        open={exportProgressOpen}
        percent={exportProgress}
        message={
          exportProgressCount > 0
            ? `${exportProgressCount} custo(s)`
            : undefined
        }
        onClose={() => {
          cancelExportRef.current = true;
          setExportProgressOpen(false);
        }}
      />

      {editing && (
        <FloatingEditor anchorRect={editing.anchorRect} onClose={cancelCostEdit}>
          <div className="w-full">
            <div className="flex items-center justify-between border-b border-neutral-900 px-2.5 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1a8ceb]/80">
                {editing.field}
              </span>
              <span className="text-[10px] text-neutral-600">Enter ↵ · Esc</span>
            </div>

            <div className="p-1.5">
              {(() => {
                const num = parseFloat(editing.value.replace(",", "."));
                const isValid = editing.value.trim() === "" || Number.isFinite(num);

                return (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        className={`
                          flex h-8 flex-1 items-center gap-1.5 border bg-black px-1.5
                          transition-colors
                          ${
                            isValid
                              ? "border-neutral-800 focus-within:border-[#1a8ceb]/60"
                              : "border-red-500/60 focus-within:border-red-500"
                          }
                        `}
                      >
                        <span className="shrink-0 text-[11px] font-semibold text-neutral-500">
                          R$
                        </span>

                        <input
                          autoFocus
                          inputMode="decimal"
                          disabled={savingEdit}
                          aria-label={`Editar ${editing.field}`}
                          aria-invalid={!isValid}
                          className="h-full flex-1 min-w-0 bg-transparent text-sm text-white outline-none disabled:opacity-50"
                          value={editing.value}
                          onChange={(e) => {
                            let cleaned = e.target.value.replace(/[^0-9.,]/g, "");
                            const firstSep = cleaned.search(/[.,]/);

                            if (firstSep !== -1) {
                              const before = cleaned.slice(0, firstSep + 1);
                              const after = cleaned
                                .slice(firstSep + 1)
                                .replace(/[.,]/g, "");
                              cleaned = before + after;
                            }

                            setEditing((prev) =>
                              prev ? { ...prev, value: cleaned } : prev
                            );
                          }}
                          onBlur={() => {
                            const n = parseFloat(editing.value.replace(",", "."));
                            if (Number.isFinite(n)) {
                              setEditing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      value: n.toFixed(2).replace(".", ","),
                                    }
                                  : prev
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && isValid) confirmCostEdit();
                            if (e.key === "Escape") cancelCostEdit();
                          }}
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Cancelar"
                          aria-label="Cancelar edição"
                          onClick={cancelCostEdit}
                          disabled={savingEdit}
                          className="
                            flex h-8 w-8 items-center justify-center
                            border border-neutral-800 bg-black
                            text-neutral-400
                            transition-colors
                            hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400
                            disabled:cursor-not-allowed disabled:opacity-40
                            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400
                          "
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Confirmar"
                          aria-label="Confirmar edição"
                          onClick={confirmCostEdit}
                          disabled={savingEdit || !isValid}
                          className="
                            flex h-8 w-8 items-center justify-center
                            border border-[#1a8ceb]/50 bg-[#1a8ceb]/10
                            text-[#1a8ceb]
                            transition-colors
                            hover:border-[#1a8ceb] hover:bg-[#1a8ceb] hover:text-white
                            disabled:cursor-not-allowed disabled:opacity-40
                            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
                          "
                        >
                          {savingEdit ? (
                            <span className="h-3.5 w-3.5 animate-spin border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <CheckIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p
                      role="status"
                      aria-live="polite"
                      className={`mt-1.5 pl-0.5 text-[11px] ${
                        !isValid ? "text-red-400" : "text-neutral-500"
                      }`}
                    >
                      {!isValid
                        ? "Valor inválido"
                        : editing.value.trim() !== ""
                        ? num.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "Digite um valor"}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </FloatingEditor>
      )}
    </div>
  );
}
