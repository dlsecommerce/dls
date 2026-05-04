"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useTransition,
  useMemo,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

import { useTrayImportExport } from "@/components/marketplaces/tray/hooks/useTrayImportExport";
import { Table, TableBody } from "@/components/ui/table";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { TableControls } from "@/components/announce/AnnounceTable/TableControls";

import { FloatingEditor } from "@/components/marketplaces/tray/FloatingEditor";
import { TableRows } from "@/components/marketplaces/tray/TableRows";
import TrayFilters from "@/components/marketplaces/tray/TrayFilters";
import TrayActionsSidebar from "@/components/marketplaces/tray/TrayActionsSidebar";
import PricingHeaderTray from "@/components/marketplaces/tray/PricingHeaderTray";
import PricingMassEditionModal from "@/components/marketplaces/tray/PricingMassEditionModal";

import { toBR, parseBR } from "@/components/marketplaces/tray/hooks/helpers";
import { calcPrecoVenda } from "@/components/marketplaces/tray/hooks/calcPrecoVenda";
import { Row } from "@/components/marketplaces/tray/hooks/types";

import {
  TrayFilters as TrayFiltersType,
  DEFAULT_TRAY_FILTERS,
} from "@/components/marketplaces/tray/types";

import {
  Check as CheckIcon,
  X as XIcon,
  Menu,
  SlidersHorizontal,
} from "lucide-react";

type CacheEntry = {
  rows: Row[];
  totalItems: number;
  savedAt: number;
};

const CACHE_TTL_MS = 10 * 60_000;
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
  situacao?: string;
  tipo?: string;
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
    `situacao=${params.situacao ?? ""}`,
    `tipo=${params.tipo ?? ""}`,
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

function sanitizeTerm(input: string) {
  return input.replace(/[%_]/g, "").replace(/"/g, "").trim();
}

function parseSearchTokens(q: string) {
  return q
    .split(",")
    .map((s) => sanitizeTerm(s))
    .filter(Boolean);
}

function isOnlyDigits(s: string) {
  return /^[0-9]+$/.test(s);
}

function escapeForOrValue(v: string) {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildOrSearchParts(tokens: string[]) {
  const orParts: string[] = [];

  for (const t of tokens) {
    if (!t) continue;

    const variants = Array.from(
      new Set([
        t,
        t.replace(/\s+/g, " "),
        t.replace(/\s+/g, "-"),
        t.replace(/\s+/g, ""),
      ])
    );

    for (const v of variants) {
      const pattern = escapeForOrValue(`%${v}%`);

      orParts.push(`Nome.ilike.${pattern}`);
      orParts.push(`"Marca".ilike.${pattern}`);
      orParts.push(`"Referência".ilike.${pattern}`);
      orParts.push(`"ID Var".ilike.${pattern}`);
      orParts.push(`"ID Bling".ilike.${pattern}`);
      orParts.push(`"ID Tray".ilike.${pattern}`);
    }

    if (isOnlyDigits(t)) {
      orParts.push(`ID.eq.${t}`);
      orParts.push(`"ID Tray".eq.${t}`);
      orParts.push(`"ID Bling".eq.${t}`);
    }
  }

  return orParts;
}

function normalizeLojaCode(lojaRaw: unknown): "PK" | "SB" | null {
  const s = String(lojaRaw ?? "").trim().toUpperCase();

  if (s === "PK" || s.startsWith("PK")) return "PK";
  if (s === "SB" || s.startsWith("SB")) return "SB";

  if (s.includes("PIKOT")) return "PK";
  if (s.includes("SOBA")) return "SB";

  return null;
}

function tableByLojaCode(code: "PK" | "SB") {
  return code === "PK" ? "marketplace_tray_pk" : "marketplace_tray_sb";
}

function isValidRow(r: any) {
  const pick = (v: any) =>
    v === null || v === undefined ? "" : String(v).trim();

  const sID = pick(r?.ID);
  const sid = pick(r?.id);

  const hasSomeId =
    (sID && sID !== "0" && sID !== "-") ||
    (sid && sid !== "0" && sid !== "-");

  return Boolean(hasSomeId);
}

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

function lojaCodesToFilterValue(lojas: string[]) {
  if (!lojas.length) return DEFAULT_TRAY_FILTERS.lojasVirtuais;

  const first = lojas[0];

  if (first === "PK") return "Pikot Shop";
  if (first === "SB") return "Sóbaquetas";

  return first;
}

function lojaFilterValueToCodes(value: string) {
  const v = String(value || "").trim();

  if (!v || v === "Todos") return [];
  if (v === "Pikot Shop" || v === "PK") return ["PK"];
  if (v === "Sóbaquetas" || v === "SB") return ["SB"];

  return [v];
}

function parseBRNullable(value: any) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = parseBR(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getTrayPricingLabel(row: any, fallbackId: string) {
  return row?.Nome || row?.Referência || row?.ID || fallbackId || "anúncio";
}

export default function PricingTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialLojas = parseArrayParam(searchParams.get("lojas"));
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  const initialFilters: TrayFiltersType = {
    ...DEFAULT_TRAY_FILTERS,
    situacao: searchParams.get("situacao") ?? DEFAULT_TRAY_FILTERS.situacao,
    tipo: searchParams.get("tipo") ?? DEFAULT_TRAY_FILTERS.tipo,
    lojasVirtuais:
      searchParams.get("loja") ?? lojaCodesToFilterValue(initialLojas),
    marca: searchParams.get("marca") ?? initialBrands.join(", "),
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLoja, setSelectedLoja] = useState<string[]>(initialLojas);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [filters, setFilters] = useState<TrayFiltersType>(initialFilters);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);
  const [totalItems, setTotalItems] = useState(0);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [sortColumn, setSortColumn] = useState<string | null>(
    initialSortColumn
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [openPricingModal, setOpenPricingModal] = useState(false);

  const [openFiltersMobile, setOpenFiltersMobile] = useState(false);
  const [openActionsMobile, setOpenActionsMobile] = useState(false);

  const didHydrateFromUrlRef = useRef(false);
  const lastUrlRef = useRef("");
  const reqIdRef = useRef(0);

  const impExp = useTrayImportExport(filteredRows, selectedLoja, selectedBrands);

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
    const nextLojas = lojaFilterValueToCodes(filters.lojasVirtuais);
    const nextBrands = filters.marca.trim() ? [filters.marca.trim()] : [];

    setSelectedLoja((prev) =>
      arraysEqual(prev, nextLojas) ? prev : nextLojas
    );

    setSelectedBrands((prev) =>
      arraysEqual(prev, nextBrands) ? prev : nextBrands
    );
  }, [filters.lojasVirtuais, filters.marca]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlLojas = parseArrayParam(searchParams.get("lojas"));
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    const urlFilters: TrayFiltersType = {
      ...DEFAULT_TRAY_FILTERS,
      situacao: searchParams.get("situacao") ?? DEFAULT_TRAY_FILTERS.situacao,
      tipo: searchParams.get("tipo") ?? DEFAULT_TRAY_FILTERS.tipo,
      lojasVirtuais:
        searchParams.get("loja") ?? lojaCodesToFilterValue(urlLojas),
      marca: searchParams.get("marca") ?? urlBrands.join(", "),
    };

    setSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setDebouncedSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setCurrentPage((prev) => (prev !== urlPage ? urlPage : prev));
    setItemsPerPage((prev) => (prev !== urlPerPage ? urlPerPage : prev));
    setSelectedLoja((prev) => (arraysEqual(prev, urlLojas) ? prev : urlLojas));
    setSelectedBrands((prev) =>
      arraysEqual(prev, urlBrands) ? prev : urlBrands
    );
    setSortColumn((prev) => (prev !== urlSortColumn ? urlSortColumn : prev));
    setSortDirection((prev) =>
      prev !== urlSortDirection ? urlSortDirection : prev
    );
    setFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(urlFilters) ? prev : urlFilters
    );

    didHydrateFromUrlRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedLoja,
    selectedBrands,
    filters.situacao,
    filters.tipo,
  ]);

  useEffect(() => {
    if (!didHydrateFromUrlRef.current) return;

    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (filters.marca.trim()) params.set("marca", filters.marca.trim());

    if (
      filters.situacao &&
      filters.situacao !== DEFAULT_TRAY_FILTERS.situacao
    ) {
      params.set("situacao", filters.situacao);
    }

    if (filters.tipo && filters.tipo !== DEFAULT_TRAY_FILTERS.tipo) {
      params.set("tipo", filters.tipo);
    }

    if (
      filters.lojasVirtuais &&
      filters.lojasVirtuais !== DEFAULT_TRAY_FILTERS.lojasVirtuais
    ) {
      params.set("loja", filters.lojasVirtuais);
    }

    if (currentPage > 1) params.set("page", String(currentPage));
    if (itemsPerPage !== 50) params.set("perPage", String(itemsPerPage));
    if (selectedLoja.length) params.set("lojas", selectedLoja.join(","));
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
    selectedLoja,
    selectedBrands,
    filters,
    sortColumn,
    sortDirection,
    router,
  ]);

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
        situacao: filters.situacao,
        tipo: filters.tipo,
      }),
    [
      currentPage,
      itemsPerPage,
      selectedLoja,
      selectedBrands,
      debouncedSearch,
      sortColumn,
      sortDirection,
      filters.situacao,
      filters.tipo,
    ]
  );

  const loadData = useCallback(async () => {
    const myReqId = ++reqIdRef.current;

    const cached = getCache(cacheKey);

    if (cached) {
      startTransition(() => {
        const safe = (cached.rows || []).filter(isValidRow);
        setRows(safe);
        setFilteredRows(safe);
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

    if (filters.tipo && filters.tipo !== "Todos") {
      if (filters.tipo === "Produtos") {
        query = query.ilike("Referência", "%PAI%");
      } else if (filters.tipo === "Produtos simples") {
        query = query
          .not("Referência", "ilike", "%PAI%")
          .not("Referência", "ilike", "%VAR%");
      } else if (filters.tipo === "Produtos com variações") {
        query = query.ilike("Referência", "%PAI%");
      } else if (filters.tipo === "Variações") {
        query = query.ilike("Referência", "%VAR%");
      }
    }

    if (debouncedSearch) {
      const tokens = parseSearchTokens(debouncedSearch);
      const orParts = buildOrSearchParts(tokens);

      if (orParts.length) query = query.or(orParts.join(","));
    }

    if (filters.situacao === "Últimos Incluídos") {
      query = query
        .order("ID", { ascending: false })
        .order("Atualizado em", { ascending: false })
        .order("id", { ascending: false });
    } else if (sortColumn) {
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
      console.error(
        "❌ Supabase error:",
        error.message,
        error.details,
        error.hint
      );

      setRows([]);
      setFilteredRows([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }

    const safeData = (data || []).filter(isValidRow);

    const normalized = safeData.map((r: any) => {
      let OD = 3;
      const ref = String(r.Referência || "").trim();

      if (ref.startsWith("PAI -")) OD = 1;
      else if (ref.startsWith("VAR -")) OD = 2;

      return {
        ...r,
        id: String(r.id),
        anuncio_id: r.anuncio_id,
        OD,
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

    setCache(cacheKey, {
      rows: normalized as any,
      totalItems: count || 0,
      savedAt: Date.now(),
    });

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
    filters.tipo,
    filters.situacao,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) void loadData();
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, loadData]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  const handleCopy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  const openEditor = useCallback(
    (row: Row, field: keyof Row, isMoney: boolean, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

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

    const newValNullable = parseBRNullable(value);
    const shouldRecalcPV = PREC_FIELDS.includes(field);

    let currentRow: any = rows.find((r: any) => String(r.id) === dbIdStr);

    if (!currentRow) {
      currentRow = rows.find((r: any) => String((r as any).ID) === dbIdStr);
    }

    if (!currentRow) {
      console.error("❌ Não encontrou linha para editar:", {
        dbIdStr,
        field,
        value,
      });

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
      const isSame =
        String((r as any).id) === dbIdStr ||
        String((r as any).ID) === dbIdStr;

      if (!isSame) return r;

      const updated: any = {
        ...(r as any),
        [field]: newValNullable,
      };

      if (shouldRecalcPV) {
        updated["Preço de Venda"] = calcPrecoVenda(updated);
      }

      newRowUpdated = updated as Row;
      return updated as Row;
    });

    setRows(updatedRows);
    setFilteredRows(updatedRows);
    setEditing(null);

    const cached = getCache(cacheKey);

    if (cached && newRowUpdated) {
      setCache(cacheKey, {
        ...cached,
        rows: cached.rows.map((r: any) => {
          const isSame =
            String((r as any).id) === dbIdStr ||
            String((r as any).ID) === dbIdStr;

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

    const payload: any = {
      [String(field)]: newValNullable,
    };

    if (shouldRecalcPV && newRowUpdated) {
      payload["Preço de Venda"] = (newRowUpdated as any)["Preço de Venda"];
    }

    try {
      const { data: upd1, error: err1 } = await supabase
        .from(table)
        .update(payload)
        .eq("id", dbIdStr)
        .select("id");

      if (err1) throw err1;

      if (!upd1?.length) {
        const fallbackID =
          (currentRow as any)?.ID ?? (newRowUpdated as any)?.ID;

        if (!fallbackID) {
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
          throw new Error("Nenhuma linha atualizada no fallback.");
        }
      }

      await createNotification({
        title: "Precificação Tray atualizada",
        message: `O campo "${String(field)}" do anúncio "${getTrayPricingLabel(
          currentRow,
          dbIdStr
        )}" foi atualizado.`,
        action: "update",
        entityType: "tray_pricing",
        entityId: String((currentRow as any)?.ID || dbIdStr),
        link: "/dashboard/marketplaces/tray",
      });
    } catch (e: any) {
      console.error("❌ Falha ao salvar. Revertendo UI.", e);
      alert("Erro ao salvar. Veja o console.");

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

  const handlePricingImport = useCallback(
    async (_data: any[]) => {
      setOpenPricingModal(false);
      clearTrayCache();
      await loadData();
    },
    [loadData]
  );

  const handleExportAll = useCallback(async () => {
    setExporting(true);

    try {
      await impExp.unlockAudio();

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
          .select(`
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
          `)
          .order("Atualizado em", { ascending: false })
          .order("id", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (selectedLoja.length) {
          exportQuery = exportQuery.in("Loja", selectedLoja);
        }

        if (selectedBrands.length) {
          exportQuery = exportQuery.in("Marca", selectedBrands);
        }

        if (filters.tipo && filters.tipo !== "Todos") {
          if (filters.tipo === "Produtos") {
            exportQuery = exportQuery.ilike("Referência", "%PAI%");
          } else if (filters.tipo === "Produtos simples") {
            exportQuery = exportQuery
              .not("Referência", "ilike", "%PAI%")
              .not("Referência", "ilike", "%VAR%");
          } else if (filters.tipo === "Produtos com variações") {
            exportQuery = exportQuery.ilike("Referência", "%PAI%");
          } else if (filters.tipo === "Variações") {
            exportQuery = exportQuery.ilike("Referência", "%VAR%");
          }
        }

        if (debouncedSearch) {
          const tokens = parseSearchTokens(debouncedSearch);
          const orParts = buildOrSearchParts(tokens);

          if (orParts.length) {
            exportQuery = exportQuery.or(orParts.join(","));
          }
        }

        const { data, error } = await exportQuery;

        if (error) throw error;
        if (!data?.length) break;

        all = all.concat(data);

        if (data.length < pageSize) break;

        page++;
      }

      all = all.filter(isValidRow);

      await impExp.handleExport(all);
    } catch (e) {
      console.error("ERRO EXPORT:", e);
      alert("Erro ao exportar. Veja o console.");
    } finally {
      setExporting(false);
    }
  }, [selectedLoja, selectedBrands, debouncedSearch, filters.tipo, impExp]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] p-0">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="fixed left-0 top-24 w-[220px] bg-[#0b0b0c]">
            <TrayFilters
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
            />
          </div>
        </aside>

        <section className="min-w-0 bg-[#0b0b0c]">
          <div className="px-3 py-4 lg:px-4">
            <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setOpenFiltersMobile(true)}
                className="flex h-11 items-center gap-2 rounded-full border border-neutral-700 bg-[#161616] px-4 text-sm font-medium text-white shadow-lg active:scale-[0.98]"
              >
                <SlidersHorizontal className="h-4 w-4 text-green-400" />
                Filtros
              </button>

              <button
                type="button"
                onClick={() => setOpenActionsMobile(true)}
                className="flex h-11 items-center gap-2 rounded-full border border-neutral-700 bg-[#161616] px-4 text-sm font-medium text-white shadow-lg active:scale-[0.98]"
              >
                <Menu className="h-4 w-4 text-green-400" />
                Ações
              </button>
            </div>

            <PricingHeaderTray
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <GlassmorphicCard className="overflow-hidden rounded-none border border-neutral-700 bg-[#101010] shadow-none border-t-0">
              <div className="w-full overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                <Table className="w-full table-fixed bg-transparent">
                  <TableBody>
                    <TableRows
                      rows={filteredRows}
                      loading={loading || isPending}
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

            <div className="mt-2 px-2 pb-24 lg:pb-4">
              <TableControls
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(totalItems / itemsPerPage))}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(n) => {
                  setItemsPerPage(n);
                  setCurrentPage(1);
                }}
                selectedCount={0}
              />
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:block">
          <div className="fixed right-5 top-23 w-[300px] bg-[#0b0b0c]">
            <TrayActionsSidebar
              exporting={exporting}
              onExport={handleExportAll}
              onImportOpen={() => setOpenPricingModal(true)}
              onMassEditOpen={() => setOpenPricingModal(true)}
              selectedCount={0}
              onDeleteSelected={() => {}}
              onClearSelection={() => {}}
            />
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setOpenActionsMobile(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[0_0_24px_rgba(34,197,94,0.35)] active:scale-95 lg:hidden"
        aria-label="Abrir ações"
      >
        <Menu className="h-6 w-6" />
      </button>

      {openFiltersMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenFiltersMobile(false)}
            aria-label="Fechar filtros"
          />

          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto border-r border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-[#0b0b0c] px-4 py-4">
              <div>
                <p className="text-sm text-neutral-400">Refinar busca</p>
                <h2 className="text-lg font-semibold text-white">Filtros</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpenFiltersMobile(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white active:scale-95"
                aria-label="Fechar filtros"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <TrayFilters
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
            />
          </div>
        </div>
      )}

      {openActionsMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenActionsMobile(false)}
            aria-label="Fechar ações"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0b0b0c] px-4 py-4">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-400">Central de ações</p>
                  <h2 className="text-lg font-semibold text-white">Ações</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenActionsMobile(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white active:scale-95"
                  aria-label="Fechar ações"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <TrayActionsSidebar
                exporting={exporting}
                onExport={() => {
                  setOpenActionsMobile(false);
                  handleExportAll();
                }}
                onImportOpen={() => {
                  setOpenActionsMobile(false);
                  setOpenPricingModal(true);
                }}
                onMassEditOpen={() => {
                  setOpenActionsMobile(false);
                  setOpenPricingModal(true);
                }}
                selectedCount={0}
                onDeleteSelected={() => {}}
                onClearSelection={() => {}}
              />
            </div>
          </div>
        </div>
      )}

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
                setEditing((prev: any) =>
                  prev ? { ...prev, value: e.target.value } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmEdit();
                if (e.key === "Escape") cancelEdit();
              }}
            />

            <div className="absolute right-1 flex items-center gap-1">
              <button
                type="button"
                title="Cancelar"
                onClick={cancelEdit}
                className="cursor-pointer text-red-400 hover:text-red-300"
              >
                <XIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Confirmar"
                onClick={confirmEdit}
                className="cursor-pointer text-green-400 hover:text-green-300"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </FloatingEditor>
      )}
    </div>
  );
}