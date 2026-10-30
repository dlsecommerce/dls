"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export type ImagensPlanilhaKey = "bling" | "tray";

type Status = "idle" | "processing" | "success" | "error";

type PlanilhasState = Record<ImagensPlanilhaKey, File | null>;

export type ResultadoAtualizacao = {
  atualizados: number;
  semId: number;
  semImagem: number;
};

const NOME_SAIDA = "BLING - IMAGENS ATUALIZADAS.xlsx";

const COL_TRAY_CHAVE = "Referência";
const COLUNAS_TRAY_IMAGEM = ["Imagem principal", "Imagem 2", "Imagem 3", "Imagem 4"];
const COL_TRAY_ADICIONAIS = "Imagens adicionais";

const COL_BLING_CHAVE = "Código";
const COL_BLING_DESTINO = "URL Imagens Externas";

const normaliza = (valor: unknown) => (valor == null ? "" : String(valor).trim());

const decodificaTexto = (buffer: ArrayBuffer) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
};

const detectaSeparadorCsv = (texto: string) => {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? "";
  const pontoEVirgula = primeiraLinha.split(";").length;
  const virgula = primeiraLinha.split(",").length;
  return pontoEVirgula > virgula ? ";" : ",";
};

const lerAba = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const ehCsv = file.name.toLowerCase().endsWith(".csv");

  let wb: XLSX.WorkBook;

  if (ehCsv) {
    const texto = decodificaTexto(buffer);
    wb = XLSX.read(texto, { type: "string", FS: detectaSeparadorCsv(texto) });
  } else {
    wb = XLSX.read(buffer, { type: "array" });
  }

  const nomeAba = wb.SheetNames[0];

  if (!nomeAba) {
    throw new Error(`Não foi possível ler a planilha ${file.name}.`);
  }

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  return { nomeAba, matriz };
};

const atualizarImagens = async (
  blingFile: File,
  trayFile: File
): Promise<ResultadoAtualizacao> => {
  const tray = await lerAba(trayFile);
  const bling = await lerAba(blingFile);

  // Tray: Referência -> URLs das imagens
  const trayHeaders = (tray.matriz[0] ?? []).map(normaliza);
  const idxRef = trayHeaders.indexOf(COL_TRAY_CHAVE);

  if (idxRef === -1) {
    throw new Error(`Coluna "${COL_TRAY_CHAVE}" não encontrada na planilha Tray.`);
  }

  const idxImagens = COLUNAS_TRAY_IMAGEM.map((c) => trayHeaders.indexOf(c)).filter(
    (i) => i !== -1
  );
  const idxAdicionais = trayHeaders.indexOf(COL_TRAY_ADICIONAIS);

  const mapa = new Map<string, string>();

  for (const row of tray.matriz.slice(1)) {
    const ref = normaliza(row[idxRef]);
    if (!ref) continue;

    const imagens = idxImagens.map((i) => normaliza(row[i]));
    const adicionais =
      idxAdicionais === -1
        ? []
        : normaliza(row[idxAdicionais])
            .split(",")
            .map((u) => u.trim());

    const urls = [...imagens, ...adicionais].filter(
      (u) => u && !u.toLowerCase().includes("youtube.com")
    );

    mapa.set(ref, [...new Set(urls)].join("|"));
  }

  // Bling: aplica as URLs pelo Código
  const blingHeader = bling.matriz[0] ?? [];
  const blingHeaders = blingHeader.map(normaliza);
  const idxCodigo = blingHeaders.indexOf(COL_BLING_CHAVE);

  if (idxCodigo === -1) {
    throw new Error(`Coluna "${COL_BLING_CHAVE}" não encontrada na planilha Bling.`);
  }

  let idxDestino = blingHeaders.indexOf(COL_BLING_DESTINO);

  if (idxDestino === -1) {
    blingHeader.push(COL_BLING_DESTINO);
    idxDestino = blingHeader.length - 1;
  }

  const resultado: ResultadoAtualizacao = {
    atualizados: 0,
    semId: 0,
    semImagem: 0,
  };

  for (const row of bling.matriz.slice(1)) {
    const codigo = normaliza(row[idxCodigo]);
    if (!codigo) continue;

    while (row.length < blingHeader.length) row.push("");

    if (!mapa.has(codigo)) {
      resultado.semId++;
      continue;
    }

    const urls = mapa.get(codigo) ?? "";

    if (!urls) {
      resultado.semImagem++;
      continue;
    }

    row[idxDestino] = urls;
    resultado.atualizados++;
  }

  const ws = XLSX.utils.aoa_to_sheet(bling.matriz);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, bling.nomeAba);
  XLSX.writeFile(wb, NOME_SAIDA);

  return resultado;
};

export function useAtualizarImagensBlingTray() {
  const [planilhas, setPlanilhas] = useState<PlanilhasState>({
    bling: null,
    tray: null,
  });

  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string>("");
  const [resultado, setResultado] = useState<ResultadoAtualizacao | null>(null);

  const handleFileSelect = (key: ImagensPlanilhaKey, file: File | null) => {
    setPlanilhas((prev) => ({
      ...prev,
      [key]: file,
    }));

    setErro("");
    setResultado(null);
    setStatus("idle");
  };

  const limparArquivos = () => {
    setPlanilhas({
      bling: null,
      tray: null,
    });

    setErro("");
    setResultado(null);
    setStatus("idle");
  };

  const iniciarAutomacao = async () => {
    if (!planilhas.bling || !planilhas.tray) {
      const message = "Selecione as planilhas Bling e Tray.";

      setErro(message);
      setStatus("error");

      throw new Error(message);
    }

    setStatus("processing");
    setErro("");

    try {
      const res = await atualizarImagens(planilhas.bling, planilhas.tray);

      setResultado(res);
      setStatus("success");

      return res;
    } catch (err: any) {
      const message =
        err?.message || "Erro inesperado ao processar planilhas.";

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
    resultado,
    handleFileSelect,
    limparArquivos,
    iniciarAutomacao,
  };
}
