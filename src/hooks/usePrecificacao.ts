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

  // custo total
  const custoTotal = composicao.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.custo) || 0) * (parseFloat(item.quantidade) || 0),
    0
  );

  // percentuais
  const desconto = (parseFloat(calculo.desconto) || 0) / 100;
  const imposto = (parseFloat(calculo.imposto) || 0) / 100;
  const lucro = (parseFloat(calculo.margem) || 0) / 100;
  const comissao = (parseFloat(calculo.comissao) || 0) / 100;
  const marketing = (parseFloat(calculo.marketing) || 0) / 100;
  const frete = parseFloat(calculo.frete) || 0;

  // custo líquido após desconto
  const custoLiquido = custoTotal * (1 - desconto);

  // denominador
  const divisor = 1 - (imposto + lucro + comissao + marketing);

  // preço de venda
  const precoVenda =
    divisor > 0 ? (custoLiquido + frete) / divisor : 0;

  // cálculo de acréscimos com a lógica solicitada
  useEffect(() => {
    if (acrescimos.precoTray && acrescimos.precoMercadoLivre) {
      const precoBase = (parseFloat(acrescimos.precoTray) || 0) + (parseFloat(acrescimos.freteMercadoLivre) || 0);
      const precoFinal = parseFloat(acrescimos.precoMercadoLivre) || 0;

      if (precoBase > 0 && precoFinal > 0) {
        const percentual = (precoFinal / precoBase - 1) * 100;
        setAcrescimos((prev) => ({ ...prev, acrescimo: percentual }));
      } else {
        setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));
      }
    } else {
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));
    }
  }, [acrescimos.precoTray, acrescimos.precoMercadoLivre, acrescimos.freteMercadoLivre]);

  const statusAcrescimo =
    acrescimos.acrescimo > 0
      ? "Lucro"
      : acrescimos.acrescimo < 0
      ? "Prejuízo"
      : "Neutro";

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
