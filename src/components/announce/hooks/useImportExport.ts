// 📄 src/hooks/useImportExport.ts
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
    selectedStores?: string[]; // Ex: ["Pikot"] ou ["Sobaquetas"]
  },
  selectedRows: RowShape[] = []
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  /* === IMPORTAÇÃO === */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { data: previewData, warnings } = await importFromXlsxOrCsv(f, true);
      setImportFile(f);
      setImportCount(previewData.length);
      setPreviewRows(previewData.slice(0, 5));
      setWarnings(warnings || []);
      setOpenImport(true);
    } catch (err) {
      console.error("Erro ao importar:", err);
    } finally {
      e.target.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await importFromXlsxOrCsv(importFile);
      loadAnuncios(currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
      setOpenImport(false);
    }
  };

  /* === EXPORTAÇÃO === */
  // Escolhe automaticamente a tabela conforme a loja selecionada
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
    const { count, error: countError } = await buildQuery(true);
    if (countError) {
      console.error("Erro ao contar anúncios:", countError);
      return [];
    }

    const total = count || 0;
    const pageSize = 1000;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    let results: RowShape[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await buildQuery(false).range(from, to);
      if (error) {
        console.error("Erro ao buscar anúncios:", error);
        break;
      }
      results = results.concat((data as RowShape[]) || []);
    }

    return results;
  };

  const handleExport = async () => {
    const exportData =
      selectedRows.length > 0 ? selectedRows : await fetchAllFiltered();

    if (!exportData || exportData.length === 0) {
      alert("Nenhum dado encontrado para exportar.");
      return;
    }

    // 🕒 Gera nome dinâmico
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hora}h${min}m`;

    // 🔖 Abreviação da loja
    let lojaTag = "";
    if (filters?.selectedStores?.length) {
      lojaTag = filters.selectedStores
        .map((s) =>
          s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z]/g, "")
            .substring(0, 3)
            .toUpperCase()
        )
        .join("-");
    }

    const baseName =
      selectedRows.length > 0 ? "ANÚNCIOS - RELATORIO-SL" : "ANÚNCIOS - RELATORIO";
    const lojaPart = lojaTag ? `-${lojaTag}` : "";
    const filename = `${baseName}${lojaPart}-${dia}-${mes}-${ano}-${timeStr}.xlsx`;

    exportFilteredToXlsx(exportData, filename);
  };

  return {
    fileInputRef,
    openImport,
    setOpenImport,
    importCount,
    previewRows,
    warnings,
    importing,
    handleFileSelect,
    confirmImport,
    handleExport,
  };
}
