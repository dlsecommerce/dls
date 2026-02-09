"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useTransition,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useTrayImportExport } from "@/components/marketplaces/tray/hooks/useTrayImportExport";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";
import { FloatingEditor } from "./FloatingEditor";
import TopBarLite from "@/components/marketplaces/tray/TopBar";
import { TableRows } from "@/components/marketplaces/tray/TableRows";
import { toBR, parseBR } from "@/components/marketplaces/tray/hooks/helpers";
import { calcPrecoVenda } from "@/components/marketplaces/tray/hooks/calcPrecoVenda";
import { Row } from "@/components/marketplaces/tray/hooks/types";
import { Check as CheckIcon, X as XIcon } from "lucide-react";
import PricingMassEditionModal from "@/components/marketplaces/tray/PricingMassEditionModal";
import PricingHeaderRow from "@/components/marketplaces/tray/PricingHeaderRow";

type CacheEntry = {
  rows: Row[];
  totalItems: number;
  savedAt: number;
};

const CACHE_TTL_MS = 10 * 60_000; // 10 minutos
const CACHE_MAX_KEYS = 25;
const TRAY_CACHE = new Map<string, CacheEntry>();

function makeCacheKey(params: {
  currentPage: number;
  itemsPerPage: number;
  selectedLoja: string[];
  selectedBrands: string[];
  debouncedSearch: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
}) {
  const loja = [...params.selectedLoja].sort().join("|");
  const brands = [...params.selectedBrands].sort().join("|");
  return [
    "tray",
    `p=${params.currentPage}`,
    `pp=${params.itemsPerPage}`,
    `loja=${loja}`,
    `brands=${brands}`,
    `q=${params.debouncedSearch}`,
    `sort=${params.sortColumn ?? ""}`,
    `dir=${params.sortDirection}`,
  ].join("&");
}

function setCache(key: string, entry: CacheEntry) {
  if (TRAY_CACHE.size >= CACHE_MAX_KEYS) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of TRAY_CACHE.entries()) {
      if (v.savedAt < oldestAt) {
        oldestAt = v.savedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) TRAY_CACHE.delete(oldestKey);
  }
  TRAY_CACHE.set(key, entry);
}

function getCache(key: string) {
  const entry = TRAY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    TRAY_CACHE.delete(key);
    return null;
  }
  return entry;
}

function clearTrayCache() {
  TRAY_CACHE.clear();
}

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
  const [editing, setEditing] = useState<any>(null);

  const [openPricingModal, setOpenPricingModal] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  const impExp = useTrayImportExport(filteredRows, selectedLoja, selectedBrands);

  // ✅ evita request antigo sobrescrever estado novo
  const reqIdRef = useRef(0);

  // ✅ Campos que disparam recálculo do PV
  const PREC_FIELDS: Array<keyof Row> = useMemo(
    () => [
      "Custo",
      "Desconto",
      "Embalagem",
      "Frete",
      "Comissão",
      "Imposto",
      "Marketing",
      "Margem de Lucro",
    ],
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedLoja, selectedBrands]);

  const cacheKey = useMemo(
    () =>
      makeCacheKey({
        currentPage,
        itemsPerPage,
        selectedLoja,
        selectedBrands,
        debouncedSearch,
        sortColumn,
        sortDirection,
      }),
    [
      currentPage,
      itemsPerPage,
      selectedLoja,
      selectedBrands,
      debouncedSearch,
      sortColumn,
      sortDirection,
    ]
  );

  // ✅ hidrata cache ao voltar pra tela
  useEffect(() => {
    const cached = getCache(cacheKey);
    if (cached) {
      setRows(cached.rows);
      setFilteredRows(cached.rows);
      setTotalItems(cached.totalItems);
      setLoading(false);
    }
  }, [cacheKey]);

  const loadData = useCallback(async () => {
    const myReqId = ++reqIdRef.current;

    // ✅ 1) cache primeiro (não liga loading se tiver cache)
    const cached = getCache(cacheKey);
    if (cached) {
      startTransition(() => {
        setRows(cached.rows);
        setFilteredRows(cached.rows);
        setTotalItems(cached.totalItems);
        setLoading(false);
      });
      return;
    }

    // ✅ 2) agora sim liga loading porque vai ao banco
    setLoading(true);

    // ✅ GARANTE AUTH: sem sessão, não busca (RLS retorna vazio)
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      if (myReqId !== reqIdRef.current) return;
      setRows([]);
      setFilteredRows([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    let query = supabase
      .from("marketplace_tray_all")
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

    // ✅ BUSCA SERVER-SIDE CORRIGIDA (ID / ID Tray / ID Bling numéricos -> cast pra text)
    if (debouncedSearch) {
      const term = debouncedSearch.replace(/[%_]/g, "").trim();
      const safe = term.replace(/"/g, "");
      const pattern = `%${safe}%`;
      const onlyDigits = /^[0-9]+$/.test(safe);

      const orParts: string[] = [
        `ID::text.ilike.${pattern}`,
        `"ID Tray"::text.ilike.${pattern}`,
        `"ID Bling"::text.ilike.${pattern}`,
        `"Marca".ilike.${pattern}`,
        `"Referência".ilike.${pattern}`,
      ];

      if (onlyDigits) {
        orParts.unshift(`ID.eq.${safe}`);
        orParts.unshift(`"ID Tray".eq.${safe}`);
        orParts.unshift(`"ID Bling".eq.${safe}`);
      }

      query = query.or(orParts.join(","));
    }

    // ✅ ORDENAÇÃO: "Atualizado em"
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

    if (myReqId !== reqIdRef.current) return;

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

    // ✅ salva cache
    setCache(cacheKey, {
      rows: normalized,
      totalItems: count || 0,
      savedAt: Date.now(),
    });

    startTransition(() => {
      setRows(normalized);
      setFilteredRows(normalized);
      setTotalItems(count || 0);
      setLoading(false);
    });
  }, [
    cacheKey,
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    selectedLoja,
    selectedBrands,
    debouncedSearch,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
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

  // ✅ NÃO refetch ao salvar: atualiza UI + cache e só salva no Supabase
  const confirmEdit = useCallback(async () => {
    if (!editing) return;

    const { dbId, loja, field, value } = editing;
    const newVal = parseBR(value);

    const shouldRecalcPV = PREC_FIELDS.includes(field);

    let newRowUpdated: Row | undefined;

    const updatedRows = rows.map((r) => {
      if (r.id === dbId) {
        const updated: Row = { ...r, [field]: newVal };
        if (shouldRecalcPV) updated["Preço de Venda"] = calcPrecoVenda(updated);
        newRowUpdated = updated;
        return updated;
      }
      return r;
    });

    // UI otimista
    setRows(updatedRows);
    setFilteredRows(updatedRows);
    setEditing(null);

    // atualiza cache da página atual (sem limpar tudo)
    const cached = getCache(cacheKey);
    if (cached && newRowUpdated) {
      setCache(cacheKey, {
        ...cached,
        rows: cached.rows.map((r) => (r.id === dbId ? newRowUpdated! : r)),
        savedAt: Date.now(),
      });
    }

    const table = loja === "PK" ? "marketplace_tray_pk" : "marketplace_tray_sb";

    const payload: any = { [String(field)]: newVal };
    if (shouldRecalcPV) payload["Preço de Venda"] = newRowUpdated?.["Preço de Venda"];

    const { error } = await supabase.from(table).update(payload).eq("id", dbId);

    if (error) {
      console.error("❌ Erro ao salvar:", error);
      // opcional: aqui você pode reverter UI ou mostrar toast
    }
  }, [editing, rows, cacheKey, PREC_FIELDS]);

  const cancelEdit = () => setEditing(null);

  const handlePricingImport = async (data: any[]) => {
    for (const row of data) {
      const loja = String(row.Loja || "").trim().toUpperCase();
      const id = String(row.ID ?? "").trim();

      if (!id || !loja) continue;

      const table = loja === "PK" ? "marketplace_tray_pk" : "marketplace_tray_sb";

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
    clearTrayCache();
    loadData();
  };

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
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
          .from("marketplace_tray_all")
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
          const onlyDigits = /^[0-9]+$/.test(safe);

          const orParts: string[] = [
            `ID::text.ilike.${pattern}`,
            `"ID Tray"::text.ilike.${pattern}`,
            `"ID Bling"::text.ilike.${pattern}`,
            `"Marca".ilike.${pattern}`,
            `"Referência".ilike.${pattern}`,
          ];

          if (onlyDigits) {
            orParts.unshift(`ID.eq.${safe}`);
            orParts.unshift(`"ID Tray".eq.${safe}`);
            orParts.unshift(`"ID Bling".eq.${safe}`);
          }

          exportQuery = exportQuery.or(orParts.join(","));
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
          <FloatingEditor
            anchorRect={editing.anchorRect}
            onClose={() => setEditing(null)}
          >
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
                  setEditing((p: any) => (p ? { ...p, value: e.target.value } : p))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") setEditing(null);
                }}
              />

              <div className="absolute right-1 flex items-center gap-1">
                <button
                  title="Cancelar"
                  onClick={() => setEditing(null)}
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
