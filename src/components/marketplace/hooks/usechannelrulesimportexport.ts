"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type ImportResult = {
  success: boolean;
  updatedChannels: number;
  totalChannels: number;
  errors?: string[];
};

type IntervalRef = React.MutableRefObject<ReturnType<typeof setInterval> | null>;

function startFakeProgress(setProgress: (fn: (p: number) => number) => void, ref: IntervalRef) {
  if (ref.current) clearInterval(ref.current);
  ref.current = setInterval(() => {
    setProgress((p) => (p >= 85 ? 85 : p + Math.random() * 12));
  }, 200);
}

function stopFakeProgress(ref: IntervalRef) {
  if (ref.current) {
    clearInterval(ref.current);
    ref.current = null;
  }
}

export function useChannelRulesImportExport() {
  const [exportingChannelRules, setExportingChannelRules] = useState(false);
  const [exportProgressOpen, setExportProgressOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [importingChannelRules, setImportingChannelRules] = useState(false);
  const [importProgressOpen, setImportProgressOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const exportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeExportProgress = useCallback(() => {
    stopFakeProgress(exportIntervalRef);
    setExportProgressOpen(false);
    setExportProgress(0);
  }, []);

  const closeImportProgress = useCallback(() => {
    stopFakeProgress(importIntervalRef);
    setImportProgressOpen(false);
    setImportProgress(0);
  }, []);

  const handleExportChannelRules = useCallback(async () => {
    setExportingChannelRules(true);
    setExportProgressOpen(true);
    setExportProgress(0);
    startFakeProgress(setExportProgress, exportIntervalRef);

    try {
      const res = await fetch("/api/marketplace/channel-rules/export");
      if (!res.ok) throw new Error("Falha ao exportar regras de canal.");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match ? decodeURIComponent(match[1]) : "regras-marketplace.xlsx";

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
      toast.error(err?.message || "Erro ao exportar regras de canal.");
    } finally {
      setExportingChannelRules(false);
      setTimeout(() => setExportProgressOpen(false), 1200);
    }
  }, []);

  const handleImportChannelRules = useCallback(
    async (file: File, onDone?: () => void | Promise<void>) => {
      setImportingChannelRules(true);
      setImportProgressOpen(true);
      setImportProgress(0);
      startFakeProgress(setImportProgress, importIntervalRef);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/marketplace/channel-rules/import", {
          method: "POST",
          body: formData,
        });

        const result: ImportResult & { error?: string; details?: string[] } = await res.json();

        stopFakeProgress(importIntervalRef);

        if (!res.ok) {
          setImportProgress(0);
          setImportProgressOpen(false);
          toast.error(result.error ?? "Erro ao importar regras de canal.");
          if (result.details) console.error(result.details);
          return;
        }

        setImportProgress(100);

        toast.success(
          `${result.updatedChannels}/${result.totalChannels} canal(is) atualizados com sucesso.`
        );

        if (result.errors?.length) {
          toast.warning(`Alguns canais falharam: ${result.errors.join(" | ")}`);
        }

        await onDone?.();
      } catch (err: any) {
        stopFakeProgress(importIntervalRef);
        setImportProgress(0);
        setImportProgressOpen(false);
        toast.error(err?.message || "Erro ao processar o arquivo importado.");
      } finally {
        setImportingChannelRules(false);
        setTimeout(() => setImportProgressOpen(false), 1200);
      }
    },
    []
  );

  return {
    exportingChannelRules,
    exportProgressOpen,
    exportProgress,
    handleExportChannelRules,
    closeExportProgress,

    importingChannelRules,
    importProgressOpen,
    importProgress,
    handleImportChannelRules,
    closeImportProgress,
  };
}
