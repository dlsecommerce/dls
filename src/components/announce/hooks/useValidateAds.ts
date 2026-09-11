"use client";

import { useState, useCallback } from "react";

export function useValidateAds() {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setValidating(false);
  }, []);

  const validar = useCallback(async () => {
    if (!file) return;

    setValidating(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/planilha/validate-ads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Erro ao validar a planilha.");
      }

      // Extrai o nome do arquivo enviado pelo servidor (se disponível)
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1]
        ? decodeURIComponent(match[1])
        : "validacao_composicao.xlsx";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setValidating(false);
    }
  }, [file]);

  return { file, setFile, validating, error, success, validar, reset };
}
