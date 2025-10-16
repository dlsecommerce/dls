import { useState, useRef } from "react";
import { importFromXlsxOrCsv } from "@/components/announce/helpers/importFromXlsxOrCsv";
import { exportFilteredToXlsx } from "@/components/announce/helpers/exportFilteredToXlsx";
import { Anuncio } from "@/components/announce/types/Announce";

export function useImportExport(loadAnuncios: (page?: number) => void, currentPage: number) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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

  const handleExport = (rows: Anuncio[]) => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const filename = `RELATORIO-ANUNCIOS-${dia}-${mes}-${ano}.xlsx`;
    exportFilteredToXlsx(rows, filename);
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
