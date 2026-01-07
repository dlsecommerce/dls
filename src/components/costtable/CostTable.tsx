"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  /* ================= ESTADOS ================= */
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
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

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
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importTipo, setImportTipo] =
    useState<"inclusao" | "alteracao">("inclusao");

  const [selectedRows, setSelectedRows] = useState<Custo[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({ message: "", type: null });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ================= HELPERS ================= */
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  /* ================= LOAD ================= */
  // ✅ AJUSTE: buscar TODAS as marcas (paginação), evitando limite de ~1000
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

  /* ================= QUERY BUILDER ================= */
  const buildQuery = (countOnly = false) => {
    let q = supabase
      .from("custos")
      .select("*", { count: "exact", head: countOnly });

    if (search) {
      q = q.or(
        `Código.ilike.%${search}%,Marca.ilike.%${search}%,NCM.ilike.%${search}%`
      );
    }

    if (selectedBrands.length) {
      q = q.in("Marca", selectedBrands);
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

    const { data } = await buildQuery(false).range(from, to);
    setRows((data || []) as Custo[]);
    setLoading(false);
  };

  /* ================= EFFECTS ================= */
  useEffect(() => {
    loadAllBrands();
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadData(1, itemsPerPage);
  }, [search, selectedBrands]);

  useEffect(() => {
    loadData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  /* ================= EXPORTAÇÃO ================= */
  // ✅ AJUSTE: export com data/hora + abreviação de marca (quando filtrado)
  // ✅ AJUSTE: export sem seleção busca TUDO (paginação por range)
  const handleExport = async () => {
    const now = new Date();
    const date = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const time = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");

    const brandPrefix =
      selectedBrands.length === 1
        ? `${selectedBrands[0].substring(0, 3).toUpperCase()}-`
        : "";

    const fileName = `RELATÓRIO - ${brandPrefix}CUSTOS - ${date} ${time}.xlsx`;

    // ✅ Se tiver seleção, exporta somente os selecionados
    if (selectedRows.length > 0) {
      exportFilteredToXlsx(selectedRows as Custo[], fileName);
      return;
    }

    // ✅ Sem seleção: buscar TODOS os registros (respeitando busca/filtro/ordem)
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleExportModeloAlteracao = async () => {
    const { data } = await supabase.from("custos").select("*");

    const now = new Date();
    const fileName = `ALTERAÇÃO - ${now
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")} ${now
      .toLocaleTimeString("pt-BR")
      .replace(/:/g, "-")}.xlsx`;

    exportFilteredToXlsx((data || []) as Custo[], fileName);
  };

  /* ================= CRUD ================= */
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
    setForm({ ...row });
    setOpenNew(true);
  };

  const saveForm = async () => {
    await loadData();
    await loadAllBrands();
  };

  const deleteSelected = async () => {
    if (!selectedRows.length) return;
    setDeleting(true);

    await supabase
      .from("custos")
      .delete()
      .in(
        "Código",
        selectedRows.map((r) => r["Código"])
      );

    setSelectedRows([]);
    setOpenDelete(false);
    setDeleting(false);
    loadData();
  };

  /* ================= IMPORTAÇÃO ================= */
  const handleImportInclusao = async (file: File) => {
    const { data, warnings } = await importFromXlsxOrCsv(file, true);
    setParsedRows(data);
    setPreviewRows(data.slice(0, 5));
    setImportCount(data.length);
    setWarnings(warnings || []);
    setImportTipo("inclusao");
    setOpenImport(true);
  };

  const handleImportAlteracao = async (file: File) => {
    const { data, warnings } = await importFromXlsxOrCsv(file, true);
    setParsedRows(data);
    setPreviewRows(data.slice(0, 5));
    setImportCount(data.length);
    setWarnings(warnings || []);
    setImportTipo("alteracao");
    setOpenImport(true);
  };

  const confirmImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);

    try {
      await importFromXlsxOrCsv(parsedRows, false, importTipo);
      await loadData();
      await loadAllBrands();

      setToast({
        message: "Importação concluída com sucesso!",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err.message || "Erro ao importar.",
        type: "error",
      });
    } finally {
      setImporting(false);
      setOpenImport(false);
      setParsedRows([]);
    }
  };

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
                      checked={
                        selectedRows.length === rows.length && rows.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(rows);
                        else setSelectedRows([]);
                      }}
                    />
                  </TableHead>

                  {["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"].map(
                    (col) => (
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
                              sortColumn === col
                                ? "text-white"
                                : "text-neutral-500"
                            }`}
                          />
                        </div>
                      </TableHead>
                    )
                  )}

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
                    <TableCell
                      colSpan={7}
                      className="text-center text-neutral-400 py-8"
                    >
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c, i) => {
                    const isSelected = selectedRows.some(
                      (r) => r["Código"] === c["Código"]
                    );
                    return (
                      <TableRow
                        key={`${c["Código"]}-${i}`}
                        className={`border-b border-neutral-700 transition-colors ${
                          isSelected
                            ? "bg-white/10 hover:bg-white/20"
                            : "hover:bg-white/5"
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
                                  selectedRows.filter(
                                    (r) => r["Código"] !== c["Código"]
                                  )
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
                              onClick={() =>
                                handleCopy(c["Código"] || "", `codigo-${i}`)
                              }
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

                        <TableCell className="text-neutral-300">
                          {c["Marca"]}
                        </TableCell>

                        {/* === Custo Atual com Copy === */}
                        <TableCell className="text-neutral-300 text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            R${" "}
                            {Number(c["Custo Atual"] || 0).toFixed(2)}
                            <button
                              onClick={() =>
                                handleCopy(
                                  String(
                                    Number(c["Custo Atual"] || 0).toFixed(2)
                                  ),
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
                          R${" "}
                          {Number(c["Custo Antigo"] || 0).toFixed(2)}
                        </TableCell>

                        {/* === NCM com Copy === */}
                        <TableCell className="text-neutral-300 text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            {c["NCM"]}
                            <button
                              onClick={() =>
                                handleCopy(c["NCM"] || "", `ncm-${i}`)
                              }
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
        onExportModeloAlteracao={handleExportModeloAlteracao}
        onImportInclusao={handleImportInclusao}
        onImportAlteracao={handleImportAlteracao}
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
    </div>
  );
}
