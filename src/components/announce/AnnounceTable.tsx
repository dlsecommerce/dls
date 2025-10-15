"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Upload,
} from "lucide-react";

import { TableControls } from "@/components/announce/TableControls";
import FiltroAnunciosPopover from "@/components/announce/FiltroAnunciosPopover";
import MassEditionModal from "@/components/announce/MassEditionModal";
import ConfirmDeleteModal from "@/components/announce/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/announce/ConfirmImportModal";

import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { Anuncio } from "@/components/announce/types/Announce";

type RowShape = {
  ID: string | number;
  Loja: string;
  "ID Bling"?: string;
  "ID Tray"?: string;
  "Referência"?: string;
  Nome?: string;
  Marca?: string;
  Categoria?: string;
};

export default function AnnounceTable() {
  const router = useRouter();

  // ======== Estado principal ========
  const [rows, setRows] = useState<Anuncio[]>([]);
  const [filteredRows, setFilteredRows] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  // paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // busca e filtros
  const [search, setSearch] = useState("");
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLojas, setAllLojas] = useState<string[]>([]);
  const [allCategorias, setAllCategorias] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // ordenação
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // import/export
  const [openMass, setOpenMass] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // seleção & exclusão
  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  // ================================
  // 🔹 Carregar TODOS os anúncios (PK + SB)
  // ================================
  const fetchAllFromTable = async (table: string, step = 1000): Promise<RowShape[]> => {
    const out: RowShape[] = [];
    let from = 0;
    while (true) {
      const to = from + step - 1;
      const { data, error } = await supabase.from(table).select("*").range(from, to);
      if (error) {
        console.error(`Erro ao carregar ${table}:`, error);
        break;
      }
      const chunk = (data || []) as RowShape[];
      out.push(...chunk);
      if (!chunk.length || chunk.length < step) break;
      from += step;
    }
    return out;
  };

  const loadAllAnuncios = async () => {
    setLoading(true);
    try {
      const [pk, sb] = await Promise.all([
        fetchAllFromTable("anuncios_pk"),
        fetchAllFromTable("anuncios_sb"),
      ]);

      // ✅ Aqui é a única modificação feita:
      const mappedPk = pk.map((item) => ({ ...item, Loja: "Pikot Shop" }));
      const mappedSb = sb.map((item) => ({ ...item, Loja: "Sóbaquetas" }));

      const all = [...mappedPk, ...mappedSb].map((item) => ({
        id: String(item.ID ?? ""),
        loja: String(item.Loja ?? ""),
        id_bling: String(item["ID Bling"] ?? ""),
        id_tray: String(item["ID Tray"] ?? ""),
        referencia: String(item["Referência"] ?? ""),
        nome: String(item.Nome ?? ""),
        marca: String(item.Marca ?? ""),
        categoria: String(item.Categoria ?? ""),
      }));

      setRows(all);
      setFilteredRows(all);

      const brands = Array.from(new Set(all.map((r) => r.marca).filter(Boolean))).sort();
      const lojas = Array.from(new Set(all.map((r) => r.loja).filter(Boolean))).sort();
      const categorias = Array.from(new Set(all.map((r) => r.categoria).filter(Boolean))).sort();

      setAllBrands(brands);
      setAllLojas(lojas);
      setAllCategorias(categorias);
    } catch (err) {
      console.error("Erro inesperado ao carregar anúncios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnuncios();
  }, []);

  // ================================
  // 🔹 Filtros + Busca + Ordenação
  // ================================
  const applyFilters = useMemo(() => {
    return () => {
      let data = [...rows];

      if (selectedLoja.length > 0) {
        data = data.filter((r) => selectedLoja.includes(r.loja));
      }

      if (selectedBrands.length > 0) {
        data = data.filter((r) => selectedBrands.includes(r.marca));
      }

      if (selectedCategoria.length > 0) {
        data = data.filter((r) => selectedCategoria.includes(r.categoria));
      }

      if (search.trim()) {
        const term = search.toLowerCase();
        data = data.filter(
          (r) =>
            r.nome?.toLowerCase().includes(term) ||
            r.loja?.toLowerCase().includes(term) ||
            r.marca?.toLowerCase().includes(term) ||
            r.id_bling?.toLowerCase().includes(term) ||
            r.id_tray?.toLowerCase().includes(term) ||
            r.referencia?.toLowerCase().includes(term)
        );
      }

      if (sortColumn) {
        const colKey: keyof Anuncio | null =
          sortColumn === "ID"
            ? "id"
            : sortColumn === "Loja"
            ? "loja"
            : sortColumn === "ID Bling"
            ? "id_bling"
            : sortColumn === "ID Tray"
            ? "id_tray"
            : sortColumn === "Referência"
            ? "referencia"
            : sortColumn === "Nome"
            ? "nome"
            : sortColumn === "Marca"
            ? "marca"
            : null;

        if (colKey) {
          data.sort((a, b) => {
            const A = (a[colKey] ?? "").toString().toLowerCase();
            const B = (b[colKey] ?? "").toString().toLowerCase();
            if (A < B) return sortDirection === "asc" ? -1 : 1;
            if (A > B) return sortDirection === "asc" ? 1 : -1;
            return 0;
          });
        }
      }

      return data;
    };
  }, [rows, selectedLoja, selectedBrands, selectedCategoria, search, sortColumn, sortDirection]);

  useEffect(() => {
    const data = applyFilters();
    setFilteredRows(data);
    setCurrentPage(1);
  }, [applyFilters]);

  // ================================
  // 🔹 Ordenação
  // ================================
  const handleSort = (col: string) => {
    if (col === "Ações") return;
    if (sortColumn === col) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // ================================
  // 🔹 Import / Export
  // ================================
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
      console.error("Erro ao importar:", err);
      setToast({ message: "Erro ao ler o arquivo.", type: "error" });
    } finally {
      e.target.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const { data } = await importFromXlsxOrCsv(importFile);
      if (data && data.length > 0) {
        setRows((prev) => [...prev, ...data]);
      }
      setToast({ message: "Importação concluída com sucesso!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao importar arquivo.", type: "error" });
    } finally {
      setImporting(false);
      setOpenImport(false);
      setTimeout(() => setToast({ message: "", type: null }), 3000);
    }
  };

  const handleExport = async () => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const filename = `RELATORIO-ANUNCIOS-${dia}-${mes}-${ano}.xlsx`;
    exportFilteredToXlsx(filteredRows, filename);
  };

  // ================================
  // 🔹 Seleção
  // ================================
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const allVisibleSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((r) => selectedRows.some((s) => s.id === r.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    const pageRows = paginatedRows;
    if (checked) {
      const toAdd = pageRows.filter((r) => !selectedRows.some((s) => s.id === r.id));
      setSelectedRows((prev) => [...prev, ...toAdd]);
    } else {
      const remaining = selectedRows.filter((s) => !pageRows.some((r) => r.id === s.id));
      setSelectedRows(remaining);
    }
  };

  const toggleRow = (row: Anuncio) => {
    setSelectedRows((prev) =>
      prev.some((r) => r.id === row.id) ? prev.filter((r) => r.id !== row.id) : [...prev, row]
    );
  };

  const deleteSelected = () => {
    if (selectedRows.length === 0) return;
    const remaining = rows.filter((r) => !selectedRows.some((s) => s.id === r.id));
    setRows(remaining);
    setFilteredRows(remaining);
    setSelectedRows([]);
    setToast({ message: "Anúncios excluídos com sucesso.", type: "success" });
    setTimeout(() => setToast({ message: "", type: null }), 3000);
  };

  // ================================
  // 🔹 UI
  // ================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      {toast.type && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          {/* === Barra Superior === */}
          <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, loja, marca, ID Bling, Tray..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <FiltroAnunciosPopover
                allBrands={allBrands}
                allLojas={allLojas}
                allCategorias={allCategorias}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                selectedLoja={selectedLoja}
                setSelectedLoja={setSelectedLoja}
                selectedCategoria={selectedCategoria}
                setSelectedCategoria={setSelectedCategoria}
                open={filterOpen}
                onOpenChange={setFilterOpen}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                variant="outline"
                className="border-neutral-700 hover:scale-105 transition-all text-white rounded-xl cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
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
                className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={() => setOpenMass(true)}
              >
                <Layers className="w-4 h-4 mr-2" /> Edição em Massa
              </Button>

              <Button
                className="bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-all rounded-xl text-white cursor-pointer"
                onClick={() => router.push("/dashboard/anuncios/edit")}
              >
                + Novo Cadastro
              </Button>
            </div>
          </div>

          {/* === Tabela === */}
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="w-[40px] text-center">
                  <input
                    type="checkbox"
                    checked={paginatedRows.length > 0 && paginatedRows.every((r) => selectedRows.some((s) => s.id === r.id))}
                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                    className="accent-[#22c55e] w-4 h-4 cursor-pointer"
                  />
                </TableHead>

                {[
                  "ID",
                  "Loja",
                  "ID Bling",
                  "ID Tray",
                  "Referência",
                  "Nome",
                  "Marca",
                  "Ações",
                ].map((col) => (
                  <TableHead
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`font-semibold select-none transition-colors text-center ${
                      col === "Ações"
                        ? "text-neutral-400"
                        : sortColumn === col
                        ? "text-white cursor-pointer"
                        : "text-neutral-400 cursor-pointer hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      {col}
                      {col !== "Ações" && (
                        <ArrowUpDown
                          className={`h-3 w-3 transition-colors ${
                            sortColumn === col ? "text-white" : "text-neutral-500"
                          }`}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="flex justify-center items-center py-16">
                      <Loader className="animate-spin h-8 w-8 text-neutral-400" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((a) => {
                  const isSelected = selectedRows.some((r) => r.id === a.id);
                  return (
                    <TableRow
                      key={a.id}
                      className={`border-b border-neutral-700 transition-colors ${
                        isSelected ? "bg-white/10 hover:bg-white/20" : "hover:bg-white/5"
                      }`}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(a)}
                          className="accent-[#22c55e] w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-white text-center">{a.id}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.loja}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.id_bling}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.id_tray}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.referencia}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.nome}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.marca}</TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:text-[#1a8ceb] hover:scale-105 transition-all cursor-pointer"
                          onClick={() => router.push(`/dashboard/anuncios/edit?id=${a.id}`)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:text-[#ef4444] hover:scale-105 transition-all cursor-pointer"
                          onClick={() => {
                            setSelectedRows([a]);
                            setOpenDelete(true);
                          }}
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
        </GlassmorphicCard>

        <div className="mt-2">
          <TableControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredRows.length}
            selectedCount={selectedRows.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* Modais */}
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
