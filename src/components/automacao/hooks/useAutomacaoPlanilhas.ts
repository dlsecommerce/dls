"use client";

import { useState } from "react";
import { createNotification } from "@/lib/createNotification";

/** Tipagem das planilhas */
interface Planilhas {
  modelo: File | null;
  vinculo: File | null;
  bling: File | null;
  tray: File | null;
}

type Loja = "Pikot Shop" | "Sóbaquetas" | "Sobaquetas";

/** Mapa de requisitos por loja */
const REQUIRED_BY_LOJA: Record<Loja, (keyof Planilhas)[]> = {
  "Pikot Shop": ["bling", "tray", "vinculo", "modelo"],
  "Sóbaquetas": ["bling", "vinculo", "modelo"],
  "Sobaquetas": ["bling", "vinculo", "modelo"],
};

/**
 * URL fixa de fallback do backend no Render.
 * Mesmo se a variável do Vercel falhar, produção continua chamando o Render,
 * não o próprio Vercel.
 */
const AUTOMACAO_API_FALLBACK = "https://dlsecommerce-api.onrender.com";

/**
 * ✅ URL do backend:
 * - Dev localhost: usa http://localhost:5000
 * - Produção: usa NEXT_PUBLIC_AUTOMACAO_API_URL
 * - Fallback produção: usa Render fixo
 */
function getApiBase() {
  const env = process.env.NEXT_PUBLIC_AUTOMACAO_API_URL;

  if (env && env.trim()) {
    return env.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:5000";
    }

    return AUTOMACAO_API_FALLBACK;
  }

  return AUTOMACAO_API_FALLBACK;
}

function buildAutomationMessage(loja: Loja, nomeArquivo: string) {
  return `A automação da loja ${loja} gerou o arquivo "${nomeArquivo}".`;
}

async function getErrorMessageFromResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await response.json();

      if (json?.error) return String(json.error);
      if (json?.message) return String(json.message);

      return JSON.stringify(json);
    } catch {
      return "Erro ao processar as planilhas.";
    }
  }

  const text = await response.text().catch(() => "");

  if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
    return (
      "A automação chamou uma página HTML/404 em vez da API. " +
      "Confira se NEXT_PUBLIC_AUTOMACAO_API_URL está apontando para o Render: " +
      AUTOMACAO_API_FALLBACK
    );
  }

  return text || "Erro ao processar as planilhas.";
}

/** 🔹 Hook principal de automação de planilhas */
export function useAutomacaoPlanilhas() {
  const [planilhas, setPlanilhas] = useState<Planilhas>({
    modelo: null,
    vinculo: null,
    bling: null,
    tray: null,
  });

  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");

  /** Atualiza o arquivo selecionado */
  const handleFileSelect = (key: keyof Planilhas, file: File | null) => {
    setPlanilhas((prev) => ({ ...prev, [key]: file }));
  };

  /** Util: valida se os arquivos exigidos existem */
  const validateRequired = (loja: Loja) => {
    const requiredKeys =
      REQUIRED_BY_LOJA[loja] ?? REQUIRED_BY_LOJA["Pikot Shop"];

    const missing = requiredKeys.filter((k) => !planilhas[k]);

    return {
      ok: missing.length === 0,
      requiredKeys,
      missing,
    };
  };

  /** 🔹 Envia as planilhas para o servidor Node.js */
  const iniciarAutomacao = async (loja: Loja = "Pikot Shop") => {
    const { ok, requiredKeys, missing } = validateRequired(loja);

    if (!ok) {
      alert(
        `Selecione todas as planilhas antes de iniciar.\n\nFaltando: ${missing.join(
          ", "
        )}`
      );
      return;
    }

    try {
      setStatus("uploading");

      const formData = new FormData();

      // Envia loja para o backend decidir o fluxo
      formData.append("loja", loja);

      // Anexa só as chaves necessárias para a loja selecionada
      for (const key of requiredKeys) {
        const file = planilhas[key];

        if (file) {
          formData.append(key, file);
        }
      }

      const apiBase = getApiBase();
      const endpoint = `${apiBase}/atualizar-planilha`;

      console.log("API automação:", apiBase);
      console.log("Endpoint automação:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      // ❌ Falha real no servidor
      if (!response.ok) {
        const message = await getErrorMessageFromResponse(response);
        throw new Error(message);
      }

      setStatus("processing");

      // ❌ Servidor não retornou Excel
      const contentType = response.headers.get("content-type") || "";

      const isExcel =
        contentType.includes("spreadsheet") ||
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

      if (!isExcel) {
        const text = await response.text().catch(() => "");

        if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
          throw new Error(
            "Resposta inválida: o servidor retornou HTML/404 em vez de Excel. " +
              `Endpoint usado: ${endpoint}`
          );
        }

        throw new Error("Resposta inválida do servidor: " + text);
      }

      const blob = await response.blob();

      // ❌ Arquivo inválido
      if (blob.size < 1000) {
        throw new Error("Arquivo retornado é inválido ou vazio.");
      }

      // ✅ Se o backend mandar filename no Content-Disposition, usa ele
      const dispo = response.headers.get("content-disposition") || "";
      const match = dispo.match(/filename="(.+?)"/i);
      const serverFileName = match?.[1];

      // 🔽 DOWNLOAD REAL
      const dataHora = new Date()
        .toLocaleString("pt-BR")
        .replace(/[/,:\s]/g, "-");

      const nomeArquivo =
        serverFileName ||
        `AUTOMAÇÃO - ${loja.toUpperCase()} - ${dataHora}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = nomeArquivo;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      await createNotification({
        title: "Automação de planilhas concluída",
        message: buildAutomationMessage(loja, nomeArquivo),
        action: "status",
        entityType: "spreadsheet_automation",
        link: "/dashboard/anuncios",
      });

      // ✅ Concluído
      setStatus("done");
    } catch (error) {
      console.error("Erro na automação:", error);

      alert(
        "A automação falhou.\n\n" +
          "Detalhe: " +
          (error instanceof Error ? error.message : "erro desconhecido")
      );

      setStatus("error");
    }
  };

  return {
    planilhas,
    handleFileSelect,
    iniciarAutomacao,
    status,
  };
}