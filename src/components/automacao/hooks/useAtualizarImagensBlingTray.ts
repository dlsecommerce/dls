"use client";

import { useState } from "react";

export type ImagensPlanilhaKey = "bling" | "tray";

type Status = "idle" | "processing" | "success" | "error";

type PlanilhasState = Record<ImagensPlanilhaKey, File | null>;

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_AUTOMACAO_API_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return "https://dlsecommerce-api.onrender.com";
};

const getFilenameFromDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return "";

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  return normalMatch?.[1] || "";
};

const baixarBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename || "BLING - IMAGENS ATUALIZADAS.xlsx";

  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
};

const getErrorMessageFromResponse = async (response: Response) => {
  const fallback = "Erro ao atualizar imagens.";

  try {
    const text = await response.text();

    if (!text) return fallback;

    try {
      const json = JSON.parse(text);
      return json?.error || json?.message || text || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
};

export function useAtualizarImagensBlingTray() {
  const [planilhas, setPlanilhas] = useState<PlanilhasState>({
    bling: null,
    tray: null,
  });

  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string>("");

  const handleFileSelect = (key: ImagensPlanilhaKey, file: File | null) => {
    setPlanilhas((prev) => ({
      ...prev,
      [key]: file,
    }));

    setErro("");
    setStatus("idle");
  };

  const limparArquivos = () => {
    setPlanilhas({
      bling: null,
      tray: null,
    });

    setErro("");
    setStatus("idle");
  };

  const iniciarAutomacao = async () => {
    if (!planilhas.bling || !planilhas.tray) {
      throw new Error("Selecione as planilhas Bling e Tray.");
    }

    const formData = new FormData();

    formData.append("bling", planilhas.bling);
    formData.append("tray", planilhas.tray);

    setStatus("processing");
    setErro("");

    try {
      const apiBaseUrl = getApiBaseUrl();

      const response = await fetch(
        `${apiBaseUrl}/atualizar-imagens-bling-tray`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const message = await getErrorMessageFromResponse(response);
        throw new Error(message);
      }

      const blob = await response.blob();

      const filename =
        getFilenameFromDisposition(
          response.headers.get("Content-Disposition")
        ) || "BLING - IMAGENS ATUALIZADAS.xlsx";

      baixarBlob(blob, filename);

      setStatus("success");
    } catch (err: any) {
      const message =
        err?.message || "Erro inesperado ao processar planilhas.";

      setErro(message);
      setStatus("error");

      throw err;
    }
  };

  return {
    planilhas,
    status,
    erro,
    handleFileSelect,
    limparArquivos,
    iniciarAutomacao,
  };
}