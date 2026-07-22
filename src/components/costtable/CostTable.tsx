"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { TableControls } from "@/components/costtable/TableControls";
import ModalNewCost from "@/components/costtable/ModalNewCost";
import ConfirmDeleteModal from "@/components/costtable/ConfirmDeleteModal";
import ConfirmImportModal from "@/components/costtable/ConfirmImportModal";
import ConfirmRenameCodesModal from "@/components/costtable/ConfirmRenameCodesModal";
import CostFiltersSidebar from "@/components/costtable/CostFiltersSidebar";
import CostActionsSidebar from "@/components/costtable/CostActionsSidebar";
import CostDataTable from "@/components/costtable/CostDataTable";
import CostTableHeaderBar from "@/components/costtable/CostTableHeaderBar";
import { FloatingEditor } from "@/components/costtable/FloatingEditor";

import { exportFilteredToXlsx } from "@/components/costtable/helpers/exportFilteredToXlsx";
import {
  importFromXlsxOrCsv,
  importRenomeacaoCodigosFromXlsxOrCsv,
} from "@/components/costtable/helpers/importFromXlsx";
import { playImportSuccessSound } from "@/utils/sound";
import { toastCustom } from "@/utils/toastCustom";

import {
  CostFilters,
  Custo,
  DEFAULT_COST_FILTERS,
} from "@/components/costtable/types";
import {
  arraysEqual,
  buildOrSearchParts,
  parseArrayParam,
  parsePositiveInt,
  parseSearchTokens,
} from "@/components/costtable/utils";

import * as XLSX from "xlsx-js-style";
import {
  Check as CheckIcon,
  X as XIcon,
  Menu,
  SlidersHorizontal,
} from "lucide-react";

type RenameCodePreviewItem = {
  linha?: number;
  codigo_antigo: string;
  codigo_novo: string;
};

const getCostKey = (row: any) => {
  return String(row?.["Código"] ?? row?.codigo ?? row?.id ?? "").trim();
};

// Suporta múltiplos termos separados por vírgula (ex: "Liverpool, SKP, 12345")
const splitByComma = (value: string): string[] =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export default function CostTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") ?? "";
  const initialMarca = searchParams.get("marca") ?? "";
  const initialPage = parsePositiveInt(searchParams.get("page"), 1);
  const initialPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
  const initialBrands = parseArrayParam(searchParams.get("brands"));
  const initialSortColumn = searchParams.get("sortColumn") || null;
  const initialSortDirection =
    searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

  const [rows, setRows] = useState<Custo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [renamingCodes, setRenamingCodes] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);

  // Estado "rascunho" — controla os inputs da UI, mas não dispara busca sozinho
  const [search, setSearch] = useState(initialSearch);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [filters, setFilters] = useState<CostFilters>({
    ...DEFAULT_COST_FILTERS,
    marca: initialMarca,
  });

  // Estado "aplicado" — usado de fato na consulta ao Supabase (buildQuery)
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [appliedSelectedBrands, setAppliedSelectedBrands] =
    useState<string[]>(initialBrands);
  const [appliedFilters, setAppliedFilters] = useState<CostFilters>({
    ...DEFAULT_COST_FILTERS,
    marca: initialMarca,
  });

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

  const [editing, setEditing] = useState<{
    codigo: string;
    value: string;
    anchorRect: DOMRect;
  } | null>(null);

  const [openFiltersMobile, setOpenFiltersMobile] = useState(false);
  const [openActionsMobile, setOpenActionsMobile] = useState(false);

  const setSelectedRowsUnique = React.useCallback(
    (updater: React.SetStateAction<Custo[]>) => {
      setSelectedRows((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (prevState: Custo[]) => Custo[])(prev)
            : updater;

        const map = new Map<string, Custo>();

        next.forEach((row) => {
          const key = getCostKey(row);

          if (key) {
            map.set(key, row);
          }
        });

        return Array.from(map.values());
      });
    },
    []
  );

  const selectedKeys = React.useMemo(() => {
    return new Set(selectedRows.map((row) => getCostKey(row)).filter(Boolean));
  }, [selectedRows]);

  const currentPageKeys = React.useMemo(() => {
    return rows.map((row) => getCostKey(row)).filter(Boolean);
  }, [rows]);

  const allSelected =
    rows.length > 0 && currentPageKeys.every((key) => selectedKeys.has(key));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => {
        const map = new Map<string, Custo>();

        prev.forEach((row) => {
          const key = getCostKey(row);

          if (key) {
            map.set(key, row);
          }
        });

        rows.forEach((row) => {
          const key = getCostKey(row);

          if (key) {
            map.set(key, row);
          }
        });

        return Array.from(map.values());
      });

      return;
    }

    setSelectedRows((prev) => {
      const pageKeys = new Set(currentPageKeys);

      return prev.filter((row) => !pageKeys.has(getCostKey(row)));
    });
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;

    navigator.clipboard.writeText(text);
    setCopiedId(key);

    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSort = (column: string) => {
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
  };

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
        if (r?.Marca) {
          setBrands.add(String(r.Marca).trim());
        }
      });

      if (!data || data.length < pageSize) break;

      from += pageSize;
    }

    setAllBrands(Array.from(setBrands).sort((a, b) => a.localeCompare(b)));
  };

  // buildQuery agora usa o estado APLICADO, não o rascunho
  const buildQuery = (countOnly = false) => {
    let q = supabase
      .from("custos")
      .select("*", { count: "exact", head: countOnly });

    // PESQUISA GLOBAL: parseSearchTokens já suporta múltiplos termos
    // separados por vírgula e sanitiza os tokens.
    if (appliedSearch.trim()) {
      const orParts = buildOrSearchParts(parseSearchTokens(appliedSearch));

      if (orParts.length) {
        q = q.or(orParts.join(","));
      }
    }

    if (appliedSelectedBrands.length) {
      q = q.in("Marca", appliedSelectedBrands);
    }

    // FILTRO DE MARCA (texto livre): suporta múltiplas marcas separadas por vírgula
    if (appliedFilters.marca.trim()) {
      const marcaTerms = splitByComma(appliedFilters.marca);
      const marcaParts: string[] = [];

      for (const term of marcaTerms) {
        if (!term) continue;

        const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

        marcaParts.push(`Marca.ilike."%${escaped}%"`);
      }

      if (marcaParts.length === 1) {
        q = q.ilike("Marca", `%${marcaTerms[0]}%`);
      } else if (marcaParts.length > 1) {
        q = q.or(marcaParts.join(","));
      }
    }

    // FILTRO NCM: "Todos" (ou vazio) = sem filtro aplicado
    if (appliedFilters.ncm === "Com NCM") {
      q = q.not("NCM", "is", null).neq("NCM", "");
    } else if (appliedFilters.ncm === "Sem NCM") {
      q = q.or('NCM.is.null,NCM.eq.""');
    }

    // FILTRO SITUAÇÃO: "Todos" usa ordenação neutra por Código;
    // "Últimos Incluídos" força ordenação por criação mais recente
    // quando não há coluna de ordenação manual selecionada.
    if (sortColumn) {
      q = q.order(sortColumn, { ascending: sortDirection === "asc" });
    } else if (appliedFilters.situacao === "Últimos Incluídos") {
      q = q.order("created_at", { ascending: false });
    } else {
      q = q.order("Código", { ascending: true });
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

  const syncUrl = (params: {
    search: string;
    marca: string;
    page: number;
    perPage: number;
    brands: string[];
    sortColumn: string | null;
    sortDirection: "asc" | "desc";
  }) => {
    const usp = new URLSearchParams();

    if (params.search !== "") usp.set("search", params.search);
    if (params.marca !== "") usp.set("marca", params.marca);
    if (params.page > 1) usp.set("page", String(params.page));
    if (params.perPage !== 50) usp.set("perPage", String(params.perPage));
    if (params.brands.length) usp.set("brands", params.brands.join(","));
    if (params.sortColumn) usp.set("sortColumn", params.sortColumn);

    if (params.sortColumn && params.sortDirection !== "asc") {
      usp.set("sortDirection", params.sortDirection);
    }

    const nextUrl = usp.toString() ? `?${usp.toString()}` : "?";

    router.replace(nextUrl, { scroll: false });
  };

  // Lê a URL apenas na primeira carga (deep-link) e sincroniza os estados
  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlMarca = searchParams.get("marca") ?? "";
    const urlPage = parsePositiveInt(searchParams.get("page"), 1);
    const urlPerPage = parsePositiveInt(searchParams.get("perPage"), 50);
    const urlBrands = parseArrayParam(searchParams.get("brands"));
    const urlSortColumn = searchParams.get("sortColumn") || null;
    const urlSortDirection =
      searchParams.get("sortDirection") === "desc" ? "desc" : "asc";

    setSearch(urlSearch);
    setAppliedSearch(urlSearch);

    setCurrentPage(urlPage);
    setItemsPerPage(urlPerPage);

    setSelectedBrands(urlBrands);
    setAppliedSelectedBrands(urlBrands);

    setSortColumn(urlSortColumn);
    setSortDirection(urlSortDirection);

    setFilters((prev) => ({ ...prev, marca: urlMarca }));
    setAppliedFilters((prev) => ({ ...prev, marca: urlMarca }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAllBrands();
  }, []);

  // Recarrega dados quando página, itens por página, ordenação OU
  // filtros aplicados (não rascunho) mudam
  useEffect(() => {
    loadData(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    itemsPerPage,
    sortColumn,
    sortDirection,
    appliedSearch,
    appliedSelectedBrands,
    appliedFilters,
  ]);

  // Aplica os filtros do rascunho (chamado pelo botão "Filtrar" ou Enter)
  const handleApplyFilters = () => {
    setAppliedSearch(search);
    setAppliedSelectedBrands(selectedBrands);
    // Situação é controlada exclusivamente pelo header (fonte única de verdade),
    // por isso preservamos o valor já aplicado ao mesclar o restante do rascunho.
    setAppliedFilters((prev) => ({ ...filters, situacao: prev.situacao }));

    setSelectedRows([]);
    setCurrentPage(1);

    syncUrl({
      search,
      marca: filters.marca,
      page: 1,
      perPage: itemsPerPage,
      brands: selectedBrands,
      sortColumn,
      sortDirection,
    });

    setOpenFiltersMobile(false);
  };

  // Limpa todos os filtros (rascunho + aplicado) e recarrega imediatamente
  const handleClearFilters = () => {
    setSearch("");
    setSelectedBrands([]);
    setFilters({ ...DEFAULT_COST_FILTERS });

    setAppliedSearch("");
    setAppliedSelectedBrands([]);
    setAppliedFilters({ ...DEFAULT_COST_FILTERS });

    setSelectedRows([]);
    setCurrentPage(1);

    syncUrl({
      search: "",
      marca: "",
      page: 1,
      perPage: itemsPerPage,
      brands: [],
      sortColumn,
      sortDirection,
    });

    setOpenFiltersMobile(false);
  };

  const handleExport = async () => {
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

  const handleExportModeloInclusao = () => {
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

  const getRowsForRenameExport = async () => {
    if (selectedRows.length > 0) return selectedRows;

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

    return all;
  };

  const handleExportRenomeacaoCodigos = async () => {
    setExporting(true);

    try {
      const exportRows = await getRowsForRenameExport();

      if (!exportRows.length) {
        throw new Error("Nenhum custo encontrado.");
      }

      const headers = [
        "Código",
        "Novo Código",
        "Marca",
        "Produto",
        "Custo Atual",
        "Custo Antigo",
        "NCM",
      ];

      const data = [
        headers,
        ...exportRows.map((row) => [
          String(row["Código"] ?? ""),
          "",
          String(row["Marca"] ?? ""),
          String(row["Produto"] ?? ""),
          row["Custo Atual"] ?? "",
          row["Custo Antigo"] ?? "",
          String(row["NCM"] ?? ""),
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);

      const headerStyle = {
        fill: {
          type: "pattern",
          patternType: "solid",
          fgColor: { rgb: "1A8CEB" },
        },
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };

      const newCodeStyle = {
        fill: {
          type: "pattern",
          patternType: "solid",
          fgColor: { rgb: "FFF2CC" },
        },
        numFmt: "@",
        alignment: {
          horizontal: "left",
          vertical: "center",
        },
      };

      headers.forEach((_, col) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: col });

        if ((ws as any)[ref]) {
          (ws as any)[ref].s = headerStyle;
        }
      });

      for (let row = 1; row <= exportRows.length; row++) {
        const codigoRef = XLSX.utils.encode_cell({ r: row, c: 0 });
        const novoRef = XLSX.utils.encode_cell({ r: row, c: 1 });

        if ((ws as any)[codigoRef]) {
          (ws as any)[codigoRef].t = "s";
          (ws as any)[codigoRef].z = "@";
        }

        if (!(ws as any)[novoRef]) {
          (ws as any)[novoRef] = {
            t: "s",
            v: "",
          };
        }

        (ws as any)[novoRef].s = newCodeStyle;
      }

      (ws as any)["!cols"] = [
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 38 },
        { wch: 15 },
        { wch: 15 },
        { wch: 14 },
      ];

      (ws as any)["!autofilter"] = {
        ref: `A1:G${exportRows.length + 1}`,
      };

      const instructions = XLSX.utils.aoa_to_sheet([
        ["RENOMEAÇÃO DE CÓDIGOS EM MASSA"],
        [],
        ["1. Não altere a coluna Código."],
        ['2. Preencha somente a coluna "Novo Código" nas linhas desejadas.'],
        ["3. Linhas sem Novo Código serão ignoradas."],
        [
          "4. A importação atualizará custos e Código 1 até Código 10 em Pikot shop e Sóbaquetas.",
        ],
        [
          "5. Quantidades, IDs, nomes, referências e percentuais serão preservados.",
        ],
      ]);

      (instructions as any)["!cols"] = [{ wch: 110 }];

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, "Renomeação");
      XLSX.utils.book_append_sheet(wb, instructions, "Instruções");

      const now = new Date();

      const fileName = `RENOMEAÇÃO DE CÓDIGOS - ${now
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")} ${now
        .toLocaleTimeString("pt-BR")
        .replace(/:/g, "-")}.xlsx`;

      XLSX.writeFile(wb, fileName);

      toastCustom.success(
        "Planilha exportada!",
        `${exportRows.length} custo(s). Preencha a coluna Novo Código.`
      );
    } catch (err: any) {
      toastCustom.error(
        "Erro ao exportar renomeações",
        err?.message || "Falha ao gerar a planilha."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleImportRenomeacaoCodigos = async (file: File) => {
    if (renamingCodes) return;

    try {
      toastCustom.message("Lendo planilha...", "Validando as renomeações.");

      const previewResult = await importRenomeacaoCodigosFromXlsxOrCsv(
        file,
        true
      );

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
  };

  const confirmRenomeacaoCodigos = async () => {
    if (!renameRows.length || renamingCodes) return;

    setRenamingCodes(true);
    setRenameErrors([]);

    try {
      toastCustom.message(
        "Renomeando códigos...",
        "Atualizando custos, anúncios e composições."
      );

      const result = await importRenomeacaoCodigosFromXlsxOrCsv(
        renameRows,
        false
      );

      setSelectedRows([]);

      await loadData(currentPage, itemsPerPage);
      await loadAllBrands();

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
  };

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

  const openCostEditor = (row: Custo, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    setEditing({
      codigo: row["Código"],
      value: String(row["Custo Atual"] ?? ""),
      anchorRect: rect,
    });
  };

  const confirmCostEdit = async () => {
    if (!editing) return;

    const codigo = editing.codigo;
    const novoCusto = editing.value.trim();
    const prevRows = rows;

    const updatedRows = rows.map((r) =>
      r["Código"] === codigo
        ? {
            ...r,
            ["Custo Atual"]: novoCusto,
          }
        : r
    );

    setRows(updatedRows);
    setEditing(null);

    try {
      const { error } = await supabase
        .from("custos")
        .update({ ["Custo Atual"]: novoCusto })
        .eq("Código", codigo);

      if (error) throw error;

      toastCustom.success("Custo atualizado!", "Alteração salva com sucesso.");
    } catch (err: any) {
      setRows(prevRows);

      toastCustom.error(
        "Erro ao atualizar custo",
        err?.message || "Falha ao salvar alteração."
      );
    }
  };

  const cancelCostEdit = () => {
    setEditing(null);
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

      toastCustom.success(
        "Exclusão concluída!",
        "Registros removidos com sucesso."
      );

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

  return (
    <div className="min-h-screen bg-[#0b0b0c] p-0">
      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="fixed left-0 top-24 h-screen w-[220px] overflow-y-auto bg-[#0b0b0c]">
            <CostFiltersSidebar
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              allBrands={allBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={loading}
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

            <CostTableHeaderBar
              allSelected={allSelected}
              hasRows={rows.length > 0}
              situacao={appliedFilters.situacao}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              selectedCount={selectedRows.length}
              onSituacaoChange={(value) => {
                // Situação é aplicada imediatamente (não depende do botão "Filtrar"),
                // então atualizamos rascunho e aplicado juntos para manter consistência.
                setFilters((prev) => ({ ...prev, situacao: value }));
                setAppliedFilters((prev) => ({ ...prev, situacao: value }));
                setCurrentPage(1);
              }}
              onToggleSelectAll={handleToggleSelectAll}
              onRefresh={() => loadData(currentPage, itemsPerPage)}
              onSort={handleSort}
              onDeleteSelected={() => setOpenDelete(true)}
            />

            <GlassmorphicCard className="overflow-hidden rounded-none border border-neutral-700 bg-[#101010] shadow-none border-t-0">
              <CostDataTable
                rows={rows}
                loading={loading}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRowsUnique}
                copiedId={copiedId}
                handleCopy={handleCopy}
                openEdit={openEdit}
                openCostEditor={openCostEditor}
                openDeleteOne={(row) => {
                  setSelectedRows([row]);
                  setOpenDelete(true);
                }}
              />
            </GlassmorphicCard>

            <div className="mt-2 px-2 pb-24 lg:pb-4">
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
        </section>

        <aside className="relative hidden lg:block">
          <div className="fixed right-5 top-23 h-screen w-[300px] overflow-y-auto bg-[#0b0b0c]">
            <CostActionsSidebar
              exporting={exporting || renamingCodes}
              handleExport={handleExport}
              onOpenCreate={openCreate}
              onExportModeloInclusao={handleExportModeloInclusao}
              onExportModeloAlteracao={handleExportModeloAlteracao}
              onExportRenomeacaoCodigos={handleExportRenomeacaoCodigos}
              onImportInclusao={handleImportInclusao}
              onImportAlteracao={handleImportAlteracao}
              onImportRenomeacaoCodigos={handleImportRenomeacaoCodigos}
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenFiltersMobile(false)}
            aria-label="Fechar filtros"
          />

          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto border-r border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-[#0b0b0c]/95 px-4 py-4 backdrop-blur">
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

            <CostFiltersSidebar
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              allBrands={allBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={loading}
            />
          </div>
        </div>
      )}

      {openActionsMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenActionsMobile(false)}
            aria-label="Fechar ações"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-[#0b0b0c] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0b0b0c]/95 px-4 py-4 backdrop-blur">
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
              <CostActionsSidebar
                exporting={exporting || renamingCodes}
                handleExport={handleExport}
                onOpenCreate={() => {
                  setOpenActionsMobile(false);
                  openCreate();
                }}
                onExportModeloInclusao={handleExportModeloInclusao}
                onExportModeloAlteracao={handleExportModeloAlteracao}
                onExportRenomeacaoCodigos={handleExportRenomeacaoCodigos}
                onImportInclusao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportInclusao(file);
                }}
                onImportAlteracao={(file) => {
                  setOpenActionsMobile(false);
                  handleImportAlteracao(file);
                }}
                onImportRenomeacaoCodigos={(file) => {
                  setOpenActionsMobile(false);
                  handleImportRenomeacaoCodigos(file);
                }}
              />
            </div>
          </div>
        </div>
      )}

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

      <ConfirmRenameCodesModal
        open={openRenamePreview}
        onOpenChange={(open) => {
          if (renamingCodes) return;

          setOpenRenamePreview(open);

          if (!open) {
            setRenameRows([]);
            setRenameWarnings([]);
            setRenameErrors([]);
            setRenameFileName("");
          }
        }}
        preview={renameRows}
        warnings={renameWarnings}
        errors={renameErrors}
        loading={renamingCodes}
        fileName={renameFileName}
        onConfirm={confirmRenomeacaoCodigos}
      />

      {editing && (
        <FloatingEditor anchorRect={editing.anchorRect} onClose={cancelCostEdit}>
          <div className="relative flex items-center rounded-md border border-neutral-700 bg-black/30 px-2 py-1.5">
            <span className="text-xs px-1 py-0.5 rounded bg-black/60 border border-neutral-700 mr-1">
              R$
            </span>

            <input
              autoFocus
              inputMode="decimal"
              className="flex-1 bg-transparent outline-none text-sm text-white pr-10"
              value={editing.value}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, value: e.target.value } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCostEdit();
                if (e.key === "Escape") cancelCostEdit();
              }}
            />

            <div className="absolute right-1 flex items-center gap-1">
              <button
                title="Cancelar"
                onClick={cancelCostEdit}
                className="text-red-400 hover:text-red-300"
              >
                <XIcon className="w-4 h-4" />
              </button>

              <button
                title="Confirmar"
                onClick={confirmCostEdit}
                className="text-green-400 hover:text-green-300"
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
