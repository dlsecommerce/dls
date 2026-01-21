"use client";

import { useState } from "react";

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
  "Sobaquetas": ["bling", "vinculo", "modelo"], // fallback se vier sem acento
};

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
    const requiredKeys = REQUIRED_BY_LOJA[loja] ?? REQUIRED_BY_LOJA["Pikot Shop"];
    const missing = requiredKeys.filter((k) => !planilhas[k]);
    return { ok: missing.length === 0, requiredKeys, missing };
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

      setStatus("processing");

      const response = await fetch("http://localhost:5000/atualizar-planilha", {
        method: "POST",
        body: formData,
      });

      // ❌ Falha real no servidor
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Erro ao processar as planilhas.");
      }

      // ❌ Servidor não retornou Excel
      const contentType = response.headers.get("content-type") || "";
      const isExcel =
        contentType.includes("spreadsheet") ||
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

      if (!isExcel) {
        const text = await response.text();
        throw new Error("Resposta inválida do servidor: " + text);
      }

      const blob = await response.blob();

      // ❌ Arquivo inválido
      if (blob.size < 1000) {
        throw new Error("Arquivo retornado é inválido ou vazio.");
      }

      // 🔽 DOWNLOAD REAL
      const dataHora = new Date()
        .toLocaleString("pt-BR")
        .replace(/[/,:\s]/g, "-");

      const nomeArquivo = `AUTOMAÇÃO - ${loja.toUpperCase()} - ${dataHora}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // ✅ Concluído
      setStatus("done");
    } catch (error) {
      console.error("Erro na automação:", error);
      alert(
        "A automação falhou.\n\n" +
          "⚠️ Se você usa AdBlock, uBlock, Brave ou antivírus com proteção web,\n" +
          "desative para localhost e tente novamente."
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
