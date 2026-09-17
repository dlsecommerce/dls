"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";
import { loadMarketplaceChannelRule } from "@/components/costs/hooks/usepricingrules";

import { ProductSection } from "./parts/ProductSection";
import { CostComposition } from "./parts/CostComposition";
import { PriceCalculationSection } from "./parts/PriceCalculationSection";

export type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
  embalagem?: string;
};

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
  marca?: string;
  packingCost?: number; // ✅ NOVO: packing_cost do item (costs)
};

type TipoBuscaProduto = "codigo" | "descricao";

// =====================
// Embalagem padrão (fallback), usada SOMENTE quando nenhum item
// da composição tem packing_cost cadastrado em `costs`.
// =====================
const EMBALAGEM_PADRAO = "5";

// =====================
// Nomes de canal exatamente como salvos pelo ChannelPricingRulesModal
// =====================
const CHANNEL_DB_NAME = {
  shopee: "Shopee",
  magalu: "Magalu",
  mercadoLivre: "Mercado Livre",
  tiktok: "TikTok Shop",
};

// =====================
// Helpers de número
// =====================
const toInternal = (v: string): string => {
  if (!v) return "";

  let s = v.replace(/\s+/g, "");

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  s = s.replace(/[^\d.-]/g, "");

  const parts = s.split(".");

  if (parts.length > 2) {
    s = parts.shift()! + "." + parts.join("");
  }

  return s;
};

const toDisplay = (v: string): string => {
  if (!v) return "";

  const num = Number(v);

  if (!isFinite(num)) return v;

  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// =====================
// Debounce genérico
// =====================
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);

    timer = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => clearTimeout(timer);

  return debounced as T & {
    cancel: () => void;
  };
}

// =====================
// Faixas oficiais HARDCODED (fallback final)
// =====================
type PriceTierLike = {
  min: number;
  max: number;
  frete: string;
  comissao: string;
};

const SHOPEE_TIERS: PriceTierLike[] = [
  { min: 0, max: 79.99, frete: "4", comissao: "20" },
  { min: 80, max: 99.99, frete: "16", comissao: "14" },
  { min: 100, max: 199.99, frete: "20", comissao: "14" },
  { min: 200, max: Infinity, frete: "26", comissao: "14" },
];

const TIKTOK_TIERS: PriceTierLike[] = [
  { min: 0, max: 49.99, frete: "4", comissao: "10" },
  { min: 50, max: Infinity, frete: "6", comissao: "6" },
];

function resolveFlatOrBrandRule(
  rule: any | null,
  marca: string,
  fallback: { comissao: string; frete: string }
): { comissao: string; frete: string } | null {
  if (!rule) return null;

  if (rule.pricing_mode === "flat") {
    return {
      comissao: String(rule.comissao ?? fallback.comissao),
      frete: String(rule.frete ?? fallback.frete),
    };
  }

  if (rule.pricing_mode === "brand") {
    const brandRule = rule.brand_rules?.find(
      (b: any) => (b.brand || "").toLowerCase() === marca.toLowerCase()
    );

    const source = brandRule ?? rule.default_rule;

    if (source) {
      return {
        comissao: String((source.commission_rate ?? 0) * 100),
        frete: String(source.fixed_fee ?? 0),
      };
    }
  }

  return null;
}

function tiersFromRule(rule: any | null): PriceTierLike[] | null {
  if (!rule || rule.pricing_mode !== "tiered") return null;
  if (!Array.isArray(rule.commission_tiers) || !rule.commission_tiers.length) {
    return null;
  }

  return rule.commission_tiers.map((t: any) => ({
    min: Number(t.min) || 0,
    max: t.max != null && t.max !== "" ? Number(t.max) : Infinity,
    frete: String(t.fixedFee ?? 0),
    comissao: String((t.rate ?? 0) * 100),
  }));
}

function resolveMLListingRule(
  rule: any | null,
  listingType: "classico" | "premium",
  fallback: { comissao: string; frete: string }
): { comissao: string; frete: string } | null {
  if (!rule?.listing_type_rules) return null;

  const lt = rule.listing_type_rules[listingType];

  if (!lt) return null;

  return {
    comissao: String((lt.commission_rate ?? 0) * 100),
    frete: lt.frete != null ? String(lt.frete) : fallback.frete,
  };
}

// =====================
// ✅ NOVO: resolve a "marca ativa" a partir do primeiro item
// preenchido da composição que tenha marca cadastrada.
// =====================
function resolveMarcaAtiva(composicao: any[]): string {
  const item = composicao.find((i: any) => String(i?.marca || "").trim());
  return item?.marca || "";
}

export default function PricingCalculatorModern() {
  const {
    composicao,
    setComposicao,
    acrescimos,
    setAcrescimos,
    custoTotal,
    statusAcrescimo,
    adicionarItem,
    removerItem,
  } = usePrecificacao();

  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [produtoDescricao, setProdutoDescricao] = useState("");
  const [produtoMarca, setProdutoMarca] = useState("");

  // =====================
  // Sugestões do Produto
  // =====================
  const [sugestoesProduto, setSugestoesProduto] = useState<Sugestao[]>([]);

  const [produtoSugestaoAtiva, setProdutoSugestaoAtiva] = useState(false);

  const [indiceProdutoSelecionado, setIndiceProdutoSelecionado] = useState(-1);

  const listaProdutoRef = useRef<HTMLDivElement>(null);
  const ultimaBuscaProdutoRef = useRef("");

  // =====================
  // Regras salvas no banco por canal
  // =====================
  const [marketplaceRules, setMarketplaceRules] = useState<{
    shopee: any | null;
    magalu: any | null;
    mercadoLivre: any | null;
    tiktok: any | null;
  }>({
    shopee: null,
    magalu: null,
    mercadoLivre: null,
    tiktok: null,
  });

  useEffect(() => {
    let active = true;

    Promise.all([
      loadMarketplaceChannelRule(CHANNEL_DB_NAME.shopee),
      loadMarketplaceChannelRule(CHANNEL_DB_NAME.magalu),
      loadMarketplaceChannelRule(CHANNEL_DB_NAME.mercadoLivre),
      loadMarketplaceChannelRule(CHANNEL_DB_NAME.tiktok),
    ])
      .then(([shopee, magalu, mercadoLivre, tiktok]) => {
        if (!active) return;

        setMarketplaceRules({
          shopee: shopee ?? null,
          magalu: magalu ?? null,
          mercadoLivre: mercadoLivre ?? null,
          tiktok: tiktok ?? null,
        });
      })
      .catch(() => {
        // Falha ao buscar regras do banco: mantém apenas o
        // fallback hardcoded, sem quebrar a calculadora.
      });

    return () => {
      active = false;
    };
  }, []);

  // =====================
  // Cálculos por canal
  // =====================
  const [calculoLoja, setCalculoLoja] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "",
    comissao: "6",
    marketing: "3",
    embalagem: EMBALAGEM_PADRAO,
  });

  const [calculoShopee, setCalculoShopee] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "4",
    comissao: "20",
    marketing: "3",
    embalagem: EMBALAGEM_PADRAO,
  });

  const [calculoMagalu, setCalculoMagalu] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "10",
    frete: "",
    comissao: "20",
    marketing: "3",
    embalagem: EMBALAGEM_PADRAO,
  });

  const [calculoMarketplaceClassico, setCalculoMarketplaceClassico] =
    useState<Calculo>({
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "",
      comissao: "11",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    });

  const [calculoMarketplacePremium, setCalculoMarketplacePremium] =
    useState<Calculo>({
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "",
      comissao: "16",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    });

  const [calculoTiktok, setCalculoTiktok] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "4",
    comissao: "10",
    marketing: "3",
    embalagem: EMBALAGEM_PADRAO,
  });

  // =====================
  // FLAGS PARA EDIÇÃO MANUAL SHOPEE
  // =====================
  const [userEditedShopeeComissao, setUserEditedShopeeComissao] =
    useState(false);

  const [userEditedShopeeFrete, setUserEditedShopeeFrete] = useState(false);

  const [userEditedShopeeImposto, setUserEditedShopeeImposto] =
    useState(false);

  const [userEditedShopeeMargem, setUserEditedShopeeMargem] = useState(false);

  const [userEditedShopeeMarketing, setUserEditedShopeeMarketing] =
    useState(false);

  const [userEditedShopeeEmbalagem, setUserEditedShopeeEmbalagem] =
    useState(false);

  // =====================
  // FLAGS PARA EDIÇÃO MANUAL TIKTOK
  // =====================
  const [userEditedTiktokComissao, setUserEditedTiktokComissao] =
    useState(false);

  const [userEditedTiktokFrete, setUserEditedTiktokFrete] = useState(false);

  // =====================
  // FLAGS PARA EDIÇÃO MANUAL — Loja / Magalu / ML Clássico / ML Premium
  // =====================
  const [userEditedLojaComissao, setUserEditedLojaComissao] = useState(false);
  const [userEditedLojaFrete, setUserEditedLojaFrete] = useState(false);

  const [userEditedMagaluComissao, setUserEditedMagaluComissao] =
    useState(false);
  const [userEditedMagaluFrete, setUserEditedMagaluFrete] = useState(false);

  const [userEditedMLClassicoComissao, setUserEditedMLClassicoComissao] =
    useState(false);
  const [userEditedMLClassicoFrete, setUserEditedMLClassicoFrete] =
    useState(false);

  const [userEditedMLPremiumComissao, setUserEditedMLPremiumComissao] =
    useState(false);
  const [userEditedMLPremiumFrete, setUserEditedMLPremiumFrete] =
    useState(false);

  // =====================
  // Sugestões Supabase da Composição
  // =====================
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);

  const listaRef = useRef<HTMLDivElement>(null);

  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const calcLojaRefs = useRef<HTMLInputElement[]>([]);
  const calcShopeeRefs = useRef<HTMLInputElement[]>([]);
  const calcMagaluRefs = useRef<HTMLInputElement[]>([]);
  const calcMLClassicoRefs = useRef<HTMLInputElement[]>([]);
  const calcMLPremiumRefs = useRef<HTMLInputElement[]>([]);
  const calcTiktokRefs = useRef<HTMLInputElement[]>([]);
  const acrescimosRefs = useRef<HTMLInputElement[]>([]);

  // =====================
  // Controle de edição
  // =====================
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());

  const setEditing = (key: string, editing: boolean) => {
    setEditingFields((prev) => {
      const next = new Set(prev);

      if (editing) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  };

  const isEditing = (key: string) => editingFields.has(key);

  // =====================
  // Fechar sugestões da composição ao clicar fora
  // =====================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;

      const listaEl = listaRef.current;
      const inputEl = inputRefs.current[campoAtivo]?.[0];

      const target = e.target as Node;

      const clickDentroLista = Boolean(listaEl && listaEl.contains(target));

      const clickNoInputAtivo = Boolean(inputEl && inputEl.contains(target));

      if (!clickDentroLista && !clickNoInputAtivo) {
        if (sugestoes.length > 0) {
          const sugestao = sugestoes[0];

          confirmarSugestaoPrimeira(
            campoAtivo,
            sugestao.codigo,
            sugestao.custo,
            sugestao.produto,
            sugestao.packingCost,
            sugestao.marca
          );
        }

        setSugestoes([]);
        setCampoAtivo(null);
        setIndiceSelecionado(-1);

        inputEl?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [campoAtivo, sugestoes]);

  // =====================
  // Fechar sugestões do produto ao clicar fora
  // =====================
  useEffect(() => {
    const handleClickOutsideProduto = (e: MouseEvent) => {
      if (!produtoSugestaoAtiva) return;

      const listaEl = listaProdutoRef.current;
      const target = e.target as Node;

      const clickDentroLista = Boolean(listaEl && listaEl.contains(target));

      if (!clickDentroLista) {
        setProdutoSugestaoAtiva(false);
        setIndiceProdutoSelecionado(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideProduto);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideProduto);
    };
  }, [produtoSugestaoAtiva]);

  // =====================
  // Rolagem automática da composição
  // =====================
  useEffect(() => {
    if (listaRef.current && indiceSelecionado >= 0) {
      const element = listaRef.current.children[
        indiceSelecionado
      ] as HTMLElement;

      element?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [indiceSelecionado]);

  // =====================
  // Rolagem automática do produto
  // =====================
  useEffect(() => {
    if (listaProdutoRef.current && indiceProdutoSelecionado >= 0) {
      const element = listaProdutoRef.current.children[
        indiceProdutoSelecionado
      ] as HTMLElement;

      element?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [indiceProdutoSelecionado]);

  const ultimaBuscaRef = useRef("");

  // =====================
  // Busca de sugestões da Composição (newsystem.costs)
  // ✅ agora também traz packing_cost e mark (marca)
  // =====================
  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();

    ultimaBuscaRef.current = raw;

    if (!raw) {
      setSugestoes([]);
      return;
    }

    const SELECT_COLS = "code, current_cost, product, packing_cost, mark";

    const mapResultados = (data: any[] | null) =>
      data?.map((item) => ({
        codigo: item.code,
        custo: Number(item.current_cost) || 0,
        produto: item.product || "",
        marca: item.mark || "",
        packingCost: Number(item.packing_cost) || 0,
      })) || [];

    const exact = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .eq("code", raw)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    if (exact.data && exact.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(mapResultados(exact.data));
      setIndiceSelecionado(0);
      return;
    }

    const starts = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike("code", `${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    if (starts.data && starts.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(mapResultados(starts.data));
      setIndiceSelecionado(0);
      return;
    }

    const partial = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike("code", `%${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    setCampoAtivo(idx);
    setSugestoes(mapResultados(partial.data));
    setIndiceSelecionado(0);
  };

  const buscarSugestoesDebounced = useRef(
    debounce(buscarSugestoes, 120)
  ).current;

  // =====================
  // Busca de sugestão do Produto (newsystem.costs)
  // ✅ agora também traz packing_cost e mark (marca)
  // =====================
  const buscarSugestoesProduto = async (
    termo: string,
    tipo: TipoBuscaProduto
  ) => {
    const raw = termo.trim();
    const buscaAtual = `${tipo}:${raw}`;

    ultimaBuscaProdutoRef.current = buscaAtual;

    if (!raw) {
      setSugestoesProduto([]);
      setProdutoSugestaoAtiva(false);
      setIndiceProdutoSelecionado(-1);

      return;
    }

    const coluna = tipo === "codigo" ? "code" : "product";
    const SELECT_COLS = "code, current_cost, product, packing_cost, mark";

    const mapResultados = (data: any[] | null) =>
      data?.map((item) => ({
        codigo: item.code,
        custo: Number(item.current_cost) || 0,
        produto: item.product || "",
        marca: item.mark || "",
        packingCost: Number(item.packing_cost) || 0,
      })) || [];

    const exact = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .eq(coluna, raw)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) {
      return;
    }

    if (exact.data && exact.data.length > 0) {
      const lista = mapResultados(exact.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);

      return;
    }

    const starts = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike(coluna, `${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) {
      return;
    }

    if (starts.data && starts.data.length > 0) {
      const lista = mapResultados(starts.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);

      return;
    }

    const partial = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike(coluna, `%${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) {
      return;
    }

    const lista = mapResultados(partial.data);

    setSugestoesProduto(lista);
    setProdutoSugestaoAtiva(lista.length > 0);

    setIndiceProdutoSelecionado(lista.length > 0 ? 0 : -1);
  };

  const buscarSugestoesProdutoDebounced = useRef(
    debounce(buscarSugestoesProduto, 120)
  ).current;

  // =====================
  // ✅ NOVO: cada item da composição passa a guardar `embalagem`
  // (packing_cost do produto) e `marca`. Ao final, recalcula a
  // "marca ativa" com base no primeiro item preenchido.
  // =====================
  const confirmarSugestaoPrimeira = (
    idx: number,
    codigo: string,
    custo: number,
    produto?: string,
    packingCost?: number,
    marca?: string
  ) => {
    const novo = [...composicao];

    novo[idx] = {
      ...novo[idx],
      codigo,
      produto: produto || novo[idx]?.produto || "",
      descricao: produto || novo[idx]?.descricao || "",
      custo: (Number(custo) || 0).toFixed(2),
      embalagem: (Number(packingCost) || 0).toFixed(2),
      marca: marca !== undefined ? marca : novo[idx]?.marca || "",
      quantidade: novo[idx]?.quantidade || "1",
    };

    setComposicao(novo);

    const marcaAtiva = resolveMarcaAtiva(novo);
    setProdutoMarca(marcaAtiva);
  };

  const selecionarSugestao = (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string,
    packingCost?: number,
    marca?: string
  ) => {
    confirmarSugestaoPrimeira(idx, codigo, custo, produto, packingCost, marca);

    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);

    setTimeout(() => {
      inputRefs.current[idx]?.[0]?.focus();
    }, 50);
  };

  const isLinhaVazia = (item: any) => {
    return (
      !String(item?.codigo || "").trim() &&
      !String(item?.produto || "").trim() &&
      !String(item?.descricao || "").trim() &&
      !String(item?.custo || "").trim()
    );
  };

  const limparProdutoBusca = () => {
    setProdutoCodigo("");
    setProdutoDescricao("");
    setSugestoesProduto([]);
    setProdutoSugestaoAtiva(false);
    setIndiceProdutoSelecionado(-1);
  };

  // =====================
  // ✅ NOVO: guarda packing_cost e marca também no item criado
  // pela busca de produto (ProductSection), e recalcula a marca
  // ativa a partir da composição inteira.
  // =====================
  const selecionarProdutoSugestao = (
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string,
    packingCost?: number
  ) => {
    setComposicao((prev: any[]) => {
      const novoItem = {
        codigo,
        produto: produto || "",
        descricao: produto || "",
        quantidade: "1",
        custo: (Number(custo) || 0).toFixed(2),
        embalagem: (Number(packingCost) || 0).toFixed(2),
        marca: marca || "",
      };

      const indexVazio = prev.findIndex(isLinhaVazia);

      let novo: any[];

      if (indexVazio >= 0) {
        novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };
      } else {
        novo = [...prev, novoItem];
      }

      const marcaAtiva = resolveMarcaAtiva(novo);
      setProdutoMarca(marcaAtiva);

      return novo;
    });

    limparProdutoBusca();
  };

  const adicionarProdutoManualNaComposicao = () => {
    const codigo = produtoCodigo.trim();

    const descricao = produtoDescricao.trim();

    if (!codigo && !descricao) {
      return;
    }

    setComposicao((prev: any[]) => {
      const novoItem = {
        codigo: codigo || "Produto sem código",
        produto: descricao,
        descricao,
        quantidade: "1",
        custo: "0",
        embalagem: "0",
        marca: "",
      };

      const indexVazio = prev.findIndex(isLinhaVazia);

      if (indexVazio >= 0) {
        const novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };

        return novo;
      }

      return [...prev, novoItem];
    });

    limparProdutoBusca();
  };

  const handleSugestoesKeys = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (!sugestoes.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setIndiceSelecionado((prev) =>
        prev < sugestoes.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceSelecionado((prev) =>
        prev > 0 ? prev - 1 : sugestoes.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      const index = indiceSelecionado >= 0 ? indiceSelecionado : 0;

      const sugestao = sugestoes[index];

      selecionarSugestao(
        sugestao.codigo,
        sugestao.custo,
        idx,
        sugestao.produto,
        sugestao.packingCost,
        sugestao.marca
      );
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index = indiceSelecionado >= 0 ? indiceSelecionado : 0;

      const sugestao = sugestoes[index];

      confirmarSugestaoPrimeira(
        idx,
        sugestao.codigo,
        sugestao.custo,
        sugestao.produto,
        sugestao.packingCost,
        sugestao.marca
      );

      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();

      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    }
  };

  const handleProdutoSugestoesKeys = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!sugestoesProduto.length || !produtoSugestaoAtiva) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setIndiceProdutoSelecionado((prev) =>
        prev < sugestoesProduto.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceProdutoSelecionado((prev) =>
        prev > 0 ? prev - 1 : sugestoesProduto.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;

      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto,
          item.marca,
          item.packingCost
        );
      }
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;

      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto,
          item.marca,
          item.packingCost
        );
      }
    } else if (e.key === "Escape") {
      e.preventDefault();

      limparProdutoBusca();
    }
  };

  const handleGridNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => {
    if (sugestoes.length && campoAtivo === row) {
      return;
    }

    const totalRows = composicao.length;

    const goNext = () => {
      const nextRow = row + 1 < totalRows ? row + 1 : 0;

      inputRefs.current[nextRow]?.[col]?.focus();
    };

    const goPrev = () => {
      const prevRow = row - 1 >= 0 ? row - 1 : totalRows - 1;

      inputRefs.current[prevRow]?.[col]?.focus();
    };

    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goPrev();
    }
  };

  const handleLinearNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => {
    const next = () => {
      refs.current[(index + 1) % total]?.focus();
    };

    const prev = () => {
      refs.current[(index - 1 + total) % total]?.focus();
    };

    if (
      e.key === "ArrowDown" ||
      e.key === "Enter" ||
      (e.key === "Tab" && !e.shiftKey)
    ) {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      prev();
    }
  };

  const syncDescontoFromLoja = (descontoInternal: string) => {
    setCalculoLoja((prev) => ({ ...prev, desconto: descontoInternal }));
    setCalculoShopee((prev) => ({ ...prev, desconto: descontoInternal }));
    setCalculoMagalu((prev) => ({ ...prev, desconto: descontoInternal }));
    setCalculoMarketplaceClassico((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));
    setCalculoMarketplacePremium((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));
    setCalculoTiktok((prev) => ({ ...prev, desconto: descontoInternal }));
  };

  // =====================
  // ⚠️ Os campos manuais de "Embalagem" por canal continuam
  // existindo como OVERRIDE MANUAL. Se o usuário digitar um valor
  // aqui, ele sobrescreve a soma automática dos packing_cost dos
  // itens da composição (ver calcularPreco). Se deixar vazio, a
  // calculadora usa a soma real vinda de `costs.packing_cost`.
  // =====================
  const handleEmbalagemChangeShared = (raw: string) => {
    const value = toInternal(raw);

    setCalculoLoja((prev) => ({ ...prev, embalagem: value }));
    setCalculoMagalu((prev) => ({ ...prev, embalagem: value }));
    setCalculoMarketplaceClassico((prev) => ({ ...prev, embalagem: value }));
    setCalculoMarketplacePremium((prev) => ({ ...prev, embalagem: value }));
    setCalculoTiktok((prev) => ({ ...prev, embalagem: value }));

    if (!userEditedShopeeEmbalagem) {
      setCalculoShopee((prev) => ({ ...prev, embalagem: value }));
    }
  };

  const handleEmbalagemBlurShared = (raw: string) => {
    const value = toInternal(raw || "");

    setCalculoLoja((prev) => ({ ...prev, embalagem: value }));
    setCalculoMagalu((prev) => ({ ...prev, embalagem: value }));
    setCalculoMarketplaceClassico((prev) => ({ ...prev, embalagem: value }));
    setCalculoMarketplacePremium((prev) => ({ ...prev, embalagem: value }));
    setCalculoTiktok((prev) => ({ ...prev, embalagem: value }));

    if (!userEditedShopeeEmbalagem) {
      setCalculoShopee((prev) => ({ ...prev, embalagem: value }));
    }
  };

  const handleEmbalagemChangeShopee = (raw: string) => {
    setUserEditedShopeeEmbalagem(true);

    const value = toInternal(raw);

    setCalculoShopee((prev) => ({ ...prev, embalagem: value }));
  };

  const handleEmbalagemBlurShopee = (raw: string) => {
    const internal = toInternal(raw || "");

    if (!internal) {
      setUserEditedShopeeEmbalagem(false);
    }

    setCalculoShopee((prev) => ({ ...prev, embalagem: internal }));
  };

  // =====================
  // ✅ NOVO: soma o packing_cost real de cada item da composição
  // (× quantidade). Essa é a embalagem "automática" por produto.
  // =====================
  const calcularEmbalagemComposicao = () =>
    composicao.reduce(
      (sum: number, item: any) =>
        sum +
        (parseFloat(toInternal(item.embalagem || "0")) || 0) *
          (parseFloat(toInternal(item.quantidade || "0")) || 0),
      0
    );

  // =====================
  // ✅ CORRIGIDO: embalagem agora prioriza o override manual do
  // campo do canal; se ele estiver vazio, usa a soma real dos
  // packing_cost dos itens; se também não houver, cai no fallback
  // hardcoded (EMBALAGEM_PADRAO) apenas como última instância.
  // =====================
  const calcularPreco = (dados: Calculo) => {
    const custo = composicao.reduce(
      (sum, item) =>
        sum +
        (parseFloat(item.custo) || 0) * (parseFloat(item.quantidade) || 0),
      0
    );

    const desconto = (parseFloat(dados.desconto) || 0) / 100;
    const imposto = (parseFloat(dados.imposto) || 0) / 100;
    const margem = (parseFloat(dados.margem) || 0) / 100;
    const comissao = (parseFloat(dados.comissao) || 0) / 100;
    const marketing = (parseFloat(dados.marketing) || 0) / 100;
    const frete = parseFloat(dados.frete) || 0;

    const embalagemManual = parseFloat(dados.embalagem || "");
    const embalagemAutomatica = calcularEmbalagemComposicao();

    const embalagem = !isNaN(embalagemManual) && dados.embalagem
      ? embalagemManual
      : embalagemAutomatica > 0
        ? embalagemAutomatica
        : parseFloat(EMBALAGEM_PADRAO);

    const custoLiquido = custo * (1 - desconto);

    const divisor = 1 - (imposto + margem + comissao + marketing);

    const preco =
      divisor > 0 ? (custoLiquido + frete + embalagem) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  // =====================
  // Cálculo do preço de venda por item da composição
  // ✅ agora usa o packing_cost real do próprio item (embalagemUnitaria)
  // =====================
  const calcularPrecoLojaItem = (
    custoUnitario: number,
    quantidade: number,
    embalagemUnitaria?: number
  ) => {
    const custoItem = custoUnitario * quantidade;

    const desconto = (parseFloat(toInternal(calculoLoja.desconto)) || 0) / 100;
    const imposto = (parseFloat(toInternal(calculoLoja.imposto)) || 0) / 100;
    const margem = (parseFloat(toInternal(calculoLoja.margem)) || 0) / 100;
    const comissao = (parseFloat(toInternal(calculoLoja.comissao)) || 0) / 100;
    const marketing =
      (parseFloat(toInternal(calculoLoja.marketing)) || 0) / 100;
    const frete = parseFloat(toInternal(calculoLoja.frete)) || 0;

    const embalagemManual = parseFloat(toInternal(calculoLoja.embalagem || ""));

    const embalagemItem =
      !isNaN(embalagemManual) && calculoLoja.embalagem
        ? embalagemManual
        : (embalagemUnitaria || 0) * quantidade;

    const custoLiquido = custoItem * (1 - desconto);
    const divisor = 1 - (imposto + margem + comissao + marketing);

    const preco =
      divisor > 0 ? (custoLiquido + frete + embalagemItem) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  const precoLoja = calcularPreco(calculoLoja);
  const precoShopee = calcularPreco(calculoShopee);
  const precoMagalu = calcularPreco(calculoMagalu);
  const precoMLClassico = calcularPreco(calculoMarketplaceClassico);
  const precoMLPremium = calcularPreco(calculoMarketplacePremium);
  const precoTiktok = calcularPreco(calculoTiktok);

  // =====================
  // Reset da trava manual de TODOS os canais a cada alteração na
  // composição ou troca de marca do produto.
  // =====================
  const isFirstRenderComposicaoRef = useRef(true);
  const lastComposicaoSnapshotRef = useRef<string>("");

  useEffect(() => {
    const snapshot = JSON.stringify({
      itens: composicao.map((item: any) => ({
        codigo: item.codigo,
        custo: item.custo,
        quantidade: item.quantidade,
        embalagem: item.embalagem,
        marca: item.marca,
      })),
      marca: produtoMarca,
    });

    if (isFirstRenderComposicaoRef.current) {
      isFirstRenderComposicaoRef.current = false;
      lastComposicaoSnapshotRef.current = snapshot;
      return;
    }

    if (snapshot !== lastComposicaoSnapshotRef.current) {
      lastComposicaoSnapshotRef.current = snapshot;

      setUserEditedShopeeComissao(false);
      setUserEditedShopeeFrete(false);
      setUserEditedTiktokComissao(false);
      setUserEditedTiktokFrete(false);
      setUserEditedLojaComissao(false);
      setUserEditedLojaFrete(false);
      setUserEditedMagaluComissao(false);
      setUserEditedMagaluFrete(false);
      setUserEditedMLClassicoComissao(false);
      setUserEditedMLClassicoFrete(false);
      setUserEditedMLPremiumComissao(false);
      setUserEditedMLPremiumFrete(false);
    }
  }, [composicao, produtoMarca]);

  // =====================
  // Regra automática Shopee
  // =====================
  useEffect(() => {
    const rule = marketplaceRules.shopee;

    const flatOrBrand = resolveFlatOrBrandRule(rule, produtoMarca, {
      comissao: calculoShopee.comissao,
      frete: calculoShopee.frete,
    });

    let comissaoResolvida: string;
    let freteResolvido: string;

    if (flatOrBrand) {
      comissaoResolvida = flatOrBrand.comissao;
      freteResolvido = flatOrBrand.frete;
    } else {
      const tiers = tiersFromRule(rule) ?? SHOPEE_TIERS;

      let tierDetectado: PriceTierLike = tiers[0];

      for (const tier of tiers) {
        const precoTeste = calcularPreco({
          desconto: calculoShopee.desconto,
          embalagem: userEditedShopeeEmbalagem
            ? calculoShopee.embalagem
            : "",
          imposto: "14",
          margem: "15",
          marketing: "3",
          comissao: tier.comissao,
          frete: tier.frete,
        });

        if (precoTeste >= tier.min && precoTeste <= tier.max) {
          tierDetectado = tier;
          break;
        }
      }

      comissaoResolvida = tierDetectado.comissao;
      freteResolvido = tierDetectado.frete;
    }

    setCalculoShopee((prev) => {
      const next: Calculo = {
        ...prev,
        imposto: userEditedShopeeImposto ? prev.imposto : "14",
        margem: userEditedShopeeMargem ? prev.margem : "15",
        marketing: userEditedShopeeMarketing ? prev.marketing : "3",
        comissao: userEditedShopeeComissao ? prev.comissao : comissaoResolvida,
        frete: userEditedShopeeFrete ? prev.frete : freteResolvido,
      };

      const semAlteracoes =
        next.imposto === prev.imposto &&
        next.margem === prev.margem &&
        next.marketing === prev.marketing &&
        next.comissao === prev.comissao &&
        next.frete === prev.frete;

      return semAlteracoes ? prev : next;
    });
  }, [
    custoTotal,
    calculoShopee.desconto,
    marketplaceRules.shopee,
    produtoMarca,
    userEditedShopeeComissao,
    userEditedShopeeFrete,
    userEditedShopeeImposto,
    userEditedShopeeMargem,
    userEditedShopeeMarketing,
    userEditedShopeeEmbalagem,
  ]);

  // =====================
  // Regra automática TikTok Shop
  // =====================
  useEffect(() => {
    const rule = marketplaceRules.tiktok;

    const flatOrBrand = resolveFlatOrBrandRule(rule, produtoMarca, {
      comissao: calculoTiktok.comissao,
      frete: calculoTiktok.frete,
    });

    let comissaoResolvida: string;
    let freteResolvido: string;

    if (flatOrBrand) {
      comissaoResolvida = flatOrBrand.comissao;
      freteResolvido = flatOrBrand.frete;
    } else {
      const tiers = tiersFromRule(rule) ?? TIKTOK_TIERS;

      let tierDetectado: PriceTierLike = tiers[0];

      for (const tier of tiers) {
        const precoTeste = calcularPreco({
          desconto: calculoTiktok.desconto,
          embalagem: calculoTiktok.embalagem || "",
          imposto: calculoTiktok.imposto,
          margem: calculoTiktok.margem,
          marketing: calculoTiktok.marketing,
          comissao: tier.comissao,
          frete: tier.frete,
        });

        if (precoTeste >= tier.min && precoTeste <= tier.max) {
          tierDetectado = tier;
          break;
        }
      }

      comissaoResolvida = tierDetectado.comissao;
      freteResolvido = tierDetectado.frete;
    }

    setCalculoTiktok((prev) => {
      const next: Calculo = {
        ...prev,
        comissao: userEditedTiktokComissao ? prev.comissao : comissaoResolvida,
        frete: userEditedTiktokFrete ? prev.frete : freteResolvido,
      };

      const semAlteracoes =
        next.comissao === prev.comissao && next.frete === prev.frete;

      return semAlteracoes ? prev : next;
    });
  }, [
    custoTotal,
    calculoTiktok.desconto,
    calculoTiktok.embalagem,
    calculoTiktok.imposto,
    calculoTiktok.margem,
    calculoTiktok.marketing,
    marketplaceRules.tiktok,
    produtoMarca,
    userEditedTiktokComissao,
    userEditedTiktokFrete,
  ]);

  // =====================
  // Regra automática Loja Própria (reservado)
  // =====================
  useEffect(() => {
    // Loja Própria normalmente não tem regra de marketplace salva.
  }, []);

  // =====================
  // Regra automática Magalu (banco -> hardcoded), agora com marca
  // vinda da composição via `produtoMarca`.
  // =====================
  useEffect(() => {
    const rule = marketplaceRules.magalu;

    const resolved = resolveFlatOrBrandRule(rule, produtoMarca, {
      comissao: calculoMagalu.comissao,
      frete: calculoMagalu.frete,
    });

    if (!resolved) return;

    setCalculoMagalu((prev) => {
      const next: Calculo = {
        ...prev,
        comissao: userEditedMagaluComissao ? prev.comissao : resolved.comissao,
        frete: userEditedMagaluFrete ? prev.frete : resolved.frete,
      };

      const semAlteracoes =
        next.comissao === prev.comissao && next.frete === prev.frete;

      return semAlteracoes ? prev : next;
    });
  }, [
    marketplaceRules.magalu,
    produtoMarca,
    userEditedMagaluComissao,
    userEditedMagaluFrete,
  ]);

  // =====================
  // Regra automática Mercado Livre — Clássico e Premium
  // =====================
  useEffect(() => {
    const rule = marketplaceRules.mercadoLivre;

    const resolvedClassico =
      resolveMLListingRule(rule, "classico", {
        comissao: calculoMarketplaceClassico.comissao,
        frete: calculoMarketplaceClassico.frete,
      }) ??
      resolveFlatOrBrandRule(rule, produtoMarca, {
        comissao: calculoMarketplaceClassico.comissao,
        frete: calculoMarketplaceClassico.frete,
      });

    if (!resolvedClassico) return;

    setCalculoMarketplaceClassico((prev) => {
      const next: Calculo = {
        ...prev,
        comissao: userEditedMLClassicoComissao
          ? prev.comissao
          : resolvedClassico.comissao,
        frete: userEditedMLClassicoFrete ? prev.frete : resolvedClassico.frete,
      };

      const semAlteracoes =
        next.comissao === prev.comissao && next.frete === prev.frete;

      return semAlteracoes ? prev : next;
    });
  }, [
    marketplaceRules.mercadoLivre,
    produtoMarca,
    userEditedMLClassicoComissao,
    userEditedMLClassicoFrete,
  ]);

  useEffect(() => {
    const rule = marketplaceRules.mercadoLivre;

    const resolvedPremium =
      resolveMLListingRule(rule, "premium", {
        comissao: calculoMarketplacePremium.comissao,
        frete: calculoMarketplacePremium.frete,
      }) ??
      resolveFlatOrBrandRule(rule, produtoMarca, {
        comissao: calculoMarketplacePremium.comissao,
        frete: calculoMarketplacePremium.frete,
      });

    if (!resolvedPremium) return;

    setCalculoMarketplacePremium((prev) => {
      const next: Calculo = {
        ...prev,
        comissao: userEditedMLPremiumComissao
          ? prev.comissao
          : resolvedPremium.comissao,
        frete: userEditedMLPremiumFrete ? prev.frete : resolvedPremium.frete,
      };

      const semAlteracoes =
        next.comissao === prev.comissao && next.frete === prev.frete;

      return semAlteracoes ? prev : next;
    });
  }, [
    marketplaceRules.mercadoLivre,
    produtoMarca,
    userEditedMLPremiumComissao,
    userEditedMLPremiumFrete,
  ]);

  useEffect(() => {
    setAcrescimos((prev) => ({
      ...prev,
      precoLoja: precoLoja.toFixed(2),
      precoShopee: precoShopee.toFixed(2),
      precoMagalu: precoMagalu.toFixed(2),
      precoMercadoLivreClassico: precoMLClassico.toFixed(2),
      precoMercadoLivrePremium: precoMLPremium.toFixed(2),
      precoTiktok: precoTiktok.toFixed(2),
      freteMercadoLivreClassico: calculoMarketplaceClassico.frete || "0",
      freteMercadoLivrePremium: calculoMarketplacePremium.frete || "0",
    }));
  }, [
    precoLoja,
    precoShopee,
    precoMagalu,
    precoMLClassico,
    precoMLPremium,
    precoTiktok,
    calculoMarketplaceClassico.frete,
    calculoMarketplacePremium.frete,
    setAcrescimos,
  ]);

  const [isClearing, setIsClearing] = useState(false);
  const [clicks, setClicks] = useState(0);

  const handleClearAll = () => {
    setClicks((prev) => {
      const newCount = prev + 1;

      if (newCount < 5) {
        setIsClearing(true);
        setComposicao([]);

        setProdutoCodigo("");
        setProdutoDescricao("");
        setProdutoMarca("");

        setSugestoesProduto([]);
        setProdutoSugestaoAtiva(false);
        setIndiceProdutoSelecionado(-1);

        setCalculoLoja({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "",
          comissao: "6",
          marketing: "3",
          embalagem: "",
        });

        setCalculoShopee({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "4",
          comissao: "20",
          marketing: "3",
          embalagem: "",
        });

        setCalculoMagalu({
          desconto: "",
          imposto: "14",
          margem: "10",
          frete: "",
          comissao: "20",
          marketing: "3",
          embalagem: "",
        });

        setCalculoMarketplaceClassico({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "",
          comissao: "11",
          marketing: "3",
          embalagem: "",
        });

        setCalculoMarketplacePremium({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "",
          comissao: "16",
          marketing: "3",
          embalagem: "",
        });

        setCalculoTiktok({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "4",
          comissao: "10",
          marketing: "3",
          embalagem: "",
        });

        setAcrescimos({
          precoLoja: "",
          precoShopee: "",
          precoMagalu: "",
          precoMercadoLivreClassico: "",
          precoMercadoLivrePremium: "",
          precoTiktok: "",
          freteMercadoLivreClassico: "",
          freteMercadoLivrePremium: "",
          acrescimoClassico: 0,
          acrescimoPremium: 0,
        });

        setUserEditedShopeeComissao(false);
        setUserEditedShopeeFrete(false);
        setUserEditedShopeeImposto(false);
        setUserEditedShopeeMargem(false);
        setUserEditedShopeeMarketing(false);
        setUserEditedShopeeEmbalagem(false);

        setUserEditedTiktokComissao(false);
        setUserEditedTiktokFrete(false);

        setUserEditedLojaComissao(false);
        setUserEditedLojaFrete(false);
        setUserEditedMagaluComissao(false);
        setUserEditedMagaluFrete(false);
        setUserEditedMLClassicoComissao(false);
        setUserEditedMLClassicoFrete(false);
        setUserEditedMLPremiumComissao(false);
        setUserEditedMLPremiumFrete(false);

        isFirstRenderComposicaoRef.current = true;
        lastComposicaoSnapshotRef.current = "";

        setTimeout(() => {
          setIsClearing(false);
        }, 300);
      } else {
        setIsClearing(true);
        console.warn("Botão de limpar bloqueado após 5 cliques.");
      }

      return newCount;
    });
  };

  useEffect(() => {
    if (clicks === 0) return;

    const timer = setTimeout(() => setClicks(0), 5000);

    return () => clearTimeout(timer);
  }, [clicks]);

  const handleDownload = async () => {
    const now = new Date();

    const dataFormatada = now.toLocaleDateString("pt-BR").replace(/\//g, "-");

    const horaFormatada = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}h${now.getMinutes().toString().padStart(2, "0")}m`;

    const fileName = `PRECIFICACAO - ${dataFormatada}-${horaFormatada}.xlsx`;

    const composicaoRows: (string | number)[][] = [
      ["Composição de Custos"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Código", "Descrição", "Quantidade", "Preço de Venda (R$)"],
      ...composicao.map((item: any) => {
        const custoUnitario = parseFloat(toInternal(item.custo)) || 0;
        const quantidade = parseFloat(toInternal(item.quantidade)) || 0;
        const embalagemUnitaria = parseFloat(toInternal(item.embalagem || "0")) || 0;

        return [
          item.codigo || "",
          item.produto || item.descricao || "",
          item.quantidade || "",
          calcularPrecoLojaItem(
            custoUnitario,
            quantidade,
            embalagemUnitaria
          ).toFixed(2),
        ];
      }),
    ];

    const composicaoSheet = XLSX.utils.aoa_to_sheet(composicaoRows);

    const headerStyle = {
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: { rgb: "1A8CEB" },
      },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      border: {
        top: { style: "thin", color: { rgb: "FFFFFF" } },
        bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } },
      },
      alignment: { horizontal: "center", vertical: "center" },
    } as const;

    const applyHeaderStyle = (sheet: any, headerRow: number, cols: number) => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

      for (let index = 0; index < cols; index++) {
        const cellRef = `${letters[index]}${headerRow}`;

        if (sheet[cellRef]) {
          sheet[cellRef].s = headerStyle;
        }
      }
    };

    applyHeaderStyle(composicaoSheet, 4, 4);

    composicaoSheet["!cols"] = [
      { wch: 24 },
      { wch: 44 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, composicaoSheet, "Composição");

    const workbookOutput = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const blob = new Blob([workbookOutput], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, fileName);

    await createNotification({
      title: "Precificação exportada",
      message: `A planilha "${fileName}" foi exportada com ${composicao.length} item(ns) na composição.`,
      action: "status",
      entityType: "pricing_calculator_export",
      link: "/dashboard/precificacao",
    });
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-br from-[#070707] via-[#0c0c0c] to-[#070707] px-3 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1880px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div
            className={`min-w-0 space-y-4 lg:col-span-3 ${
              campoAtivo !== null || produtoSugestaoAtiva ? "z-[120]" : "z-0"
            }`}
          >
            <ProductSection
              codigo={produtoCodigo}
              setCodigo={setProdutoCodigo}
              descricao={produtoDescricao}
              setDescricao={setProdutoDescricao}
              sugestoesProduto={sugestoesProduto}
              produtoSugestaoAtiva={produtoSugestaoAtiva}
              indiceProdutoSelecionado={indiceProdutoSelecionado}
              listaProdutoRef={listaProdutoRef}
              buscarSugestoesProdutoDebounced={buscarSugestoesProdutoDebounced}
              handleProdutoSugestoesKeys={handleProdutoSugestoesKeys}
              selecionarProdutoSugestao={selecionarProdutoSugestao}
              onAdicionarProduto={adicionarProdutoManualNaComposicao}
            />

            <CostComposition
              composicao={composicao}
              setComposicao={setComposicao}
              custoTotal={custoTotal}
              adicionarItem={adicionarItem}
              removerItem={removerItem}
              sugestoes={sugestoes}
              campoAtivo={campoAtivo}
              indiceSelecionado={indiceSelecionado}
              listaRef={listaRef}
              inputRefs={inputRefs}
              buscarSugestoesDebounced={buscarSugestoesDebounced}
              handleSugestoesKeys={handleSugestoesKeys}
              handleGridNav={handleGridNav}
              selecionarSugestao={selecionarSugestao}
              confirmarSugestaoPrimeira={confirmarSugestaoPrimeira}
              isEditing={isEditing}
              setEditing={setEditing}
              toDisplay={toDisplay}
              toInternal={toInternal}
            />
          </div>

          <div className="min-w-0 lg:col-span-9">
            <PriceCalculationSection
              calculoLoja={calculoLoja}
              setCalculoLoja={setCalculoLoja}
              calculoShopee={calculoShopee}
              setCalculoShopee={setCalculoShopee}
              calculoMagalu={calculoMagalu}
              setCalculoMagalu={setCalculoMagalu}
              calculoMLClassico={calculoMarketplaceClassico}
              setCalculoMLClassico={setCalculoMarketplaceClassico}
              calculoMLPremium={calculoMarketplacePremium}
              setCalculoMLPremium={setCalculoMarketplacePremium}
              calculoTiktok={calculoTiktok}
              setCalculoTiktok={setCalculoTiktok}
              precoLoja={precoLoja}
              precoShopee={precoShopee}
              precoMagalu={precoMagalu}
              precoMLClassico={precoMLClassico}
              precoMLPremium={precoMLPremium}
              precoTiktok={precoTiktok}
              acrescimos={acrescimos}
              setAcrescimos={setAcrescimos}
              isEditing={isEditing}
              setEditing={setEditing}
              toDisplay={toDisplay}
              toInternal={toInternal}
              handleLinearNav={handleLinearNav}
              calcLojaRefs={calcLojaRefs}
              calcShopeeRefs={calcShopeeRefs}
              calcMagaluRefs={calcMagaluRefs}
              calcMLClassicoRefs={calcMLClassicoRefs}
              calcMLPremiumRefs={calcMLPremiumRefs}
              calcTiktokRefs={calcTiktokRefs}
              acrescimosRefs={acrescimosRefs}
              handleEmbalagemBlurShared={handleEmbalagemBlurShared}
              handleEmbalagemChangeShared={handleEmbalagemChangeShared}
              handleEmbalagemBlurShopee={handleEmbalagemBlurShopee}
              handleEmbalagemChangeShopee={handleEmbalagemChangeShopee}
              handleDownload={handleDownload}
              handleClearAll={handleClearAll}
              isClearing={isClearing}
              clicks={clicks}
              statusAcrescimo={statusAcrescimo}
              syncDescontoFromLoja={syncDescontoFromLoja}
              userEditedShopeeComissao={userEditedShopeeComissao}
              setUserEditedShopeeComissao={setUserEditedShopeeComissao}
              userEditedShopeeFrete={userEditedShopeeFrete}
              setUserEditedShopeeFrete={setUserEditedShopeeFrete}
              userEditedShopeeImposto={userEditedShopeeImposto}
              setUserEditedShopeeImposto={setUserEditedShopeeImposto}
              userEditedShopeeMargem={userEditedShopeeMargem}
              setUserEditedShopeeMargem={setUserEditedShopeeMargem}
              userEditedShopeeMarketing={userEditedShopeeMarketing}
              setUserEditedShopeeMarketing={setUserEditedShopeeMarketing}
              userEditedShopeeEmbalagem={userEditedShopeeEmbalagem}
              setUserEditedShopeeEmbalagem={setUserEditedShopeeEmbalagem}
              userEditedTiktokComissao={userEditedTiktokComissao}
              setUserEditedTiktokComissao={setUserEditedTiktokComissao}
              userEditedTiktokFrete={userEditedTiktokFrete}
              setUserEditedTiktokFrete={setUserEditedTiktokFrete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
