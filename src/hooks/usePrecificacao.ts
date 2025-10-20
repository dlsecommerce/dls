"use client";
import { useState, useEffect } from "react";

export function usePrecificacao() {
  const [composicao, setComposicao] = useState([
    { codigo: "", quantidade: "", custo: "" },
  ]);

  const [calculo, setCalculo] = useState({
    desconto: "",
    imposto: "",
    margem: "", // lucro %
    frete: "",
    comissao: "",
    marketing: "",
  });

  const [acrescimos, setAcrescimos] = useState({
    precoTray: "",
    precoMercadoLivre: "",
    freteMercadoLivre: "",
    acrescimo: 0,
  });

  const [alteracoes, setAlteracoes] = useState<
    { timestamp: string; tipo: string; campo: string; de: string; para: string; detalhe?: string }[]
  >([]);

  // ==================================================
  // 🔹 Função para parsear números (versão final segura)
  // ==================================================
  const parseBR = (v: string | number | null | undefined): number => {
    if (v === null || v === undefined || v === "") return 0;
    const s = String(v).trim();

    // Se já for número, retorna direto
    if (typeof v === "number") return v;

    // Caso tenha vírgula → formato BR (ex: 1.234,56 ou 10,00)
    if (s.includes(",")) {
      // Remove pontos de milhar apenas se houver ponto antes da vírgula
      if (s.match(/\.\d{3},/)) {
        return Number(s.replace(/\./g, "").replace(",", "."));
      }
      // Caso simples: "10,00" → "10.00"
      return Number(s.replace(",", "."));
    }

    // Caso decimal com ponto (ex: 1234.56)
    if (s.includes(".") && s.split(".")[1]?.length <= 2) {
      return Number(s);
    }

    // Caso número inteiro simples (ex: "10")
    return Number(s);
  };

  // ==================================================
  // 💰 Cálculo de custo total
  // ==================================================
  const custoTotal = composicao.reduce(
    (sum, item) => sum + parseBR(item.custo) * parseBR(item.quantidade),
    0
  );

  // ==================================================
  // 📊 Percentuais
  // ==================================================
  const desconto = parseBR(calculo.desconto) / 100;
  const imposto = parseBR(calculo.imposto) / 100;
  const lucro = parseBR(calculo.margem) / 100;
  const comissao = parseBR(calculo.comissao) / 100;
  const marketing = parseBR(calculo.marketing) / 100;
  const frete = parseBR(calculo.frete);

  // ==================================================
  // 🧮 Cálculo principal
  // ==================================================
  const custoLiquido = custoTotal * (1 - desconto);
  const divisor = 1 - (imposto + lucro + comissao + marketing);
  const precoVenda = divisor > 0 ? (custoLiquido + frete) / divisor : 0;

  // ==================================================
  // 📈 Cálculo de acréscimos
  // ==================================================
  useEffect(() => {
    const precoBase =
      parseBR(acrescimos.precoTray) + parseBR(acrescimos.freteMercadoLivre);
    const precoFinal = parseBR(acrescimos.precoMercadoLivre);

    if (precoBase > 0 && precoFinal > 0) {
      const percentual = (precoFinal / precoBase - 1) * 100;
      setAcrescimos((prev) => ({ ...prev, acrescimo: percentual }));
    } else {
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));
    }
  }, [
    acrescimos.precoTray,
    acrescimos.precoMercadoLivre,
    acrescimos.freteMercadoLivre,
  ]);

  const statusAcrescimo =
    acrescimos.acrescimo > 0
      ? "Lucro"
      : acrescimos.acrescimo < 0
      ? "Prejuízo"
      : "Neutro";

  // ==================================================
  // 🧱 Controle de composição
  // ==================================================
  const adicionarItem = () => {
    setComposicao([...composicao, { codigo: "", quantidade: "", custo: "" }]);
    registrarAlteracao("Inclusão", "Item", "-", "Novo item", "Item adicionado");
  };

  const removerItem = (idx: number) => {
    const item = composicao[idx];
    setComposicao(composicao.filter((_, i) => i !== idx));
    registrarAlteracao(
      "Exclusão",
      "Item",
      item.codigo,
      "-",
      `Item removido (${item.codigo})`
    );
  };

  const registrarAlteracao = (
    tipo: string,
    campo: string,
    de: string,
    para: string,
    detalhe?: string
  ) => {
    setAlteracoes((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleString(),
        tipo,
        campo,
        de,
        para,
        detalhe,
      },
    ]);
  };

  // ==================================================
  // 🔁 Retorno do hook
  // ==================================================
  return {
    composicao,
    setComposicao,
    calculo,
    setCalculo,
    acrescimos,
    setAcrescimos,
    custoTotal,
    precoVenda,
    statusAcrescimo,
    adicionarItem,
    removerItem,
    alteracoes,
    registrarAlteracao,
  };
}
