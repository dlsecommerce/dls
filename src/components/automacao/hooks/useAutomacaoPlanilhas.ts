"use client";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useState } from "react";

/** Tipagem base */
interface Planilhas {
  modelo: File | null;
  vinculo: File | null;
  bling: File | null;
  tray: File | null;
}

/** 🔹 Hook principal da automação */
export function useAutomacaoPlanilhas() {
  const [planilhas, setPlanilhas] = useState<Planilhas>({
    modelo: null,
    vinculo: null,
    bling: null,
    tray: null,
  });
  const [status, setStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");

  /** Atualiza arquivo selecionado */
  const handleFileSelect = (key: keyof Planilhas, file: File | null) => {
    setPlanilhas((prev) => ({ ...prev, [key]: file }));
  };

  /** Detecta e lê CSV ou XLSX */
  const readFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const isCSV = file.name.toLowerCase().endsWith(".csv");

    if (isCSV) {
      const text = new TextDecoder("utf-8").decode(buffer);
      const workbook = XLSX.read(text, { type: "string" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } else {
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }
  };

  /** 🔹 Função principal da automação */
  const iniciarAutomacao = async () => {
    if (!planilhas.modelo || !planilhas.vinculo || !planilhas.bling || !planilhas.tray) {
      alert("⚠️ Selecione as planilhas: Modelo, Vínculo, Bling e Tray.");
      return;
    }

    try {
      setStatus("processing");

      const modelo = await readFile(planilhas.modelo);
      const vinculo = await readFile(planilhas.vinculo);
      const bling = await readFile(planilhas.bling);
      const tray = await readFile(planilhas.tray);

      if (!modelo.length) throw new Error("Modelo vazio ou inválido.");

      const colunasModelo = Object.keys(modelo[0]);
      const dfNovo: any[] = [];

      // 🔹 Percorre vínculo e preenche o modelo
      vinculo.forEach((item: any, idx: number) => {
        const linha: any = {};
        linha["ID Bling"] = item["IdProduto"] || "";
        linha["Nome"] = item["Nome"] || "";
        linha["Referência"] = item["Código"] || "";

        // 🔸 Define loja
        const idLoja = (item["ID na Loja"] || "").toString().trim();
        if (/n\s*tray/i.test(idLoja) && !/\d/.test(idLoja)) linha["Loja"] = "SB";
        else if (/\d/.test(idLoja)) linha["Loja"] = "PK";
        else linha["Loja"] = "";

        // 🔸 IDs Tray/Var
        const numeros = idLoja.replace(/\D/g, "");
        if (numeros.length === 7) linha["ID Tray"] = numeros;
        else if (numeros.length === 5) linha["ID Var"] = numeros;
        else {
          linha["ID Tray"] = "";
          linha["ID Var"] = "";
        }

        // 🔸 Dados Bling
        const dadosBling = bling[idx] || {};
        linha["Marca"] = dadosBling["Marca"] || "";
        linha["Categoria"] = dadosBling["Categoria do produto"] || "";
        linha["Peso líquido (Kg)"] = dadosBling["Peso líquido (Kg)"] || "";
        linha["Altura do Produto"] = dadosBling["Altura do Produto"] || "";
        linha["Largura do produto"] = dadosBling["Largura do produto"] || "";
        linha["Profundidade do produto"] = dadosBling["Profundidade do produto"] || "";

        // 🔸 Dados Tray
        const matchTray =
          tray.find(
            (t: any) =>
              t["IdProduto"] === item["IdProduto"] ||
              t["Nome"] === item["Nome"] ||
              t["Código"] === item["Código"]
          ) || {};
        linha["Preço Tray"] = matchTray["Preço"] || "";
        linha["Estoque Tray"] = matchTray["Estoque"] || "";
        linha["Situação Tray"] = matchTray["Situação"] || "";
        linha["ID na Loja Tray"] = matchTray["ID na Loja"] || "";

        // 🔸 Códigos e quantidades
        const ref = (item["Código"] || "").toString();
        const codigosQtd = processarReferencia(ref);
        for (let i = 0; i < 10; i++) {
          linha[`Código ${i + 1}`] = codigosQtd[i]?.codigo || "";
          linha[`Quantidade ${i + 1}`] = codigosQtd[i]?.quantidade || "";
        }

        dfNovo.push(linha);
      });

      // 🔹 Alinha com modelo
      const linhasFormatadas = dfNovo.map((obj) => {
        const linhaFinal: any = {};
        colunasModelo.forEach((col) => (linhaFinal[col] = obj[col] || ""));
        return linhaFinal;
      });

      const ws = XLSX.utils.json_to_sheet(linhasFormatadas, { header: colunasModelo });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resultado");

      // 🔹 Gera arquivo final
      const agora = new Date();
      const dataHora = `${agora.toLocaleDateString("pt-BR").replaceAll("/", "-")}_${agora
        .getHours()
        .toString()
        .padStart(2, "0")}-${agora.getMinutes().toString().padStart(2, "0")}`;
      const nomeArquivo = `AUTOMAÇÃO - MODELO - ${dataHora}.xlsx`;

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([buffer], { type: "application/octet-stream" }), nomeArquivo);

      setStatus("done");
    } catch (error) {
      console.error("Erro na automação:", error);
      setStatus("error");
    }
  };

  /** 🔹 Processa códigos e quantidades */
  const processarReferencia = (ref: string) => {
    if (!ref) return [];

    const partes = ref.split(/[\/\\]/);
    const resultado: Array<{ codigo: string; quantidade: number }> = [];

    for (let parte of partes) {
      parte = parte.trim();
      if (!parte) continue;

      let quantidade = 1;
      let codigo = parte;

      const match = parte.match(/^(\d+)-(.+)$/);
      if (match) {
        quantidade = parseInt(match[1]);
        codigo = match[2];
      }

      codigo = codigo.replace(/[A-Z]/gi, "").replace(/-+$/, "");
      if (codigo) resultado.push({ codigo, quantidade });
    }

    return resultado.slice(0, 10);
  };

  return {
    planilhas,
    handleFileSelect,
    iniciarAutomacao,
    status,
  };
}
