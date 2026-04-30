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
 * ✅ URL do backend:
 * - Dev (localhost): usa http://localhost:5000
 * - Produção: usa NEXT_PUBLIC_AUTOMACAO_API_URL (recomendado)
 *   Ex: NEXT_PUBLIC_AUTOMACAO_API_URL=https://api.seudominio.com
 * - Se não tiver env em produção, tenta usar URL relativa (mesmo domínio)
 */
function getApiBase() {
  const env = process.env.NEXT_PUBLIC_AUTOMACAO_API_URL;
  if (env && env.trim()) return env.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) return "http://localhost:5000";

    return "";
  }

  return "http://localhost:5000";
}

function buildAutomationMessage(loja: Loja, nomeArquivo: string) {
  return `A automação da loja ${loja} gerou o arquivo "${nomeArquivo}".`;
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

      // (Opcional) envia loja pro backend decidir o fluxo
      formData.append("loja", loja);

      // Anexa só as chaves necessárias para a loja selecionada
      for (const key of requiredKeys) {
        const file = planilhas[key];
        if (file) formData.append(key, file);
      }

      const apiBase = getApiBase();

      const response = await fetch(
        apiBase
          ? `${apiBase}/atualizar-planilha`
          : "/atualizar-planilha",
        {
          method: "POST",
          body: formData,
        }
      );

      // ❌ Falha real no servidor
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Erro ao processar as planilhas.");
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
          "⚠️ Se você usa AdBlock, uBlock, Brave ou antivírus com proteção web,\n" +
          "desative para localhost e tente novamente.\n\n" +
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