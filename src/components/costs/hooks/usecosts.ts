"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

import {
  CostFilters as CostFiltersType,
  Custo,
  DEFAULT_COST_FILTERS,
  ApplyPayload,
  ApplyResult,
} from "@/components/costs/hooks/types";
// Tipo do formulário do modal (chaves em inglês) — renomeado para não
// colidir com o tipo `Custo` (chaves em português) usado na tabela/linhas.
import type { Custo as CustoForm } from "@/components/costs/Newcost";
import {
  parseArrayParam,
  parsePositiveInt,
  parseSearchTokens,
  sanitizeTerm,
} from "@/components/costs/hooks/utils";

const SCHEMA = "newsystem";

export type RenameCodePreviewItem = {
  linha?: number;
  codigo_antigo: string;
  codigo_novo: string;
};

export const getCostKey = (row: any) => {
  return String(row?.["Código"] ?? row?.codigo ?? row?.id ?? "").trim();
};

const splitByComma = (value: string): string[] =>
  value
    .split(",")
    .map((v) => sanitizeTerm(v))
    .filter(Boolean);

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
});

// Formata um número (ou null) em string BR para exibir no input de custo do modal
const formatCostForForm = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2).replace(".", ",");
};

// Formata o NCM (dígitos puros vindos do banco) com máscara para exibição no modal
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

export function useCosts() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCodigo = searchParams.get("codigo") ?? "";
  const initialMarca = searchParams.get("marca") ?? "";
  const initialProduto = searchParams.get("produto") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";
  const initialNcm = searchParams.get("ncm") ?? "";

  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
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
    codigo: initialCodigo,
    marca: initialMarca,
    produto: initialProduto,
    ncm: initialNcm || DEFAULT_COST_FILTERS.ncm,
  });

  const [appliedSelectedBrands, setAppliedSelectedBrands] =
    useState<string[]>(initialBrands);
  const [appliedFilters, setAppliedFilters] = useState<CostFiltersType>({
    ...DEFAULT_COST_FILTERS,
    codigo: initialCodigo,
    marca: initialMarca,
    produto: initialProduto,
    ncm: initialNcm || DEFAULT_COST_FILTERS.ncm,
  });

  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

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

  const loadRequestIdRef = useRef(0);

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
          if (key) map.set(key, row);
        });

        const result = Array.from(map.values());

        if (result.length > SELECTION_WARN_LIMIT) {
          toastCustom.warning(
            "Seleção muito grande",
            `Você selecionou mais de ${SELECTION_WARN_LIMIT} registros. Isso pode deixar a exportação lenta.`
          );
        }

        return result;
      });
    },
    []
  );

  const selectedKeys = new Set(
    selectedRows.map((row) => getCostKey(row)).filter(Boolean)
  );

  const currentPageKeys = rows.map((row) => getCostKey(row)).filter(Boolean);

  const allSelected =
    rows.length > 0 && currentPageKeys.every((key) => selectedKeys.has(key));

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowsUnique((prev) => [...prev, ...rows]);
        return;
      }

      setSelectedRows((prev) => {
        const pageKeys = new Set(currentPageKeys);
        return prev.filter((row) => !pageKeys.has(getCostKey(row)));
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

  const handleSortColumn = useCallback(
    (column: string) => {
      setSortColumn((prevColumn) => {
        if (prevColumn !== column) {
          setSortDirection("asc");
          return column;
        }

        if (sortDirection === "asc") {
          setSortDirection("desc");
          return column;
        }

        setSortDirection("asc");
        return null;
      });

      setCurrentPage(1);
    },
    [sortDirection]
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

  const buildQuery = useCallback(
    (countOnly = false) => {
      let q = supabase
        .schema(SCHEMA)
        .from("costs")
        .select("*", { count: "exact", head: countOnly })
        .is("deleted_at", null);

      if (appliedFilters.codigo.trim()) {
        const tokens = splitByComma(appliedFilters.codigo);
        const parts = tokens.map(
          (t) => `code.ilike."%${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
        );

        if (parts.length === 1) {
          q = q.ilike("code", `%${tokens[0]}%`);
        } else if (parts.length > 1) {
          q = q.or(parts.join(","));
        }
      }

      if (appliedFilters.produto.trim()) {
        const tokens = parseSearchTokens(appliedFilters.produto);
        const parts = tokens.map(
          (t) =>
            `product.ilike."%${String(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
        );

        if (parts.length === 1) {
          q = q.ilike("product", `%${tokens[0]}%`);
        } else if (parts.length > 1) {
          q = q.or(parts.join(","));
        }
      }

      if (appliedSelectedBrands.length) {
        q = q.in("mark", appliedSelectedBrands);
      }

      if (appliedFilters.marca.trim()) {
        const marcaTerms = splitByComma(appliedFilters.marca);
        const marcaParts = marcaTerms.map(
          (t) => `mark.ilike."%${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`
        );

        if (marcaParts.length === 1) {
          q = q.ilike("mark", `%${marcaTerms[0]}%`);
        } else if (marcaParts.length > 1) {
          q = q.or(marcaParts.join(","));
        }
      }

      if (appliedFilters.ncm === "Com NCM") {
        q = q.not("ncm", "is", null).neq("ncm", "");
      } else if (appliedFilters.ncm === "Sem NCM") {
        q = q.or('ncm.is.null,ncm.eq.""');
      }

      if (sortColumn) {
        const dbColumn = SORT_FIELD_MAP[sortColumn] || sortColumn;
        q = q.order(dbColumn, { ascending: sortDirection === "asc" });
      } else if (appliedFilters.situacao === "Últimos Incluídos") {
        q = q.order("created_at", { ascending: false });
      } else {
        q = q.order("code", { ascending: true });
      }

      return q;
    },
    [appliedSelectedBrands, appliedFilters, sortColumn, sortDirection]
  );

  const loadData = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const [{ count }, { data, error }] = await Promise.all([
        buildQuery(true),
        buildQuery(false).range(from, to),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (error) {
        console.error("Erro ao carregar dados:", error);
        toastCustom.error(
          "Erro ao carregar custos",
          error.message || "Falha ao buscar os registros."
        );
        setRows([]);
        setLoading(false);
        return;
      }

      setTotalItems(count || 0);
      setRows((data || []).map(mapRowToUI));
      setLoading(false);
    },
    [buildQuery, currentPage, itemsPerPage]
  );

  const fetchAllRows = useCallback(async (): Promise<Custo[]> => {
    const { count } = await buildQuery(true);
    const total = count || 0;

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

  const syncUrl = useCallback(
    (params: {
      codigo: string;
      marca: string;
      produto: string;
      ncm: string;
      page: number;
      perPage: number;
      brands: string[];
      sortColumn: string | null;
      sortDirection: "asc" | "desc";
    }) => {
      const usp = new URLSearchParams();

      if (params.codigo !== "") usp.set("codigo", params.codigo);
      if (params.marca !== "") usp.set("marca", params.marca);
      if (params.produto !== "") usp.set("produto", params.produto);
      if (params.ncm && params.ncm !== "Todos") usp.set("ncm", params.ncm);
      if (params.page > 1) usp.set("page", String(params.page));
      if (params.perPage !== 50) usp.set("perPage", String(params.perPage));
      if (params.brands.length) usp.set("brands", params.brands.join(","));
      if (params.sortColumn) usp.set("sortColumn", params.sortColumn);

      if (params.sortColumn && params.sortDirection !== "asc") {
        usp.set("sortDirection", params.sortDirection);
      }

      const nextUrl = usp.toString() ? `?${usp.toString()}` : "?";

      router.replace(nextUrl, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const urlCodigo = searchParams.get("codigo") ?? "";
    const urlMarca = searchParams.get("marca") ?? "";
    const urlProduto = searchParams.get("produto") ?? "";
    const urlNcm = searchParams.get("ncm") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setCurrentPage(urlPage);
    setItemsPerPage(urlPerPage);

    setSelectedBrands(urlBrands);
    setAppliedSelectedBrands(urlBrands);

    setSortColumn(urlSortColumn);
    setSortDirection(urlSortDirection);

    setFilters((prev) => ({
      ...prev,
      codigo: urlCodigo,
      marca: urlMarca,
      produto: urlProduto,
      ncm: urlNcm || prev.ncm,
    }));
    setAppliedFilters((prev) => ({
      ...prev,
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

  useEffect(() => {
    loadData(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    appliedSelectedBrands,
    appliedFilters,
  ]);

  const applyFilterState = useCallback(
    (next: {
      codigo: string;
      marca: string;
      produto: string;
      brands: string[];
      ncm?: string;
    }) => {
      setAppliedSelectedBrands(next.brands);
      setAppliedFilters((prev) => ({
        ...prev,
        codigo: next.codigo,
        marca: next.marca,
        produto: next.produto,
        ncm: next.ncm ?? prev.ncm,
      }));

      setSelectedRows([]);
      setCurrentPage(1);

      syncUrl({
        codigo: next.codigo,
        marca: next.marca,
        produto: next.produto,
        ncm: next.ncm ?? filters.ncm,
        page: 1,
        perPage: itemsPerPage,
        brands: next.brands,
        sortColumn,
        sortDirection,
      });
    },
    [filters.ncm, itemsPerPage, sortColumn, sortDirection, syncUrl]
  );

  const handleApplyFilters = useCallback(async () => {
    if (applyingFilters) return;

    setApplyingFilters(true);

    try {
      applyFilterState({
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

    applyFilterState({
      codigo: "",
      marca: "",
      produto: "",
      brands: [],
      ncm: DEFAULT_COST_FILTERS.ncm,
    });

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

  const handleExportModeloInclusao = useCallback(async () => {
    try {
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
        [
          [
            "12345",
            "Liverpool",
            "Baqueta 7A Liverpool",
            "250.00",
            "240.00",
            "851821",
          ],
        ],
        { origin: -1 }
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inclusão");

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
  }, []);

  const handleExportModeloAlteracao = useCallback(async () => {
    try {
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
        [
          [
            "12345",
            "Liverpool",
            "Baqueta 7A Liverpool",
            "260.00",
            "250.00",
            "851821",
          ],
        ],
        { origin: -1 }
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Alteração");

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
  }, []);

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

  const confirmCostEdit = useCallback(async () => {
    if (!editing || savingEdit) return;

    setSavingEdit(true);

    const { codigo, field } = editing;
    const novoValor = editing.value.trim();
    const prevRows = rows;

    const dbField = field === "Custo Atual" ? "current_cost" : "previous_cost";

    const updatedRows = rows.map((r) =>
      r["Código"] === codigo ? { ...r, [field]: novoValor } : r
    );

    setRows(updatedRows);
    setEditing(null);

    try {
      const { error } = await supabase
        .schema(SCHEMA)
        .from("costs")
        .update({ [dbField]: novoValor === "" ? null : parseDecimalToNumber(novoValor) })
        .eq("code", codigo)
        .is("deleted_at", null);

      if (error) throw error;

      toastCustom.success("Custo atualizado!", "Alteração salva com sucesso.");
    } catch (err: any) {
      setRows(prevRows);
      toastCustom.error(
        "Erro ao atualizar custo",
        err?.message || "Falha ao salvar alteração."
      );
    } finally {
      setSavingEdit(false);
    }
  }, [editing, savingEdit, rows]);

  const cancelCostEdit = useCallback(() => {
    if (savingEdit) return;
    setEditing(null);
  }, [savingEdit]);

  const saveForm = useCallback(async () => {
    await Promise.all([loadData(), loadAllBrands()]);
  }, [loadData, loadAllBrands]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .schema(SCHEMA)
        .from("costs")
        .update({ deleted_at: new Date().toISOString() })
        .in("code", selectedRows.map((r) => r["Código"]));

      if (error) throw error;

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
  }, [selectedRows, loadData]);

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
   * Busca os códigos de custo vinculados a uma loja específica,
   * via a coluna `announce.reference` (equivalente ao `costs.code`).
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
   * Aplica o valor de embalagem (fixo ou percentual) para uma lista de
   * códigos de custo. Quando percentual, precisa buscar o current_cost
   * de cada código para calcular o valor individual.
   */
  const applyPackagingToCodes = useCallback(
    async (
      codes: string[],
      embalagemValue: number,
      mode: "fixed" | "percent"
    ): Promise<number> => {
      if (!codes.length) return 0;

      if (mode === "fixed") {
        const batches: string[][] = [];
        for (let i = 0; i < codes.length; i += PAGE_SIZE_BULK) {
          batches.push(codes.slice(i, i + PAGE_SIZE_BULK));
        }

        for (const batch of batches) {
          const { error } = await supabase
            .schema(SCHEMA)
            .from("costs")
            .update({ packaging_cost: embalagemValue })
            .in("code", batch)
            .is("deleted_at", null);

          if (error) throw error;
        }

        return codes.length;
      }

      // percentual: precisa do current_cost de cada código
      let updated = 0;
      const batches: string[][] = [];
      for (let i = 0; i < codes.length; i += PAGE_SIZE_BULK) {
        batches.push(codes.slice(i, i + PAGE_SIZE_BULK));
      }

      for (const batch of batches) {
        const { data, error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .select("code, current_cost")
          .in("code", batch)
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
   * margem_minima, desconto) com scope "global" | "store" | "channel" | "product".
   * Regra de negócio: Liverpool sempre recebe 23% de desconto fixo,
   * sobrescrevendo o valor digitado no modal (apenas no escopo "product").
   *
   * Embalagem é aplicada diretamente no campo físico packaging_cost da
   * tabela costs (fixo em R$ ou percentual sobre current_cost). Não se
   * aplica ao escopo "channel" (canal não possui vínculo direto com
   * costs.packaging_cost — é regra de precificação, não custo direto):
   *  - "product": aplica apenas nos produtos selecionados.
   *  - "global": aplica em todos os produtos ativos (costs.deleted_at is null).
   *  - "store": aplica em todos os produtos vinculados à loja selecionada
   *    (via announce.reference = costs.code).
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
          scope: "global" | "store" | "channel" | "product";
          scope_value: string;
          rate: number;
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

          if (values.desconto.trim() !== "") {
            rulesToCreate.push({
              rule_type: "desconto",
              scope: values.scope,
              scope_value: scopeValue,
              rate: parseDecimalToNumber(values.desconto)!,
            });
          }
        } else {
          // scope === "product"
          for (const row of selectedRows) {
            const code = row["Código"];

            if (values.imposto.trim() !== "") {
              rulesToCreate.push({
                rule_type: "imposto",
                scope: "product",
                scope_value: code,
                rate: parseDecimalToNumber(values.imposto)!,
              });
            }

            if (values.marketing.trim() !== "") {
              rulesToCreate.push({
                rule_type: "marketing",
                scope: "product",
                scope_value: code,
                rate: parseDecimalToNumber(values.marketing)!,
              });
            }

            if (values.margemMinima.trim() !== "") {
              rulesToCreate.push({
                rule_type: "margem_minima",
                scope: "product",
                scope_value: code,
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
                rate: discountRate,
              });
            }
          }
        }

        const created = await Promise.all(rulesToCreate.map((r) => createRule(r)));

        // Embalagem: aplicada em costs.packaging_cost (indisponível para escopo "channel")
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

    // ordenação
    sortColumn,
    sortDirection,
    handleSortColumn,

    // seleção
    selectedRows,
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
