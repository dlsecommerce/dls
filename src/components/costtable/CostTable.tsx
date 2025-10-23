"use client";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowUpDown,
  Download,
  Edit as EditIcon,
  Loader,
  Layers,
  Search,
  Trash2 as TrashIcon,
  Upload,
  CopyIcon,
} from "lucide-react";

import { TableControls } from "@/components/costtable/TableControls";
import FilterBrandsPopover from "@/components/costtable/FilterBrandsPopover";
import ModalNewCost, {
  Custo as CustoType,
} from "@/components/costtable/ModalNewCost";
import MassEditionModal from "@/components/costtable/MassEditionModal";
import ConfirmDeleteModal from "@/components/costtable/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/costtable/ConfirmImportModal";

import { exportFilteredToXlsx } from "@/components/costtable/helpers/exportFilteredToXlsx";
import { importFromXlsxOrCsv } from "@/components/costtable/helpers/importFromXlsx";

type Custo = CustoType;

export default function CostTable() {
  /* === Estados === */
  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [search, setSearch] = useState("");
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [openNew, setOpenNew] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<Custo>({
    ["Código"]: "",
    ["Marca"]: "",
    ["Custo Atual"]: "",
    ["Custo Antigo"]: "",
    ["NCM"]: "",
  });

  const [openMass, setOpenMass] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [selectedRows, setSelectedRows] = useState<Custo[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  // Novo estado para cópia
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, uniqueKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(uniqueKey);
    setTimeout(() => setCopiedId(null), 1500);
  };

  /* === carregar todas as marcas === */
  const loadAllBrands = async () => {
    const { count } = await supabase
      .from("custos")
      .select("*", { count: "exact", head: true });

    const total = count || 0;
    const pageSize = 2000;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const setBrands = new Set<string>();

    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("custos")
        .select("Marca")
        .range(from, to);
      if (error) break;
      (data || []).forEach((r: any) => {
        if (r?.Marca) setBrands.add(r.Marca);
      });
    }

    setAllBrands(Array.from(setBrands).sort((a, b) => a.localeCompare(b)));
  };

  /* === construir query === */
  const buildQuery = (countOnly = false) => {
    let q = supabase
      .from("custos")
      .select(countOnly ? "*" : "*", { count: "exact", head: countOnly });
    if (search.trim() !== "")
      q = q.or(
        `Código.ilike.%${search}%,Marca.ilike.%${search}%,NCM.ilike.%${search}%`
      );
    if (selectedBrands.length > 0) q = q.in("Marca", selectedBrands);
    if (sortColumn)
      q = q.order(sortColumn, { ascending: sortDirection === "asc" });
    return q;
  };

  /* === carregar dados === */
  const loadData = async (page = currentPage, limit = itemsPerPage) => {
    setLoading(true);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { count } = await buildQuery(true);
    setTotalItems(count || 0);

    const { data, error } = await buildQuery(false).range(from, to);
    if (!error && data) setRows(data as Custo[]);
    setTimeout(() => setLoading(false), 400);
  };

  useEffect(() => {
    loadAllBrands();
  }, []);
  useEffect(() => {
    loadData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]);
  useEffect(() => {
    setCurrentPage(1);
    loadData(1, itemsPerPage);
  }, [search, selectedBrands]);

  const handleSort = (col: string) => {
    if (sortColumn === col)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  /* === EXPORTAÇÃO === */
  const fetchAllFiltered = async (): Promise<Custo[]> => {
    const { count } = await buildQuery(true);
    const total = count || 0;
    const pageSize = 1000;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    let results: Custo[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await buildQuery(false).range(from, to);
      if (error) break;
      results = results.concat((data as Custo[]) || []);
    }
    return results;
  };

  const handleExport = async () => {
    let exportData = selectedRows.length > 0 ? selectedRows : await fetchAllFiltered();

    if (!exportData || exportData.length === 0) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hora}h${min}m`;

    let marcaTag = "";
    if (selectedBrands.length > 0) {
      marcaTag = selectedBrands
        .map((m) => {
          const clean = m
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z]/g, "");
          return clean.substring(0, 3).toUpperCase();
        })
        .join("-");
    }

    const baseName = selectedRows.length > 0 ? "CUSTOS-SELECIONADOS" : "CUSTOS";
    const marcaPart = marcaTag ? `-${marcaTag}` : "";
    const filename = `${baseName}${marcaPart}-${dia}-${mes}-${ano}-${timeStr}.xlsx`;

    exportFilteredToXlsx(exportData, filename);
  };

  /* === CRUD === */
  const openCreate = () => {
    setMode("create");
    setForm({
      ["Código"]: "",
      ["Marca"]: "",
      ["Custo Atual"]: "",
      ["Custo Antigo"]: "",
      ["NCM"]: "",
    });
    setOpenNew(true);
  };

  const openEdit = (row: Custo) => {
    setMode("edit");
    setForm({
      ["Código"]: row["Código"] || "",
      ["Marca"]: row["Marca"] || "",
      ["Custo Atual"]: row["Custo Atual"] || "",
      ["Custo Antigo"]: row["Custo Antigo"] || "",
      ["NCM"]: row["NCM"] || "",
    });
    setOpenNew(true);
  };

  const saveForm = async () => {
    await loadData(currentPage, itemsPerPage);
    await loadAllBrands();
  };

  const deleteSelected = async () => {
    if (selectedRows.length === 0) return;
    try {
      setDeleting(true);
      const codigos = selectedRows.map((r) => r["Código"]);
      const { error } = await supabase.from("custos").delete().in("Código", codigos);
      if (error) throw error;

      setOpenDelete(false);
      setSelectedRows([]);
      await loadData(currentPage, itemsPerPage);
      await loadAllBrands();

      setToast({
        message:
          selectedRows.length === 1
            ? "1 produto excluído com sucesso."
            : `${selectedRows.length} produtos excluídos com sucesso.`,
        type: "success",
      });
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setToast({ message: "Erro ao excluir produtos.", type: "error" });
    } finally {
      setDeleting(false);
      setTimeout(() => setToast({ message: "", type: null }), 3000);
    }
  };

  /* === IMPORTAÇÃO === */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { data: previewData, warnings } = await importFromXlsxOrCsv(f, true);
      setImportFile(f);
      setImportCount(previewData.length);
      setPreviewRows(previewData.slice(0, 5));
      setWarnings(warnings || []);
      setOpenImport(true);
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      setToast({ message: "Erro ao ler o arquivo.", type: "error" });
    } finally {
      e.currentTarget.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await importFromXlsxOrCsv(importFile);
      await loadData();
      setToast({ message: "Importação concluída com sucesso!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao importar arquivo.", type: "error" });
    } finally {
      setImporting(false);
      setOpenImport(false);
      setImportFile(null);
      setTimeout(() => setToast({ message: "", type: null }), 3000);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  /* === UI === */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white text-sm transition-all duration-300 ${
            toast.type === "success" ? "bg-[#22c55e]" : "bg-[#ef4444]"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                placeholder="Buscar por código, marca ou NCM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl"
              />
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3">
              <FilterBrandsPopover
                allBrands={allBrands}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                open={filterOpen}
                onOpenChange={setFilterOpen}
              />

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                variant="outline"
                className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Importar
              </Button>

              <Button
                variant="outline"
                className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>

              {selectedRows.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                    onClick={() => setOpenDelete(true)}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" /> Excluir Selecionados
                  </Button>
                  <Button
                    variant="outline"
                    className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                    onClick={() => setSelectedRows([])}
                  >
                    Desmarcar Todos
                  </Button>
                </>
              )}

              <Button
                className="bg-gradient-to-r from-[#1A8CEB] to-[#0d64ab] hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={() => setOpenMass(true)}
              >
                <Layers className="w-4 h-4 mr-2" /> Edição em Massa
              </Button>

              <Button
                className="bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={openCreate}
              >
                + Novo Custo
              </Button>
            </div>
          </div>

          {/* === TABELA === */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700">
                  <TableHead className="w-[40px] text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-[#1A8CEB]"
                      style={{ accentColor: "#1A8CEB" }}
                      checked={selectedRows.length === rows.length && rows.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(rows);
                        else setSelectedRows([]);
                      }}
                    />
                  </TableHead>

                  {["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"].map((col) => (
                    <TableHead
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`font-semibold cursor-pointer transition-colors select-none 
                      hover:text-white ${
                        sortColumn === col ? "text-white" : "text-neutral-400"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {col}
                        <ArrowUpDown
                          className={`h-3 w-3 transition-colors ${
                            sortColumn === col ? "text-white" : "text-neutral-500"
                          }`}
                        />
                      </div>
                    </TableHead>
                  ))}

                  <TableHead className="w-[120px] text-neutral-400 font-semibold text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex justify-center items-center py-16">
                        <Loader className="animate-spin h-8 w-8 text-neutral-400" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-neutral-400 py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c, i) => {
                    const isSelected = selectedRows.some((r) => r["Código"] === c["Código"]);
                    return (
                      <TableRow
                        key={`${c["Código"]}-${i}`}
                        className={`border-b border-neutral-700 transition-colors ${
                          isSelected ? "bg-white/10 hover:bg-white/20" : "hover:bg-white/5"
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedRows([...selectedRows, c]);
                              else
                                setSelectedRows(
                                  selectedRows.filter((r) => r["Código"] !== c["Código"])
                                );
                            }}
                            className="w-4 h-4 cursor-pointer accent-[#1A8CEB]"
                            style={{ accentColor: "#1A8CEB" }}
                          />
                        </TableCell>

                        {/* === Código com Copy === */}
                        <TableCell className="text-white text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            {c["Código"]}
                            <button
                              onClick={() => handleCopy(c["Código"] || "", `codigo-${i}`)}
                              title="Copiar"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            >
                              <CopyIcon
                                className={`w-3 h-3 transition-all duration-300 ${
                                  copiedId === `codigo-${i}`
                                    ? "text-blue-500 scale-110"
                                    : "text-white group-hover:text-blue-400"
                                }`}
                              />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="text-neutral-300">{c["Marca"]}</TableCell>

                        {/* === Custo Atual com Copy === */}
                        <TableCell className="text-neutral-300 text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            R$ {Number(c["Custo Atual"] || 0).toFixed(2)}
                            <button
                              onClick={() =>
                                handleCopy(
                                  String(Number(c["Custo Atual"] || 0).toFixed(2)),
                                  `custo-${i}`
                                )
                              }
                              title="Copiar"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            >
                              <CopyIcon
                                className={`w-3 h-3 transition-all duration-300 ${
                                  copiedId === `custo-${i}`
                                    ? "text-blue-500 scale-110"
                                    : "text-white group-hover:text-blue-400"
                                }`}
                              />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="text-neutral-300 text-center">
                          R$ {Number(c["Custo Antigo"] || 0).toFixed(2)}
                        </TableCell>

                        {/* === NCM com Copy === */}
                        <TableCell className="text-neutral-300 text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            {c["NCM"]}
                            <button
                              onClick={() => handleCopy(c["NCM"] || "", `ncm-${i}`)}
                              title="Copiar"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            >
                              <CopyIcon
                                className={`w-3 h-3 transition-all duration-300 ${
                                  copiedId === `ncm-${i}`
                                    ? "text-blue-500 scale-110"
                                    : "text-white group-hover:text-blue-400"
                                }`}
                              />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-[#1a8ceb] hover:scale-105 transition-all cursor-pointer"
                            onClick={() => openEdit(c)}
                            title="Editar"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-[#ef4444] hover:scale-105 transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedRows([c]);
                              setOpenDelete(true);
                            }}
                            title="Excluir"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </GlassmorphicCard>

        {/* Paginação */}
        <div className="mt-2">
          <TableControls
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
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

      {/* Modais */}
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

      <MassEditionModal
        open={openMass}
        onOpenChange={setOpenMass}
        onExportModeloAlteracao={handleExport}
      />

      <ConfirmImportModal
        open={openImport}
        onOpenChange={setOpenImport}
        count={importCount}
        onConfirm={confirmImport}
        loading={importing}
        preview={previewRows}
        warnings={warnings}
      />
    </div>
  );
}
