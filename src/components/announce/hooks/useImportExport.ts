"use client";

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import type { RowShape } from "@/components/announce/helpers/importFromXlsxOrCsv";

type ImportMode = "inclusao" | "alteracao";

/* =========================
   Helpers de Loja
========================= */
function normalizeStore(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function toStoreCode(s: string): "PK" | "SB" | null {
  const v = normalizeStore(s);

  if (v === "pk") return "PK";
  if (v === "sb") return "SB";

  if (v.includes("pikot")) return "PK";
  if (v.includes("sobaquetas")) return "SB";

  return null;
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
  },
  selectedRows: RowShape[] = []
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [openMassEdition, setOpenMassEdition] = useState(false);
  const [openConfirmImport, setOpenConfirmImport] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("alteracao");

  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  /* =========================
     Preview (antes de importar)
  ========================= */
  const openPreview = async (file: File, mode: ImportMode) => {
    const { data: previewData, warnings } = await importFromXlsxOrCsv(file, true);

    setImportMode(mode);
    setImportFile(file);
    setImportCount(previewData.length);
    setPreviewRows(previewData.slice(0, 10));
    setWarnings(warnings || []);
    setOpenConfirmImport(true);
  };

  /* =========================
     Import via TopBar
  ========================= */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      // TopBar hoje só altera
      await openPreview(f, "alteracao");
    } catch (err) {
      console.error("Erro ao importar arquivo:", err);
      alert("Erro ao ler o arquivo. Verifique se é .xlsx ou .csv.");
    } finally {
      e.target.value = "";
    }
  };

  /* =========================
     Import via MassEdition
  ========================= */
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
      console.log(`📦 Importando (${importMode}) →`, importFile.name);

      await importFromXlsxOrCsv(importFile);
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
     EXPORTAÇÃO
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

    let q = supabase
      .from(table)
      .select("*", { count: "exact", head: countOnly });

    if (filters?.search?.trim()) {
      q = q.or(
        `Nome.ilike.%${filters.search}%,Marca.ilike.%${filters.search}%,Referência.ilike.%${filters.search}%`
      );
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
    const { count } = await buildQuery(true);
    const total = count || 0;

    const pageSize = 1000;
    const totalPages = Math.ceil(total / pageSize);
    let results: RowShape[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const from = (p - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data } = await buildQuery(false).range(from, to);
      results = results.concat((data as RowShape[]) || []);
    }

    return results;
  };

  const handleExport = async () => {
    const exportData =
      selectedRows.length > 0 ? selectedRows : await fetchAllFiltered();

    if (!exportData.length) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    const now = new Date();
    const filename = `ANUNCIOS-${now
      .toLocaleString("pt-BR")
      .replace(/[/: ]/g, "-")}.xlsx`;

    exportFilteredToXlsx(exportData, filename);
  };

  /* =========================
     Retorno
  ========================= */
  return {
    fileInputRef,
    handleFileSelect,
    handleFileDirect,
    confirmImport,
    handleExport,

    importMode,
    importCount,
    previewRows,
    warnings,
    importing,

    openMassEdition,
    setOpenMassEdition,
    openConfirmImport,
    setOpenConfirmImport,
  };
}
