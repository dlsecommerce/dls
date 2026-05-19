"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Layers,
  Plus,
  Trash2,
  Pencil,
  Hash,
  Package,
  ShoppingBag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { VariationShopeeModal } from "./VariationShopeeModal";
import { supabase } from "@/integrations/supabase/client";

type CalculoLoja = {
  desconto: string | number;
  embalagem: string | number;
  frete: string | number;
  imposto: string | number;
  margem: string | number;
  comissao: string | number;
  marketing: string | number;
};

type Variation = {
  id?: string | number;
  ID?: string | number;

  marketplace_id?: string | number;
  id_marketplace?: string | number;
  id_anuncio?: string | number;
  anuncio_id?: string | number;
  id_logico?: string | number;

  sku?: string;
  nome?: string;
  Nome?: string;
  titulo?: string;

  valor?: string;
  estoque?: string | number;
  Estoque?: string | number;

  loja?: string;
  Loja?: string;

  tipo_anuncio?: string;

  referencia?: string;
  Referencia?: string;
  "Referência"?: string;

  id_var?: string | number;
  "ID Var"?: string | number;

  id_bling?: string;
  "ID Bling"?: string;

  id_tray?: string;
  "ID Tray"?: string;

  od?: string;
  OD?: string;

  categoria?: string;
  Categoria?: string;

  marca?: string;
  Marca?: string;

  peso?: string | number;
  Peso?: string | number;

  altura?: string | number;
  Altura?: string | number;

  largura?: string | number;
  Largura?: string | number;

  comprimento?: string | number;
  Comprimento?: string | number;

  marketplace?: string;
  canal?: string;
  marketplaces?: any[];

  link?: string;

  preco?: string | number;
  precoLoja?: string | number;
  preco_loja?: string | number;
  "Preço de Venda"?: string | number;

  status?: string;
  descricao?: string;

  desconto?: string | number;
  Desconto?: string | number;

  embalagem?: string | number;
  Embalagem?: string | number;

  frete?: string | number;
  Frete?: string | number;

  imposto?: string | number;
  Imposto?: string | number;

  margem?: string | number;
  margem_lucro?: string | number;
  "Margem de Lucro"?: string | number;

  comissao?: string | number;
  Comissao?: string | number;
  Comissão?: string | number;

  marketing?: string | number;
  Marketing?: string | number;

  calculoLoja?: Partial<CalculoLoja>;

  composicao?: any[];
  Composicao?: any[];
  "Composição"?: any[];

  custoTotal?: number | string;
  custo_total?: number | string;
  custo?: number | string;
  Custo?: number | string;
  "Custo Total"?: number | string;

  dados?: any;

  [key: string]: any;
};

type VariationShopeeSectionProps = {
  produto: any;
  setProduto: any;
  AnimatedNumber: ComponentType<{ value: number }>;
  onModalOpenChange?: (open: boolean) => void;
};

const removerAcentos = (value: string) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
};

const parseNumero = (value: any) => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let str = String(value).trim();

  str = str.replace(/[^\d.,-]/g, "");

  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");

  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }

  const n = Number(str);

  return Number.isFinite(n) ? n : 0;
};

const normalizarQuantidade = (value: any) => {
  if (value === null || value === undefined || value === "") return 1;

  const numero = parseNumero(value);

  return numero > 0 ? numero : 1;
};

const normalizeLojaCode = (lojaRaw: any): "PK" | "SB" | "" => {
  const s = String(lojaRaw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "");

  if (s === "PK" || s.startsWith("PK") || s.includes("PIKOT")) return "PK";
  if (s === "SB" || s.startsWith("SB") || s.includes("SOBA")) return "SB";

  return "";
};

const normalizarCodigoBaseNovoPadrao = (
  referencia?: string | null,
): string => {
  let ref = removerAcentos(String(referencia || "")).trim().toUpperCase();

  if (!ref) return "";

  while (/^\s*(PAI|VAR)\s*[-_\s]*/i.test(ref)) {
    ref = ref.replace(/^\s*(PAI|VAR)\s*[-_\s]*/i, "").trim();
  }

  ref = ref
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*_\s*/g, "_")
    .trim();

  const partes = ref
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length === 0) return "";

  const marca = partes[0];

  if (partes.length === 2) {
    return `${marca}-${partes[1]}`;
  }

  if (partes.length >= 3) {
    return `${marca}-${partes.slice(1).join("_")}`;
  }

  return ref.replace(/\s+/g, "");
};

const getReferenciaProduto = (produto: any) => {
  return (
    produto?.referencia ??
    produto?.Referencia ??
    produto?.["Referência"] ??
    produto?.sku ??
    ""
  );
};

const getReferenciaVariation = (variation: any) => {
  return (
    variation?.referencia ??
    variation?.Referencia ??
    variation?.["Referência"] ??
    variation?.sku ??
    variation?.dados?.referencia ??
    variation?.dados?.Referencia ??
    variation?.dados?.["Referência"] ??
    variation?.dados?.sku ??
    ""
  );
};

const getLojaProduto = (produto: any) => {
  return produto?.loja ?? produto?.Loja ?? "";
};

const criarReferenciaPaiNovoPadrao = (referencia?: string | null) => {
  const codigoBase = normalizarCodigoBaseNovoPadrao(referencia);
  return codigoBase ? `PAI-${codigoBase}` : "PAI-";
};

const criarReferenciaVariacaoNovoPadrao = (referencia?: string | null) => {
  const codigoBase = normalizarCodigoBaseNovoPadrao(referencia);
  return codigoBase ? `VAR-${codigoBase}` : "VAR-";
};

const criarPrimeiraReferenciaVariacaoDoPai = (produto: any) => {
  const referenciaPai = getReferenciaProduto(produto);
  const codigoBasePai = normalizarCodigoBaseNovoPadrao(referenciaPai);

  if (!codigoBasePai) return "VAR-";

  const partes = codigoBasePai.split("-");
  const marca = partes[0] || "";
  const codigos = (partes[1] || "").split("_").filter(Boolean);
  const primeiroCodigo = codigos[0] || "";

  if (!marca || !primeiroCodigo) return "VAR-";

  return `VAR-${marca}-${primeiroCodigo}`;
};

const normalizarComposicao = (composicao: any[]) => {
  return (Array.isArray(composicao) ? composicao : []).map((item: any) => ({
    ...item,
    codigo: item?.codigo ?? item?.Codigo ?? item?.Código ?? "",
    produto: item?.produto ?? item?.Produto ?? item?.descricao ?? "",
    descricao: item?.descricao ?? item?.produto ?? item?.Produto ?? "",
    quantidade: normalizarQuantidade(item?.quantidade ?? item?.Quantidade),
    custo: parseNumero(item?.custo ?? item?.Custo),
  }));
};

const getComposicaoFromDados = (dados: any) => {
  if (Array.isArray(dados?.composicao)) {
    return normalizarComposicao(dados.composicao);
  }

  if (Array.isArray(dados?.Composicao)) {
    return normalizarComposicao(dados.Composicao);
  }

  if (Array.isArray(dados?.["Composição"])) {
    return normalizarComposicao(dados["Composição"]);
  }

  const composicaoPorCodigos = Array.from({ length: 10 }, (_, index) => {
    const numero = index + 1;

    const codigo =
      dados?.[`Código ${numero}`] ??
      dados?.[`Codigo ${numero}`] ??
      dados?.[`codigo_${numero}`] ??
      dados?.[`codigo${numero}`] ??
      "";

    const quantidade =
      dados?.[`Quantidade ${numero}`] ??
      dados?.[`quantidade_${numero}`] ??
      dados?.[`quantidade${numero}`] ??
      "";

    if (!codigo) return null;

    return {
      codigo,
      produto: "",
      descricao: "",
      quantidade: normalizarQuantidade(quantidade),
      custo: 0,
    };
  }).filter(Boolean);

  return normalizarComposicao(composicaoPorCodigos as any[]);
};

const calcCustoTotal = (composicao: any[]) => {
  return normalizarComposicao(composicao).reduce((total, item) => {
    const quantidade = normalizarQuantidade(item?.quantidade);
    const custo = parseNumero(item?.custo);

    return total + quantidade * custo;
  }, 0);
};

const getCustoFromVariation = (variation: Variation, composicao: any[]) => {
  const dados = variation?.dados || {};

  const custoDireto =
    variation.custoTotal ??
    variation.custo_total ??
    variation.custo ??
    variation.Custo ??
    variation["Custo Total"] ??
    dados.custoTotal ??
    dados.custo_total ??
    dados.custo ??
    dados.Custo ??
    dados["Custo Total"];

  const custoNumerico = parseNumero(custoDireto);

  if (custoNumerico > 0) return custoNumerico;

  return calcCustoTotal(composicao);
};

const getCalculoLojaFromVariation = (variation: Variation): CalculoLoja => {
  const dados = variation?.dados || {};

  return {
    desconto:
      variation.calculoLoja?.desconto ??
      variation.desconto ??
      variation.Desconto ??
      dados.calculoLoja?.desconto ??
      dados.desconto ??
      dados.Desconto ??
      "",
    embalagem:
      variation.calculoLoja?.embalagem ??
      variation.embalagem ??
      variation.Embalagem ??
      dados.calculoLoja?.embalagem ??
      dados.embalagem ??
      dados.Embalagem ??
      "",
    frete:
      variation.calculoLoja?.frete ??
      variation.frete ??
      variation.Frete ??
      dados.calculoLoja?.frete ??
      dados.frete ??
      dados.Frete ??
      "",
    imposto:
      variation.calculoLoja?.imposto ??
      variation.imposto ??
      variation.Imposto ??
      dados.calculoLoja?.imposto ??
      dados.imposto ??
      dados.Imposto ??
      "",
    margem:
      variation.calculoLoja?.margem ??
      variation.margem ??
      variation.margem_lucro ??
      variation["Margem de Lucro"] ??
      dados.calculoLoja?.margem ??
      dados.margem ??
      dados.margem_lucro ??
      dados["Margem de Lucro"] ??
      "",
    comissao:
      variation.calculoLoja?.comissao ??
      variation.comissao ??
      variation.Comissao ??
      variation.Comissão ??
      dados.calculoLoja?.comissao ??
      dados.comissao ??
      dados.Comissao ??
      dados.Comissão ??
      "",
    marketing:
      variation.calculoLoja?.marketing ??
      variation.marketing ??
      variation.Marketing ??
      dados.calculoLoja?.marketing ??
      dados.marketing ??
      dados.Marketing ??
      "",
  };
};

const montarCamposPercentuaisSistema = (calculoLoja: CalculoLoja) => {
  return {
    calculoLoja,

    desconto: calculoLoja.desconto,
    Desconto: calculoLoja.desconto,

    embalagem: calculoLoja.embalagem,
    Embalagem: calculoLoja.embalagem,

    frete: calculoLoja.frete,
    Frete: calculoLoja.frete,

    imposto: calculoLoja.imposto,
    Imposto: calculoLoja.imposto,

    margem: calculoLoja.margem,
    margem_lucro: calculoLoja.margem,
    "Margem de Lucro": calculoLoja.margem,

    comissao: calculoLoja.comissao,
    Comissao: calculoLoja.comissao,
    Comissão: calculoLoja.comissao,

    marketing: calculoLoja.marketing,
    Marketing: calculoLoja.marketing,
  };
};

const getIdentificadorVariation = (variation: Variation) => {
  const referencia = getReferenciaVariation(variation);

  return String(
    variation.marketplace_id ??
      variation.id_marketplace ??
      variation.id ??
      variation.ID ??
      variation.id_logico ??
      variation.anuncio_id ??
      variation.id_anuncio ??
      variation.dados?.marketplace_id ??
      variation.dados?.id_marketplace ??
      variation.dados?.id ??
      variation.dados?.ID ??
      variation.dados?.id_logico ??
      variation.dados?.anuncio_id ??
      variation.dados?.id_anuncio ??
      referencia ??
      "",
  ).trim();
};

const normalizarMarketplacesShopee = (variation: Variation, referencia = "") => {
  const marketplaces = Array.isArray(variation.marketplaces)
    ? variation.marketplaces
    : Array.isArray(variation.dados?.marketplaces)
      ? variation.dados.marketplaces
      : [];

  if (marketplaces.length > 0) {
    return marketplaces.map((item: any) => ({
      marketplace: item?.marketplace || "Shopee",
      id_anuncio: item?.id_anuncio ?? item?.id ?? "",
      sku: item?.sku ?? referencia,
      link: item?.link ?? "",
    }));
  }

  return [
    {
      marketplace: "Shopee",
      id_anuncio:
        variation.id_anuncio ??
        variation.anuncio_id ??
        variation.ID ??
        variation.dados?.id_anuncio ??
        variation.dados?.anuncio_id ??
        variation.dados?.ID ??
        "",
      sku: variation.sku ?? referencia,
      link: variation.link ?? variation.dados?.link ?? "",
    },
  ];
};

const normalizarVariationParaSalvar = (
  variation: Variation,
  produtoPai?: any,
): Variation => {
  const referenciaFonte = getReferenciaVariation(variation);
  const referenciaNormalizada =
    criarReferenciaVariacaoNovoPadrao(referenciaFonte);

  const lojaPai = produtoPai?.loja ?? produtoPai?.Loja ?? variation.loja ?? "";
  const lojaPaiDisplay =
    produtoPai?.Loja ?? produtoPai?.loja ?? variation.Loja ?? lojaPai;

  const composicaoFonte = Array.isArray(variation.composicao)
    ? variation.composicao
    : Array.isArray(variation.dados?.composicao)
      ? variation.dados.composicao
      : [];

  const composicaoNormalizada = normalizarComposicao(composicaoFonte);

  const custoTotalNormalizado = getCustoFromVariation(
    variation,
    composicaoNormalizada,
  );

  const calculoLoja = getCalculoLojaFromVariation(variation);

  const preco =
    variation.preco ??
    variation.precoLoja ??
    variation.preco_loja ??
    variation["Preço de Venda"] ??
    variation.dados?.preco ??
    variation.dados?.precoLoja ??
    variation.dados?.preco_loja ??
    variation.dados?.["Preço de Venda"] ??
    "";

  const marketplaceId =
    variation.marketplace_id ??
    variation.id_marketplace ??
    variation.id ??
    variation.dados?.marketplace_id ??
    variation.dados?.id_marketplace ??
    variation.dados?.id ??
    "";

  const anuncioId =
    variation.anuncio_id ??
    variation.id_anuncio ??
    variation.ID ??
    variation.dados?.anuncio_id ??
    variation.dados?.id_anuncio ??
    variation.dados?.ID ??
    "";

  const idLogico =
    variation.id_logico ??
    variation.ID ??
    variation.anuncio_id ??
    variation.id_anuncio ??
    variation.dados?.id_logico ??
    variation.dados?.ID ??
    variation.dados?.anuncio_id ??
    variation.dados?.id_anuncio ??
    "";

  const idVar =
    variation.id_var ??
    variation["ID Var"] ??
    variation.dados?.id_var ??
    variation.dados?.["ID Var"] ??
    "";

  const camposPercentuais = montarCamposPercentuaisSistema(calculoLoja);
  const marketplacesShopee = normalizarMarketplacesShopee(
    variation,
    referenciaNormalizada,
  );

  return {
    ...variation,

    marketplace_id: marketplaceId,
    id_marketplace: marketplaceId,

    anuncio_id: anuncioId,
    id_anuncio: anuncioId,
    id_logico: idLogico,

    id: variation.id ?? variation.dados?.id ?? marketplaceId,
    ID: variation.ID ?? variation.dados?.ID ?? idLogico,

    loja: lojaPai,
    Loja: lojaPaiDisplay,

    marketplace: "Shopee",
    canal: "Shopee",

    tipo_anuncio: "variacoes",

    referencia: referenciaNormalizada,
    Referencia: referenciaNormalizada,
    "Referência": referenciaNormalizada,
    sku: referenciaNormalizada,

    titulo: variation.titulo || variation.nome || produtoPai?.nome || "",
    nome: variation.nome || variation.titulo || produtoPai?.nome || "",
    Nome:
      variation.Nome ||
      variation.nome ||
      variation.titulo ||
      produtoPai?.nome ||
      "",

    id_var: idVar,
    "ID Var": idVar,

    id_bling:
      variation.id_bling ??
      variation["ID Bling"] ??
      variation.dados?.id_bling ??
      variation.dados?.["ID Bling"] ??
      "",
    "ID Bling":
      variation["ID Bling"] ??
      variation.id_bling ??
      variation.dados?.["ID Bling"] ??
      variation.dados?.id_bling ??
      "",

    id_tray:
      variation.id_tray ??
      variation["ID Tray"] ??
      variation.dados?.id_tray ??
      variation.dados?.["ID Tray"] ??
      "",
    "ID Tray":
      variation["ID Tray"] ??
      variation.id_tray ??
      variation.dados?.["ID Tray"] ??
      variation.dados?.id_tray ??
      "",

    od: variation.od ?? variation.OD ?? variation.dados?.od ?? "",
    OD: variation.OD ?? variation.od ?? variation.dados?.OD ?? "",

    status: variation.status || variation.dados?.status || "ativo",

    ...camposPercentuais,

    preco,
    precoLoja: preco,
    preco_loja: preco,
    "Preço de Venda": preco,

    marketplaces: marketplacesShopee,

    composicao: composicaoNormalizada,
    Composicao: composicaoNormalizada,
    "Composição": composicaoNormalizada,

    custoTotal: custoTotalNormalizado,
    custo_total: custoTotalNormalizado,
    custo: custoTotalNormalizado,
    Custo: custoTotalNormalizado,
    "Custo Total": custoTotalNormalizado,

    dados: {
      ...(variation.dados || {}),
      ...variation,

      marketplace_id: marketplaceId,
      id_marketplace: marketplaceId,

      anuncio_id: anuncioId,
      id_anuncio: anuncioId,
      id_logico: idLogico,

      id: variation.id ?? variation.dados?.id ?? marketplaceId,
      ID: variation.ID ?? variation.dados?.ID ?? idLogico,

      loja: lojaPai,
      Loja: lojaPaiDisplay,

      marketplace: "Shopee",
      canal: "Shopee",

      tipo_anuncio: "variacoes",

      referencia: referenciaNormalizada,
      Referencia: referenciaNormalizada,
      "Referência": referenciaNormalizada,
      sku: referenciaNormalizada,

      titulo: variation.titulo || variation.nome || produtoPai?.nome || "",
      nome: variation.nome || variation.titulo || produtoPai?.nome || "",
      Nome:
        variation.Nome ||
        variation.nome ||
        variation.titulo ||
        produtoPai?.nome ||
        "",

      id_var: idVar,
      "ID Var": idVar,

      ...camposPercentuais,

      preco,
      precoLoja: preco,
      preco_loja: preco,
      "Preço de Venda": preco,

      marketplaces: marketplacesShopee,

      composicao: composicaoNormalizada,
      Composicao: composicaoNormalizada,
      "Composição": composicaoNormalizada,

      custoTotal: custoTotalNormalizado,
      custo_total: custoTotalNormalizado,
      custo: custoTotalNormalizado,
      Custo: custoTotalNormalizado,
      "Custo Total": custoTotalNormalizado,
    },
  };
};

const manterSomentePercentuaisEditaveis = (
  original: Variation,
  atualizado: Variation,
): Variation => {
  const calculoLojaAtualizado = getCalculoLojaFromVariation(atualizado);

  const composicaoOriginal = normalizarComposicao(
    Array.isArray(original.composicao)
      ? original.composicao
      : Array.isArray(original.dados?.composicao)
        ? original.dados.composicao
        : [],
  );

  const custoOriginal = getCustoFromVariation(original, composicaoOriginal);

  const precoOriginal =
    original.preco ??
    original.precoLoja ??
    original.preco_loja ??
    original["Preço de Venda"] ??
    original.dados?.preco ??
    original.dados?.precoLoja ??
    original.dados?.preco_loja ??
    original.dados?.["Preço de Venda"] ??
    "";

  const camposPercentuais = montarCamposPercentuaisSistema(
    calculoLojaAtualizado,
  );

  const merged: Variation = {
    ...original,
    ...atualizado,

    marketplace_id:
      original.marketplace_id ??
      original.id_marketplace ??
      original.id ??
      atualizado.marketplace_id ??
      atualizado.id_marketplace ??
      atualizado.id,
    id_marketplace:
      original.id_marketplace ??
      original.marketplace_id ??
      original.id ??
      atualizado.id_marketplace ??
      atualizado.marketplace_id ??
      atualizado.id,

    anuncio_id:
      original.anuncio_id ??
      original.id_anuncio ??
      original.ID ??
      atualizado.anuncio_id ??
      atualizado.id_anuncio ??
      atualizado.ID,
    id_anuncio:
      original.id_anuncio ??
      original.anuncio_id ??
      original.ID ??
      atualizado.id_anuncio ??
      atualizado.anuncio_id ??
      atualizado.ID,
    id_logico:
      original.id_logico ??
      original.ID ??
      original.anuncio_id ??
      atualizado.id_logico ??
      atualizado.ID ??
      atualizado.anuncio_id,

    id: original.id ?? atualizado.id,
    ID: original.ID ?? atualizado.ID,

    loja: original.loja ?? original.Loja ?? atualizado.loja,
    Loja: original.Loja ?? original.loja ?? atualizado.Loja,

    marketplace: "Shopee",
    canal: "Shopee",

    tipo_anuncio: original.tipo_anuncio ?? atualizado.tipo_anuncio,

    referencia:
      original.referencia ??
      original.Referencia ??
      original["Referência"] ??
      original.sku ??
      atualizado.referencia,
    Referencia:
      original.Referencia ??
      original.referencia ??
      original["Referência"] ??
      original.sku ??
      atualizado.Referencia,
    "Referência":
      original["Referência"] ??
      original.referencia ??
      original.Referencia ??
      original.sku ??
      atualizado["Referência"],
    sku:
      original.sku ??
      original.referencia ??
      original.Referencia ??
      original["Referência"] ??
      atualizado.sku,

    nome: original.nome ?? original.Nome ?? original.titulo ?? atualizado.nome,
    Nome: original.Nome ?? original.nome ?? original.titulo ?? atualizado.Nome,
    titulo:
      original.titulo ?? original.nome ?? original.Nome ?? atualizado.titulo,

    id_var: original.id_var ?? original["ID Var"] ?? atualizado.id_var,
    "ID Var": original["ID Var"] ?? original.id_var ?? atualizado["ID Var"],

    id_bling: original.id_bling ?? original["ID Bling"] ?? atualizado.id_bling,
    "ID Bling":
      original["ID Bling"] ?? original.id_bling ?? atualizado["ID Bling"],

    id_tray: original.id_tray ?? original["ID Tray"] ?? atualizado.id_tray,
    "ID Tray": original["ID Tray"] ?? original.id_tray ?? atualizado["ID Tray"],

    od: original.od ?? original.OD ?? atualizado.od,
    OD: original.OD ?? original.od ?? atualizado.OD,

    categoria: original.categoria ?? original.Categoria ?? atualizado.categoria,
    Categoria: original.Categoria ?? original.categoria ?? atualizado.Categoria,

    marca: original.marca ?? original.Marca ?? atualizado.marca,
    Marca: original.Marca ?? original.marca ?? atualizado.Marca,

    peso: original.peso ?? original.Peso ?? atualizado.peso,
    Peso: original.Peso ?? original.peso ?? atualizado.Peso,

    altura: original.altura ?? original.Altura ?? atualizado.altura,
    Altura: original.Altura ?? original.altura ?? atualizado.Altura,

    largura: original.largura ?? original.Largura ?? atualizado.largura,
    Largura: original.Largura ?? original.largura ?? atualizado.Largura,

    comprimento:
      original.comprimento ?? original.Comprimento ?? atualizado.comprimento,
    Comprimento:
      original.Comprimento ?? original.comprimento ?? atualizado.Comprimento,

    estoque: original.estoque ?? original.Estoque ?? atualizado.estoque,
    Estoque: original.Estoque ?? original.estoque ?? atualizado.Estoque,

    marketplaces: normalizarMarketplacesShopee(
      original,
      getReferenciaVariation(original),
    ),

    link: original.link ?? atualizado.link,

    preco: precoOriginal,
    precoLoja: precoOriginal,
    preco_loja: precoOriginal,
    "Preço de Venda": precoOriginal,

    status: original.status ?? atualizado.status,
    descricao: original.descricao ?? atualizado.descricao,

    composicao: composicaoOriginal,
    Composicao: composicaoOriginal,
    "Composição": composicaoOriginal,

    custoTotal: custoOriginal,
    custo_total: custoOriginal,
    custo: custoOriginal,
    Custo: custoOriginal,
    "Custo Total": custoOriginal,

    ...camposPercentuais,
  };

  return {
    ...merged,
    dados: {
      ...(original.dados || {}),
      ...(atualizado.dados || {}),
      ...merged,
      ...camposPercentuais,
    },
  };
};

const createEmptyVariation = (produto: any): Variation => {
  const referenciaVariacao = criarPrimeiraReferenciaVariacaoDoPai(produto);

  const loja = produto?.loja ?? produto?.Loja ?? "";
  const nome = produto?.nome ?? produto?.Nome ?? "";
  const marca = produto?.marca ?? produto?.Marca ?? "";
  const categoria = produto?.categoria ?? produto?.Categoria ?? "";

  const peso = produto?.peso ?? produto?.Peso ?? "";
  const altura = produto?.altura ?? produto?.Altura ?? "";
  const largura = produto?.largura ?? produto?.Largura ?? "";
  const comprimento = produto?.comprimento ?? produto?.Comprimento ?? "";

  const composicaoBase = Array.isArray(produto?.composicao)
    ? normalizarComposicao(produto.composicao)
    : [];

  const custoBase =
    produto?.custoTotal ??
    produto?.custo_total ??
    produto?.custo ??
    produto?.Custo ??
    produto?.["Custo Total"] ??
    0;

  const custoTotalBase =
    calcCustoTotal(composicaoBase) > 0
      ? calcCustoTotal(composicaoBase)
      : parseNumero(custoBase);

  const calculoLoja = {
    desconto: "",
    embalagem: "",
    frete: "",
    imposto: "",
    margem: "",
    comissao: "",
    marketing: "",
  };

  const variation: Variation = {
    loja,
    Loja: loja,

    marketplace: "Shopee",
    canal: "Shopee",

    tipo_anuncio: "variacoes",

    nome,
    Nome: nome,
    titulo: nome,

    referencia: referenciaVariacao,
    Referencia: referenciaVariacao,
    "Referência": referenciaVariacao,
    sku: referenciaVariacao,

    marketplace_id: "",
    id_marketplace: "",
    anuncio_id: "",
    id_anuncio: "",
    id_logico: "",

    id_var: "",
    "ID Var": "",

    id_bling: "",
    "ID Bling": "",

    id_tray: "",
    "ID Tray": "",

    od: "",
    OD: "",

    marketplaces: [
      {
        marketplace: "Shopee",
        id_anuncio: "",
        sku: referenciaVariacao,
        link: "",
      },
    ],

    link: "",

    preco: "",
    precoLoja: "",
    preco_loja: "",
    "Preço de Venda": "",

    status: "ativo",
    descricao: "",

    categoria,
    Categoria: categoria,

    marca,
    Marca: marca,

    peso,
    Peso: peso,

    altura,
    Altura: altura,

    largura,
    Largura: largura,

    comprimento,
    Comprimento: comprimento,

    estoque: "",
    Estoque: "",

    composicao: composicaoBase,
    custoTotal: custoTotalBase,
    custo_total: custoTotalBase,
    custo: custoTotalBase,
    Custo: custoTotalBase,
    "Custo Total": custoTotalBase,

    ...montarCamposPercentuaisSistema(calculoLoja),
  };

  return {
    ...variation,
    dados: {
      ...variation,
    },
  };
};

const mapBancoParaVariation = (v: any): Variation => {
  const dados = v?.dados || v || {};

  const referencia =
    v?.referencia ??
    v?.Referencia ??
    v?.["Referência"] ??
    dados?.referencia ??
    dados?.Referencia ??
    dados?.["Referência"] ??
    "";

  const composicao = getComposicaoFromDados(dados);

  const custoTotal =
    parseNumero(
      v?.custoTotal ??
        v?.custo_total ??
        v?.custo ??
        v?.Custo ??
        v?.["Custo Total"] ??
        dados.custoTotal ??
        dados.custo_total ??
        dados.custo ??
        dados.Custo ??
        dados["Custo Total"] ??
        0,
    ) || calcCustoTotal(composicao);

  const preco =
    v?.preco ??
    v?.precoLoja ??
    v?.preco_loja ??
    v?.["Preço de Venda"] ??
    dados.preco ??
    dados.precoLoja ??
    dados.preco_loja ??
    dados["Preço de Venda"] ??
    "";

  const calculoLoja: CalculoLoja = {
    desconto:
      v?.desconto ?? v?.Desconto ?? dados.desconto ?? dados.Desconto ?? "",
    embalagem:
      v?.embalagem ??
      v?.Embalagem ??
      dados.embalagem ??
      dados.Embalagem ??
      "",
    frete: v?.frete ?? v?.Frete ?? dados.frete ?? dados.Frete ?? "",
    imposto: v?.imposto ?? v?.Imposto ?? dados.imposto ?? dados.Imposto ?? "",
    margem:
      v?.margem ??
      v?.margem_lucro ??
      v?.["Margem de Lucro"] ??
      dados.margem ??
      dados.margem_lucro ??
      dados["Margem de Lucro"] ??
      "",
    comissao:
      v?.comissao ??
      v?.Comissao ??
      v?.Comissão ??
      dados.comissao ??
      dados.Comissao ??
      dados.Comissão ??
      "",
    marketing:
      v?.marketing ?? v?.Marketing ?? dados.marketing ?? dados.Marketing ?? "",
  };

  const idVar =
    v?.id_var ??
    v?.["ID Var"] ??
    dados?.["ID Var"] ??
    dados?.id_var ??
    dados?.ID_VAR ??
    "";

  const marketplaceId =
    v?.marketplace_id ??
    v?.id_marketplace ??
    v?.id ??
    dados?.marketplace_id ??
    dados?.id_marketplace ??
    dados?.id ??
    "";

  const anuncioId =
    v?.anuncio_id ??
    v?.id_anuncio ??
    v?.ID ??
    dados?.anuncio_id ??
    dados?.id_anuncio ??
    dados?.ID ??
    "";

  const idLogico =
    v?.id_logico ??
    v?.ID ??
    v?.anuncio_id ??
    dados?.id_logico ??
    dados?.ID ??
    dados?.anuncio_id ??
    "";

  const base: Variation = {
    ...dados,
    ...v,

    marketplace_id: marketplaceId,
    id_marketplace: marketplaceId,

    anuncio_id: anuncioId,
    id_anuncio: anuncioId,
    id_logico: idLogico,

    id: v?.id ?? dados?.id ?? marketplaceId,
    ID: v?.ID ?? dados?.ID ?? idLogico,

    loja: v?.loja ?? v?.Loja ?? dados.Loja ?? dados.loja,
    Loja: v?.Loja ?? v?.loja ?? dados.Loja ?? dados.loja,

    marketplace: "Shopee",
    canal: "Shopee",

    tipo_anuncio: "variacoes",

    referencia,
    Referencia: referencia,
    "Referência": referencia,
    sku: referencia,

    nome: v?.nome ?? v?.Nome ?? dados.Nome ?? dados.nome,
    Nome: v?.Nome ?? v?.nome ?? dados.Nome ?? dados.nome,
    titulo: dados.titulo ?? dados.Titulo ?? v?.nome ?? dados.Nome ?? dados.nome,

    marca: v?.marca ?? v?.Marca ?? dados.Marca ?? dados.marca,
    Marca: v?.Marca ?? v?.marca ?? dados.Marca ?? dados.marca,

    id_var: idVar,
    "ID Var": idVar,

    categoria:
      v?.categoria ?? v?.Categoria ?? dados.Categoria ?? dados.categoria ?? "",
    Categoria:
      v?.Categoria ?? v?.categoria ?? dados.Categoria ?? dados.categoria ?? "",

    id_bling:
      v?.id_bling ?? v?.["ID Bling"] ?? dados["ID Bling"] ?? dados.id_bling,
    "ID Bling":
      v?.["ID Bling"] ?? v?.id_bling ?? dados["ID Bling"] ?? dados.id_bling,

    id_tray: v?.id_tray ?? v?.["ID Tray"] ?? dados["ID Tray"] ?? dados.id_tray,
    "ID Tray":
      v?.["ID Tray"] ?? v?.id_tray ?? dados["ID Tray"] ?? dados.id_tray,

    od: v?.od ?? v?.OD ?? dados.OD ?? dados.od,
    OD: v?.OD ?? v?.od ?? dados.OD ?? dados.od,

    peso: v?.peso ?? v?.Peso ?? dados.Peso ?? dados.peso ?? "",
    Peso: v?.Peso ?? v?.peso ?? dados.Peso ?? dados.peso ?? "",

    altura: v?.altura ?? v?.Altura ?? dados.Altura ?? dados.altura ?? "",
    Altura: v?.Altura ?? v?.altura ?? dados.Altura ?? dados.altura ?? "",

    largura: v?.largura ?? v?.Largura ?? dados.Largura ?? dados.largura ?? "",
    Largura: v?.Largura ?? v?.largura ?? dados.Largura ?? dados.largura ?? "",

    comprimento:
      v?.comprimento ??
      v?.Comprimento ??
      dados.Comprimento ??
      dados.comprimento ??
      "",
    Comprimento:
      v?.Comprimento ??
      v?.comprimento ??
      dados.Comprimento ??
      dados.comprimento ??
      "",

    estoque: v?.estoque ?? v?.Estoque ?? dados.Estoque ?? dados.estoque ?? "",
    Estoque: v?.Estoque ?? v?.estoque ?? dados.Estoque ?? dados.estoque ?? "",

    preco,
    precoLoja: preco,
    preco_loja: preco,
    "Preço de Venda": preco,

    ...montarCamposPercentuaisSistema(calculoLoja),

    status: v?.status ?? dados.status ?? "ativo",

    composicao,
    Composicao: composicao,
    "Composição": composicao,

    custoTotal,
    custo_total: custoTotal,
    custo: custoTotal,
    Custo: custoTotal,
    "Custo Total": custoTotal,

    marketplaces: normalizarMarketplacesShopee(
      {
        ...dados,
        ...v,
      },
      referencia,
    ),
  };

  return {
    ...base,
    dados: {
      ...dados,
      ...base,
      ...montarCamposPercentuaisSistema(calculoLoja),
    },
  };
};

export const VariationShopeeSection = ({
  produto,
  setProduto,
  AnimatedNumber,
  onModalOpenChange,
}: VariationShopeeSectionProps) => {
  const [open, setOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<
    number | null
  >(null);

  const [variationDraft, setVariationDraft] = useState<Variation | null>(null);
  const [variationComposicao, setVariationComposicao] = useState<any[]>([]);

  const setVariationModalOpenState = (openState: boolean) => {
    setModalOpen(openState);
    onModalOpenChange?.(openState);
  };

  useEffect(() => {
    const carregarVariacoesDoPai = async () => {
      const referenciaPai = getReferenciaProduto(produto);
      const lojaPai = getLojaProduto(produto);
      const lojaCode = normalizeLojaCode(lojaPai);

      if (!referenciaPai || !lojaCode) return;

      const referenciaPaiNormalizada =
        criarReferenciaPaiNovoPadrao(referenciaPai);

      if (!String(referenciaPaiNormalizada).toUpperCase().startsWith("PAI-")) {
        return;
      }

      const { data, error } = await supabase.rpc("buscar_variacoes_do_pai", {
        p_loja: lojaCode,
        p_referencia_pai: referenciaPaiNormalizada,
      });

      if (error) {
        console.error("Erro ao carregar variações Shopee do pai:", error);
        return;
      }

      const variacoesCarregadas: Variation[] = (data || []).map(
        mapBancoParaVariation,
      );

      setProduto((p: any) => {
        const variacoesAtuais = Array.isArray(p?.variacoes) ? p.variacoes : [];

        const mapaAtuais = new Map<string, Variation>();

        variacoesAtuais.forEach((item: Variation) => {
          const chave = getIdentificadorVariation(item);

          if (chave) {
            mapaAtuais.set(String(chave), item);
          }

          const ref = getReferenciaVariation(item);

          if (ref) {
            mapaAtuais.set(String(ref), item);
          }
        });

        const mescladas = variacoesCarregadas.map((item) => {
          const chave = getIdentificadorVariation(item);
          const ref = getReferenciaVariation(item);

          const existente =
            mapaAtuais.get(String(chave)) || mapaAtuais.get(String(ref));

          if (!existente) return normalizarVariationParaSalvar(item, p);

          return normalizarVariationParaSalvar(
            {
              ...item,
              ...existente,
              composicao:
                Array.isArray(existente.composicao) &&
                existente.composicao.length > 0
                  ? existente.composicao
                  : item.composicao,
              custoTotal:
                existente.custoTotal ??
                existente.custo_total ??
                existente.custo ??
                existente.Custo ??
                item.custoTotal,
              custo_total:
                existente.custo_total ??
                existente.custoTotal ??
                existente.custo ??
                existente.Custo ??
                item.custo_total,
              calculoLoja: {
                ...getCalculoLojaFromVariation(item),
                ...getCalculoLojaFromVariation(existente),
              },
              marketplaces:
                Array.isArray(existente.marketplaces) &&
                existente.marketplaces.length > 0
                  ? existente.marketplaces
                  : item.marketplaces,
            },
            p,
          );
        });

        const referenciasCarregadas = new Set(
          mescladas.map((item) => String(getReferenciaVariation(item))),
        );

        const locaisNaoCarregados = variacoesAtuais.filter(
          (item: Variation) => {
            const ref = String(getReferenciaVariation(item));
            return ref && !referenciasCarregadas.has(ref);
          },
        );

        return {
          ...p,
          marketplace: "Shopee",
          canal: "Shopee",
          tipo_anuncio: "variacoes",

          referencia: referenciaPaiNormalizada,
          Referencia: referenciaPaiNormalizada,
          "Referência": referenciaPaiNormalizada,
          sku: referenciaPaiNormalizada,

          variacoes: [
            ...mescladas,
            ...locaisNaoCarregados.map((item: Variation) =>
              normalizarVariationParaSalvar(item, p),
            ),
          ],
        };
      });
    };

    carregarVariacoesDoPai();
  }, [
    produto?.id,
    produto?.ID,
    produto?.referencia,
    produto?.Referencia,
    produto?.["Referência"],
    produto?.sku,
    produto?.loja,
    produto?.Loja,
    setProduto,
  ]);

  const variacoes: Variation[] = useMemo(() => {
    if (Array.isArray(produto?.variacoes)) return produto.variacoes;
    return [];
  }, [produto?.variacoes]);

  const variationCustoTotal = useMemo(() => {
    return calcCustoTotal(variationComposicao);
  }, [variationComposicao]);

  const updateVariations = (next: Variation[]) => {
    const referenciaPaiNormalizada = criarReferenciaPaiNovoPadrao(
      getReferenciaProduto(produto),
    );

    setProduto((p: any) => ({
      ...p,

      marketplace: "Shopee",
      canal: "Shopee",
      tipo_anuncio: "variacoes",

      referencia: referenciaPaiNormalizada,
      Referencia: referenciaPaiNormalizada,
      "Referência": referenciaPaiNormalizada,
      sku: referenciaPaiNormalizada,

      variacoes: next.map((item) => normalizarVariationParaSalvar(item, p)),
    }));
  };

  const openNewVariation = () => {
    const newVariation = createEmptyVariation(produto);

    setSelectedVariationIndex(null);
    setVariationDraft(newVariation);
    setVariationComposicao(newVariation.composicao ?? []);
    setVariationModalOpenState(true);
    setOpen(true);
  };

  const openEditVariation = (variation: Variation, index: number) => {
    const composicaoNormalizada = normalizarComposicao(
      Array.isArray(variation.composicao)
        ? variation.composicao
        : Array.isArray(variation.dados?.composicao)
          ? variation.dados.composicao
          : [],
    );

    const custoCalculado = getCustoFromVariation(
      variation,
      composicaoNormalizada,
    );

    const normalizedVariation = normalizarVariationParaSalvar(
      {
        ...variation,
        sku:
          variation.sku ??
          variation.referencia ??
          variation.Referencia ??
          variation["Referência"] ??
          "",
        referencia:
          variation.referencia ??
          variation.sku ??
          variation.Referencia ??
          variation["Referência"] ??
          "",
        composicao: composicaoNormalizada,
        custoTotal:
          variation.custoTotal ??
          variation.custo_total ??
          variation.custo ??
          variation.Custo ??
          custoCalculado,
        custo_total:
          variation.custo_total ??
          variation.custoTotal ??
          variation.custo ??
          variation.Custo ??
          custoCalculado,
      },
      produto,
    );

    setSelectedVariationIndex(index);
    setVariationDraft(normalizedVariation);

    setVariationComposicao(
      Array.isArray(normalizedVariation.composicao)
        ? normalizedVariation.composicao
        : [],
    );

    setVariationModalOpenState(true);
    setOpen(true);
  };

  const closeModal = () => {
    setVariationModalOpenState(false);
    setSelectedVariationIndex(null);
    setVariationDraft(null);
    setVariationComposicao([]);
  };

  const saveVariation = async (draftAtualizado?: Variation) => {
    const draft = draftAtualizado ?? variationDraft;

    if (!draft) return;

    const composicaoBase =
      Array.isArray(draft.composicao) && draft.composicao.length > 0
        ? draft.composicao
        : variationComposicao;

    const composicaoNormalizada = normalizarComposicao(composicaoBase);

    const custoTotalNormalizado = getCustoFromVariation(
      draft,
      composicaoNormalizada,
    );

    const variationToSave: Variation = normalizarVariationParaSalvar(
      {
        ...draft,
        marketplace: "Shopee",
        canal: "Shopee",
        sku:
          draft.sku ||
          draft.referencia ||
          draft.Referencia ||
          draft["Referência"] ||
          "",
        referencia:
          draft.referencia ||
          draft.sku ||
          draft.Referencia ||
          draft["Referência"] ||
          "",
        composicao: composicaoNormalizada,
        custoTotal: custoTotalNormalizado,
        custo_total: custoTotalNormalizado,
      },
      produto,
    );

    const variationFinal: Variation =
      selectedVariationIndex === null
        ? variationToSave
        : manterSomentePercentuaisEditaveis(
            normalizarVariationParaSalvar(
              variacoes[selectedVariationIndex],
              produto,
            ),
            variationToSave,
          );

    const next =
      selectedVariationIndex === null
        ? (() => {
            const novaRef = String(getReferenciaVariation(variationFinal));
            const novaChave = String(getIdentificadorVariation(variationFinal));

            const jaExiste = variacoes.some((item) => {
              const ref = String(getReferenciaVariation(item));
              const chave = String(getIdentificadorVariation(item));

              return (
                (novaRef && ref === novaRef) ||
                (novaChave && chave === novaChave)
              );
            });

            if (!jaExiste) return [...variacoes, variationFinal];

            return variacoes.map((item) => {
              const ref = String(getReferenciaVariation(item));
              const chave = String(getIdentificadorVariation(item));

              if (
                (novaRef && ref === novaRef) ||
                (novaChave && chave === novaChave)
              ) {
                return variationFinal;
              }

              return item;
            });
          })()
        : variacoes.map((item, index) =>
            index === selectedVariationIndex ? variationFinal : item,
          );

    updateVariations(next);
    closeModal();
  };

  const removeVariation = (index: number) => {
    updateVariations(variacoes.filter((_, i) => i !== index));
  };

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-start justify-between gap-4 text-left transition-colors duration-300 hover:text-white"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
                6.
              </span>

              <h2 className="text-base font-semibold text-white">
                Variações Shopee
              </h2>

              {variacoes.length > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/50">
                  {variacoes.length}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Gerencie as variações do anúncio Shopee.
            </p>
          </div>

          <motion.div
            animate={{ rotate: open ? 0 : 180 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-1 shrink-0"
          >
            <ChevronUp className="h-4 w-4 text-white/45" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="shopee-variations-content"
              initial={{
                height: 0,
                opacity: 0,
                y: -6,
              }}
              animate={{
                height: "auto",
                opacity: 1,
                y: 0,
              }}
              exit={{
                height: 0,
                opacity: 0,
                y: -6,
              }}
              transition={{
                height: {
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.45,
                  ease: "easeOut",
                },
                y: {
                  duration: 0.45,
                  ease: "easeOut",
                },
              }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                {variacoes.length > 0 ? (
                  <div className="space-y-3">
                    {variacoes.map((variation, index) => {
                      const referencia =
                        variation.referencia ||
                        variation["Referência"] ||
                        variation.sku ||
                        `Variação ${index + 1}`;

                      const idVar =
                        variation.id_var ||
                        variation["ID Var"] ||
                        variation.valor ||
                        variation.id_logico ||
                        variation.anuncio_id ||
                        variation.ID ||
                        variation.id ||
                        "Não informado";

                      return (
                        <div
                          key={
                            getIdentificadorVariation(variation) ||
                            `${referencia}-${index}`
                          }
                          className="
                            group rounded-xl border border-white/10 bg-[#0f0f0f] p-3
                            transition-all duration-200
                            hover:border-[#1a8ceb]/35 hover:bg-[#121212]
                          "
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                openEditVariation(variation, index)
                              }
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1a8ceb]/20 bg-[#1a8ceb]/10">
                                <ShoppingBag className="h-4 w-4 text-[#1a8ceb]" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {referencia}
                                  </p>
                                </div>

                                <p className="mt-1 truncate text-xs text-white/45">
                                  {variation.nome ||
                                    variation.titulo ||
                                    variation.Nome ||
                                    "Sem título definido"}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                    <Hash className="h-3 w-3 text-[#1a8ceb]/70" />
                                    ID variação: {idVar}
                                  </span>

                                  {variation.estoque !== undefined &&
                                    variation.estoque !== "" && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                        <Package className="h-3 w-3 text-[#1a8ceb]/70" />
                                        Estoque: {variation.estoque}
                                      </span>
                                    )}

                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                    <Layers className="h-3 w-3 text-[#1a8ceb]/70" />
                                    Shopee
                                  </span>
                                </div>
                              </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                type="button"
                                onClick={() =>
                                  openEditVariation(variation, index)
                                }
                                variant="ghost"
                                size="sm"
                                className="
                                  h-8 w-8 cursor-pointer rounded-lg border border-white/10
                                  bg-white/[0.03] p-0 text-white/50
                                  hover:bg-white/[0.06] hover:text-white
                                "
                                title="Editar variação Shopee"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVariation(index);
                                }}
                                variant="ghost"
                                size="sm"
                                className="
                                  h-8 w-8 cursor-pointer rounded-lg border border-red-500/20
                                  bg-red-500/10 p-0 text-red-400
                                  hover:bg-red-500/20 hover:text-red-300
                                "
                                title="Remover variação Shopee"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-5 text-center">
                    <p className="text-sm font-medium text-white/75">
                      Nenhuma variação Shopee adicionada
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Adicione variações como tamanho, cor, modelo ou kit para o
                      anúncio da Shopee.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={openNewVariation}
                  variant="outline"
                  className="
                    mt-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-xl
                    border border-white/10 bg-transparent
                    px-4 text-xs font-semibold text-white/85
                    shadow-none transition-all duration-200
                    hover:border-white/20 hover:bg-white/[0.03] hover:text-white
                    active:scale-[0.99]
                    focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/50
                    focus-visible:ring-offset-0
                  "
                >
                  <Plus className="mr-2 h-3.5 w-3.5 text-white/70" />
                  Adicionar variação Shopee
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <VariationShopeeModal
        open={modalOpen}
        variation={variationDraft}
        setVariation={setVariationDraft}
        composicao={variationComposicao}
        setComposicao={setVariationComposicao}
        custoTotal={variationCustoTotal}
        AnimatedNumber={AnimatedNumber}
        isEditing={selectedVariationIndex !== null}
        onClose={closeModal}
        onSave={saveVariation}
      />
    </>
  );
};

export default VariationShopeeSection;