"use client";

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import type { RowShape } from "@/components/announce/helpers/importFromXlsxOrCsv";

type ImportMode = "inclusao" | "alteracao";

/* =========================
   Normalização geral
========================= */
function normText(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/* =========================
   Helpers de Loja (PK/SB)
========================= */
function normalizeStore(s: string) {
  return normText(s);
}

function toStoreCode(s: string): "PK" | "SB" | null {
  const v = normalizeStore(s);

  if (v === "pk") return "PK";
  if (v === "sb") return "SB";

  if (v.includes("pikot")) return "PK";
  if (v.includes("sobaquetas")) return "SB";

  return null;
}

function storeSigla(nomeLoja: string) {
  const loja = normText(nomeLoja);

  if (loja.includes("pikot") || loja === "pk") return "PK";
  if (loja.includes("sobaquetas") || loja === "sb") return "SB";

  // fallback: iniciais
  const raw = String(nomeLoja ?? "").trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/* =========================
   Sigla de Marca (sem MAP)
   Ex: "VDR Relatório" -> "VDR"
   Ex: "Telefunken" -> "TEL"
========================= */
function marcaSigla(marca: string, maxLen = 3) {
  const clean = String(marca ?? "").trim();

  // limpa (remove acento, espaços, símbolos) e deixa uppercase
  const code = clean
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");

  if (!code) return "";
  return code.slice(0, maxLen);
}

/* =========================
   Nome do arquivo (GLOBAL)
   Regras:
   - Sem filtros: "ANÚNCIOS - RELATÓRIO - dataHora"
   - Só loja: "ANÚNCIOS - RELATÓRIO - PK - dataHora"
   - Só marcas: "ANÚNCIOS - RELATÓRIO - LIV-ITC - dataHora"
   - Marca + loja: "ANÚNCIOS - RELATÓRIO - LIV-PK - dataHora"
========================= */
function buildExportFilename(filters?: {
  selectedStores?: string[];
  selectedBrands?: string[];
}) {
  const agora = new Date();
  const dataHora = agora
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/[/:]/g, "-")
    .replace(", ", "_");

  const marcas = Array.from(
    new Set((filters?.selectedBrands ?? []).map((m) => marcaSigla(m, 3)))
  ).filter(Boolean);

  // Loja: se marcar 1 só (PK ou SB), entra. Se marcar as duas, não entra (vira “todos”).
  const lojaCodes = Array.from(
    new Set((filters?.selectedStores ?? []).map((s) => storeSigla(s)).filter(Boolean))
  );

  const lojaFinal = lojaCodes.length === 1 ? lojaCodes[0] : "";

  // marcas primeiro, depois loja
  const middle = [marcas.join("-"), lojaFinal].filter(Boolean).join("-");

  return middle
    ? `ANÚNCIOS - RELATÓRIO - ${middle} - ${dataHora}.xlsx`
    : `ANÚNCIOS - RELATÓRIO - ${dataHora}.xlsx`;
}

/* =========================
   Filtro GLOBAL:
   - OR dentro de cada grupo
   - AND entre grupos
========================= */
function applyGlobalFilters(
  rows: RowShape[],
  filters?: {
    selectedStores?: string[];
    selectedBrands?: string[];
    selectedCategorias?: string[];
  }
) {
  const lojas = (filters?.selectedStores ?? []).map(normText);
  const marcas = (filters?.selectedBrands ?? []).map(normText);
  const cats = (filters?.selectedCategorias ?? []).map(normText);

  if (!rows?.length) return [];

  // sem filtros → retorna como está
  if (lojas.length === 0 && marcas.length === 0 && cats.length === 0) return rows;

  return rows.filter((r: any) => {
    const loja = normText(r.Loja ?? r.loja);
    const marca = normText(r.Marca ?? r.marca);
    const categoria = normText(r.Categoria ?? r.categoria);

    const lojaOk = lojas.length === 0 || lojas.includes(loja);
    const marcaOk = marcas.length === 0 || marcas.includes(marca);
    const catOk = cats.length === 0 || cats.includes(categoria);

    return lojaOk && marcaOk && catOk;
  });
}

/* =========================
   Search filter (para Opção B)
   Aplica no export quando há seleção ou não.
========================= */
function applySearchFilter(rows: RowShape[], search?: string) {
  const s = normText(search ?? "");
  if (!s) return rows;

  return (rows ?? []).filter((r: any) => {
    const nome = normText(r.Nome ?? r.nome);
    const marca = normText(r.Marca ?? r.marca);
    const ref = normText(r["Referência"] ?? r.Referência ?? r.referencia);

    return nome.includes(s) || marca.includes(s) || ref.includes(s);
  });
}

/* =========================
   Hook
========================= */
export function useImportExport(
  loadAnuncios: (page?: number) => void,
  currentPage: number,
  filters?: {
    search?: string;
    selectedStores?: string[];
    selectedBrands?: string[];
    selectedCategorias?: string[];
  },
  selectedRows: RowShape[] = []
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [openMassEdition, setOpenMassEdition] = useState(false);
  const [openConfirmImport, setOpenConfirmImport] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("inclusao");

  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  /* =========================
     Preview (antes de importar)
  ========================= */
  const openPreview = async (file: File, mode: ImportMode) => {
    const result: any = await importFromXlsxOrCsv(file, true, mode);
    const previewData = result?.data ?? [];
    const warn = result?.warnings ?? [];
    const errs = result?.errors ?? [];

    setImportMode(mode);
    setImportFile(file);
    setImportCount(previewData.length);
    setPreviewRows(previewData.slice(0, 10));
    setWarnings(warn);
    setErrors(errs);
    setOpenConfirmImport(true);
  };

  const openImportInclusaoFromTopBar = () => {
    setImportMode("inclusao");
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      await openPreview(f, importMode);
    } catch (err) {
      console.error("Erro ao importar arquivo:", err);
      alert("Erro ao ler o arquivo. Verifique se é .xlsx ou .csv.");
    } finally {
      e.target.value = "";
    }
  };

  const handleFileDirect = async (file: File, mode: ImportMode) => {
    if (!file) return;

    try {
      await openPreview(file, mode);
    } catch (err) {
      console.error("Erro ao importar arquivo direto:", err);
      alert("Erro ao ler o arquivo. Verifique se é .xlsx ou .csv.");
    }
  };

  /* =========================
     Confirma Importação
  ========================= */
  const confirmImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      await importFromXlsxOrCsv(importFile, false, importMode);
      await loadAnuncios(currentPage);
    } catch (err) {
      console.error("Erro ao importar:", err);
      alert("Erro ao importar dados. Veja o console.");
    } finally {
      setImporting(false);
      setOpenConfirmImport(false);
    }
  };

  /* =========================
     EXPORTAÇÃO (Supabase + filtros)
  ========================= */
  const getTableName = (): string => {
    const stores = filters?.selectedStores ?? [];
    const hasPK = stores.some((s) => toStoreCode(s) === "PK");
    const hasSB = stores.some((s) => toStoreCode(s) === "SB");

    if (hasPK && !hasSB) return "anuncios_pk";
    if (hasSB && !hasPK) return "anuncios_sb";
    return "anuncios_all";
  };

  const buildQuery = (countOnly = false) => {
    const table = getTableName();

    let q = supabase.from(table).select("*", {
      count: "exact",
      head: countOnly,
    });

    // 🔎 Search
    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`Nome.ilike.%${s}%,Marca.ilike.%${s}%,Referência.ilike.%${s}%`);
    }

    // 🏪 Loja PK/SB
    const lojaCodes =
      filters?.selectedStores
        ?.map(toStoreCode)
        .filter((v): v is "PK" | "SB" => Boolean(v)) ?? [];

    if (lojaCodes.length) {
      q = q.in("Loja", lojaCodes);
    }

    return q;
  };

  const fetchAllFiltered = async (): Promise<RowShape[]> => {
    const { count, error: errCount } = await buildQuery(true);
    if (errCount) {
      console.error("Erro ao contar export:", errCount);
      return [];
    }

    const total = count || 0;
    if (total === 0) return [];

    const pageSize = 1000;
    const totalPages = Math.ceil(total / pageSize);
    let results: RowShape[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const from = (p - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await buildQuery(false).range(from, to);
      if (error) {
        console.error("Erro ao buscar export:", error);
        break;
      }

      results = results.concat((data as RowShape[]) || []);
    }

    // ✅ aplica Loja/Marca/Categoria (global AND) com normalização
    results = applyGlobalFilters(results, {
      selectedStores: filters?.selectedStores ?? [],
      selectedBrands: filters?.selectedBrands ?? [],
      selectedCategorias: filters?.selectedCategorias ?? [],
    });

    // ✅ aplica search também (compatível com a tela)
    results = applySearchFilter(results, filters?.search);

    return results;
  };

  const handleExport = async () => {
    const activeFilters = {
      selectedStores: filters?.selectedStores ?? [],
      selectedBrands: filters?.selectedBrands ?? [],
      selectedCategorias: filters?.selectedCategorias ?? [],
    };

    const base = selectedRows.length > 0 ? selectedRows : await fetchAllFiltered();

    // ✅ OPÇÃO B: mesmo com seleção, respeita Loja/Marca/Categoria + Search
    let exportData = applyGlobalFilters(base, activeFilters);
    exportData = applySearchFilter(exportData, filters?.search);

    if (!exportData.length) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    const filename = buildExportFilename({
      selectedStores: filters?.selectedStores ?? [],
      selectedBrands: filters?.selectedBrands ?? [],
    });

    exportFilteredToXlsx(exportData, filename);
  };

  return {
    fileInputRef,
    openImportInclusaoFromTopBar,

    handleFileSelect,
    handleFileDirect,
    confirmImport,
    handleExport,

    importMode,
    setImportMode,
    importCount,
    previewRows,
    warnings,
    errors,
    importing,

    openMassEdition,
    setOpenMassEdition,
    openConfirmImport,
    setOpenConfirmImport,
  };
}
