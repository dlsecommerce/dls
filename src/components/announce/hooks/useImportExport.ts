"use client";

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import type { RowShape } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { toastCustom } from "@/utils/toastCustom";

// ✅ usar seu util do MP3
import { unlockAudio, playImportSuccessSound } from "@/utils/sound";

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
========================= */
function marcaSigla(marca: string, maxLen = 3) {
  const clean = String(marca ?? "").trim();

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

  const lojaCodes = Array.from(
    new Set(
      (filters?.selectedStores ?? []).map((s) => storeSigla(s)).filter(Boolean)
    )
  );

  const lojaFinal = lojaCodes.length === 1 ? lojaCodes[0] : "";
  const middle = [marcas.join("-"), lojaFinal].filter(Boolean).join("-");

  return middle
    ? `ANÚNCIOS - RELATÓRIO - ${middle} - ${dataHora}.xlsx`
    : `ANÚNCIOS - RELATÓRIO - ${dataHora}.xlsx`;
}

/* =========================
   Filtro GLOBAL
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
   Search filter
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
      toastCustom.error("Erro ao ler o arquivo", "Verifique se é .xlsx ou .csv.");
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
      toastCustom.error("Erro ao ler o arquivo", "Verifique se é .xlsx ou .csv.");
    }
  };

  /* =========================
     ✅ Confirma Importação
     🔑 IMPORTANTE:
     - unlockAudio() deve ser chamado NO CLIQUE do botão "Confirmar"
     - aqui toca o som só no sucesso real
  ========================= */
  const confirmImport = async () => {
    if (!importFile) return;

    if (errors.length > 0) {
      toastCustom.error("Importação bloqueada", "Corrija os erros antes de confirmar.");
      return;
    }

    setImporting(true);

    try {
      toastCustom.message("Importando...", "Aguarde a conclusão da importação.");

      await importFromXlsxOrCsv(importFile, false, importMode);
      await loadAnuncios(currentPage);

      setOpenConfirmImport(false);

      toastCustom.success(
        importMode === "inclusao" ? "Inclusão concluída!" : "Alteração concluída!",
        `Processados ${importCount} registro(s).`
      );

      // 🔊 SOM: somente no sucesso real (fim da importação)
      playImportSuccessSound(0.4);
    } catch (err: any) {
      console.error("Erro ao importar:", err);
      toastCustom.error(
        "Erro ao importar dados",
        err?.message || err?.details || "Veja o console para mais detalhes."
      );
    } finally {
      setImporting(false);
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

    if (filters?.search?.trim()) {
      const s = filters.search.trim();
      q = q.or(`Nome.ilike.%${s}%,Marca.ilike.%${s}%,Referência.ilike.%${s}%`);
    }

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

    results = applyGlobalFilters(results, {
      selectedStores: filters?.selectedStores ?? [],
      selectedBrands: filters?.selectedBrands ?? [],
      selectedCategorias: filters?.selectedCategorias ?? [],
    });

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
    let exportData = applyGlobalFilters(base, activeFilters);
    exportData = applySearchFilter(exportData, filters?.search);

    if (!exportData.length) {
      toastCustom.warning("Nada para exportar", "Nenhum dado encontrado com os filtros atuais.");
      return;
    }

    const filename = buildExportFilename({
      selectedStores: filters?.selectedStores ?? [],
      selectedBrands: filters?.selectedBrands ?? [],
    });

    exportFilteredToXlsx(exportData, filename);
    toastCustom.success("Exportação gerada!", "O download foi iniciado.");
  };

  return {
    fileInputRef,
    openImportInclusaoFromTopBar,

    handleFileSelect,
    handleFileDirect,

    // ✅ IMPORTANTE: chame isso no clique do botão Confirmar:
    // await unlockAudio(); await confirmImport();
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
    unlockAudio,
  };
}