"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useTrayImportExport } from "@/components/marketplaces/hooks/useTrayImportExport";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";
import { FloatingEditor } from "./FloatingEditor";
import TopBarLite from "@/components/marketplaces/tray/TopBar";
import { TableRows } from "@/components/marketplaces/tray/TableRows";
import { toBR, parseBR } from "@/components/marketplaces/hooks/helpers";
import { calcPrecoVenda } from "@/components/marketplaces/hooks/calcPrecoVenda";
import { Row } from "@/components/marketplaces/hooks/types";
import { Check as CheckIcon, X as XIcon } from "lucide-react";
import PricingMassEditionModal from "@/components/marketplaces/tray/PricingMassEditionModal";
import PricingHeaderRow from "@/components/marketplaces/tray/PricingHeaderRow";

export default function PricingTable() {
  const router = useRouter();

  // ------------------------------
  // ESTADOS PRINCIPAIS
  // ------------------------------
  const [rows, setRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const [openPricingModal, setOpenPricingModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isPending, startTransition] = useTransition();

  // Exportador
  const impExp = useTrayImportExport(
    filteredRows,
    selectedLoja[0] ?? "",
    selectedBrands[0] ?? ""
  );

  // ------------------------------
  // DEBOUNCE PESQUISA
  // ------------------------------
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // ------------------------------
  // CARREGAR DADOS
  // ------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    let query = supabase
      .from("marketplace_tray_all")
      .select(`
        ID, Loja, "ID Tray", "ID Var", Marca, Referência, Categoria,
        Desconto, Embalagem, Frete, Comissão, Imposto, Marketing,
        "Margem de Lucro", Custo, "Preço de Venda"
      `, { count: "exact" });

    if (selectedLoja.length) {
      const lojasDB = selectedLoja.map((l) =>
        l.includes("Pikot") ? "PK" :
        l.includes("Sóbaquetas") ? "SB" :
        l
      );
      query = query.in("Loja", lojasDB);
    }

    if (selectedBrands.length) {
      query = query.in("Marca", selectedBrands);
    }

    if (sortColumn) {
      query = query.order(sortColumn, {
        ascending: sortDirection === "asc",
        nullsFirst: true,
      });
    } else {
      query = query.order("ID", { ascending: true });
    }

    const { data, error, count } = await query.range(start, end);

    if (error) {
      console.error("❌ Supabase error:", error);
      setLoading(false);
      return;
    }

    // Normalização final (NUNCA Number())
    const normalized = (data || []).map((r) => ({
      ...r,
      Desconto: parseBR(r.Desconto),
      Embalagem: parseBR(r.Embalagem),
      Frete: parseBR(r.Frete),
      Comissão: parseBR(r.Comissão),
      Imposto: parseBR(r.Imposto),
      Marketing: parseBR(r.Marketing),
      "Margem de Lucro": parseBR(r["Margem de Lucro"]),
      Custo: parseBR(r.Custo),
      "Preço de Venda": parseBR(r["Preço de Venda"]),
    }));

    startTransition(() => {
      setRows(normalized);
      setFilteredRows(normalized);
      setTotalItems(count || 0);
      setLoading(false);
    });
  }, [
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    selectedLoja,
    selectedBrands,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ------------------------------
  // ORDENAR
  // ------------------------------
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // ------------------------------
  // FILTRAGEM / BUSCA EM MEMÓRIA
  // ------------------------------
  useEffect(() => {
    if (!rows.length) return;

    const termo = debouncedSearch.toLowerCase();
    const isNumeric = /^\d+$/.test(termo);

    const normalize = (v: any) =>
      String(v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    startTransition(() => {
      const result = rows.filter((r) => {
        const lojaNome = r.Loja === "PK" ? "Pikot Shop" : "Sóbaquetas";

        const lojaOk =
          selectedLoja.length === 0 || selectedLoja.includes(lojaNome);
        const marcaOk =
          selectedBrands.length === 0 || selectedBrands.includes(r.Marca);

        if (!lojaOk || !marcaOk) return false;

        const campos = [
          normalize(r.ID),
          normalize(r["ID Tray"]),
          normalize(r["ID Var"]),
          normalize(r.Marca),
          normalize(r.Referência),
          normalize(r.Categoria),
          normalize(lojaNome),
        ];

        if (termo === "") return true;

        if (isNumeric)
          return (
            campos[0].includes(termo) ||
            campos[1].includes(termo) ||
            campos[2].includes(termo)
          );

        return campos.some((c) => c.includes(termo));
      });

      setFilteredRows(result);
    });
  }, [debouncedSearch, rows, selectedLoja, selectedBrands]);

  // ------------------------------
  // COPIAR
  // ------------------------------
  const handleCopy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  // ------------------------------
  // ABRIR EDITOR
  // ------------------------------
  const openEditor = useCallback(
    (row: Row, field: keyof Row, isMoney: boolean, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      const rawValue = parseBR(row[field]);
      const formatted = toBR(rawValue);

      setEditing({
        id: row.ID,
        loja: row.Loja,
        field,
        value: formatted,
        isMoney,
        anchorRect: rect,
      });
    },
    []
  );

  // ------------------------------
  // CONFIRMAR EDIÇÃO
  // ------------------------------
  const confirmEdit = useCallback(async () => {
    if (!editing) return;

    const { id, loja, field, value } = editing;
    const newVal = parseBR(value);

    const updatedRows = rows.map((r) => {
      if (r.ID === id && r.Loja === loja) {
        const updated: Row = { ...r, [field]: newVal };
        updated["Preço de Venda"] = calcPrecoVenda(updated);
        return updated;
      }
      return r;
    });

    setRows(updatedRows);

    const rowUpdated = updatedRows.find((r) => r.ID === id && r.Loja === loja);
    const precoNovo = rowUpdated?.["Preço de Venda"] ?? 0;

    const { error } = await supabase
      .from("marketplace_tray_all")
      .update({
        [String(field)]: newVal,
        "Preço de Venda": precoNovo,
      })
      .eq("ID", id)
      .eq("Loja", loja);

    if (error) console.error("❌ Erro ao salvar:", error);

    setEditing(null);
  }, [editing, rows]);

  const cancelEdit = () => setEditing(null);

  // ------------------------------
  // IMPORTAÇÃO EM MASSA
  // ------------------------------
  const handlePricingImport = async (data: any[]) => {
    for (const row of data) {
      await supabase
        .from("marketplace_tray_all")
        .update({
          Desconto: row.Desconto,
          Embalagem: row.Embalagem,
          Frete: row.Frete,
          Comissão: row.Comissão,
          Imposto: row.Imposto,
          Marketing: row.Marketing,
          Custo: row.Custo,
          "Preço de Venda": row["Preço de Venda"],
        })
        .eq("ID", row.ID);
    }

    setOpenPricingModal(false);
    loadData();
  };

  // ------------------------------
  // EXPORTAR TODOS
  // ------------------------------
  const handleExportAll = useCallback(async () => {
    const pageSize = 1000;
    let page = 0;
    let all: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("marketplace_tray_all")
        .select(`
          ID, Loja, "ID Tray", "ID Var", Marca, Referência, Categoria,
          Desconto, Embalagem, Frete, Comissão, Imposto, Marketing,
          "Margem de Lucro", Custo, "Preço de Venda"
        `)
        .order("ID", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        alert("Erro ao exportar");
        return;
      }

      if (!data?.length) break;

      all = [...all, ...data];
      if (data.length < pageSize) break;

      page++;
    }

    const normalized = all.map((r) => ({
      ...r,
      Desconto: parseBR(r.Desconto),
      Embalagem: parseBR(r.Embalagem),
      Frete: parseBR(r.Frete),
      Comissão: parseBR(r.Comissão),
      Imposto: parseBR(r.Imposto),
      Marketing: parseBR(r.Marketing),
      "Margem de Lucro": parseBR(r["Margem de Lucro"]),
      Custo: parseBR(r.Custo),
      "Preço de Venda": parseBR(r["Preço de Venda"]),
    }));

    await impExp.handleExport(normalized);
  }, [selectedLoja, selectedBrands, debouncedSearch]);

  // ------------------------------
  // RENDERIZAÇÃO
  // ------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="mx-auto space-y-6 w-full">
        <GlassmorphicCard>
          <TopBarLite
            search={search}
            setSearch={setSearch}
            onExport={handleExportAll}
            onMassEditOpen={() => setOpenPricingModal(true)}
            allBrands={[]}
            allLojas={[]}
            allCategorias={[]}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
            selectedLoja={selectedLoja}
            setSelectedLoja={setSelectedLoja}
            selectedCategoria={[]}
            setSelectedCategoria={() => {}}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            selectedCount={0}
            onDeleteSelected={() => {}}
            onClearSelection={() => {}}
          />

          <div className="w-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
            <Table>
              <TableHeader>
                <PricingHeaderRow
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHeader>

              <TableBody>
                <TableRows
                  rows={filteredRows}
                  loading={loading}
                  copiedId={copiedId}
                  editedId={null}
                  handleCopy={handleCopy}
                  openEditor={openEditor}
                  handleEditFull={() => {}}
                />
              </TableBody>
            </Table>
          </div>
        </GlassmorphicCard>

        <TableControls
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          selectedCount={0}
        />

        <PricingMassEditionModal
          open={openPricingModal}
          onOpenChange={setOpenPricingModal}
          onImportComplete={handlePricingImport}
        />

        {editing && (
          <FloatingEditor anchorRect={editing.anchorRect} onClose={cancelEdit}>
            <div className="relative flex items-center rounded-md border border-neutral-700 bg-black/30 px-2 py-1.5">
              <span className="text-xs px-1 py-0.5 rounded bg-black/60 border border-neutral-700 mr-1">
                {editing.isMoney ? "R$" : "%"}
              </span>

              <input
                autoFocus
                inputMode="decimal"
                className="flex-1 bg-transparent outline-none text-sm text-white pr-10"
                value={editing.value}
                onChange={(e) =>
                  setEditing((p) => (p ? { ...p, value: e.target.value } : p))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
              />

              <div className="absolute right-1 flex items-center gap-1">
                <button
                  title="Cancelar"
                  onClick={cancelEdit}
                  className="text-red-400 hover:text-red-300"
                >
                  <XIcon className="w-4 h-4" />
                </button>

                <button
                  title="Confirmar"
                  onClick={confirmEdit}
                  className="text-green-400 hover:text-green-300"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </FloatingEditor>
        )}
      </div>
    </div>
  );
}
