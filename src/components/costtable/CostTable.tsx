"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { TableControls } from "@/components/costtable/TableControls";
import ModalNewCost from "@/components/costtable/ModalNewCost";
import ConfirmDeleteModal from "@/components/costtable/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/costtable/ConfirmImportModal";
import CostFiltersSidebar from "@/components/costtable/CostFiltersSidebar";
import CostActionsSidebar from "@/components/costtable/CostActionsSidebar";
import CostDataTable from "@/components/costtable/CostDataTable";
import CostTableHeaderBar from "@/components/costtable/CostTableHeaderBar";
import { FloatingEditor } from "@/components/costtable/FloatingEditor";

import { exportFilteredToXlsx } from "@/components/costtable/helpers/exportFilteredToXlsx";
import { importFromXlsxOrCsv } from "@/components/costtable/helpers/importFromXlsx";
import { playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";

import {
  CostFilters,
  Custo,
  DEFAULT_COST_FILTERS,
} from "@/components/costtable/types";
import {
  arraysEqual,
  buildOrSearchParts,
  parseArrayParam,
  parsePositiveInt,
  parseSearchTokens,
} from "@/components/costtable/utils";

import * as XLSX from "xlsx-js-style";
import { Check as CheckIcon, X as XIcon } from "lucide-react";

export default function CostTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialMarca = searchParams.get("marca") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);

  const [search, setSearch] = useState(initialSearch);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [filters, setFilters] = useState<CostFilters>({
    ...DEFAULT_COST_FILTERS,
    marca: initialMarca,
  });

  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  const [openNew, setOpenNew] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<Custo>({
    ["Código"]: "",
    ["Marca"]: "",
    ["Produto"]: "",
    ["Custo Atual"]: "",
    ["Custo Antigo"]: "",
    ["NCM"]: "",
  });

  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importTipo, setImportTipo] = useState<"inclusao" | "alteracao">(
    "inclusao"
  );

  const [selectedRows, setSelectedRows] = useState<Custo[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editing, setEditing] = useState<{
    codigo: string;
    value: string;
    anchorRect: DOMRect;
  } | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
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

    setCurrentPage(1);
  };

  const loadAllBrands = async () => {
    const pageSize = 1000;
    let from = 0;
    const setBrands = new Set<string>();

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("custos")
        .select("Marca")
        .range(from, to);

      if (error) {
        console.error("Erro ao carregar marcas:", error);
        break;
      }

      (data || []).forEach((r: any) => {
        if (r?.Marca) setBrands.add(String(r.Marca).trim());
      });

      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    setAllBrands(Array.from(setBrands).sort((a, b) => a.localeCompare(b)));
  };

  const buildQuery = (countOnly = false) => {
    let q = supabase
      .from("custos")
      .select("*", { count: "exact", head: countOnly });

    if (search.trim()) {
      const tokens = parseSearchTokens(search);
      const orParts = buildOrSearchParts(tokens);

      if (orParts.length) {
        q = q.or(orParts.join(","));
      }
    }

    if (selectedBrands.length) {
      q = q.in("Marca", selectedBrands);
    }

    if (filters.marca.trim()) {
      const marcaTokens = parseSearchTokens(filters.marca);
      const marcaParts: string[] = [];

      for (const term of marcaTokens) {
        if (!term) continue;

        const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        marcaParts.push(`Marca.ilike."%${escaped}%"`);
      }

      if (marcaParts.length === 1) {
        q = q.ilike("Marca", `%${marcaTokens[0]}%`);
      } else if (marcaParts.length > 1) {
        q = q.or(marcaParts.join(","));
      }
    }

    if (filters.ncm === "Com NCM") {
      q = q.not("NCM", "is", null).neq("NCM", "");
    }

    if (filters.ncm === "Sem NCM") {
      q = q.or('NCM.is.null,NCM.eq.""');
    }

    if (sortColumn) {
      q = q.order(sortColumn, { ascending: sortDirection === "asc" });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    return q;
  };

  const loadData = async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { count } = await buildQuery(true);
    setTotalItems(count || 0);

    const { data, error } = await buildQuery(false).range(from, to);

    if (error) {
      console.error("Erro ao carregar dados:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as Custo[]);
    setLoading(false);
  };

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlMarca = searchParams.get("marca") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setCurrentPage((prev) => (prev !== urlPage ? urlPage : prev));
    setItemsPerPage((prev) => (prev !== urlPerPage ? urlPerPage : prev));
    setSelectedBrands((prev) => (arraysEqual(prev, urlBrands) ? prev : urlBrands));
    setSortColumn((prev) => (prev !== urlSortColumn ? urlSortColumn : prev));
    setSortDirection((prev) =>
      prev !== urlSortDirection ? urlSortDirection : prev
    );
    setFilters((prev) =>
      prev.marca !== urlMarca ? { ...prev, marca: urlMarca } : prev
    );
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search !== "") params.set("search", search);
    if (filters.marca !== "") params.set("marca", filters.marca);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (itemsPerPage !== 50) params.set("perPage", String(itemsPerPage));
    if (selectedBrands.length) params.set("brands", selectedBrands.join(","));
    if (sortColumn) params.set("sortColumn", sortColumn);
    if (sortColumn && sortDirection !== "asc") {
      params.set("sortDirection", sortDirection);
    }

    const nextUrl = params.toString() ? `?${params.toString()}` : "?";
    router.replace(nextUrl, { scroll: false });
  }, [
    search,
    filters.marca,
    currentPage,
    itemsPerPage,
    selectedBrands,
    sortColumn,
    sortDirection,
    router,
  ]);

  useEffect(() => {
    loadAllBrands();
  }, []);

  useEffect(() => {
    loadData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]);

  useEffect(() => {
    setSelectedRows([]);
    setCurrentPage(1);
  }, [search, selectedBrands, filters.marca, filters.ncm, filters.situacao]);

  useEffect(() => {
    loadData(1, itemsPerPage);
  }, [search, selectedBrands, filters.marca, filters.ncm, filters.situacao]);

  const handleExport = async () => {
    const now = new Date();
    const date = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const time = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");

    const brandTag =
      selectedBrands.length > 0
        ? selectedBrands
            .map((b) => String(b).trim().substring(0, 3).toUpperCase())
            .filter(Boolean)
            .join("-")
        : "";

    const fileName = `CUSTOS - ${
      brandTag ? `${brandTag}-` : ""
    }RELATÓRIO - ${date} ${time}.xlsx`;

    if (selectedRows.length > 0) {
      exportFilteredToXlsx(selectedRows as Custo[], fileName);
      toastCustom.success("Exportação concluída!", "Download iniciado.");
      return;
    }

    setExporting(true);
    try {
      const pageSize = 1000;
      let all: Custo[] = [];
      let from = 0;

      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await buildQuery(false).range(from, to);
        if (error) throw error;

        const chunk = (data || []) as Custo[];
        all = all.concat(chunk);

        if (chunk.length < pageSize) break;
        from += pageSize;
      }

      exportFilteredToXlsx(all, fileName);
      toastCustom.success("Exportação concluída!", "Download iniciado.");
    } catch (err: any) {
      toastCustom.error(
        "Erro ao exportar",
        err?.message || "Falha ao gerar o arquivo."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportModeloInclusao = () => {
    const headers = [
      "Código",
      "Marca",
      "Produto",
      "Custo Atual",
      "Custo Antigo",
      "NCM",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    const style = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1A8CEB" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    headers.forEach((_, idx) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: idx });
      (ws as any)[cell] = (ws as any)[cell] || {};
      (ws as any)[cell].s = style;
    });

    (ws as any)["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 34 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.sheet_add_aoa(
      ws,
      [["12345", "Liverpool", "Baqueta 7A Liverpool", "250.00", "240.00", "851821"]],
      { origin: -1 }
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inclusão");

    const now = new Date();
    const nomeArquivo = `INCLUSÃO - ${now
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")} ${now
      .toLocaleTimeString("pt-BR")
      .replace(/:/g, "-")}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  };

  const handleExportModeloAlteracao = async () => {
    try {
      const { data } = await supabase.from("custos").select("*");

      const now = new Date();
      const fileName = `ALTERAÇÃO - ${now
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")} ${now
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-")}.xlsx`;

      exportFilteredToXlsx((data || []) as Custo[], fileName);
      toastCustom.success("Modelo exportado!", "Download iniciado.");
    } catch (err: any) {
      toastCustom.error(
        "Erro ao exportar modelo",
        err?.message || "Falha ao gerar o arquivo."
      );
    }
  };

  const openCreate = () => {
    setMode("create");
    setForm({
      ["Código"]: "",
      ["Marca"]: "",
      ["Produto"]: "",
      ["Custo Atual"]: "",
      ["Custo Antigo"]: "",
      ["NCM"]: "",
    });
    setOpenNew(true);
  };

  const openEdit = (row: Custo) => {
    setMode("edit");
    setForm({ ...row });
    setOpenNew(true);
  };

  const openCostEditor = (row: Custo, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    setEditing({
      codigo: row["Código"],
      value: String(row["Custo Atual"] ?? ""),
      anchorRect: rect,
    });
  };

  const confirmCostEdit = async () => {
    if (!editing) return;

    const codigo = editing.codigo;
    const novoCusto = editing.value.trim();
    const prevRows = rows;

    const updatedRows = rows.map((r) =>
      r["Código"] === codigo
        ? {
            ...r,
            ["Custo Atual"]: novoCusto,
          }
        : r
    );

    setRows(updatedRows);
    setEditing(null);

    try {
      const { error } = await supabase
        .from("custos")
        .update({ ["Custo Atual"]: novoCusto })
        .eq("Código", codigo);

      if (error) throw error;

      toastCustom.success("Custo atualizado!", "Alteração salva com sucesso.");
    } catch (err: any) {
      setRows(prevRows);
      toastCustom.error(
        "Erro ao atualizar custo",
        err?.message || "Falha ao salvar alteração."
      );
    }
  };

  const cancelCostEdit = () => {
    setEditing(null);
  };

  const saveForm = async () => {
    await loadData();
    await loadAllBrands();
  };

  const deleteSelected = async () => {
    if (!selectedRows.length) return;
    setDeleting(true);

    try {
      await supabase
        .from("custos")
        .delete()
        .in(
          "Código",
          selectedRows.map((r) => r["Código"])
        );

      setSelectedRows([]);
      setOpenDelete(false);
      toastCustom.success("Exclusão concluída!", "Registros removidos com sucesso.");
      loadData();
    } catch (err: any) {
      toastCustom.error(
        "Erro ao excluir",
        err?.message || "Falha ao excluir registros."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleImportInclusao = async (file: File) => {
    try {
      toastCustom.message("Lendo arquivo...", "Gerando prévia da inclusão.");

      const { data, warnings } = await importFromXlsxOrCsv(file, true);

      setParsedRows(data);
      setPreviewRows(data.slice(0, 5));
      setImportCount(data.length);
      setWarnings(warnings || []);
      setImportTipo("inclusao");
      setOpenImport(true);

      if (warnings?.length) {
        toastCustom.warning("Prévia carregada", warnings[0]);
      }
    } catch (err: any) {
      toastCustom.error(
        "Erro ao ler arquivo",
        err?.message || "Falha ao processar arquivo."
      );
    }
  };

  const handleImportAlteracao = async (file: File) => {
    try {
      toastCustom.message("Lendo arquivo...", "Gerando prévia da alteração.");

      const { data, warnings } = await importFromXlsxOrCsv(file, true);

      setParsedRows(data);
      setPreviewRows(data.slice(0, 5));
      setImportCount(data.length);
      setWarnings(warnings || []);
      setImportTipo("alteracao");
      setOpenImport(true);

      if (warnings?.length) {
        toastCustom.warning("Prévia carregada", warnings[0]);
      }
    } catch (err: any) {
      toastCustom.error(
        "Erro ao ler arquivo",
        err?.message || "Falha ao processar arquivo."
      );
    }
  };

  const confirmImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);

    try {
      toastCustom.message("Importando...", "Aguarde a conclusão.");

      await importFromXlsxOrCsv(parsedRows, false, importTipo);
      await loadData();
      await loadAllBrands();

      playImportSuccessSound(0.4);

      toastCustom.success(
        "Importação concluída!",
        `${parsedRows.length} registros processados.`
      );
    } catch (err: any) {
      toastCustom.error(
        "Erro ao importar",
        err?.message || "Falha no processamento."
      );
    } finally {
      setImporting(false);
      setOpenImport(false);
      setParsedRows([]);
    }
  };

  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  return (
    <div className="min-h-screen bg-[#0b0b0c] p-0">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside>
          <div className="fixed left-0 top-24 h-screen w-[220px] overflow-y-auto bg-[#0b0b0c]">
            <CostFiltersSidebar
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
            />
          </div>
        </aside>

        <section className="min-w-0 bg-[#0b0b0c]">
          <div className="px-4 py-4">
            <CostTableHeaderBar
              allSelected={allSelected}
              hasRows={rows.length > 0}
              situacao={filters.situacao}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              selectedCount={selectedRows.length}
              onSituacaoChange={(value) =>
                setFilters((prev) => ({ ...prev, situacao: value }))
              }
              onToggleSelectAll={(checked) => {
                if (checked) setSelectedRows(rows);
                else setSelectedRows([]);
              }}
              onRefresh={() => loadData(currentPage, itemsPerPage)}
              onSort={handleSort}
              onDeleteSelected={() => setOpenDelete(true)}
            />

            <GlassmorphicCard className="overflow-hidden rounded-none border border-neutral-700 bg-[#101010] shadow-none border-t-0">
              <CostDataTable
                rows={rows}
                loading={loading}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                copiedId={copiedId}
                handleCopy={handleCopy}
                openEdit={openEdit}
                openCostEditor={openCostEditor}
                openDeleteOne={(row) => {
                  setSelectedRows([row]);
                  setOpenDelete(true);
                }}
              />
            </GlassmorphicCard>

            <div className="mt-2 px-2 pb-4">
              <TableControls
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
        </section>

        <aside className="relative">
          <div className="fixed right-5 top-23 h-screen w-[300px] overflow-y-auto bg-[#0b0b0c]">
            <CostActionsSidebar
              exporting={exporting}
              handleExport={handleExport}
              onOpenCreate={openCreate}
              onExportModeloInclusao={handleExportModeloInclusao}
              onExportModeloAlteracao={handleExportModeloAlteracao}
              onImportInclusao={handleImportInclusao}
              onImportAlteracao={handleImportAlteracao}
            />
          </div>
        </aside>
      </div>

      <ModalNewCost
        open={openNew}
        onOpenChange={setOpenNew}
        mode={mode}
        form={form}
        setForm={setForm}
        onSave={saveForm}
      />

      <ConfirmDeleteModal
        open={openDelete}
        onOpenChange={setOpenDelete}
        count={selectedRows.length}
        onConfirm={deleteSelected}
        loading={deleting}
      />

      <ConfirmImportModal
        open={openImport}
        onOpenChange={setOpenImport}
        count={importCount}
        onConfirm={confirmImport}
        loading={importing}
        preview={previewRows}
        warnings={warnings}
        tipo={importTipo}
      />

      {editing && (
        <FloatingEditor anchorRect={editing.anchorRect} onClose={cancelCostEdit}>
          <div className="relative flex items-center rounded-md border border-neutral-700 bg-black/30 px-2 py-1.5">
            <span className="text-xs px-1 py-0.5 rounded bg-black/60 border border-neutral-700 mr-1">
              R$
            </span>

            <input
              autoFocus
              inputMode="decimal"
              className="flex-1 bg-transparent outline-none text-sm text-white pr-10"
              value={editing.value}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, value: e.target.value } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCostEdit();
                if (e.key === "Escape") cancelCostEdit();
              }}
            />

            <div className="absolute right-1 flex items-center gap-1">
              <button
                title="Cancelar"
                onClick={cancelCostEdit}
                className="text-red-400 hover:text-red-300"
              >
                <XIcon className="w-4 h-4" />
              </button>

              <button
                title="Confirmar"
                onClick={confirmCostEdit}
                className="text-green-400 hover:text-green-300"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </FloatingEditor>
      )}
    </div>
  );
}