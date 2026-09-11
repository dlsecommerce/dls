// hooks/useautomationspreadsheets.ts
"use client";

import { useState } from "react";
import { createNotification } from "@/lib/createNotification";

interface Planilhas {
  bling: File | null;
}

type Loja = "Pikot Shop" | "Sóbaquetas";

interface Resultado {
  url: string;
  nomeArquivo: string;
  blob: Blob;
}

function buildAutomationMessage(loja: Loja, nomeArquivo: string) {
  return `A automação da loja ${loja} gerou o arquivo "${nomeArquivo}".`;
}

async function getErrorMessageFromResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await response.json();
      return json?.error ?? json?.message ?? JSON.stringify(json);
    } catch {
      return "Erro ao processar a planilha.";
    }
  }

  const text = await response.text().catch(() => "");
  return text || "Erro ao processar a planilha.";
}

function triggerBrowserDownload(url: string, nomeArquivo: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function useAutomacaoPlanilhas() {
  const [planilhas, setPlanilhas] = useState<Planilhas>({ bling: null });
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFileSelect = (key: keyof Planilhas, file: File | null) => {
    setPlanilhas((prev) => ({ ...prev, [key]: file }));
  };

  const resetResultado = () => {
    if (resultado?.url) URL.revokeObjectURL(resultado.url);
    setResultado(null);
    setStatus("idle");
    setErrorMessage("");
  };

  const iniciarAutomacao = async (loja: Loja, blingFile: File) => {
    if (!blingFile) {
      throw new Error("Selecione a planilha Bling antes de iniciar.");
    }

    try {
      setStatus("uploading");
      setErrorMessage("");

      const formData = new FormData();
      formData.append("loja", loja);
      formData.append("bling", blingFile);

      const response = await fetch("/api/planilha/generate-spreadsheet", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await getErrorMessageFromResponse(response);
        throw new Error(message);
      }

      setStatus("processing");

      const blob = await response.blob();

      if (blob.size < 500) {
        throw new Error("Arquivo retornado é inválido ou vazio.");
      }

      const dispo = response.headers.get("content-disposition") || "";
      const match = dispo.match(/filename="(.+?)"/i);
      const serverFileName = match?.[1]
        ? decodeURIComponent(match[1])
        : null;

      const dataHora = new Date()
        .toLocaleString("pt-BR")
        .replace(/[/,:\s]/g, "-");

      const lojaLabel = loja === "Pikot Shop" ? "PIKOT SHOP" : "SÓBAQUETAS";

      const nomeArquivo =
        serverFileName || `ANÚNCIOS - ${lojaLabel} - ${dataHora}.xlsx`;

      const url = URL.createObjectURL(blob);

      setResultado({ url, nomeArquivo, blob });
      setStatus("done");

      // Download automático assim que o arquivo é gerado
      triggerBrowserDownload(url, nomeArquivo);

      createNotification({
        title: "Planilha atualizada gerada",
        message: buildAutomationMessage(loja, nomeArquivo),
        action: "status",
        entityType: "spreadsheet_automation",
        link: "/dashboard/anuncios",
      }).catch((err) => {
        console.error("Notificação falhou, mas planilha foi gerada:", err);
      });
    } catch (error) {
      console.error("Erro na automação:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      setStatus("error");
      throw error;
    }
  };

  return {
    planilhas,
    handleFileSelect,
    iniciarAutomacao,
    status,
    resultado,
    errorMessage,
    resetResultado,
  };
}
