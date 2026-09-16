// components/announce/hooks/useComposicaoActions.ts

"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────── */

type ImportErro = {
  linha: number;
  motivo: string;
};

type ImportResultado = {
  success: boolean;
  processed: number;
  skipped: number;
  errors: ImportErro[];
};

/* ─────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────── */

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error(
      "Sua sessão expirou. Entre novamente no sistema."
    );
  }

  return token;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || `Erro inesperado (status ${response.status}).`;
  } catch {
    return `Erro inesperado (status ${response.status}).`;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function extractFilename(
  response: Response,
  fallback: string
): string {
  const disposition = response.headers.get("content-disposition");

  if (!disposition) return fallback;

  const match = disposition.match(/filename="?([^"]+)"?/i);

  return match?.[1] ?? fallback;
}

/* ─────────────────────────────────────────────
 * HOOK
 * ───────────────────────────────────────────── */

export function useComposicaoActions() {
  const [exportingComposicao, setExportingComposicao] = useState(false);
  const [exportingModelo, setExportingModelo] = useState(false);
  const [importingComposicao, setImportingComposicao] = useState(false);

  /**
   * Baixa a planilha com as composições já cadastradas.
   */
  const onExportComposicao = useCallback(async () => {
    if (exportingComposicao) return;

    setExportingComposicao(true);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/composicao/export", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const blob = await response.blob();
      const filename = extractFilename(response, "composicoes.xlsx");

      downloadBlob(blob, filename);

      toast.success("Composições exportadas com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível exportar as composições.");
    } finally {
      setExportingComposicao(false);
    }
  }, [exportingComposicao]);

  /**
   * Baixa o modelo de planilha para preenchimento (todos os
   * anúncios, com ou sem composição).
   */
  const onExportModeloComposicao = useCallback(async () => {
    if (exportingModelo) return;

    setExportingModelo(true);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/composicao/export-modelo", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const blob = await response.blob();
      const filename = extractFilename(response, "modelo-composicao.xlsx");

      downloadBlob(blob, filename);

      toast.success("Modelo de composição baixado com sucesso.");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível gerar o modelo de composição.");
    } finally {
      setExportingModelo(false);
    }
  }, [exportingModelo]);

  /**
   * Envia a planilha preenchida para importar/atualizar composições.
   */
  const onImportComposicao = useCallback(async (file: File) => {
    if (importingComposicao) return;

    setImportingComposicao(true);

    try {
      const token = await getAccessToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/composicao/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const resultado = (await response.json()) as ImportResultado;

      if (resultado.errors.length > 0) {
        toast.warning(
          `Importação concluída com ${resultado.errors.length} erro(s). ` +
            `${resultado.processed} processado(s), ${resultado.skipped} ignorado(s).`
        );

        // eslint-disable-next-line no-console
        console.warn("[useComposicaoActions] Erros na importação:", resultado.errors);
      } else {
        toast.success(
          `${resultado.processed} composição(ões) importada(s) com sucesso.` +
            (resultado.skipped > 0 ? ` ${resultado.skipped} linha(s) em branco ignorada(s).` : "")
        );
      }

      return resultado;
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível importar as composições.");
      return null;
    } finally {
      setImportingComposicao(false);
    }
  }, [importingComposicao]);

  return {
    onExportComposicao,
    onExportModeloComposicao,
    onImportComposicao,
    exportingComposicao,
    exportingModelo,
    importingComposicao,
  };
}
