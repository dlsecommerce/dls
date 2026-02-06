"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useTrayImportExport } from "@/components/marketplaces/shopee/hooks/useTrayImportExport";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";
import { FloatingEditor } from "./FloatingEditor";
import TopBarLite from "@/components/marketplaces/shopee/TopBar";
import { TableRows } from "@/components/marketplaces/shopee/TableRows";
import { toBR, parseBR } from "@/components/marketplaces/shopee/hooks/helpers";
import { calcPrecoVenda } from "@/components/marketplaces/shopee/hooks/calcPrecoVenda";
import { Row } from "@/components/marketplaces/shopee/hooks/types";
import { Check as CheckIcon, X as XIcon } from "lucide-react";
import PricingMassEditionModal from "@/components/marketplaces/shopee/PricingMassEditionModal";
import PricingHeaderRow from "@/components/marketplaces/shopee/PricingHeaderRow";

export default function PricingTable() {
  const router = useRouter();

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

  // 🔥 edição baseada no UUID
  const [editing, setEditing] = useState<any>(null);

  const [openPricingModal, setOpenPricingModal] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [isPending, startTransition] = useTransition();

  // ✅ loader do botão Exportar
  const [exporting, setExporting] = useState(false);

  const impExp = useTrayImportExport(filteredRows, selectedLoja, selectedBrands);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // ✅ quando buscar (ou mudar filtros), volta pra página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedLoja, selectedBrands]);

  const loadData = useCallback(async () => {
    setLoading(true);

    // ✅ GARANTE AUTH: se não tiver sessão, não busca (RLS vai retornar vazio)
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      console.log("🔒 Sem sessão (anon) — aguardando autenticação para carregar anúncios.");
      setRows([]);
      setFilteredRows([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    let query = supabase
      .from("marketplace_shopee_all")
      .select(
        `
        id,
        anuncio_id,
        ID,
        Loja,
        "ID Tray",
        "ID Var",
        "ID Bling",
        Nome,
        Marca,
        Referência,
        Categoria,
        Desconto,
        Embalagem,
        Frete,
        Comissão,
        Imposto,
        Marketing,
        "Margem de Lucro",
        Custo,
        "Preço de Venda",
        "Atualizado em"
      `,
        { count: "exact" }
      );

    if (selectedLoja.length) query = query.in("Loja", selectedLoja);
    if (selectedBrands.length) query = query.in("Marca", selectedBrands);

    // ✅ busca SERVER-SIDE (ID, Marca, Referência, ID Bling)
    if (debouncedSearch) {
      const term = debouncedSearch.replace(/[%_]/g, "").trim();
      const safe = term.replace(/"/g, "");
      const pattern = `%${safe}%`;

      query = query.or(
        [
          `ID.ilike.${pattern}`,
          `"Marca".ilike.${pattern}`,
          `"Referência".ilike.${pattern}`,
          `"ID Bling".ilike.${pattern}`,
        ].join(",")
      );
    }

    // ✅ ORDENAÇÃO: usar "Atualizado em" (conforme seu banco)
    if (sortColumn) {
      query = query
        .order(sortColumn, {
          ascending: sortDirection === "asc",
          nullsFirst: true,
        })
        .order("Atualizado em", { ascending: false })
        .order("id", { ascending: false });
    } else {
      query = query
        .order("Atualizado em", { ascending: false })
        .order("id", { ascending: false });
    }

    const { data, error, count } = await query.range(start, end);

    if (error) {
      console.error("❌ Supabase error:", error.message, error.details, error.hint);
      setRows([]);
      setFilteredRows([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((r: any) => {
      let OD = 3;
      const ref = String(r.Referência || "").trim();
      if (ref.startsWith("PAI -")) OD = 1;
      else if (ref.startsWith("VAR -")) OD = 2;

      return {
        ...r,
        id: r.id,
        anuncio_id: r.anuncio_id,
        OD,
        Desconto: parseBR(r.Desconto),
        Embalagem: parseBR(r.Embalagem),
        Frete: parseBR(r.Frete),
        Comissão: parseBR(r.Comissão),
        Imposto: parseBR(r.Imposto),
        Marketing: parseBR(r.Marketing),
        "Margem de Lucro": parseBR(r["Margem de Lucro"]),
        Custo: parseBR(r.Custo),
        "Preço de Venda": parseBR(r["Preço de Venda"]),
      };
    });

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
    debouncedSearch,
  ]);

  // ✅ IMPORTANTE: ao montar, espera sessão e também recarrega quando auth ficar pronta
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // não dá redirect aqui porque você pode ter auth em outra camada
        // mas deixa a tela sem dados até autenticar.
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) loadData();
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadData();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadData]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const handleCopy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  const openEditor = useCallback(
    (row: Row, field: keyof Row, isMoney: boolean, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      const rawValue = parseBR(row[field]);
      const formatted = toBR(rawValue);

      setEditing({
        dbId: row.id,
        loja: row.Loja,
        field,
        value: formatted,
        isMoney,
        anchorRect: rect,
      });
    },
    []
  );

  const confirmEdit = useCallback(async () => {
    if (!editing) return;

    const { dbId, loja, field, value } = editing;
    const newVal = parseBR(value);

    const updatedRows = rows.map((r) => {
      if (r.id === dbId) {
        const updated: Row = { ...r, [field]: newVal };
        updated["Preço de Venda"] = calcPrecoVenda(updated);
        return updated;
      }
      return r;
    });

    setRows(updatedRows);
    setFilteredRows(updatedRows);

    const rowUpdated = updatedRows.find((r) => r.id === dbId);

    const table = loja === "PK" ? "marketplace_shopee_pk" : "marketplace_shopee_sb";

    const { error } = await supabase
      .from(table)
      .update({
        [String(field)]: newVal,
        "Preço de Venda": rowUpdated?.["Preço de Venda"],
      })
      .eq("id", dbId);

    if (error) console.error("❌ Erro ao salvar:", error);

    setEditing(null);
  }, [editing, rows]);

  const cancelEdit = () => setEditing(null);

  // ✅ IMPORTAÇÃO: atualizar por (ID + Loja), NÃO por UUID
  const handlePricingImport = async (data: any[]) => {
    for (const row of data) {
      const loja = String(row.Loja || "").trim().toUpperCase();
      const id = String(row.ID ?? "").trim();

      if (!id || !loja) continue;

      const table = loja === "PK" ? "marketplace_shopee_pk" : "marketplace_shopee_sb";

      const { error } = await supabase
        .from(table)
        .update({
          Desconto: row.Desconto,
          Embalagem: row.Embalagem,
          Frete: row.Frete,
          Comissão: row.Comissão,
          Imposto: row.Imposto,
          Marketing: row.Marketing,
          Custo: row.Custo,
          "Margem de Lucro": row["Margem de Lucro"],
          "Preço de Venda": row["Preço de Venda"],
        })
        .eq("ID", id)
        .eq("Loja", loja);

      if (error) console.error("❌ Erro ao importar:", error);
    }

    setOpenPricingModal(false);
    loadData();
  };

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      // ✅ GARANTE AUTH antes do export também
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        alert("Você precisa estar logado para exportar.");
        return;
      }

      const pageSize = 1000;
      let page = 0;
      let all: any[] = [];

      while (true) {
        let exportQuery = supabase
          .from("marketplace_shopee_all")
          .select(
            `
            id,
            anuncio_id,
            ID,
            Loja,
            "ID Tray",
            "ID Var",
            "ID Bling",
            Nome,
            Marca,
            Referência,
            Categoria,
            Desconto,
            Embalagem,
            Frete,
            Comissão,
            Imposto,
            Marketing,
            "Margem de Lucro",
            Custo,
            "Preço de Venda",
            "Atualizado em"
          `
          )
          .order("Atualizado em", { ascending: false })
          .order("id", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (selectedLoja.length) exportQuery = exportQuery.in("Loja", selectedLoja);
        if (selectedBrands.length) exportQuery = exportQuery.in("Marca", selectedBrands);

        if (debouncedSearch) {
          const term = debouncedSearch.replace(/[%_]/g, "").trim();
          const safe = term.replace(/"/g, "");
          const pattern = `%${safe}%`;
          exportQuery = exportQuery.or(
            [
              `ID.ilike.${pattern}`,
              `"Marca".ilike.${pattern}`,
              `"Referência".ilike.${pattern}`,
              `"ID Bling".ilike.${pattern}`,
            ].join(",")
          );
        }

        const { data, error } = await exportQuery;

        if (error) throw error;
        if (!data?.length) break;

        all = all.concat(data);
        if (data.length < pageSize) break;

        page++;
      }

      await impExp.handleExport(all);
    } catch (e) {
      console.error("ERRO EXPORT:", e);
      alert("Erro ao exportar. Veja o console.");
    } finally {
      setExporting(false);
    }
  }, [selectedLoja, selectedBrands, debouncedSearch, impExp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="mx-auto space-y-6 w-full">
        <GlassmorphicCard>
          <TopBarLite
            search={search}
            setSearch={setSearch}
            onExport={handleExportAll}
            exporting={exporting}
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
                  setEditing((p: any) =>
                    p
                      ? {
                          ...p,
                          value: e.target.value,
                        }
                      : p
                  )
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
