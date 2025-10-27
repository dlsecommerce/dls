"use client";

import { useState } from "react";
import { saveAs } from "file-saver";

/** Tipagem das planilhas */
interface Planilhas {
  modelo: File | null;
  vinculo: File | null;
  bling: File | null;
  tray: File | null;
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

  /** 🔹 Envia as planilhas para o servidor Node.js */
  const iniciarAutomacao = async () => {
    if (!planilhas.modelo || !planilhas.vinculo || !planilhas.bling || !planilhas.tray) {
      return;
    }

    try {
      setStatus("uploading");

      const formData = new FormData();
      formData.append("modelo", planilhas.modelo);
      formData.append("bling", planilhas.bling);
      formData.append("tray", planilhas.tray);
      formData.append("vinculo", planilhas.vinculo);

      setStatus("processing");

      const response = await fetch("http://localhost:5000/atualizar-planilha", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao processar as planilhas no servidor.");
      }

      // Faz o download do arquivo retornado
      const blob = await response.blob();
      const dataHora = new Date()
        .toLocaleString("pt-BR")
        .replace(/[/,:\s]/g, "-");
      const nomeArquivo = `AUTOMAÇÃO - MODELO - ${dataHora}.xlsx`;

      saveAs(blob, nomeArquivo);

      setStatus("done");
    } catch (error) {
      console.error("Erro:", error);
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
