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
  CopyIcon,
} from "lucide-react";

import { TableControls } from "@/components/announce/TableControls";
import FiltroAnunciosPopover from "@/components/announce/FiltroAnunciosPopover";
import MassEditionModal from "@/components/announce/MassEditionModal";
import ConfirmDeleteModal from "@/components/announce/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/announce/ConfirmImportModal";

import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { Anuncio } from "@/components/announce/types/Announce";

/** Tabelas */
type TableName = "anuncios_pk" | "anuncios_sb";

/** Linhas conforme estão no Supabase (com colunas com espaços/acentos) */
type RowShape = {
  ID: string | number;
  Loja?: string;
  "ID Bling"?: string;
  "ID Tray"?: string;
  "ID Var"?: string;
  "OD"?: string;
  "Referência"?: string;
  "Nome"?: string;
  "Marca"?: string;
  "Categoria"?: string;
  "Peso"?: string;
  "Altura"?: string;
  "Largura"?: string;
  "Comprimento"?: string;
  "Código 1"?: string; "Quantidade 1"?: string;
  "Código 2"?: string; "Quantidade 2"?: string;
  "Código 3"?: string; "Quantidade 3"?: string;
  "Código 4"?: string; "Quantidade 4"?: string;
  "Código 5"?: string; "Quantidade 5"?: string;
  "Código 6"?: string; "Quantidade 6"?: string;
  "Código 7"?: string; "Quantidade 7"?: string;
  "Código 8"?: string; "Quantidade 8"?: string;
  "Código 9"?: string; "Quantidade 9"?: string;
  "Código 10"?: string; "Quantidade 10"?: string;
};

/** Colunas ordenáveis (nome exibido → chave do tipo `Anuncio`) */
const ORDERABLE_COLUMNS: Record<string, keyof Anuncio> = {
  ID: "id",
  Loja: "loja",
  "ID Bling": "id_bling",
  "ID Tray": "id_tray",
  "Referência": "referencia",
  Nome: "nome",
  Marca: "marca",
};

/** Mapa de rótulos por tabela */
const SHOP_LABEL: Record<TableName, string> = {
  anuncios_pk: "Pikot Shop",
  anuncios_sb: "Sóbaquetas",
};

/** Função util: parse number ou undefined */
const toNum = (v?: string) => {
  if (v == null || v === "") return undefined;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** Mapeia linha vinda do Supabase para `Anuncio`, fixando a Loja pelo nome da tabela */
const mapRowToAnuncio = (row: RowShape, table: TableName): Anuncio => ({
  id: String(row.ID ?? ""),
  loja: SHOP_LABEL[table],
  id_bling: String(row["ID Bling"] ?? ""),
  id_tray: String(row["ID Tray"] ?? ""),
  id_var: row["ID Var"] ? String(row["ID Var"]) : undefined,
  od: row["OD"] ? String(row["OD"]) : undefined,
  tipo_anuncio: undefined, // não há coluna correspondente explícita
  referencia: row["Referência"] ? String(row["Referência"]) : undefined,
  nome: String(row["Nome"] ?? ""),
  marca: String(row["Marca"] ?? ""),
  status: row["Status"] ? String(row["Status"]) : undefined,
  categoria: row["Categoria"] ? String(row["Categoria"]) : undefined,
  peso: toNum(row["Peso"]),
  altura: toNum(row["Altura"]),
  largura: toNum(row["Largura"]),
  comprimento: toNum(row["Comprimento"]),
  codigo_1: row["Código 1"] ?? undefined,
  quantidade_1: toNum(row["Quantidade 1"]),
  codigo_2: row["Código 2"] ?? undefined,
  quantidade_2: toNum(row["Quantidade 2"]),
  codigo_3: row["Código 3"] ?? undefined,
  quantidade_3: toNum(row["Quantidade 3"]),
  codigo_4: row["Código 4"] ?? undefined,
  quantidade_4: toNum(row["Quantidade 4"]),
  codigo_5: row["Código 5"] ?? undefined,
  quantidade_5: toNum(row["Quantidade 5"]),
  codigo_6: row["Código 6"] ?? undefined,
  quantidade_6: toNum(row["Quantidade 6"]),
  codigo_7: row["Código 7"] ?? undefined,
  quantidade_7: toNum(row["Quantidade 7"]),
  codigo_8: row["Código 8"] ?? undefined,
  quantidade_8: toNum(row["Quantidade 8"]),
  codigo_9: row["Código 9"] ?? undefined,
  quantidade_9: toNum(row["Quantidade 9"]),
  codigo_10: row["Código 10"] ?? undefined,
  quantidade_10: toNum(row["Quantidade 10"]),
});

export default function AnnounceTable() {
  const router = useRouter();

  // ======== Estado principal ========
  const [rows, setRows] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(false);

  // paginação real
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // busca e filtros (reais no Supabase)
  const [search, setSearch] = useState("");
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [allLojas, setAllLojas] = useState<string[]>(["Pikot Shop", "Sóbaquetas"]); // fixo
  const [allCategorias, setAllCategorias] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // ordenação (aplicada por tabela quando possível, e consolidada após merge)
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

  // seleção & exclusão (visual/local)
  const [selectedRows, setSelectedRows] = useState<Anuncio[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ================================
  // 🔹 Helpers de busca global (por tabela, com colunas com acento/espaço)
  // ================================
  const buildOr = (term: string) => {
    const like = `%${term}%`;
    // Obs: Loja não entra aqui pois loja é definida pelo nome da tabela (filtro de Loja decide quais tabelas consultar)
    return [
      `"Nome".ilike.${like}`,
      `"Marca".ilike.${like}`,
      `"ID Bling".ilike.${like}`,
      `"ID Tray".ilike.${like}`,
      `"Referência".ilike.${like}`,
      // ID pode ser numérico; se não funcionar com ilike, não impacta
      `ID.ilike.${like}`,
    ].join(",");
  };

  /** Decide quais tabelas consultar conforme filtro de loja */
  const getTablesForLoja = (): TableName[] => {
    if (selectedLoja.length === 0) return ["anuncios_pk", "anuncios_sb"];
    const wantsPk = selectedLoja.includes("Pikot Shop");
    const wantsSb = selectedLoja.includes("Sóbaquetas");
    const list: TableName[] = [];
    if (wantsPk) list.push("anuncios_pk");
    if (wantsSb) list.push("anuncios_sb");
    return list;
  };

  /** Aplica filtros comuns por tabela (Marca/Categoria + Busca + Ordenação parcial) */
  const applyFiltersForTable = <T,>(
    q: T & {
      or: (f: string) => T;
      in: (col: string, vals: string[]) => T;
      order: (col: string, opts?: { ascending: boolean; nullsFirst?: boolean }) => T;
    },
    table: TableName
  ) => {
    if (search.trim()) q = (q as any).or(buildOr(search.trim()));
    if (selectedBrands.length) q = (q as any).in("Marca", selectedBrands);
    if (selectedCategoria.length) q = (q as any).in("Categoria", selectedCategoria);

    // Ordenação no server quando a coluna corresponde a uma coluna física
    // (Loja não aplicamos no server pois é um rótulo fixo, ordenamos depois do merge)
    if (sortColumn && ORDERABLE_COLUMNS[sortColumn] && sortColumn !== "Loja") {
      const map: Record<keyof Anuncio, string> = {
        id: "ID",
        loja: "Loja", // não usamos aqui
        id_bling: "ID Bling",
        id_tray: "ID Tray",
        id_var: "ID Var",
        od: "OD",
        tipo_anuncio: "Tipo", // não existe, apenas placeholder
        referencia: "Referência",
        nome: "Nome",
        marca: "Marca",
        status: "Status",
        categoria: "Categoria",
        peso: "Peso",
        altura: "Altura",
        largura: "Largura",
        comprimento: "Comprimento",
        codigo_1: "Código 1",
        quantidade_1: "Quantidade 1",
        codigo_2: "Código 2",
        quantidade_2: "Quantidade 2",
        codigo_3: "Código 3",
        quantidade_3: "Quantidade 3",
        codigo_4: "Código 4",
        quantidade_4: "Quantidade 4",
        codigo_5: "Código 5",
        quantidade_5: "Quantidade 5",
        codigo_6: "Código 6",
        quantidade_6: "Quantidade 6",
        codigo_7: "Código 7",
        quantidade_7: "Quantidade 7",
        codigo_8: "Código 8",
        quantidade_8: "Quantidade 8",
        codigo_9: "Código 9",
        quantidade_9: "Quantidade 9",
        codigo_10: "Código 10",
        quantidade_10: "Quantidade 10",
      };
      const colPhysical = map[ORDERABLE_COLUMNS[sortColumn]];
      if (colPhysical) {
        q = (q as any).order(colPhysical, {
          ascending: sortDirection === "asc",
          nullsFirst: false,
        });
      }
    }

    return q;
  };

  // ================================
  // 🔹 Facets reais (Marca & Categoria) – Loja é fixa
  // ================================
  const fetchDistinct = async (table: TableName, column: "Marca" | "Categoria") => {
    const { data, error } = await supabase
      .from(table)
      .select(`${column}`, { distinct: true })
      .not(column, "is", null)
      .neq(column, "")
      .order(column, { ascending: true })
      .limit(20000);
    if (error) {
      console.error("distinct error", table, column, error);
      return [] as string[];
    }
    const vals = (data || []).map((r: any) => String(r[column] ?? "")).filter(Boolean);
    return Array.from(new Set(vals));
  };

  const hydrateFacets = async () => {
    const [marcasPk, marcasSb] = await Promise.all([
      fetchDistinct("anuncios_pk", "Marca"),
      fetchDistinct("anuncios_sb", "Marca"),
    ]);
    const [catsPk, catsSb] = await Promise.all([
      fetchDistinct("anuncios_pk", "Categoria"),
      fetchDistinct("anuncios_sb", "Categoria"),
    ]);
    setAllBrands(Array.from(new Set([...marcasPk, ...marcasSb])).sort());
    setAllCategorias(Array.from(new Set([...catsPk, ...catsSb])).sort());
    // Loja é fixa:
    setAllLojas(["Pikot Shop", "Sóbaquetas"]);
  };

  // ================================
  // 🔹 Carregar lista (paginação real + soma de counts) com filtros no server
  // ================================
  const loadAnuncios = async (page = 1) => {
    setLoading(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const tables = getTablesForLoja();
      if (tables.length === 0) {
        setRows([]);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      // Counts filtrados por tabela
      const countPromises = tables.map((t) =>
        applyFiltersForTable(
          supabase.from(t).select("*", { count: "exact", head: true }) as any,
          t
        )
      );
      const countResults = await Promise.all(countPromises);
      // @ts-ignore
      const total = countResults.reduce((acc, r) => acc + (r?.count ?? 0), 0);
      setTotalItems(total);

      // Dados paginados por tabela (nota: como não temos UNION no server,
      // buscamos por tabela e mesclamos a página; se necessário, aumente o "buffer")
      const buffer = itemsPerPage; // pode multiplicar por 2 se a distribuição ficar desigual
      const tFrom = from; // simplificação
      const tTo = tFrom + buffer - 1;

      const dataPromises = tables.map((t) =>
        applyFiltersForTable(
          supabase.from(t).select("*").range(tFrom, tTo) as any,
          t
        )
      );
      const dataResults = await Promise.all(dataPromises);

      // Normaliza resultados por tabela
      const mapped: Anuncio[] = [];
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const res: any = dataResults[i];
        if (res?.error) {
          console.error("data error", t, res.error);
          continue;
        }
        const data: RowShape[] = (res?.data || []) as RowShape[];
        mapped.push(...data.map((r) => mapRowToAnuncio(r, t)));
      }

      // Ordenação final (no cliente) — necessária especialmente para "Loja"
      if (sortColumn && ORDERABLE_COLUMNS[sortColumn]) {
        const key = ORDERABLE_COLUMNS[sortColumn];
        mapped.sort((a, b) => {
          const A = String(a[key] ?? "").toLowerCase();
          const B = String(b[key] ?? "").toLowerCase();
          if (A < B) return sortDirection === "asc" ? -1 : 1;
          if (A > B) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });
      }

      // Recorta exatamente a janela da página (pois mesclamos tabelas)
      const pageSlice = mapped.slice(0, itemsPerPage);

      setRows(pageSlice);
    } catch (err) {
      console.error("Erro ao carregar anúncios:", err);
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // ===== Inicializa facetas =====
  useEffect(() => {
    hydrateFacets();
  }, []);

  // ===== Recarrega ao mudar filtros/busca/ordenação/paginação =====
  useEffect(() => {
    loadAnuncios(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    itemsPerPage,
    search,
    selectedBrands,
    selectedLoja,
    selectedCategoria,
    sortColumn,
    sortDirection,
  ]);

  // ================================
  // 🔹 Ordenação (UI)
  // ================================
  const handleSort = (col: string) => {
    if (!(col in ORDERABLE_COLUMNS)) return;
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // ================================
  // 🔹 Seleção (checkboxes)
  // ================================
  const toggleRow = (row: Anuncio) => {
    setSelectedRows((prev) =>
      prev.some((r) => r.id === row.id) ? prev.filter((r) => r.id !== row.id) : [...prev, row]
    );
  };

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedRows.some((s) => s.id === r.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      const toAdd = rows.filter((r) => !selectedRows.some((s) => s.id === r.id));
      setSelectedRows((prev) => [...prev, ...toAdd]);
    } else {
      const remaining = selectedRows.filter((s) => !rows.some((r) => r.id === s.id));
      setSelectedRows(remaining);
    }
  };

  const deleteSelected = () => {
    if (selectedRows.length === 0) return;
    const remaining = rows.filter((r) => !selectedRows.some((s) => s.id === r.id));
    setRows(remaining);
    setSelectedRows([]);
  };

  // ================================
  // 🔹 Copiar (ícone pequeno)
  // ================================
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
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
    } finally {
      e.target.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await importFromXlsxOrCsv(importFile);
      loadAnuncios(currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
      setOpenImport(false);
    }
  };

  const handleExport = async () => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const filename = `RELATORIO-ANUNCIOS-${dia}-${mes}-${ano}.xlsx`;
    exportFilteredToXlsx(rows, filename);
  };

  // ================================
  // 🔹 UI
  // ================================
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          {/* === Barra Superior === */}
          <div className="flex flex-wrap justify-between items-center border-b border-neutral-700 p-4 gap-3">
            {/* Busca global */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, marca, ID Bling, ID Tray, referência..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-white/5 border-neutral-700 text-white rounded-xl"
              />
            </div>

            {/* Ações + Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <FiltroAnunciosPopover
                allBrands={allBrands}
                allLojas={allLojas}
                allCategorias={allCategorias}
                selectedBrands={selectedBrands}
                setSelectedBrands={(v) => {
                  setSelectedBrands(v);
                  setCurrentPage(1);
                }}
                selectedLoja={selectedLoja}
                setSelectedLoja={(v) => {
                  setSelectedLoja(v);
                  setCurrentPage(1);
                }}
                selectedCategoria={selectedCategoria}
                setSelectedCategoria={(v) => {
                  setSelectedCategoria(v);
                  setCurrentPage(1);
                }}
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
                {/* Checkbox Selecionar Todos (como estava) */}
                <TableHead className="w-[40px] text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                    className="accent-[#22c55e] w-4 h-4 cursor-pointer"
                  />
                </TableHead>

                {["ID", "Loja", "ID Bling", "ID Tray", "Referência", "Nome", "Marca", "Ações"].map(
                  (col) => (
                    <TableHead
                      key={col}
                      onClick={() => (col === "Ações" ? null : handleSort(col))}
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
                  )
                )}
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="py-10 text-center text-neutral-400">
                      Nenhum anúncio encontrado com os filtros atuais.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => {
                  const isSelected = selectedRows.some((r) => r.id === a.id);
                  return (
                    <TableRow
                      key={`${a.id}-${a.loja}-${a.id_tray}`}
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

                      {/* ID Bling com ícone copiar pequeno */}
                      <TableCell className="text-neutral-300 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {a.id_bling || "-"}
                          {a.id_bling && (
                            <button
                              onClick={() => handleCopy(a.id_bling || "")}
                              title="Copiar"
                              className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <CopyIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* ID Tray com ícone copiar pequeno */}
                      <TableCell className="text-neutral-300 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {a.id_tray || "-"}
                          {a.id_tray && (
                            <button
                              onClick={() => handleCopy(a.id_tray || "")}
                              title="Copiar"
                              className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <CopyIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* Referência com ícone copiar pequeno */}
                      <TableCell className="text-neutral-300 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {a.referencia || "-"}
                          {a.referencia && (
                            <button
                              onClick={() => handleCopy(a.referencia || "")}
                              title="Copiar"
                              className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <CopyIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-neutral-300 text-center">{a.nome}</TableCell>
                      <TableCell className="text-neutral-300 text-center">{a.marca}</TableCell>

                      {/* Ações */}
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

        {/* Controles de página */}
        <div className="mt-2">
          <TableControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
            selectedCount={selectedRows.length}
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
