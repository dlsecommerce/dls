"use client";

import { useState } from "react";

export type ImagensPlanilhaKey = "bling" | "tray";

type Status = "idle" | "processing" | "success" | "error";

type PlanilhasState = Record<ImagensPlanilhaKey, File | null>;

const TIMEOUT_MS = 180000;

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_AUTOMACAO_API_URL;

  if (!envUrl || !envUrl.trim()) {
    throw new Error(
      "NEXT_PUBLIC_AUTOMACAO_API_URL não está definida no build. Configure na Vercel (Production) e faça redeploy sem cache."
    );
  }

  return envUrl.trim().replace(/\/$/, "");
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
  const fallback = `Erro ao atualizar imagens (HTTP ${response.status}).`;

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
      const message = "Selecione as planilhas Bling e Tray.";

      setErro(message);
      setStatus("error");

      throw new Error(message);
    }

    const formData = new FormData();

    formData.append("bling", planilhas.bling);
    formData.append("tray", planilhas.tray);

    setStatus("processing");
    setErro("");

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const endpoint = `${apiBaseUrl}/atualizar-imagens-bling-tray`;

      console.log("API usada na automação de imagens:", apiBaseUrl);
      console.log("Endpoint usado na automação de imagens:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      });

      window.clearTimeout(timeout);

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
      window.clearTimeout(timeout);

      let message: string;

      if (err?.name === "AbortError") {
        message =
          "Tempo limite excedido. O servidor demorou demais para responder.";
      } else if (err instanceof TypeError) {
        message =
          "Falha de conexão com a API (Failed to fetch). Verifique se o serviço está no ar e se o CORS do backend libera o domínio do front.";
      } else {
        message = err?.message || "Erro inesperado ao processar planilhas.";
      }

      console.error("Detalhe do erro na automação de imagens:", err);

      setErro(message);
      setStatus("error");

      throw new Error(message);
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
