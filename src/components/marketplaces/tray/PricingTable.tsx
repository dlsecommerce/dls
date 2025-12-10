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

  // ⭐ Filtros antes do hook
  const [selectedLoja, setSelectedLoja] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Dados e controle da tabela
  const [rows, setRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Hook de exportação (usa filtros para nome do arquivo)
  const impExp = useTrayImportExport(
    filteredRows,
    selectedLoja[0] ?? "",
    selectedBrands[0] ?? ""
  );

  // Debounce da busca
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // ---------- carregar dados (apenas página atual para a UI) ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    let query = supabase
      .from("marketplace_tray_all")
      .select(
        `
        ID, Loja, "ID Tray", "ID Var", Marca, Referência, Categoria,
        Desconto, Embalagem, Frete, Comissão, Imposto, Marketing,
        "Margem de Lucro", Custo, "Preço de Venda"
      `,
        { count: "exact" }
      );

    // filtros de loja
    if (selectedLoja.length) {
      const lojasDB = selectedLoja.map((l) =>
        l.includes("Pikot") ? "PK" :
        l.includes("Sóbaquetas") ? "SB" :
        l
      );
      query = query.in("Loja", lojasDB);
    }

    // filtros de marca
    if (selectedBrands.length) {
      query = query.in("Marca", selectedBrands);
    }

    // ordenação
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
      console.error("❌ Supabase load error:", error);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((r) => ({
      ...r,
      Desconto: parseBR(r["Desconto"]),
      Embalagem: parseBR(r["Embalagem"]),
      Frete: parseBR(r["Frete"]),
      Comissão: parseBR(r["Comissão"]),
      Imposto: parseBR(r["Imposto"]),
      Marketing: parseBR(r["Marketing"]),
      "Margem de Lucro": parseBR(r["Margem de Lucro"]),
      Custo: parseBR(r["Custo"]),
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

  // ---------- ordenação ----------
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // ---------- busca + filtro em memória (sobre rows da página atual) ----------
  useEffect(() => {
    if (!rows.length) return;

    const termo = debouncedSearch.toLowerCase().trim();
    const isNumeric = /^\d+$/.test(termo);

    const normalizeStr = (val: any) =>
      val
        ? String(val)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        : "";

    startTransition(() => {
      const filtrados = rows.filter((r) => {
        const lojaNome =
          r.Loja === "PK" ? "Pikot Shop" : r.Loja === "SB" ? "Sóbaquetas" : r.Loja;

        const lojaOk =
          selectedLoja.length === 0 || selectedLoja.includes(lojaNome);

        const marcaOk =
          selectedBrands.length === 0 || selectedBrands.includes(r.Marca);

        const campos = {
          id: normalizeStr(r.ID),
          idTray: normalizeStr(r["ID Tray"]),
          idVar: normalizeStr(r["ID Var"]),
          referencia: normalizeStr(r.Referência),
          marca: normalizeStr(r.Marca),
          categoria: normalizeStr(r.Categoria),
          loja: normalizeStr(lojaNome),
        };

        if (isNumeric) {
          return (
            lojaOk &&
            marcaOk &&
            (campos.id.includes(termo) ||
              campos.idTray.includes(termo) ||
              campos.idVar.includes(termo))
          );
        }

        const searchOk =
          termo === "" ||
          Object.values(campos).some((campo) => campo.includes(termo));

        return lojaOk && marcaOk && searchOk;
      });

      setFilteredRows(filtrados);
    });
  }, [debouncedSearch, rows, selectedLoja, selectedBrands]);

  // ---------- copiar ----------
  const handleCopy = useCallback((text: string, uniqueKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(uniqueKey);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  // ---------- edição ----------
  const openEditor = useCallback(
    (row: Row, field: keyof Row, isMoney: boolean, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const val = row[field] ?? 0;
      const str = toBR(Number(val));
      setEditing({
        id: row.ID,
        loja: row.Loja,
        field,
        value: str,
        isMoney,
        anchorRect: rect,
      });
    },
    []
  );

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

    const base = updatedRows.find((r) => r.ID === id && r.Loja === loja);
    const precoNovo = base ? base["Preço de Venda"] : 0;

    const { error } = await supabase
      .from("marketplace_tray_all")
      .update({ [String(field)]: newVal, "Preço de Venda": precoNovo })
      .eq("ID", id)
      .eq("Loja", loja);

    if (error) console.error("❌ Erro ao salvar:", error);
    setEditing(null);
  }, [editing, rows]);

  const cancelEdit = () => setEditing(null);

  // ---------- importação ----------
  const handlePricingImport = async (data: any[]) => {
    for (const row of data) {
      const {
        ID,
        Desconto,
        Embalagem,
        Frete,
        Comissão,
        Imposto,
        Marketing,
        Custo,
        "Preço de Venda": PrecoVenda,
      } = row;

      await supabase
        .from("marketplace_tray_all")
        .update({
          Desconto: Desconto ?? null,
          Embalagem: Embalagem ?? null,
          Frete: Frete ?? null,
          Comissão: Comissão ?? null,
          Imposto: Imposto ?? null,
          Marketing: Marketing ?? null,
          Custo: Custo ?? null,
          "Preço de Venda": PrecoVenda ?? null,
        })
        .eq("ID", ID);
    }

    setOpenPricingModal(false);
    loadData();
  };

  // ---------- EXPORTAR TODOS OS ANÚNCIOS DO FILTRO (SEM LIMITE) ----------
  const handleExportAll = useCallback(async () => {
    const pageSize = 1000;
    let page = 0;
    let allData: any[] = [];

    // 1) Buscar TUDO do Supabase em blocos
    while (true) {
      let query = supabase
        .from("marketplace_tray_all")
        .select(
          `
          ID, Loja, "ID Tray", "ID Var", Marca, Referência, Categoria,
          Desconto, Embalagem, Frete, Comissão, Imposto, Marketing,
          "Margem de Lucro", Custo, "Preço de Venda"
        `
        )
        .order("ID", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;

      if (error) {
        console.error("❌ Erro ao exportar todos:", error);
        alert("Erro ao exportar anúncios.");
        return;
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);

      if (data.length < pageSize) {
        break;
      }

      page++;
    }

    // 2) Normalizar números
    const allNormalized = allData.map((r) => ({
      ...r,
      Desconto: parseBR(r["Desconto"]),
      Embalagem: parseBR(r["Embalagem"]),
      Frete: parseBR(r["Frete"]),
      Comissão: parseBR(r["Comissão"]),
      Imposto: parseBR(r["Imposto"]),
      Marketing: parseBR(r["Marketing"]),
      "Margem de Lucro": parseBR(r["Margem de Lucro"]),
      Custo: parseBR(r["Custo"]),
      "Preço de Venda": parseBR(r["Preço de Venda"]),
    }));

    // 3) Aplicar MESMA lógica de filtro da tabela (loja + marca + busca)
    const termo = debouncedSearch.toLowerCase().trim();
    const isNumeric = /^\d+$/.test(termo);

    const normalizeStr = (val: any) =>
      val
        ? String(val)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        : "";

    const exportRows = allNormalized.filter((r) => {
      const lojaNome =
        r.Loja === "PK" ? "Pikot Shop" : r.Loja === "SB" ? "Sóbaquetas" : r.Loja;

      const lojaOk =
        selectedLoja.length === 0 || selectedLoja.includes(lojaNome);

      const marcaOk =
        selectedBrands.length === 0 || selectedBrands.includes(r.Marca);

      const campos = {
        id: normalizeStr(r.ID),
        idTray: normalizeStr(r["ID Tray"]),
        idVar: normalizeStr(r["ID Var"]),
        referencia: normalizeStr(r.Referência),
        marca: normalizeStr(r.Marca),
        categoria: normalizeStr(r.Categoria),
        loja: normalizeStr(lojaNome),
      };

      if (isNumeric) {
        const hit =
          campos.id.includes(termo) ||
          campos.idTray.includes(termo) ||
          campos.idVar.includes(termo);

        return lojaOk && marcaOk && hit;
      }

      const searchOk =
        termo === "" ||
        Object.values(campos).some((campo) => campo.includes(termo));

      return lojaOk && marcaOk && searchOk;
    });

    console.log("📦 Total exportado:", exportRows.length);

    // 4) Passar para o hook que gera o Excel
    await impExp.handleExport(exportRows);
  }, [
    debouncedSearch,
    selectedLoja,
    selectedBrands,
    impExp,
  ]);

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-8">
      <div className="mx-auto space-y-6 w-full">
        <GlassmorphicCard>
          <TopBarLite
            search={search}
            setSearch={setSearch}
            onExport={handleExportAll} // 🔥 agora exporta exatamente o que a tela filtraria, sem limite
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
