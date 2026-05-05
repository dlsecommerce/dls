"use client";

import { useState, useEffect } from "react";

type ComposicaoItem = {
  codigo: string;
  quantidade: string;
  custo: string;
  produto?: string;
  descricao?: string;
};

export function usePrecificacao() {
  const [composicao, setComposicao] = useState<ComposicaoItem[]>([]);

  const [calculo, setCalculo] = useState({
    desconto: "",
    imposto: "",
    margem: "", // lucro %
    frete: "",
    comissao: "",
    marketing: "",
  });

  const [acrescimos, setAcrescimos] = useState({
    precoLoja: "",
    precoShopee: "",
    precoMagalu: "",
    precoMercadoLivreClassico: "",
    precoMercadoLivrePremium: "",
    freteMercadoLivreClassico: "",
    freteMercadoLivrePremium: "",
    acrescimoClassico: 0,
    acrescimoPremium: 0,
  });

  const [alteracoes, setAlteracoes] = useState<
    {
      timestamp: string;
      tipo: string;
      campo: string;
      de: string;
      para: string;
      detalhe?: string;
    }[]
  >([]);

  // ==================================================
  // Parser seguro
  // ==================================================
  const parseBR = (v: string | number | null | undefined): number => {
    if (v === null || v === undefined || v === "") return 0;

    if (typeof v === "number") return v;

    const s = String(v).trim();

    if (s.includes(",")) {
      if (s.match(/\.\d{3},/)) {
        return Number(s.replace(/\./g, "").replace(",", "."));
      }

      return Number(s.replace(",", "."));
    }

    if (s.includes(".") && s.split(".")[1]?.length <= 2) {
      return Number(s);
    }

    return Number(s);
  };

  // ==================================================
  // Custo total
  // ==================================================
  const EMBALAGEM_FIXA = 2.5;

  const custoTotal = composicao.reduce(
    (sum, item) => sum + parseBR(item.custo) * parseBR(item.quantidade),
    0
  );

  // ==================================================
  // Fluxo antigo mantido para compatibilidade
  // ==================================================
  const desconto = parseBR(calculo.desconto) / 100;
  const imposto = parseBR(calculo.imposto) / 100;
  const lucro = parseBR(calculo.margem) / 100;
  const comissao = parseBR(calculo.comissao) / 100;
  const marketing = parseBR(calculo.marketing) / 100;
  const frete = parseBR(calculo.frete);

  const custoLiquido = custoTotal * (1 - desconto);
  const divisor = 1 - (imposto + lucro + comissao + marketing);

  const precoVenda =
    divisor > 0 ? (custoLiquido + frete + EMBALAGEM_FIXA) / divisor : 0;

  // ==================================================
  // Cálculo de acréscimo
  // ==================================================
  useEffect(() => {
    const precoLoja = parseBR(acrescimos.precoLoja);

    // =====================
    // CLÁSSICO
    // =====================
    const precoClassico = parseBR(acrescimos.precoMercadoLivreClassico);
    const freteClassico = parseBR(acrescimos.freteMercadoLivreClassico);

    const baseClassico = precoLoja + freteClassico;

    let acrescimoClassico = 0;

    if (baseClassico > 0 && precoClassico > 0) {
      acrescimoClassico = (precoClassico / baseClassico - 1) * 100;
    }

    // =====================
    // PREMIUM
    // =====================
    const precoPremium = parseBR(acrescimos.precoMercadoLivrePremium);
    const fretePremium = parseBR(acrescimos.freteMercadoLivrePremium);

    const basePremium = precoLoja + fretePremium;

    let acrescimoPremium = 0;

    if (basePremium > 0 && precoPremium > 0) {
      acrescimoPremium = (precoPremium / basePremium - 1) * 100;
    }

    setAcrescimos((prev) => ({
      ...prev,
      acrescimoClassico,
      acrescimoPremium,
    }));
  }, [
    acrescimos.precoLoja,
    acrescimos.precoMercadoLivreClassico,
    acrescimos.precoMercadoLivrePremium,
    acrescimos.freteMercadoLivreClassico,
    acrescimos.freteMercadoLivrePremium,
  ]);

  // ==================================================
  // Status baseado no Clássico
  // ==================================================
  const statusAcrescimo =
    acrescimos.acrescimoClassico > 0
      ? "Lucro"
      : acrescimos.acrescimoClassico < 0
      ? "Prejuízo"
      : "Neutro";

  // ==================================================
  // Composição
  // ==================================================
  const adicionarItem = () => {
    setComposicao((prev) => [
      ...prev,
      {
        codigo: "",
        produto: "",
        descricao: "",
        quantidade: "1",
        custo: "",
      },
    ]);

    registrarAlteracao("Inclusão", "Item", "-", "Novo item", "Item adicionado");
  };

  const removerItem = (idx: number) => {
    const item = composicao[idx];

    setComposicao((prev) => prev.filter((_, i) => i !== idx));

    registrarAlteracao(
      "Exclusão",
      "Item",
      item?.codigo || "-",
      "-",
      `Item removido (${item?.codigo || "sem código"})`
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