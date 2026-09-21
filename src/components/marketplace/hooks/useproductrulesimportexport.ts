"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type ImportResult = {
  success: boolean;
  updatedProducts: number;
  errors?: string[];
};

export function useProductRulesImportExport() {
  const [exportingProductRules, setExportingProductRules] = useState(false);
  const [exportProgressOpen, setExportProgressOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [importingProductRules, setImportingProductRules] = useState(false);
  const [importProgressOpen, setImportProgressOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const exportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFakeProgress = (
    setProgress: (fn: (p: number) => number) => void,
    ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) => {
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      setProgress((p) => (p >= 85 ? 85 : p + Math.random() * 12));
    }, 200);
  };

  const stopFakeProgress = (
    ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) => {
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
  };

  const handleExportProductRules = useCallback(async () => {
    setExportingProductRules(true);
    setExportProgressOpen(true);
    setExportProgress(0);
    startFakeProgress(setExportProgress, exportIntervalRef);

    try {
      const res = await fetch("/api/marketplace/product-rules/export");
      if (!res.ok) throw new Error("Falha ao exportar regras por produto.");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match
        ? decodeURIComponent(match[1])
        : "regras-produto.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      stopFakeProgress(exportIntervalRef);
      setExportProgress(100);
    } catch (err: any) {
      stopFakeProgress(exportIntervalRef);
      setExportProgress(0);
      setExportProgressOpen(false);
      toast.error(err?.message || "Erro ao exportar regras por produto.");
    } finally {
      setExportingProductRules(false);
      setTimeout(() => setExportProgressOpen(false), 1200);
    }
  }, []);

  const handleImportProductRules = useCallback(
    async (file: File, onDone?: () => void | Promise<void>) => {
      setImportingProductRules(true);
      setImportProgressOpen(true);
      setImportProgress(0);
      startFakeProgress(setImportProgress, importIntervalRef);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/marketplace/product-rules/import", {
          method: "POST",
          body: formData,
        });

        const result: ImportResult & { error?: string; details?: string[] } =
          await res.json();

        stopFakeProgress(importIntervalRef);

        if (!res.ok) {
          setImportProgress(0);
          setImportProgressOpen(false);
          toast.error(result.error ?? "Erro ao importar regras por produto.");
          if (result.details) console.error(result.details);
          return;
        }

        setImportProgress(100);

        toast.success(
          `${result.updatedProducts} produto(s) atualizados com sucesso.`
        );

        if (result.errors?.length) {
          toast.warning(`Alguns produtos falharam: ${result.errors.join(" | ")}`);
        }

        await onDone?.();
      } catch (err: any) {
        stopFakeProgress(importIntervalRef);
        setImportProgress(0);
        setImportProgressOpen(false);
        toast.error(err?.message || "Erro ao processar o arquivo importado.");
      } finally {
        setImportingProductRules(false);
        setTimeout(() => setImportProgressOpen(false), 1200);
      }
    },
    []
  );

  return {
    exportingProductRules,
    exportProgressOpen,
    exportProgress,
    handleExportProductRules,
    closeExportProgress: () => setExportProgressOpen(false),

    importingProductRules,
    importProgressOpen,
    importProgress,
    handleImportProductRules,
    closeImportProgress: () => setImportProgressOpen(false),
  };
}
