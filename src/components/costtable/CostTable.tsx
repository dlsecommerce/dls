"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";

// ✅ Ajuste: garante que "Produto" exista no tipo mesmo que o Modal ainda não tenha sido atualizado
type Custo = CustoType & { ["Produto"]?: string };

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArrayParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

function sanitizeTerm(input: string) {
  return input.replace(/[%_]/g, "").replace(/"/g, "").trim();
}

function parseSearchTokens(q: string) {
  return q
    .split(",")
    .map((s) => sanitizeTerm(s))
    .filter(Boolean);
}

function escapeForOrValue(v: string) {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildOrSearchParts(tokens: string[]) {
  const orParts: string[] = [];

  for (const term of tokens) {
    if (!term) continue;

    const variants = Array.from(
      new Set([
        term,
        term.replace(/\s+/g, " "),
        term.replace(/\s+/g, "-"),
        term.replace(/\s+/g, ""),
      ])
    );

    for (const v of variants) {
      const pattern = escapeForOrValue(`%${v}%`);
      orParts.push(`Código.ilike.${pattern}`);
      orParts.push(`Marca.ilike.${pattern}`);
      orParts.push(`Produto.ilike.${pattern}`);
      orParts.push(`NCM.ilike.${pattern}`);
    }
  }

  return orParts;
}

export default function CostTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  /* ================= ESTADOS ================= */
  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);

  const [search, setSearch] = useState(initialSearch);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [filterOpen, setFilterOpen] = useState(false);

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

  const [openMass, setOpenMass] = useState(false);

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

  const didHydrateFromUrlRef = useRef(false);
  const lastUrlRef = useRef("");

  /* ================= HELPERS ================= */

  const formatBR = (v: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "0,00";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  /* ================= LOAD ================= */
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

  /* ================= SORT ================= */
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  /* ================= URL <-> STATE ================= */

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
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

    didHydrateFromUrlRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!didHydrateFromUrlRef.current) return;

    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (currentPage > 1) params.set("page", String(currentPage));
    if (itemsPerPage !== 50) params.set("perPage", String(itemsPerPage));
    if (selectedBrands.length) params.set("brands", selectedBrands.join(","));
    if (sortColumn) params.set("sortColumn", sortColumn);
    if (sortDirection !== "asc") params.set("sortDirection", sortDirection);

    const nextUrl = params.toString() ? `?${params.toString()}` : "?";

    if (lastUrlRef.current === nextUrl) return;
    lastUrlRef.current = nextUrl;

    router.replace(nextUrl, { scroll: false });
  }, [
    search,
    currentPage,
    itemsPerPage,
    selectedBrands,
    sortColumn,
    sortDirection,
    router,
  ]);

  /* ================= EFFECTS ================= */
  useEffect(() => {
    loadAllBrands();
  }, []);

  useEffect(() => {
    loadData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]);

  useEffect(() => {
    setSelectedRows([]);
    setCurrentPage(1);
  }, [search, selectedBrands]);

  useEffect(() => {
    loadData(1, itemsPerPage);
  }, [search, selectedBrands]);

  /* ================= EXPORTAÇÃO ================= */
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

  /* ================= CRUD ================= */
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

  /* ================= IMPORTAÇÃO ================= */
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

  /* === UI === */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                placeholder="Buscar por código, marca, produto ou NCM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl"
              />
            </div>

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
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" /> Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </>
                )}
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

                  {[
                    "Código",
                    "Marca",
                    "Produto",
                    "Custo Atual",
                    "Custo Antigo",
                    "NCM",
                  ].map((col) => (
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
                  ))}

                  <TableHead className="w-[120px] text-neutral-400 font-semibold text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex justify-center items-center py-16">
                        <Loader className="animate-spin h-8 w-8 text-neutral-400" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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

                        <TableCell className="text-neutral-300">
                          {c["Produto"]}
                        </TableCell>

                        <TableCell className="text-neutral-300 text-center">
                          <div className="flex justify-center items-center gap-1 group">
                            R$ {formatBR(c["Custo Atual"])}
                            <button
                              onClick={() =>
                                handleCopy(
                                  `R$ ${formatBR(c["Custo Atual"])}`,
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
                          R$ {formatBR(c["Custo Antigo"])}
                        </TableCell>

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

        <div className="mt-2">
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