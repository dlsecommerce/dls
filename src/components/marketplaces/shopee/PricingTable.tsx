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
import { useTrayImportExport } from "@/components/marketplaces/shopee/hooks/useTrayImportExport";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";
import { FloatingEditor } from "./FloatingEditor";
import TopBarLite from "@/components/marketplaces/shopee/TopBar";
import { TableRows } from "@/components/marketplaces/shopee/TableRows";
import { toBR, parseBR } from "@/components/marketplaces/shopee/hooks/helpers";
import {
  calcPrecoVendaWithApplied,
  parseBRNullable,
} from "@/components/marketplaces/shopee/hooks/calcPrecoVenda";
import { Row } from "@/components/marketplaces/shopee/hooks/types";
import { Check as CheckIcon, X as XIcon } from "lucide-react";
import PricingMassEditionModal from "@/components/marketplaces/shopee/PricingMassEditionModal";
import PricingHeaderRow from "@/components/marketplaces/shopee/PricingHeaderRow";

/**
 * ✅ Cache simples em memória (sem libs)
 */
type CacheEntry = {
  rows: Row[];
  totalItems: number;
  savedAt: number;
};

const CACHE_TTL_MS = 10 * 60_000; // 10 minutos
const CACHE_MAX_KEYS = 25;
const SHOPEE_CACHE = new Map<string, CacheEntry>();

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
    "shopee",
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
  if (SHOPEE_CACHE.size >= CACHE_MAX_KEYS) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of SHOPEE_CACHE.entries()) {
      if (v.savedAt < oldestAt) {
        oldestAt = v.savedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) SHOPEE_CACHE.delete(oldestKey);
  }
  SHOPEE_CACHE.set(key, entry);
}

function getCache(key: string) {
  const entry = SHOPEE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    SHOPEE_CACHE.delete(key);
    return null;
  }
  return entry;
}

function clearShopeeCache() {
  SHOPEE_CACHE.clear();
}

/**
 * ✅ Normaliza Loja para escolher a tabela correta.
 */
function normalizeLojaCode(lojaRaw: unknown): "PK" | "SB" | null {
  const s = String(lojaRaw ?? "").trim().toUpperCase();

  if (s === "PK" || s.startsWith("PK")) return "PK";
  if (s === "SB" || s.startsWith("SB")) return "SB";

  if (s.includes("PIKOT")) return "PK";
  if (s.includes("SOBA")) return "SB";

  return null;
}

function tableByLojaCode(code: "PK" | "SB") {
  return code === "PK" ? "marketplace_shopee_pk" : "marketplace_shopee_sb";
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

  // ✅ Export usa os dados filtrados em tela (ou export All pega tudo)
  const impExp = useTrayImportExport(filteredRows, selectedLoja, selectedBrands);

  const reqIdRef = useRef(0);

  // ✅ só recalcula PV se mexer em algum campo de precificação
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

    setLoading(true);

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
        // ✅ id pode ser UUID: NUNCA converter com Number()
        id: String(r.id),
        anuncio_id: r.anuncio_id,
        OD,

        // ✅ IMPORTANTE: aqui mantemos o que vem do banco (pode ser null)
        // Mas como seu helper parseBR transforma null em 0, a UI vai mostrar 0.
        // Se você quer mostrar “padrão regra” quando vier null, o correto é:
        // - manter null em row e resolver na UI
        // - OU, mais simples: manter números no banco (via manual/import) e usar regra só no cálculo.
        //
        // Como você pediu pra regra ser o padrão quando "não mexer", o ideal é salvar NULL.
        // Para não quebrar UI, vamos manter null no estado e só converter no display/editor.
        Desconto: r.Desconto ?? null,
        Embalagem: r.Embalagem ?? null,
        Frete: r.Frete ?? null,
        Comissão: r.Comissão ?? null,
        Imposto: r.Imposto ?? null,
        Marketing: r.Marketing ?? null,
        "Margem de Lucro": r["Margem de Lucro"] ?? null,
        Custo: r.Custo ?? null,
        "Preço de Venda": r["Preço de Venda"] ?? null,
      } as any;
    });

    setCache(cacheKey, { rows: normalized as any, totalItems: count || 0, savedAt: Date.now() });

    startTransition(() => {
      setRows(normalized as any);
      setFilteredRows(normalized as any);
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
    if (sortColumn === col) setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    else {
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

      // ✅ editor mostra vazio se for null (para permitir voltar pro automático)
      const rawNullable = (row as any)[field] ?? null;
      const n = rawNullable === null ? null : parseBR(rawNullable as any);
      const formatted = n === null ? "" : toBR(n);

      setEditing({
        dbId: String((row as any).id ?? (row as any).ID),
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
    const dbIdStr = String(dbId);

    // ✅ vazio => null (automatico)
    const newValNullable = parseBRNullable(value);

    const shouldRecalcPV = PREC_FIELDS.includes(field);

    // encontra a linha
    let currentRow: any = rows.find((r: any) => String(r.id) === dbIdStr);
    if (!currentRow) currentRow = rows.find((r: any) => String((r as any).ID) === dbIdStr);

    if (!currentRow) {
      console.error("❌ Não encontrou linha para editar:", { dbIdStr, field, value });
      setEditing(null);
      return;
    }

    const oldValNullable = parseBRNullable((currentRow as any)[field]);
    const same =
      (oldValNullable === null && newValNullable === null) ||
      (oldValNullable !== null &&
        newValNullable !== null &&
        parseBR(oldValNullable) === parseBR(newValNullable));

    if (same) {
      setEditing(null);
      return;
    }

    const prevRows = rows;
    let newRowUpdated: Row | undefined;

    const updatedRows = rows.map((r: any) => {
      const isSame = String((r as any).id) === dbIdStr || String((r as any).ID) === dbIdStr;
      if (!isSame) return r;

      const updated: any = { ...(r as any), [field]: newValNullable };

      if (shouldRecalcPV) {
        const { pv, resolved } = calcPrecoVendaWithApplied(updated);

        updated["Preço de Venda"] = pv;

        // ✅ garante que a UI e o banco ficam iguais ao "resultado aplicado"
        updated.Embalagem = resolved.Embalagem;
        updated.Frete = resolved.Frete;
        updated["Comissão"] = resolved["Comissão"];
        updated.Imposto = resolved.Imposto;
        updated.Marketing = resolved.Marketing;
        updated["Margem de Lucro"] = resolved["Margem de Lucro"];
      }

      newRowUpdated = updated as Row;
      return updated as Row;
    });

    // UI otimista
    setRows(updatedRows);
    setFilteredRows(updatedRows);
    setEditing(null);

    // cache otimista
    const cached = getCache(cacheKey);
    if (cached && newRowUpdated) {
      setCache(cacheKey, {
        ...cached,
        rows: cached.rows.map((r: any) => {
          const isSame = String((r as any).id) === dbIdStr || String((r as any).ID) === dbIdStr;
          return isSame ? (newRowUpdated as any) : r;
        }),
        savedAt: Date.now(),
      });
    }

    const lojaCode = normalizeLojaCode(loja);
    if (!lojaCode) {
      console.error("❌ Loja inválida para salvar:", loja);
      alert("Loja inválida para salvar. Veja o console.");
      setRows(prevRows);
      setFilteredRows(prevRows);
      return;
    }
    const table = tableByLojaCode(lojaCode);

    // ✅ payload: salva campo editado (pode ser null) + PV + campos aplicados
    const payload: any = { [String(field)]: newValNullable };

    if (shouldRecalcPV && newRowUpdated) {
      payload["Preço de Venda"] = (newRowUpdated as any)?.["Preço de Venda"];

      payload.Embalagem = (newRowUpdated as any).Embalagem;
      payload.Frete = (newRowUpdated as any).Frete;
      payload["Comissão"] = (newRowUpdated as any)["Comissão"];
      payload.Imposto = (newRowUpdated as any).Imposto;
      payload.Marketing = (newRowUpdated as any).Marketing;
      payload["Margem de Lucro"] = (newRowUpdated as any)["Margem de Lucro"];
    }

    try {
      // 1) tenta por UUID
      const { data: upd1, error: err1 } = await supabase
        .from(table)
        .update(payload)
        .eq("id", dbIdStr)
        .select("id");

      if (err1) throw err1;

      // 2) fallback se id da view não bater com id da tabela base
      if (!upd1?.length) {
        const fallbackID = (currentRow as any)?.ID ?? (newRowUpdated as any)?.ID;

        if (!fallbackID) {
          console.error("❌ Update não encontrou por id e não há ID para fallback.", {
            dbIdStr,
            loja,
            lojaCode,
            table,
            payload,
          });
          throw new Error("Sem ID para fallback.");
        }

        const lojaOriginal = String(loja ?? "").trim();

        const { data: upd2, error: err2 } = await supabase
          .from(table)
          .update(payload)
          .eq("ID", fallbackID as any)
          .or(`Loja.eq.${lojaOriginal},Loja.eq.${lojaCode}`)
          .select("id");

        if (err2) throw err2;

        if (!upd2?.length) {
          console.error("❌ Update não alterou nenhuma linha (id e fallback falharam).", {
            dbIdStr,
            fallbackID,
            lojaOriginal,
            lojaCode,
            table,
            payload,
          });
          throw new Error("Nenhuma linha atualizada no fallback.");
        }
      }
    } catch (e: any) {
      console.error("❌ Falha ao salvar. Revertendo UI.", e);
      alert("Erro ao salvar. Veja o console.");

      // reverte
      setRows(prevRows);
      setFilteredRows(prevRows);

      const cached2 = getCache(cacheKey);
      if (cached2) {
        setCache(cacheKey, {
          ...cached2,
          rows: prevRows,
          savedAt: Date.now(),
        });
      }
    }
  }, [editing, rows, cacheKey, PREC_FIELDS]);

  const cancelEdit = () => setEditing(null);

  /**
   * ✅ O modal já atualiza via RPC
   * Então aqui só fecha, limpa cache e recarrega
   */
  const handlePricingImport = useCallback(
    async (_data: any[]) => {
      setOpenPricingModal(false);
      clearShopeeCache();
      await loadData();
    },
    [loadData]
  );

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
                  setEditing((p: any) => (p ? { ...p, value: e.target.value } : p))
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
