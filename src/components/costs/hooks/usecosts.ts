"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { exportFilteredToXlsx } from "@/components/costs/helpers/Exportcosts";
import { exportRenameCodesToXlsx } from "@/components/costs/helpers/Exportrenamecodes";
import {
  importFromXlsxOrCsv,
  importRenomeacaoCodigosFromXlsxOrCsv,
} from "@/components/costs/helpers/Importcosts";
import { playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";
import { createRule } from "@/components/costs/hooks/usepricingrules";
import { applyCostSituacao } from "@/components/costs/hooks/applycostsituacao";

import {
  CostFilters as CostFiltersType,
  Custo,
  DEFAULT_COST_FILTERS,
  ORDER_OPTIONS,
  OrderOption,
  SITUACAO_OPTIONS,
  Situacao,
  ApplyPayload,
  ApplyResult,
} from "@/components/costs/hooks/types";
// Tipo do formulário do modal (chaves em inglês) — renomeado para não
// colidir com o tipo `Custo` (chaves em português) usado na tabela/linhas.
import type { Custo as CustoForm } from "@/components/costs/Newcost";
import {
  getCostKey,
  parseArrayParam,
  parsePositiveInt,
  parseSearchTokens,
  sanitizeTerm,
} from "@/components/costs/hooks/utils";

// getCostKey agora vem de utils.ts; reexportada para quem já importava daqui
export { getCostKey };

const SCHEMA = "newsystem";

export type RenameCodePreviewItem = {
  linha?: number;
  codigo_antigo: string;
  codigo_novo: string;
};

const splitByComma = (value: string): string[] =>
  value
    .split(",")
    .map((v) => sanitizeTerm(v))
    .filter(Boolean);

// Valida o valor vindo da URL contra as opções reais de Situação
const parseSituacao = (value: string | null): Situacao =>
  (SITUACAO_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as Situacao)
    : DEFAULT_COST_FILTERS.situacao;

// Valida a ordenação vinda da URL contra as opções oficiais.
// `null` = ordenação padrão (por código) ou ordenação por coluna.
const parseOrdem = (value: string | null): OrderOption | null =>
  (ORDER_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as OrderOption)
    : null;

// --- Mapeamento DB (inglês, tabela "costs") <-> UI (português) ---
const mapRowToUI = (row: any): Custo => ({
  id: row.id ?? "",
  code: row.code ?? "",
  ["Código"]: row.code ?? "",
  ["Marca"]: row.mark ?? "",
  ["Produto"]: row.product ?? "",
  ["Custo Atual"]: row.current_cost ?? "",
  ["Custo Antigo"]: row.previous_cost ?? "",
  ["NCM"]: row.ncm ?? "",
  current_cost: typeof row.current_cost === "number" ? row.current_cost : null,
  previous_cost: typeof row.previous_cost === "number" ? row.previous_cost : null,
  packaging_cost: typeof row.packaging_cost === "number" ? row.packaging_cost : null,
  // Necessário para o badge "Novo" (CostDataTable lê created_at)
  created_at: row.created_at ?? null,
  active: typeof row.active === "boolean" ? row.active : true,
  deleted_at: row.deleted_at ?? null,
});

// Formata um número (ou null) em string BR para o input de custo do modal
const formatCostForForm = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2).replace(".", ",");
};

// Formata o NCM (dígitos puros vindos do banco) com máscara para o modal
const formatNcmForForm = (raw: unknown): string => {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
};

// --- Mapeamento Custo (linha da tabela, português) -> CustoForm (modal, inglês) ---
const mapRowToForm = (row: Custo): CustoForm => ({
  code: row.code ?? row["Código"] ?? "",
  mark: row["Marca"] ?? "",
  product: row["Produto"] ?? "",
  current_cost: formatCostForForm(row.current_cost ?? row["Custo Atual"]),
  previous_cost: formatCostForForm(row.previous_cost ?? row["Custo Antigo"]),
  ncm: formatNcmForForm(row["NCM"]),
});

const EMPTY_FORM: CustoForm = {
  code: "",
  mark: "",
  product: "",
  current_cost: "",
  previous_cost: "",
  ncm: "",
};

const SORT_FIELD_MAP: Record<string, string> = {
  ["Código"]: "code",
  ["Marca"]: "mark",
  ["Produto"]: "product",
  ["Custo Atual"]: "current_cost",
  ["Custo Antigo"]: "previous_cost",
  ["NCM"]: "ncm",
};

const PAGE_SIZE_BULK = 1000;
const SELECTION_WARN_LIMIT = 5000;
const LIVERPOOL_DISCOUNT_RATE = 23;

// Converte string BR ("12,50") em number para enviar ao Supabase
const parseDecimalToNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
};

const isLiverpoolBrand = (mark: string) =>
  String(mark || "").trim().toLowerCase() === "liverpool";

/* ─────────────────────────────────────────────
 * QUERY BUILDER — puro, sem depender de closures do hook.
 * Reaproveitado por: useQuery principal, fetchAllRows, exportações, seleção.
 * A Situação é aplicada aqui, em um único lugar, para que listagem,
 * count, seleção e exportação respondam sempre o mesmo conjunto de IDs.
 * A Ordem (ex.: "Últimos Incluídos") é independente da Situação.
 * ───────────────────────────────────────────── */

type CostsQueryParams = {
  appliedFilters: CostFiltersType;
  appliedSelectedBrands: string[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  ordem: OrderOption | null;
};

function buildCostsQuery(query: any, params: CostsQueryParams) {
  const { appliedFilters, appliedSelectedBrands, sortColumn, sortDirection, ordem } =
    params;

  // Situação (Todos / Ativos / Inativos / Excluídos) — filtro único
  query = applyCostSituacao(query, appliedFilters.situacao);

  if (appliedFilters.codigo.trim()) {
    const tokens = splitByComma(appliedFilters.codigo);
    const parts = tokens.map(
      (t) => `code.ilike."%${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
    );

    if (parts.length === 1) {
      query = query.ilike("code", `%${tokens[0]}%`);
    } else if (parts.length > 1) {
      query = query.or(parts.join(","));
    }
  }

  if (appliedFilters.produto.trim()) {
    const tokens = parseSearchTokens(appliedFilters.produto);
    const parts = tokens.map(
      (t) =>
        `product.ilike."%${String(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
    );

    if (parts.length === 1) {
      query = query.ilike("product", `%${tokens[0]}%`);
    } else if (parts.length > 1) {
      query = query.or(parts.join(","));
    }
  }

  if (appliedSelectedBrands.length) {
    query = query.in("mark", appliedSelectedBrands);
  }

  if (appliedFilters.marca.trim()) {
    const marcaTerms = splitByComma(appliedFilters.marca);
    const marcaParts = marcaTerms.map(
      (t) => `mark.ilike."%${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
    );

    if (marcaParts.length === 1) {
      query = query.ilike("mark", `%${marcaTerms[0]}%`);
    } else if (marcaParts.length > 1) {
      query = query.or(marcaParts.join(","));
    }
  }

  if (appliedFilters.ncm === "Com NCM") {
    query = query.not("ncm", "is", null).neq("ncm", "");
  } else if (appliedFilters.ncm === "Sem NCM") {
    query = query.or('ncm.is.null,ncm.eq.""');
  }

  // Ordenação: "Últimos Incluídos" tem precedência sobre a ordenação por coluna.
  // `id` como critério secundário torna a paginação estável (sem linhas repetidas
  // ou perdidas entre páginas quando há empate no critério principal).
  if (ordem === "Últimos Incluídos") {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  } else if (sortColumn) {
    const dbColumn = SORT_FIELD_MAP[sortColumn] || sortColumn;
    query = query
      .order(dbColumn, { ascending: sortDirection === "asc" })
      .order("id", { ascending: true });
  } else {
    query = query
      .order("code", { ascending: true })
      .order("id", { ascending: true });
  }

  return query;
}

// Base sem filtro de situação: quem decide Ativos/Inativos/Excluídos/Todos
// é applyCostSituacao, dentro de buildCostsQuery.
function baseCostsQuery(countOnly: boolean) {
  return supabase
    .schema(SCHEMA)
    .from("costs")
    .select("*", { count: "exact", head: countOnly });
}

/* ─────────────────────────────────────────────
 * SERIALIZAÇÃO DE FILTROS — chave estável para o queryKey
 * ───────────────────────────────────────────── */

function buildFiltersKey(params: CostsQueryParams) {
  return JSON.stringify({
    codigo: params.appliedFilters.codigo.trim(),
    marca: params.appliedFilters.marca.trim(),
    produto: params.appliedFilters.produto.trim(),
    ncm: params.appliedFilters.ncm,
    situacao: params.appliedFilters.situacao,
    brands: params.appliedSelectedBrands.slice().sort(),
    sortColumn: params.sortColumn,
    sortDirection: params.sortDirection,
    ordem: params.ordem,
  });
}

/* ─────────────────────────────────────────────
 * FETCH FUNCTION — usada pelo React Query
 * ───────────────────────────────────────────── */

type FetchResult = { rows: Custo[]; totalCount: number };

async function fetchCostsPage(
  params: CostsQueryParams,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<FetchResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let countQuery = baseCostsQuery(true);
  let dataQuery = baseCostsQuery(false);

  if (signal) {
    countQuery = countQuery.abortSignal(signal);
    dataQuery = dataQuery.abortSignal(signal);
  }

  countQuery = buildCostsQuery(countQuery, params);
  dataQuery = buildCostsQuery(dataQuery, params).range(from, to);

  const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);

  if (countRes.error) throw countRes.error;
  if (dataRes.error) throw dataRes.error;

  return {
    rows: (dataRes.data || []).map(mapRowToUI),
    totalCount: countRes.count || 0,
  };
}

export function useCosts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialCodigo = searchParams.get("codigo") ?? "";
  const initialMarca = searchParams.get("marca") ?? "";
  const initialProduto = searchParams.get("produto") ?? "";
  const initialSituacao = parseSituacao(searchParams.get("situacao"));
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";
  const initialNcm = searchParams.get("ncm") ?? "";
  const initialOrdem = parseOrdem(searchParams.get("ordem"));

  const [exporting, setExporting] = useState(false);
  const [renamingCodes, setRenamingCodes] = useState(false);
  const [applyingAdjustments, setApplyingAdjustments] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);
  const [applyingFilters, setApplyingFilters] = useState(false);

  const [exportProgressOpen, setExportProgressOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportProgressCount, setExportProgressCount] = useState(0);

  const cancelExportRef = useRef(false);

  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [filters, setFilters] = useState<CostFiltersType>({
    ...DEFAULT_COST_FILTERS,
    situacao: initialSituacao,
    codigo: initialCodigo,
    marca: initialMarca,
    produto: initialProduto,
    ncm: initialNcm || DEFAULT_COST_FILTERS.ncm,
  });

  const [appliedSelectedBrands, setAppliedSelectedBrands] =
    useState<string[]>(initialBrands);
  const [appliedFilters, setAppliedFilters] = useState<CostFiltersType>({
    ...DEFAULT_COST_FILTERS,
    situacao: initialSituacao,
    codigo: initialCodigo,
    marca: initialMarca,
    produto: initialProduto,
    ncm: initialNcm || DEFAULT_COST_FILTERS.ncm,
  });

  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  // Ordem (ex.: "Últimos Incluídos"): separada da Situação e da ordenação por coluna
  const [ordem, setOrdem] = useState<OrderOption | null>(initialOrdem);

  const [openNew, setOpenNew] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<CustoForm>({ ...EMPTY_FORM });

  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importTipo, setImportTipo] = useState<"inclusao" | "alteracao">(
    "inclusao"
  );

  const [openRenamePreview, setOpenRenamePreview] = useState(false);
  const [renameRows, setRenameRows] = useState<RenameCodePreviewItem[]>([]);
  const [renameWarnings, setRenameWarnings] = useState<string[]>([]);
  const [renameErrors, setRenameErrors] = useState<string[]>([]);
  const [renameFileName, setRenameFileName] = useState("");

  const [selectedRows, setSelectedRows] = useState<Custo[]>([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [openAdjustments, setOpenAdjustments] = useState(false);

  const [editing, setEditing] = useState<{
    codigo: string;
    field: "Custo Atual" | "Custo Antigo";
    value: string;
    anchorRect: DOMRect;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [openFiltersMobile, setOpenFiltersMobile] = useState(false);
  const [openActionsMobile, setOpenActionsMobile] = useState(false);

  const [selectingAll, setSelectingAll] = useState(false);

  /* ── syncUrl — definido ANTES dos callbacks que o utilizam ──── */
  const syncUrl = useCallback(
    (params: {
      situacao: Situacao;
      codigo: string;
      marca: string;
      produto: string;
      ncm: string;
      page: number;
      perPage: number;
      brands: string[];
      sortColumn: string | null;
      sortDirection: "asc" | "desc";
      ordem: OrderOption | null;
    }) => {
      const usp = new URLSearchParams();

      if (params.situacao !== DEFAULT_COST_FILTERS.situacao) {
        usp.set("situacao", params.situacao);
      }
      if (params.codigo !== "") usp.set("codigo", params.codigo);
      if (params.marca !== "") usp.set("marca", params.marca);
      if (params.produto !== "") usp.set("produto", params.produto);
      if (params.ncm && params.ncm !== "Todos") usp.set("ncm", params.ncm);
      if (params.page > 1) usp.set("page", String(params.page));
      if (params.perPage !== 50) usp.set("perPage", String(params.perPage));
      if (params.brands.length) usp.set("brands", params.brands.join(","));
      if (params.ordem) usp.set("ordem", params.ordem);
      if (params.sortColumn) usp.set("sortColumn", params.sortColumn);

      if (params.sortColumn && params.sortDirection !== "asc") {
        usp.set("sortDirection", params.sortDirection);
      }

      const nextUrl = usp.toString() ? `?${usp.toString()}` : "?";

      router.replace(nextUrl, { scroll: false });
    },
    [router]
  );

  /* ── Chave de filtros estável (queryKey do React Query) ────── */
  const queryParams: CostsQueryParams = useMemo(
    () => ({
      appliedFilters,
      appliedSelectedBrands,
      sortColumn,
      sortDirection,
      ordem,
    }),
    [appliedFilters, appliedSelectedBrands, sortColumn, sortDirection, ordem]
  );

  const filtersKey = useMemo(() => buildFiltersKey(queryParams), [queryParams]);

  const queryKey = useMemo(
    () => ["costs", filtersKey, currentPage, itemsPerPage] as const,
    [filtersKey, currentPage, itemsPerPage]
  );

  /* ── QUERY principal — cache, dedupe, abort, retry ──────────── */
  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchQuery,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      fetchCostsPage(queryParams, currentPage, itemsPerPage, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: (failureCount, err: any) => {
      const msg = String(err?.message || "");
      const isNetworkError = msg.includes("Failed to fetch") || msg.includes("network");
      return isNetworkError && failureCount < 2;
    },
  });

  const rows = data?.rows ?? [];
  const totalItems = data?.totalCount ?? 0;
  const loading = isLoading || isFetching;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  /* ── Prefetch preditivo da próxima página ───────────────────── */
  useEffect(() => {
    if (currentPage >= totalPages) return;
    const nextKey = ["costs", filtersKey, currentPage + 1, itemsPerPage] as const;
    queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: () => fetchCostsPage(queryParams, currentPage + 1, itemsPerPage),
      staleTime: 30_000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, currentPage, itemsPerPage, totalPages]);

  /* ── loadData — compatibilidade: import, delete, ajustes e rename chamam await loadData() ── */
  const loadData = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      if (page !== currentPage) setCurrentPage(page);
      if (limit !== itemsPerPage) setItemsPerPage(limit);
      await refetchQuery();
    },
    [currentPage, itemsPerPage, refetchQuery]
  );

  /**
   * Atualiza a seleção sem efeitos colaterais dentro do updater.
   * Linhas sem chave válida são descartadas; duplicatas são removidas por chave.
   */
  const setSelectedRowsUnique = useCallback(
    (updater: React.SetStateAction<Custo[]>) => {
      setSelectedRows((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (prevState: Custo[]) => Custo[])(prev)
            : updater;

        const map = new Map<string, Custo>();

        next.forEach((row) => {
          const key = getCostKey(row);
          if (key !== null) map.set(key, row);
        });

        return Array.from(map.values());
      });
    },
    []
  );

  // Aviso de seleção grande: feito por efeito, não dentro do setState
  const warnedSelectionRef = useRef(false);
  useEffect(() => {
    if (selectedRows.length > SELECTION_WARN_LIMIT) {
      if (!warnedSelectionRef.current) {
        warnedSelectionRef.current = true;
        toastCustom.warning(
          "Seleção muito grande",
          `Você selecionou mais de ${SELECTION_WARN_LIMIT} registros. Isso pode deixar a exportação lenta.`
        );
      }
    } else {
      warnedSelectionRef.current = false;
    }
  }, [selectedRows.length]);

  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedRows
          .map((row) => getCostKey(row))
          .filter((key): key is string => key !== null)
      ),
    [selectedRows]
  );

  const currentPageKeys = useMemo(
    () =>
      rows
        .map((row) => getCostKey(row))
        .filter((key): key is string => key !== null),
    [rows]
  );

  const allSelected =
    rows.length > 0 &&
    currentPageKeys.length > 0 &&
    currentPageKeys.every((key) => selectedKeys.has(key));

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowsUnique((prev) => [...prev, ...rows]);
        return;
      }

      setSelectedRows((prev) => {
        const pageKeys = new Set(currentPageKeys);
        return prev.filter((row) => {
          const key = getCostKey(row);
          return key === null ? true : !pageKeys.has(key);
        });
      });
    },
    [rows, currentPageKeys, setSelectedRowsUnique]
  );

  const handleCopy = useCallback((text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  /**
   * Ordenação por coluna: ciclo asc → desc → padrão.
   * Clicar em uma coluna desfaz a ordem "Últimos Incluídos".
   */
  const handleSortColumn = useCallback(
    (column: string) => {
      setOrdem(null);

      if (sortColumn !== column) {
        setSortColumn(column);
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }

      setCurrentPage(1);
    },
    [sortColumn, sortDirection]
  );

  /**
   * Altera a ordem (ex.: "Últimos Incluídos" ou `null` para padrão).
   * Não mexe na Situação nem nos filtros aplicados.
   */
  const handleOrdemChange = useCallback(
    (value: OrderOption | null) => {
      setOrdem(value);
      setCurrentPage(1);

      syncUrl({
        situacao: appliedFilters.situacao,
        codigo: appliedFilters.codigo,
        marca: appliedFilters.marca,
        produto: appliedFilters.produto,
        ncm: appliedFilters.ncm,
        page: 1,
        perPage: itemsPerPage,
        brands: appliedSelectedBrands,
        sortColumn,
        sortDirection,
        ordem: value,
      });
    },
    [appliedFilters, appliedSelectedBrands, itemsPerPage, sortColumn, sortDirection, syncUrl]
  );

  /**
   * Altera a Situação: atualiza filtros aplicados, volta para a página 1 e
   * sincroniza a URL. A seleção é mantida (chaves são estáveis).
   */
  const handleSituacaoChange = useCallback(
    (value: Situacao) => {
      setFilters((prev) => ({ ...prev, situacao: value }));
      setAppliedFilters((prev) => ({ ...prev, situacao: value }));
      setCurrentPage(1);

      syncUrl({
        situacao: value,
        codigo: appliedFilters.codigo,
        marca: appliedFilters.marca,
        produto: appliedFilters.produto,
        ncm: appliedFilters.ncm,
        page: 1,
        perPage: itemsPerPage,
        brands: appliedSelectedBrands,
        sortColumn,
        sortDirection,
        ordem,
      });
    },
    [appliedFilters, appliedSelectedBrands, itemsPerPage, sortColumn, sortDirection, ordem, syncUrl]
  );

  const loadAllBrands = useCallback(async () => {
    const { data, error } = await supabase
      .schema(SCHEMA)
      .rpc("get_distinct_marks");

    if (error) {
      console.error("Erro ao carregar marcas:", error);
      toastCustom.error(
        "Erro ao carregar marcas",
        "Não foi possível carregar a lista de marcas."
      );
      return;
    }

    const brands = (data || [])
      .map((r: any) => String(r.mark ?? "").trim())
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));

    setAllBrands(brands);
  }, []);

  /* ── buildQuery — para bulk fetch e exportações ─────────────── */
  const buildQuery = useCallback(
    (countOnly = false) => {
      const base = baseCostsQuery(countOnly);
      return buildCostsQuery(base, {
        appliedFilters,
        appliedSelectedBrands,
        sortColumn,
        sortDirection,
        ordem,
      });
    },
    [appliedSelectedBrands, appliedFilters, sortColumn, sortDirection, ordem]
  );

  // Usado por seleção em massa e exportação: respeita a Situação via buildCostsQuery
  const fetchAllRows = useCallback(async (): Promise<Custo[]> => {
    const countRes = await buildQuery(true);
    if (countRes.error) throw countRes.error;

    const total = countRes.count || 0;
    if (total === 0) return [];

    const pages = Math.ceil(total / PAGE_SIZE_BULK);

    const requests = Array.from({ length: pages }, (_, i) => {
      const from = i * PAGE_SIZE_BULK;
      const to = from + PAGE_SIZE_BULK - 1;
      return buildQuery(false).range(from, to);
    });

    const results = await Promise.all(requests);

    for (const r of results) {
      if (r.error) throw r.error;
    }

    return results.flatMap((r) => (r.data || []).map(mapRowToUI));
  }, [buildQuery]);

  const handleSelectAllFiltered = useCallback(async () => {
    if (selectingAll) return;

    setSelectingAll(true);

    try {
      const allRows = await fetchAllRows();
      setSelectedRowsUnique(allRows);

      toastCustom.success(
        "Seleção concluída!",
        `${allRows.length} produto(s) selecionado(s).`
      );
    } catch (err: any) {
      toastCustom.error(
        "Erro ao selecionar todos",
        err?.message || "Falha ao buscar os registros."
      );
    } finally {
      setSelectingAll(false);
    }
  }, [selectingAll, fetchAllRows, setSelectedRowsUnique]);

  useEffect(() => {
    const urlSituacao = parseSituacao(searchParams.get("situacao"));
    const urlCodigo = searchParams.get("codigo") ?? "";
    const urlMarca = searchParams.get("marca") ?? "";
    const urlProduto = searchParams.get("produto") ?? "";
    const urlNcm = searchParams.get("ncm") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlOrdem = parseOrdem(searchParams.get("ordem"));
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setCurrentPage(urlPage);
    setItemsPerPage(urlPerPage);

    setSelectedBrands(urlBrands);
    setAppliedSelectedBrands(urlBrands);

    setOrdem(urlOrdem);
    setSortColumn(urlSortColumn);
    setSortDirection(urlSortDirection);

    setFilters((prev) => ({
      ...prev,
      situacao: urlSituacao,
      codigo: urlCodigo,
      marca: urlMarca,
      produto: urlProduto,
      ncm: urlNcm || prev.ncm,
    }));
    setAppliedFilters((prev) => ({
      ...prev,
      situacao: urlSituacao,
      codigo: urlCodigo,
      marca: urlMarca,
      produto: urlProduto,
      ncm: urlNcm || prev.ncm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAllBrands();
  }, [loadAllBrands]);

  /**
   * Aplica filtros ao estado e à URL. A seleção é mantida, salvo quando
   * `resetSelection` for true (usado ao limpar filtros).
   */
  const applyFilterState = useCallback(
    (
      next: {
        situacao?: Situacao;
        codigo: string;
        marca: string;
        produto: string;
        brands: string[];
        ncm?: string;
      },
      resetSelection: boolean = false
    ) => {
      const nextSituacao = next.situacao ?? filters.situacao;

      setAppliedSelectedBrands(next.brands);
      setAppliedFilters((prev) => ({
        ...prev,
        situacao: nextSituacao,
        codigo: next.codigo,
        marca: next.marca,
        produto: next.produto,
        ncm: next.ncm ?? prev.ncm,
      }));

      if (resetSelection) {
        setSelectedRows([]);
      }

      setCurrentPage(1);

      syncUrl({
        situacao: nextSituacao,
        codigo: next.codigo,
        marca: next.marca,
        produto: next.produto,
        ncm: next.ncm ?? filters.ncm,
        page: 1,
        perPage: itemsPerPage,
        brands: next.brands,
        sortColumn,
        sortDirection,
        ordem,
      });
    },
    [filters.situacao, filters.ncm, itemsPerPage, sortColumn, sortDirection, ordem, syncUrl]
  );

  const handleApplyFilters = useCallback(async () => {
    if (applyingFilters) return;

    setApplyingFilters(true);

    try {
      applyFilterState({
        situacao: filters.situacao,
        codigo: filters.codigo,
        marca: filters.marca,
        produto: filters.produto,
        brands: selectedBrands,
        ncm: filters.ncm,
      });

      setOpenFiltersMobile(false);
    } finally {
      setTimeout(() => setApplyingFilters(false), 300);
    }
  }, [applyingFilters, applyFilterState, filters, selectedBrands]);

  const handleClearFilters = useCallback(() => {
    setSelectedBrands([]);
    setFilters({ ...DEFAULT_COST_FILTERS });

    applyFilterState(
      {
        situacao: DEFAULT_COST_FILTERS.situacao,
        codigo: "",
        marca: "",
        produto: "",
        brands: [],
        ncm: DEFAULT_COST_FILTERS.ncm,
      },
      true
    );

    setOpenFiltersMobile(false);
  }, [applyFilterState]);

  const handleExport = useCallback(async () => {
    const now = new Date();
    const date = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const time = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");

    const brandTag =
      appliedSelectedBrands.length > 0
        ? appliedSelectedBrands
            .map((b) => String(b).trim().substring(0, 3).toUpperCase())
            .filter(Boolean)
            .join("-")
        : "";

    const fileName = `CUSTOS - ${
      brandTag ? `${brandTag}-` : ""
    }RELATÓRIO - ${date} ${time}.xlsx`;

    cancelExportRef.current = false;
    setExporting(true);
    setExportProgress(0);
    setExportProgressOpen(true);

    try {
      // Sem seleção, exporta o conjunto filtrado (inclui a Situação aplicada)
      const rowsToExport =
        selectedRows.length > 0 ? (selectedRows as Custo[]) : await fetchAllRows();

      if (cancelExportRef.current) return;

      setExportProgressCount(rowsToExport.length);

      await exportFilteredToXlsx(rowsToExport, fileName, (percent) => {
        if (cancelExportRef.current) {
          throw new Error("__EXPORT_CANCELLED__");
        }
        setExportProgress(percent);
      });

      if (!cancelExportRef.current) {
        toastCustom.success(
          "Exportação concluída!",
          `${rowsToExport.length} custo(s) exportado(s).`
        );
      }
    } catch (err: any) {
      if (err?.message !== "__EXPORT_CANCELLED__") {
        toastCustom.error(
          "Erro ao exportar",
          err?.message || "Falha ao gerar o arquivo."
        );
      }
    } finally {
      setExporting(false);
      if (!cancelExportRef.current) {
        setTimeout(() => setExportProgressOpen(false), 1200);
      }
    }
  }, [appliedSelectedBrands, selectedRows, fetchAllRows]);

  /* ── Modelos de planilha (inclusão / alteração) ─────────────── */
  const buildModeloWorkbook = useCallback(
    async (sheetName: string, exampleNewCost: string) => {
      const XLSX = await import("xlsx-js-style");

      const headers = [
        "Código",
        "Marca",
        "Produto",
        "Custo Atual",
        "Custo Antigo",
        "NCM",
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers]);

      const style = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1A8CEB" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      headers.forEach((_, idx) => {
        const cell = XLSX.utils.encode_cell({ r: 0, c: idx });
        (ws as any)[cell] = (ws as any)[cell] || {};
        (ws as any)[cell].s = style;
      });

      (ws as any)["!cols"] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 34 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
      ];

      XLSX.utils.sheet_add_aoa(
        ws,
        [["12345", "Liverpool", "Baqueta 7A Liverpool", exampleNewCost, "240.00", "851821"]],
        { origin: -1 }
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      return { XLSX, wb };
    },
    []
  );

  const handleExportModeloInclusao = useCallback(async () => {
    try {
      const { XLSX, wb } = await buildModeloWorkbook("Inclusão", "250.00");

      const now = new Date();
      const nomeArquivo = `INCLUSÃO - ${now
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")} ${now
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-")}.xlsx`;

      XLSX.writeFile(wb, nomeArquivo);

      toastCustom.success("Modelo exportado!", "Download iniciado.");
    } catch (err: any) {
      toastCustom.error(
        "Erro ao exportar modelo de inclusão",
        err?.message || "Falha ao gerar o arquivo."
      );
    }
  }, [buildModeloWorkbook]);

  const handleExportModeloAlteracao = useCallback(async () => {
    try {
      const { XLSX, wb } = await buildModeloWorkbook("Alteração", "260.00");

      const now = new Date();
      const nomeArquivo = `ALTERAÇÃO - ${now
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")} ${now
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-")}.xlsx`;

      XLSX.writeFile(wb, nomeArquivo);

      toastCustom.success("Modelo exportado!", "Download iniciado.");
    } catch (err: any) {
      toastCustom.error(
        "Erro ao exportar modelo de alteração",
        err?.message || "Falha ao gerar o arquivo."
      );
    }
  }, [buildModeloWorkbook]);

  const getRowsForRenameExport = useCallback(async () => {
    if (selectedRows.length > 0) return selectedRows;
    return fetchAllRows();
  }, [selectedRows, fetchAllRows]);

  const handleExportRenomeacaoCodigos = useCallback(async () => {
    cancelExportRef.current = false;
    setExporting(true);
    setExportProgress(0);
    setExportProgressOpen(true);

    try {
      const exportRows = await getRowsForRenameExport();

      if (cancelExportRef.current) return;

      if (!exportRows.length) {
        throw new Error("Nenhum custo encontrado.");
      }

      setExportProgressCount(exportRows.length);

      const now = new Date();
      const fileName = `RENOMEAÇÃO DE CÓDIGOS - ${now
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")} ${now
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-")}.xlsx`;

      await exportRenameCodesToXlsx(exportRows, fileName, (percent) => {
        if (cancelExportRef.current) {
          throw new Error("__EXPORT_CANCELLED__");
        }
        setExportProgress(percent);
      });

      if (!cancelExportRef.current) {
        toastCustom.success(
          "Planilha exportada!",
          `${exportRows.length} custo(s). Preencha a coluna Novo Código.`
        );
      }
    } catch (err: any) {
      if (err?.message !== "__EXPORT_CANCELLED__") {
        toastCustom.error(
          "Erro ao exportar renomeações",
          err?.message || "Falha ao gerar a planilha."
        );
      }
    } finally {
      setExporting(false);
      if (!cancelExportRef.current) {
        setTimeout(() => setExportProgressOpen(false), 1200);
      }
    }
  }, [getRowsForRenameExport]);

  const handleImportRenomeacaoCodigos = useCallback(
    async (file: File) => {
      if (renamingCodes) return;

      try {
        toastCustom.message("Lendo planilha...", "Validando as renomeações.");

        const previewResult = await importRenomeacaoCodigosFromXlsxOrCsv(file, true);

        const renomeacoes = previewResult.data.map((item, index) => ({
          ...item,
          linha: index + 2,
        }));

        setRenameRows(renomeacoes);
        setRenameWarnings((previewResult as any).warnings || []);
        setRenameErrors([]);
        setRenameFileName(file.name);
        setOpenRenamePreview(true);
      } catch (err: any) {
        toastCustom.error(
          "Erro ao ler renomeações",
          err?.message || "Falha no processamento da planilha."
        );
      }
    },
    [renamingCodes]
  );

  const confirmRenomeacaoCodigos = useCallback(async () => {
    if (!renameRows.length || renamingCodes) return;

    setRenamingCodes(true);
    setRenameErrors([]);

    try {
      toastCustom.message(
        "Renomeando códigos...",
        "Atualizando custos, anúncios e composições."
      );

      const result = await importRenomeacaoCodigosFromXlsxOrCsv(renameRows, false);

      setSelectedRows([]);

      await Promise.all([loadData(currentPage, itemsPerPage), loadAllBrands()]);

      playImportSuccessSound(0.4);

      toastCustom.success(
        "Renomeação concluída!",
        `${result.data.length} código(s) processado(s) e ${
          result.recalculosProcessados ?? 0
        } recálculo(s) concluído(s).`
      );

      setOpenRenamePreview(false);
      setRenameRows([]);
      setRenameWarnings([]);
      setRenameErrors([]);
      setRenameFileName("");
    } catch (err: any) {
      const message = err?.message || "Falha no processamento da planilha.";
      setRenameErrors([message]);
      toastCustom.error("Erro ao renomear códigos", message);
    } finally {
      setRenamingCodes(false);
    }
  }, [renameRows, renamingCodes, loadData, currentPage, itemsPerPage, loadAllBrands]);

  const openCreate = useCallback(() => {
    setMode("create");
    setForm({ ...EMPTY_FORM });
    setOpenNew(true);
  }, []);

  const openEdit = useCallback((row: Custo) => {
    setMode("edit");
    setForm(mapRowToForm(row));
    setOpenNew(true);
  }, []);

  const openCostEditor = useCallback(
    (
      row: Custo,
      e: React.MouseEvent,
      field: "Custo Atual" | "Custo Antigo" = "Custo Atual"
    ) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      setEditing({
        codigo: row["Código"],
        field,
        value: String(row[field] ?? ""),
        anchorRect: rect,
      });
    },
    []
  );

  /**
   * Edição inline de custo com optimistic update. Atualiza tanto o campo
   * textual em português quanto o numérico (current_cost / previous_cost),
   * para que a UI e os cálculos fiquem consistentes antes do refetch.
   */
  const confirmCostEdit = useCallback(async () => {
    if (!editing || savingEdit) return;

    setSavingEdit(true);

    const { codigo, field } = editing;
    const novoValor = editing.value.trim();

    const dbField = field === "Custo Atual" ? "current_cost" : "previous_cost";
    const numericValue = novoValor === "" ? null : parseDecimalToNumber(novoValor);

    const previousData = queryClient.getQueriesData<FetchResult>({
      queryKey: ["costs"],
      exact: false,
    });

    queryClient.setQueriesData<FetchResult>(
      { queryKey: ["costs"], exact: false },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((r) =>
            r["Código"] === codigo
              ? {
                  ...r,
                  [field]: numericValue ?? "",
                  [dbField]: numericValue,
                }
              : r
          ),
        };
      }
    );

    setEditing(null);

    try {
      const { error } = await supabase
        .schema(SCHEMA)
        .from("costs")
        .update({ [dbField]: numericValue })
        .eq("code", codigo)
        .is("deleted_at", null);

      if (error) throw error;

      toastCustom.success("Custo atualizado!", "Alteração salva com sucesso.");
    } catch (err: any) {
      // rollback
      previousData.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });

      toastCustom.error(
        "Erro ao atualizar custo",
        err?.message || "Falha ao salvar alteração."
      );
    } finally {
      setSavingEdit(false);
      queryClient.invalidateQueries({ queryKey: ["costs"], exact: false });
    }
  }, [editing, savingEdit, queryClient]);

  const cancelCostEdit = useCallback(() => {
    if (savingEdit) return;
    setEditing(null);
  }, [savingEdit]);

  const saveForm = useCallback(async () => {
    await Promise.all([loadData(), loadAllBrands()]);
  }, [loadData, loadAllBrands]);

  /**
   * Exclusão em duas etapas, decidida por linha:
   * - Ativo ou inativo (deleted_at nulo): SOFT DELETE.
   * - Já em "Excluídos" (deleted_at preenchido): HARD DELETE, removendo
   *   antes as pricing_rules vinculadas (cost_id).
   */
  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;

    setDeleting(true);

    try {
      const softIds = selectedRows
        .filter((r) => !r.deleted_at && r.id)
        .map((r) => r.id as string);

      const hardIds = selectedRows
        .filter((r) => r.deleted_at && r.id)
        .map((r) => r.id as string);

      for (let i = 0; i < softIds.length; i += PAGE_SIZE_BULK) {
        const batch = softIds.slice(i, i + PAGE_SIZE_BULK);
        const { error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", batch)
          .is("deleted_at", null);

        if (error) throw error;
      }

      for (let i = 0; i < hardIds.length; i += PAGE_SIZE_BULK) {
        const batch = hardIds.slice(i, i + PAGE_SIZE_BULK);

        const { error: rulesError } = await supabase
          .schema(SCHEMA)
          .from("pricing_rules")
          .delete()
          .in("cost_id", batch);

        if (rulesError) throw rulesError;

        const { error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .delete()
          .in("id", batch);

        if (error) throw error;
      }

      setSelectedRows([]);
      setOpenDelete(false);

      toastCustom.success(
        "Exclusão concluída!",
        [
          softIds.length > 0 ? `${softIds.length} movido(s) para Excluídos` : null,
          hardIds.length > 0 ? `${hardIds.length} removido(s) permanentemente` : null,
        ]
          .filter(Boolean)
          .join(" • ")
      );

      await loadData();
    } catch (err: any) {
      toastCustom.error(
        "Erro ao excluir",
        err?.message || "Falha ao excluir registros."
      );
    } finally {
      setDeleting(false);
    }
  }, [selectedRows, loadData]);

  /**
   * Ativar/desativar só altera `active`. Linhas excluídas são ignoradas.
   */
  const setActiveForSelected = useCallback(
    async (active: boolean) => {
      const ids = selectedRows
        .filter((r) => !r.deleted_at && r.id)
        .map((r) => r.id as string);

      if (!ids.length) return;

      setTogglingActive(true);

      try {
        for (let i = 0; i < ids.length; i += PAGE_SIZE_BULK) {
          const batch = ids.slice(i, i + PAGE_SIZE_BULK);
          const { error } = await supabase
            .schema(SCHEMA)
            .from("costs")
            .update({ active })
            .in("id", batch)
            .is("deleted_at", null);

          if (error) throw error;
        }

        toastCustom.success(
          active ? "Produtos reativados!" : "Produtos desativados!",
          `${ids.length} registro(s) atualizado(s).`
        );

        await loadData();
      } catch (err: any) {
        toastCustom.error(
          "Erro ao alterar status",
          err?.message || "Falha ao atualizar."
        );
      } finally {
        setTogglingActive(false);
      }
    },
    [selectedRows, loadData]
  );

  const handleDeactivateSelected = useCallback(
    () => setActiveForSelected(false),
    [setActiveForSelected]
  );

  const handleReactivateSelected = useCallback(
    () => setActiveForSelected(true),
    [setActiveForSelected]
  );

  /**
   * Busca todos os códigos ativos de custo (escopo "global").
   */
  const fetchAllActiveCostCodes = useCallback(async (): Promise<string[]> => {
    const codes: string[] = [];
    let from = 0;

    while (true) {
      const to = from + PAGE_SIZE_BULK - 1;
      const { data, error } = await supabase
        .schema(SCHEMA)
        .from("costs")
        .select("code")
        .eq("active", true)
        .is("deleted_at", null)
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) break;

      codes.push(...data.map((r: any) => r.code));

      if (data.length < PAGE_SIZE_BULK) break;
      from += PAGE_SIZE_BULK;
    }

    return codes;
  }, []);

  /**
   * Busca os códigos de custo vinculados a uma loja (announce.reference = costs.code).
   */
  const fetchCostCodesByStore = useCallback(async (store: string): Promise<string[]> => {
    const codes = new Set<string>();
    let from = 0;

    while (true) {
      const to = from + PAGE_SIZE_BULK - 1;
      const { data, error } = await supabase
        .schema(SCHEMA)
        .from("announce")
        .select("reference")
        .eq("store", store)
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) break;

      data.forEach((r: any) => {
        if (r.reference) codes.add(r.reference);
      });

      if (data.length < PAGE_SIZE_BULK) break;
      from += PAGE_SIZE_BULK;
    }

    return Array.from(codes);
  }, []);

  /**
   * Aplica embalagem (fixo em R$ ou percentual sobre current_cost) em
   * costs.packaging_cost para uma lista de códigos.
   */
  const applyPackagingToCodes = useCallback(
    async (
      codes: string[],
      embalagemValue: number,
      mode: "fixed" | "percent"
    ): Promise<number> => {
      if (!codes.length) return 0;

      const batches: string[][] = [];
      for (let i = 0; i < codes.length; i += PAGE_SIZE_BULK) {
        batches.push(codes.slice(i, i + PAGE_SIZE_BULK));
      }

      if (mode === "fixed") {
        for (const batch of batches) {
          const { error } = await supabase
            .schema(SCHEMA)
            .from("costs")
            .update({ packaging_cost: embalagemValue })
            .in("code", batch)
            .eq("active", true)
            .is("deleted_at", null);

          if (error) throw error;
        }

        return codes.length;
      }

      // percentual: precisa do current_cost de cada código
      let updated = 0;

      for (const batch of batches) {
        const { data, error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .select("code, current_cost")
          .in("code", batch)
          .eq("active", true)
          .is("deleted_at", null);

        if (error) throw error;
        if (!data?.length) continue;

        const results = await Promise.all(
          data.map((row: any) => {
            const base = typeof row.current_cost === "number" ? row.current_cost : 0;
            const newPackaging = base * (embalagemValue / 100);
            return supabase
              .schema(SCHEMA)
              .from("costs")
              .update({ packaging_cost: newPackaging })
              .eq("code", row.code)
              .eq("active", true)
              .is("deleted_at", null);
          })
        );

        const firstError = results.find((r) => r.error)?.error;
        if (firstError) throw firstError;

        updated += data.length;
      }

      return updated;
    },
    []
  );

  /**
   * Ajustes em massa: cria regras em pricing_rules (imposto, marketing,
   * margem_minima, desconto) com scope "global" | "store" | "channel" | "product"
   * (ou "brand" para desconto restrito por marca).
   *
   * Regras de negócio:
   * - Liverpool sempre recebe 23% de desconto, sobrescrevendo o valor digitado
   *   (apenas no escopo "product").
   * - Embalagem vai para costs.packaging_cost e não se aplica ao escopo "channel".
   */
  const applyAdjustmentsToSelected = useCallback(
    async (values: ApplyPayload): Promise<ApplyResult> => {
      const isGlobal = values.scope === "global";
      const isStore = values.scope === "store";
      const isChannel = values.scope === "channel";
      const isProduct = values.scope === "product";

      if (isProduct && !selectedRows.length) {
        return { success: false, error: "Nenhum produto selecionado." };
      }

      if (isStore && !values.store) {
        return { success: false, error: "Selecione uma loja." };
      }

      if (isChannel && !values.channel) {
        return { success: false, error: "Selecione um canal." };
      }

      if (applyingAdjustments) {
        return { success: false, error: "Já existe uma operação em andamento." };
      }

      // Embalagem não se aplica ao escopo "channel"
      const embalagemValue =
        !isChannel && values.embalagem.trim() !== ""
          ? parseDecimalToNumber(values.embalagem)
          : null;

      const hasAnyField =
        values.imposto.trim() !== "" ||
        values.marketing.trim() !== "" ||
        values.margemMinima.trim() !== "" ||
        values.desconto.trim() !== "" ||
        embalagemValue !== null;

      if (!hasAnyField) {
        return { success: false, error: "Preencha ao menos um campo." };
      }

      setApplyingAdjustments(true);

      try {
        const rulesToCreate: {
          rule_type: string;
          scope: "global" | "store" | "channel" | "product" | "brand";
          scope_value: string | null;
          rate: number;
          cost_id?: string | null;
        }[] = [];

        if (isGlobal || isStore || isChannel) {
          const scopeValue = isGlobal
            ? "global"
            : isStore
            ? values.store!
            : values.channel!;

          if (values.imposto.trim() !== "") {
            rulesToCreate.push({
              rule_type: "imposto",
              scope: values.scope,
              scope_value: scopeValue,
              rate: parseDecimalToNumber(values.imposto)!,
            });
          }

          if (values.marketing.trim() !== "") {
            rulesToCreate.push({
              rule_type: "marketing",
              scope: values.scope,
              scope_value: scopeValue,
              rate: parseDecimalToNumber(values.marketing)!,
            });
          }

          if (values.margemMinima.trim() !== "") {
            rulesToCreate.push({
              rule_type: "margem_minima",
              scope: values.scope,
              scope_value: scopeValue,
              rate: parseDecimalToNumber(values.margemMinima)!,
            });
          }

          // Desconto restrito por marca: scope="brand" em vez do escopo principal
          if (values.desconto.trim() !== "") {
            if (values.brand) {
              rulesToCreate.push({
                rule_type: "desconto",
                scope: "brand",
                scope_value: values.brand,
                rate: parseDecimalToNumber(values.desconto)!,
              });
            } else {
              rulesToCreate.push({
                rule_type: "desconto",
                scope: values.scope,
                scope_value: scopeValue,
                rate: parseDecimalToNumber(values.desconto)!,
              });
            }
          }
        } else {
          // scope === "product"
          for (const row of selectedRows) {
            const code = row["Código"];
            const costId = row.id; // UUID real do custo (obrigatório para escopo product)

            if (!costId) {
              throw new Error(
                `Produto "${code}" não possui id válido — não é possível aplicar regra de escopo "product".`
              );
            }

            if (values.imposto.trim() !== "") {
              rulesToCreate.push({
                rule_type: "imposto",
                scope: "product",
                scope_value: code,
                cost_id: costId,
                rate: parseDecimalToNumber(values.imposto)!,
              });
            }

            if (values.marketing.trim() !== "") {
              rulesToCreate.push({
                rule_type: "marketing",
                scope: "product",
                scope_value: code,
                cost_id: costId,
                rate: parseDecimalToNumber(values.marketing)!,
              });
            }

            if (values.margemMinima.trim() !== "") {
              rulesToCreate.push({
                rule_type: "margem_minima",
                scope: "product",
                scope_value: code,
                cost_id: costId,
                rate: parseDecimalToNumber(values.margemMinima)!,
              });
            }

            // Desconto: Liverpool sempre 23%, sobrescrevendo valor digitado
            const discountRate = isLiverpoolBrand(row["Marca"])
              ? LIVERPOOL_DISCOUNT_RATE
              : values.desconto.trim() !== ""
              ? parseDecimalToNumber(values.desconto)!
              : null;

            if (discountRate !== null) {
              rulesToCreate.push({
                rule_type: "desconto",
                scope: "product",
                scope_value: code,
                cost_id: costId,
                rate: discountRate,
              });
            }
          }
        }

        const created = await Promise.all(rulesToCreate.map((r) => createRule(r)));

        // Embalagem: aplicada em costs.packaging_cost
        let costsUpdated = 0;

        if (embalagemValue !== null) {
          if (isProduct) {
            const codes = selectedRows.map((r) => r["Código"]);
            costsUpdated = await applyPackagingToCodes(
              codes,
              embalagemValue,
              values.embalagemMode
            );
          } else if (isGlobal) {
            const codes = await fetchAllActiveCostCodes();
            costsUpdated = await applyPackagingToCodes(
              codes,
              embalagemValue,
              values.embalagemMode
            );
          } else if (isStore) {
            const codes = await fetchCostCodesByStore(values.store!);
            costsUpdated = await applyPackagingToCodes(
              codes,
              embalagemValue,
              values.embalagemMode
            );
          }
        }

        await loadData(currentPage, itemsPerPage);

        return {
          success: true,
          counts: { costsUpdated, rulesCreated: created.length },
        };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || "Falha ao atualizar os produtos selecionados.",
        };
      } finally {
        setApplyingAdjustments(false);
      }
    },
    [
      selectedRows,
      applyingAdjustments,
      loadData,
      currentPage,
      itemsPerPage,
      applyPackagingToCodes,
      fetchAllActiveCostCodes,
      fetchCostCodesByStore,
    ]
  );

  const handleApplyAdjustments = useCallback(
    async (values: ApplyPayload): Promise<ApplyResult> => {
      const result = await applyAdjustmentsToSelected(values);

      if (result.success) {
        const { costsUpdated = 0, rulesCreated = 0 } = result.counts ?? {};
        const parts: string[] = [];
        if (costsUpdated > 0) parts.push(`${costsUpdated} custo(s) de embalagem`);
        if (rulesCreated > 0) parts.push(`${rulesCreated} regra(s) de precificação`);

        toastCustom.success(
          "Ajustes aplicados!",
          parts.length > 0 ? parts.join(" • ") : "Nenhuma alteração realizada."
        );
      } else {
        toastCustom.error(
          "Erro ao aplicar ajustes",
          result.error ?? "Falha desconhecida."
        );
      }

      return result;
    },
    [applyAdjustmentsToSelected]
  );

  const handleImportInclusao = useCallback(async (file: File) => {
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
  }, []);

  const handleImportAlteracao = useCallback(async (file: File) => {
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
  }, []);

  const confirmImport = useCallback(async () => {
    if (!parsedRows.length) return;

    setImporting(true);

    try {
      toastCustom.message("Importando...", "Aguarde a conclusão.");

      await importFromXlsxOrCsv(parsedRows, false, importTipo);

      await Promise.all([loadData(), loadAllBrands()]);

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
  }, [parsedRows, importTipo, loadData, loadAllBrands]);

  return {
    // dados / paginação
    rows,
    totalItems,
    loading,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // filtros
    filters,
    setFilters,
    allBrands,
    selectedBrands,
    setSelectedBrands,
    applyingFilters,
    handleApplyFilters,
    handleClearFilters,
    appliedFilters,
    setAppliedFilters,

    // situação (valores oficiais de SITUACAO_OPTIONS)
    handleSituacaoChange,

    // ordenação
    sortColumn,
    sortDirection,
    handleSortColumn,

    // ordem (ex.: "Últimos Incluídos"), independente da situação
    ordem,
    setOrdem,
    handleOrdemChange,

    // seleção
    selectedRows,
    selectedCount: selectedRows.length,
    setSelectedRows,
    setSelectedRowsUnique,
    allSelected,
    handleToggleSelectAll,
    handleSelectAllFiltered,
    selectingAll,
    copiedId,
    handleCopy,

    // criação/edição
    openNew,
    setOpenNew,
    mode,
    form,
    setForm,
    openCreate,
    openEdit,
    saveForm,

    // edição inline de custo
    editing,
    setEditing,
    savingEdit,
    openCostEditor,
    confirmCostEdit,
    cancelCostEdit,

    // exclusão
    openDelete,
    setOpenDelete,
    deleting,
    deleteSelected,

    // status (ativar/desativar)
    togglingActive,
    handleDeactivateSelected,
    handleReactivateSelected,

    // exportação
    exporting,
    handleExport,
    handleExportModeloInclusao,
    handleExportModeloAlteracao,
    handleExportRenomeacaoCodigos,
    exportProgressOpen,
    setExportProgressOpen,
    exportProgress,
    exportProgressCount,
    cancelExportRef,

    // importação
    openImport,
    setOpenImport,
    importCount,
    previewRows,
    importing,
    warnings,
    importTipo,
    handleImportInclusao,
    handleImportAlteracao,
    confirmImport,

    // renomeação de códigos
    renamingCodes,
    openRenamePreview,
    setOpenRenamePreview,
    renameRows,
    setRenameRows,
    renameWarnings,
    setRenameWarnings,
    renameErrors,
    setRenameErrors,
    renameFileName,
    setRenameFileName,
    handleImportRenomeacaoCodigos,
    confirmRenomeacaoCodigos,

    // ajustes em massa
    openAdjustments,
    setOpenAdjustments,
    applyingAdjustments,
    handleApplyAdjustments,

    // mobile panels
    openFiltersMobile,
    setOpenFiltersMobile,
    openActionsMobile,
    setOpenActionsMobile,

    // utilitário
    loadData,
    loadAllBrands,
  };
}
