"use client";

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import { RowShape } from "@/components/announce/helpers/importFromXlsxOrCsv";

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
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  /* === 📤 Importação via input (TopBar) === */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = (e.target as HTMLInputElement)?.files;
    const f = fileList?.[0];
    if (!f) return;

    try {
      const { data: previewData, warnings } = await importFromXlsxOrCsv(f, true);
      setImportFile(f);
      setImportCount(previewData.length);
      setPreviewRows(previewData.slice(0, 10));
      setWarnings(warnings || []);
      setOpenConfirmImport(true);
    } catch (err) {
      console.error("Erro ao importar arquivo:", err);
      alert("Erro ao ler o arquivo. Verifique se o formato está correto (.xlsx ou .csv).");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  };

  /* === 📤 Importação direta (MassEditionModal) === */
  const handleFileDirect = async (file: File) => {
    if (!file) return;
    try {
      const { data: previewData, warnings } = await importFromXlsxOrCsv(file, true);
      setImportFile(file);
      setImportCount(previewData.length);
      setPreviewRows(previewData.slice(0, 10));
      setWarnings(warnings || []);
      setOpenConfirmImport(true);
    } catch (err) {
      console.error("Erro ao importar arquivo direto:", err);
      alert("Erro ao ler o arquivo. Verifique se o formato está correto (.xlsx ou .csv).");
    }
  };

  /* === ✅ Confirmação final === */
  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      console.log("📦 Importando para Supabase:", importFile.name);
      await importFromXlsxOrCsv(importFile); // executa import real
      loadAnuncios(currentPage);
    } catch (err) {
      console.error("Erro ao importar:", err);
      alert("Erro ao importar dados. Verifique o console para mais detalhes.");
    } finally {
      setImporting(false);
      setOpenConfirmImport(false);
    }
  };

  /* === 📦 Exportação === */
  const getTableName = (): string => {
    if (filters?.selectedStores?.includes("Pikot")) return "anuncios_pk";
    if (filters?.selectedStores?.includes("Sobaquetas")) return "anuncios_sb";
    return "anuncios_all";
  };

  const buildQuery = (countOnly = false) => {
    const table = getTableName();
    let q = supabase
      .from(table)
      .select(countOnly ? "*" : "*", { count: "exact", head: countOnly });

    if (filters?.search?.trim()) {
      q = q.or(
        `Nome.ilike.%${filters.search}%,Marca.ilike.%${filters.search}%,Referência.ilike.%${filters.search}%`
      );
    }

    if (filters?.selectedStores?.length)
      q = q.in("Loja", filters.selectedStores);

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
    const filename = `ANÚNCIOS - RELATÓRIO - ${now
      .toLocaleString("pt-BR")
      .replace(/[/: ]/g, "-")}.xlsx`;

    exportFilteredToXlsx(exportData, filename);
  };

  return {
    fileInputRef,
    handleFileSelect,
    handleFileDirect,
    confirmImport,
    handleExport,
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
