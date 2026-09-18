"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

import { ProductSection } from "./parts/ProductSection";
import { CostComposition } from "./parts/CostComposition";
import { PriceCalculationSection } from "./parts/PriceCalculationSection";
import { CHANNELS, EMBALAGEM_PADRAO } from "@/components/costs/hooks/channelsconfig";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import { useChannelPricing } from "@/components/costs/hooks/usechannelpricing";

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
};

type TipoBuscaProduto = "codigo" | "descricao";

// Termos com menos de 2 caracteres geram queries muito genéricas
// (batem em quase toda a tabela) — sem ganho de UX real, só carga
// desnecessária no banco. Abaixo disso, não busca.
const MIN_CHARS_BUSCA = 2;

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

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => clearTimeout(timer);

  return debounced as T & { cancel: () => void };
}

function resolveMarcaAtiva(composicao: any[]): string {
  const item = composicao.find((i: any) => String(i?.marca || "").trim());
  return item?.marca || "";
}

// Mapeia preço/frete calculado de cada canal para os campos legados
// consumidos por `acrescimos` (mantido para não quebrar consumidores externos).
const ACRESCIMO_PRICE_FIELD: Record<ChannelKey, string> = {
  loja: "precoLoja",
  shopee: "precoShopee",
  magalu: "precoMagalu",
  mlClassico: "precoMercadoLivreClassico",
  mlPremium: "precoMercadoLivrePremium",
  tiktok: "precoTiktok",
};

const ACRESCIMO_FRETE_FIELD: Partial<Record<ChannelKey, string>> = {
  mlClassico: "freteMercadoLivreClassico",
  mlPremium: "freteMercadoLivrePremium",
};

// Colunas usadas nas buscas de sugestão (composição + produto).
// packaging_cost REMOVIDO: embalagem não vem mais do banco por item,
// é controlada 100% no motor de canais (Fixa/Manual, aplicada 1x).
const SELECT_COLS = "code, current_cost, product, mark";

const mapResultados = (data: any[] | null): Sugestao[] =>
  data?.map((item) => ({
    codigo: item.code,
    custo: Number(item.current_cost) || 0,
    produto: item.product || "",
    marca: item.mark || "",
  })) || [];

/**
 * Ordena os resultados de uma busca por relevância em relação ao termo
 * e à coluna pesquisada: match exato > começa com o termo > contém o termo.
 */
function ordenarPorRelevancia<T extends { codigo: string; produto?: string }>(
  lista: T[],
  termo: string,
  coluna: "codigo" | "produto"
): T[] {
  const termoNorm = termo.trim().toLowerCase();

  const valor = (item: T) =>
    (coluna === "codigo" ? item.codigo : item.produto || "").toLowerCase();

  const score = (item: T) => {
    const v = valor(item);
    if (v === termoNorm) return 0;
    if (v.startsWith(termoNorm)) return 1;
    return 2;
  };

  return [...lista].sort((a, b) => score(a) - score(b));
}

/**
 * Busca otimizada em 2 estágios contra uma coluna específica.
 * -----------------------------------------------------------------
 * ESTÁGIO 1 (rápido, usa índice B-tree/trigram): `ilike 'termo%'`
 * — prefixo. A maioria das buscas por código/produto é digitada do
 * início, então isso resolve quase sempre já na 1ª consulta e é
 * MUITO mais rápido que `%termo%` (que força scan completo sem
 * índice adequado).
 *
 * ESTÁGIO 2 (fallback, só dispara se o estágio 1 não achar nada):
 * `ilike '%termo%'` — contém, cobre o caso de busca por termo no
 * meio da string (ex: parte do nome do produto).
 *
 * Ambos os estágios respeitam o `AbortSignal` recebido.
 */
async function buscarComPrefixoEFallback(
  coluna: string,
  raw: string,
  limit: number,
  signal: AbortSignal
): Promise<{ data: any[] | null; error: any }> {
  const prefixResult = await supabase
    .schema("newsystem")
    .from("costs")
    .select(SELECT_COLS)
    .ilike(coluna, `${raw}%`)
    .limit(limit)
    .abortSignal(signal);

  if (prefixResult.error) return prefixResult;
  if (prefixResult.data && prefixResult.data.length > 0) return prefixResult;

  // Nada por prefixo — tenta "contém" como fallback.
  return supabase
    .schema("newsystem")
    .from("costs")
    .select(SELECT_COLS)
    .ilike(coluna, `%${raw}%`)
    .limit(limit)
    .abortSignal(signal);
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
  // Sugestões Supabase da Composição
  // =====================
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);

  // Refs voláteis usadas dentro dos listeners de "clicar fora" — evita
  // recriar os listeners (removeEventListener + addEventListener) a
  // cada tecla digitada, já que `sugestoes` muda em toda busca.
  const sugestoesRef = useRef(sugestoes);
  sugestoesRef.current = sugestoes;

  const listaRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const acrescimosRefs = useRef<HTMLInputElement[]>([]);

  // AbortControllers para cancelar requisições de busca em voo quando
  // uma nova busca é disparada (digitação rápida) — evita que N
  // requisições completas rodem em paralelo no banco.
  const buscaAbortControllerRef = useRef<AbortController | null>(null);
  const buscaProdutoAbortControllerRef = useRef<AbortController | null>(null);

  // Refs de navegação por canal — Record<ChannelKey, ref>, substitui
  // os 6 useRef individuais.
  const channelRefsMapRef = useRef<Record<ChannelKey, HTMLInputElement[]>>(
    Object.fromEntries(CHANNELS.map((c) => [c.key, []])) as Record<
      ChannelKey,
      HTMLInputElement[]
    >
  );

  // =====================
  // Controle de edição
  // =====================
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());

  const setEditing = (key: string, editing: boolean) => {
    setEditingFields((prev) => {
      const next = new Set(prev);
      if (editing) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const isEditing = (key: string) => editingFields.has(key);

  // =====================
  // Cálculo de preço (usa composicao do escopo do componente)
  // =====================
  const calcularPreco = useCallback(
    (dados: Calculo) => {
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

      const embalagem =
        !isNaN(embalagemManual) && dados.embalagem
          ? embalagemManual
          : parseFloat(EMBALAGEM_PADRAO);

      const custoLiquido = custo * (1 - desconto);
      const divisor = 1 - (imposto + margem + comissao + marketing);

      const preco =
        divisor > 0 ? (custoLiquido + frete + embalagem) / divisor : 0;

      return isFinite(preco) ? preco : 0;
    },
    [composicao]
  );

  // =====================
  // Motor único de canais
  // =====================
  const {
    calculos,
    setCalculo,
    setCalculos,
    manualFlags,
    setManualFlag,
    brandOverrides,
    precos,
    resetAll: resetChannelsAll,
    resetManualState,
    refetchDbRules, // ← NOVO: permite invalidar/recarregar as regras de banco (flat/tiered/brand) sem precisar de reload de página, assim que o modal de regras salvar algo novo.
  } = useChannelPricing(produtoMarca, calcularPreco);

  // =====================
  // calcularPrecoLojaItem (usado só na exportação do Excel)
  // =====================
  const calcularPrecoLojaItem = (
    custoUnitario: number,
    quantidade: number
  ) => {
    const calculoLoja = calculos.loja;
    const custoItem = custoUnitario * quantidade;

    const desconto = (parseFloat(toInternal(calculoLoja.desconto)) || 0) / 100;
    const imposto = (parseFloat(toInternal(calculoLoja.imposto)) || 0) / 100;
    const margem = (parseFloat(toInternal(calculoLoja.margem)) || 0) / 100;
    const comissao = (parseFloat(toInternal(calculoLoja.comissao)) || 0) / 100;
    const marketing =
      (parseFloat(toInternal(calculoLoja.marketing)) || 0) / 100;
    const frete = parseFloat(toInternal(calculoLoja.frete)) || 0;

    const embalagemManual = parseFloat(
      toInternal(calculoLoja.embalagem || "")
    );

    const embalagem =
      !isNaN(embalagemManual) && calculoLoja.embalagem
        ? embalagemManual
        : parseFloat(EMBALAGEM_PADRAO);

    const custoLiquido = custoItem * (1 - desconto);
    const divisor = 1 - (imposto + margem + comissao + marketing);

    const preco =
      divisor > 0 ? (custoLiquido + frete + embalagem) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  // =====================
  // Reset da trava manual a cada alteração na composição ou marca.
  // =====================
  const isFirstRenderComposicaoRef = useRef(true);
  const lastComposicaoSnapshotRef = useRef<string>("");

  useEffect(() => {
    const snapshot = JSON.stringify({
      itens: composicao.map((item: any) => ({
        codigo: item.codigo,
        custo: item.custo,
        quantidade: item.quantidade,
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
      resetManualState();
    }
  }, [composicao, produtoMarca, resetManualState]);

  // =====================
  // Sincroniza acrescimos (preços/fretes calculados) para consumo
  // externo, mantendo os nomes de campo legados.
  // =====================
  useEffect(() => {
    setAcrescimos((prev: any) => {
      const next = { ...prev };

      CHANNELS.forEach((def) => {
        next[ACRESCIMO_PRICE_FIELD[def.key]] = precos[def.key].toFixed(2);

        const freteField = ACRESCIMO_FRETE_FIELD[def.key];
        if (freteField) {
          next[freteField] = calculos[def.key].frete || "0";
        }
      });

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precos, calculos.mlClassico.frete, calculos.mlPremium.frete, setAcrescimos]);

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
        const sugestoesAtuais = sugestoesRef.current;

        if (sugestoesAtuais.length > 0) {
          const sugestao = sugestoesAtuais[0];

          confirmarSugestaoPrimeira(
            campoAtivo,
            sugestao.codigo,
            sugestao.custo,
            sugestao.produto,
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campoAtivo]);

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
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideProduto);
  }, [produtoSugestaoAtiva]);

  useEffect(() => {
    if (listaRef.current && indiceSelecionado >= 0) {
      const element = listaRef.current.children[
        indiceSelecionado
      ] as HTMLElement;
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [indiceSelecionado]);

  useEffect(() => {
    if (listaProdutoRef.current && indiceProdutoSelecionado >= 0) {
      const element = listaProdutoRef.current.children[
        indiceProdutoSelecionado
      ] as HTMLElement;
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [indiceProdutoSelecionado]);

  const ultimaBuscaRef = useRef("");

  /**
   * Busca de sugestões da COMPOSIÇÃO — usa `buscarComPrefixoEFallback`
   * (estágio 1 = prefixo indexado e instantâneo, estágio 2 = contém,
   * só quando o prefixo não retorna nada).
   */
  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();
    ultimaBuscaRef.current = raw;

    if (!raw || raw.length < MIN_CHARS_BUSCA) {
      setSugestoes([]);
      return;
    }

    buscaAbortControllerRef.current?.abort();
    const controller = new AbortController();
    buscaAbortControllerRef.current = controller;

    const { data, error } = await buscarComPrefixoEFallback(
      "code",
      raw,
      15,
      controller.signal
    );

    if (ultimaBuscaRef.current !== raw) return;
    if (error) return; // inclui abort — ignorado silenciosamente

    const lista = ordenarPorRelevancia(
      mapResultados(data),
      raw,
      "codigo"
    ).slice(0, 5);

    setCampoAtivo(idx);
    setSugestoes(lista);
    setIndiceSelecionado(0);
  };

  // Debounce reduzido de 120ms -> 60ms: com busca por prefixo indexado
  // a query é rápida o suficiente pra não precisar de tanta espera.
  const buscarSugestoesDebounced = useRef(
    debounce(buscarSugestoes, 60)
  ).current;

  /**
   * Busca de sugestões do PRODUTO — mesmo padrão de 2 estágios,
   * aplicado tanto pra busca por código quanto por descrição.
   */
  const buscarSugestoesProduto = async (
    termo: string,
    tipo: TipoBuscaProduto
  ) => {
    const raw = termo.trim();
    const buscaAtual = `${tipo}:${raw}`;
    ultimaBuscaProdutoRef.current = buscaAtual;

    if (!raw || raw.length < MIN_CHARS_BUSCA) {
      setSugestoesProduto([]);
      setProdutoSugestaoAtiva(false);
      setIndiceProdutoSelecionado(-1);
      return;
    }

    const coluna = tipo === "codigo" ? "code" : "product";

    buscaProdutoAbortControllerRef.current?.abort();
    const controller = new AbortController();
    buscaProdutoAbortControllerRef.current = controller;

    const { data, error } = await buscarComPrefixoEFallback(
      coluna,
      raw,
      20,
      controller.signal
    );

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;
    if (error) return; // inclui abort — ignorado silenciosamente

    const lista = ordenarPorRelevancia(
      mapResultados(data),
      raw,
      tipo === "codigo" ? "codigo" : "produto"
    ).slice(0, 8);

    setSugestoesProduto(lista);
    setProdutoSugestaoAtiva(lista.length > 0);
    setIndiceProdutoSelecionado(lista.length > 0 ? 0 : -1);
  };

  const buscarSugestoesProdutoDebounced = useRef(
    debounce(buscarSugestoesProduto, 60)
  ).current;

  // Cancela debounces pendentes e requisições em voo ao desmontar o
  // componente — evita setState em componente desmontado.
  useEffect(() => {
    return () => {
      buscarSugestoesDebounced.cancel();
      buscarSugestoesProdutoDebounced.cancel();
      buscaAbortControllerRef.current?.abort();
      buscaProdutoAbortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarSugestaoPrimeira = (
    idx: number,
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string
  ) => {
    const novo = [...composicao];

    novo[idx] = {
      ...novo[idx],
      codigo,
      produto: produto || novo[idx]?.produto || "",
      descricao: produto || novo[idx]?.descricao || "",
      custo: (Number(custo) || 0).toFixed(2),
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
    marca?: string
  ) => {
    confirmarSugestaoPrimeira(idx, codigo, custo, produto, marca);

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

  const selecionarProdutoSugestao = (
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string
  ) => {
    setComposicao((prev: any[]) => {
      const novoItem = {
        codigo,
        produto: produto || "",
        descricao: produto || "",
        quantidade: "1",
        custo: (Number(custo) || 0).toFixed(2),
        marca: marca || "",
      };

      const indexVazio = prev.findIndex(isLinhaVazia);
      let novo: any[];

      if (indexVazio >= 0) {
        novo = [...prev];
        novo[indexVazio] = { ...novo[indexVazio], ...novoItem };
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

    if (!codigo && !descricao) return;

    setComposicao((prev: any[]) => {
      const novoItem = {
        codigo: codigo || "Produto sem código",
        produto: descricao,
        descricao,
        quantidade: "1",
        custo: "0",
        marca: "",
      };

      const indexVazio = prev.findIndex(isLinhaVazia);

      if (indexVazio >= 0) {
        const novo = [...prev];
        novo[indexVazio] = { ...novo[indexVazio], ...novoItem };
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
    if (!sugestoesProduto.length || !produtoSugestaoAtiva) return;

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
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;
      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto,
          item.marca
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
    if (sugestoes.length && campoAtivo === row) return;

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
    const next = () => refs.current[(index + 1) % total]?.focus();
    const prev = () => refs.current[(index - 1 + total) % total]?.focus();

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

  // =====================
  // Desconto: a Loja sempre dirige o desconto de todos os canais.
  // =====================
  const syncDescontoFromLoja = (descontoInternal: string) => {
    CHANNELS.forEach((def) => {
      setCalculo(def.key, (prev) => ({ ...prev, desconto: descontoInternal }));
    });
  };

  // =====================
  // Embalagem: canais com sharesEmbalagem=true recebem o valor
  // global (editado pela Loja). Canais com sharesEmbalagem=false
  // (ex: Shopee) têm campo próprio e travam manualmente ao editar.
  // -----------------------------------------------------------------
  // FIX: qualquer edição — incluindo "0" — precisa marcar
  // manualFlags[...].embalagem = true. Sem isso, o engine de
  // embalagem (useChannelPricing) vê a flag ainda em "false" e
  // sobrescreve o "0" digitado de volta pro valor fixo
  // (EMBALAGEM_PADRAO) no próximo ciclo de render — por isso o
  // usuário "não conseguia" deixar o campo em 0.
  // =====================
  const handleEmbalagemChangeShared = (raw: string) => {
    const value = toInternal(raw);

    CHANNELS.forEach((def) => {
      if (!def.sharesEmbalagem) return;

      setManualFlag(def.key, "embalagem", true);
      setCalculo(def.key, (prev) => ({ ...prev, embalagem: value }));
    });
  };

  const handleEmbalagemBlurShared = (raw: string) => {
    const value = toInternal(raw || "");

    CHANNELS.forEach((def) => {
      if (!def.sharesEmbalagem) return;

      if (!value) {
        // Campo ficou vazio no blur → volta pro modo automático (fixo).
        setManualFlag(def.key, "embalagem", false);
      } else {
        setManualFlag(def.key, "embalagem", true);
      }

      setCalculo(def.key, (prev) => ({ ...prev, embalagem: value }));
    });
  };

  const handleEmbalagemChangeChannel = (key: ChannelKey, raw: string) => {
    setManualFlag(key, "embalagem", true);

    const value = toInternal(raw);
    setCalculo(key, (prev) => ({ ...prev, embalagem: value }));
  };

  const handleEmbalagemBlurChannel = (key: ChannelKey, raw: string) => {
    const internal = toInternal(raw || "");

    if (!internal) {
      setManualFlag(key, "embalagem", false);
    }

    setCalculo(key, (prev) => ({ ...prev, embalagem: internal }));
  };

  // =====================
  // Limpar tudo
  // =====================
  const [isClearing, setIsClearing] = useState(false);
  const [clicks, setClicks] = useState(0);

  const handleClearAll = () => {
    const newCount = clicks + 1;
    setClicks(newCount);

    if (newCount >= 5) {
      setIsClearing(true);
      console.warn("Botão de limpar bloqueado após 5 cliques.");
      return;
    }

    setIsClearing(true);
    setComposicao([]);

    setProdutoCodigo("");
    setProdutoDescricao("");
    setProdutoMarca("");

    setSugestoesProduto([]);
    setProdutoSugestaoAtiva(false);
    setIndiceProdutoSelecionado(-1);

    resetChannelsAll();

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

    isFirstRenderComposicaoRef.current = true;
    lastComposicaoSnapshotRef.current = "";

    setTimeout(() => setIsClearing(false), 300);
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

        return [
          item.codigo || "",
          item.produto || item.descricao || "",
          item.quantidade || "",
          calcularPrecoLojaItem(custoUnitario, quantidade).toFixed(2),
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
        if (sheet[cellRef]) sheet[cellRef].s = headerStyle;
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
              calculos={calculos}
              precos={precos}
              manualFlags={manualFlags}
              setManualFlag={setManualFlag}
              brandOverrides={brandOverrides}
              setCalculo={setCalculo}
              channelRefsMap={channelRefsMapRef.current}
              acrescimos={acrescimos}
              setAcrescimos={setAcrescimos}
              isEditing={isEditing}
              setEditing={setEditing}
              toDisplay={toDisplay}
              toInternal={toInternal}
              handleLinearNav={handleLinearNav}
              acrescimosRefs={acrescimosRefs}
              handleEmbalagemBlurShared={handleEmbalagemBlurShared}
              handleEmbalagemChangeShared={handleEmbalagemChangeShared}
              handleEmbalagemChangeChannel={handleEmbalagemChangeChannel}
              handleEmbalagemBlurChannel={handleEmbalagemBlurChannel}
              handleDownload={handleDownload}
              handleClearAll={handleClearAll}
              isClearing={isClearing}
              clicks={clicks}
              statusAcrescimo={statusAcrescimo}
              syncDescontoFromLoja={syncDescontoFromLoja}
              refetchDbRules={refetchDbRules} // ← NOVO: repassado pra section, que deve encaminhar pro onApplied do ChannelPricingRulesModal (onde quer que ele esteja renderizado).
            />
          </div>
        </div>
      </div>
    </div>
  );
}
