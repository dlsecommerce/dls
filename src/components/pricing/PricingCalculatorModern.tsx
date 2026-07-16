"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

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
};

type TipoBuscaProduto = "codigo" | "descricao";

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
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) {
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

  // =====================
  // Sugestões do Produto
  // =====================
  const [sugestoesProduto, setSugestoesProduto] =
    useState<Sugestao[]>([]);

  const [produtoSugestaoAtiva, setProdutoSugestaoAtiva] =
    useState(false);

  const [
    indiceProdutoSelecionado,
    setIndiceProdutoSelecionado,
  ] = useState(-1);

  const listaProdutoRef = useRef<HTMLDivElement>(null);
  const ultimaBuscaProdutoRef = useRef("");

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
    embalagem: "3",
  });

  const [calculoShopee, setCalculoShopee] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "4",
    comissao: "20",
    marketing: "3",
    embalagem: "3",
  });

  const [calculoMagalu, setCalculoMagalu] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "10",
    frete: "",
    comissao: "20",
    marketing: "3",
    embalagem: "3",
  });

  const [
    calculoMarketplaceClassico,
    setCalculoMarketplaceClassico,
  ] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "",
    comissao: "11",
    marketing: "3",
    embalagem: "3",
  });

  const [
    calculoMarketplacePremium,
    setCalculoMarketplacePremium,
  ] = useState<Calculo>({
    desconto: "",
    imposto: "14",
    margem: "15",
    frete: "",
    comissao: "16",
    marketing: "3",
    embalagem: "3",
  });

  // =====================
  // FLAGS PARA EDIÇÃO MANUAL SHOPEE
  // =====================
  const [
    userEditedShopeeComissao,
    setUserEditedShopeeComissao,
  ] = useState(false);

  const [
    userEditedShopeeFrete,
    setUserEditedShopeeFrete,
  ] = useState(false);

  const [
    userEditedShopeeImposto,
    setUserEditedShopeeImposto,
  ] = useState(false);

  const [
    userEditedShopeeMargem,
    setUserEditedShopeeMargem,
  ] = useState(false);

  const [
    userEditedShopeeMarketing,
    setUserEditedShopeeMarketing,
  ] = useState(false);

  const [
    userEditedShopeeEmbalagem,
    setUserEditedShopeeEmbalagem,
  ] = useState(false);

  /*
   * IMPORTANTE:
   *
   * Não deve existir um useEffect com dependência [composicao]
   * redefinindo as flags acima para false.
   *
   * Alterar quantidade, custo ou código na composição não significa
   * que o usuário deixou de editar manualmente os valores da Shopee.
   */

  // =====================
  // Sugestões Supabase da Composição
  // =====================
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] =
    useState<number>(-1);

  const listaRef = useRef<HTMLDivElement>(null);

  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const calcLojaRefs = useRef<HTMLInputElement[]>([]);
  const calcShopeeRefs = useRef<HTMLInputElement[]>([]);
  const calcMagaluRefs = useRef<HTMLInputElement[]>([]);
  const calcMLClassicoRefs = useRef<HTMLInputElement[]>([]);
  const calcMLPremiumRefs = useRef<HTMLInputElement[]>([]);
  const acrescimosRefs = useRef<HTMLInputElement[]>([]);

  // =====================
  // Controle de edição
  // =====================
  const [editingFields, setEditingFields] = useState<Set<string>>(
    new Set()
  );

  const setEditing = (
    key: string,
    editing: boolean
  ) => {
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

  const isEditing = (key: string) =>
    editingFields.has(key);

  // =====================
  // Fechar sugestões da composição ao clicar fora
  // =====================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;

      const listaEl = listaRef.current;
      const inputEl =
        inputRefs.current[campoAtivo]?.[0];

      const target = e.target as Node;

      const clickDentroLista = Boolean(
        listaEl && listaEl.contains(target)
      );

      const clickNoInputAtivo = Boolean(
        inputEl && inputEl.contains(target)
      );

      if (
        !clickDentroLista &&
        !clickNoInputAtivo
      ) {
        if (sugestoes.length > 0) {
          const sugestao = sugestoes[0];

          confirmarSugestaoPrimeira(
            campoAtivo,
            sugestao.codigo,
            sugestao.custo,
            sugestao.produto
          );
        }

        setSugestoes([]);
        setCampoAtivo(null);
        setIndiceSelecionado(-1);

        inputEl?.blur();
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [campoAtivo, sugestoes]);

  // =====================
  // Fechar sugestões do produto ao clicar fora
  // =====================
  useEffect(() => {
    const handleClickOutsideProduto = (
      e: MouseEvent
    ) => {
      if (!produtoSugestaoAtiva) return;

      const listaEl = listaProdutoRef.current;
      const target = e.target as Node;

      const clickDentroLista = Boolean(
        listaEl && listaEl.contains(target)
      );

      if (!clickDentroLista) {
        setProdutoSugestaoAtiva(false);
        setIndiceProdutoSelecionado(-1);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutsideProduto
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutsideProduto
      );
    };
  }, [produtoSugestaoAtiva]);

  // =====================
  // Rolagem automática da composição
  // =====================
  useEffect(() => {
    if (
      listaRef.current &&
      indiceSelecionado >= 0
    ) {
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
    if (
      listaProdutoRef.current &&
      indiceProdutoSelecionado >= 0
    ) {
      const element =
        listaProdutoRef.current.children[
          indiceProdutoSelecionado
        ] as HTMLElement;

      element?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [indiceProdutoSelecionado]);

  const ultimaBuscaRef = useRef("");

  const buscarSugestoes = async (
    termo: string,
    idx: number
  ) => {
    const raw = termo.trim();

    ultimaBuscaRef.current = raw;

    if (!raw) {
      setSugestoes([]);
      return;
    }

    const exact = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .eq('"Código"', raw)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    if (
      exact.data &&
      exact.data.length > 0
    ) {
      setCampoAtivo(idx);

      setSugestoes(
        exact.data.map((item) => ({
          codigo: item["Código"],
          custo:
            Number(item["Custo Atual"]) || 0,
          produto: item["Produto"] || "",
        }))
      );

      setIndiceSelecionado(0);

      return;
    }

    const starts = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike('"Código"', `${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    if (
      starts.data &&
      starts.data.length > 0
    ) {
      setCampoAtivo(idx);

      setSugestoes(
        starts.data.map((item) => ({
          codigo: item["Código"],
          custo:
            Number(item["Custo Atual"]) || 0,
          produto: item["Produto"] || "",
        }))
      );

      setIndiceSelecionado(0);

      return;
    }

    const partial = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike('"Código"', `%${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) {
      return;
    }

    setCampoAtivo(idx);

    setSugestoes(
      partial.data?.map((item) => ({
        codigo: item["Código"],
        custo:
          Number(item["Custo Atual"]) || 0,
        produto: item["Produto"] || "",
      })) || []
    );

    setIndiceSelecionado(0);
  };

  const buscarSugestoesDebounced = useRef(
    debounce(buscarSugestoes, 120)
  ).current;

  // =====================
  // Busca de sugestão do Produto
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

    const coluna =
      tipo === "codigo"
        ? "Código"
        : "Produto";

    const mapResultados = (
      data: any[] | null
    ) =>
      data?.map((item) => ({
        codigo: item["Código"],
        custo:
          Number(item["Custo Atual"]) || 0,
        produto: item["Produto"] || "",
      })) || [];

    const exact = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .eq(`"${coluna}"`, raw)
      .limit(8);

    if (
      ultimaBuscaProdutoRef.current !==
      buscaAtual
    ) {
      return;
    }

    if (
      exact.data &&
      exact.data.length > 0
    ) {
      const lista = mapResultados(exact.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);

      return;
    }

    const starts = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike(`"${coluna}"`, `${raw}%`)
      .limit(8);

    if (
      ultimaBuscaProdutoRef.current !==
      buscaAtual
    ) {
      return;
    }

    if (
      starts.data &&
      starts.data.length > 0
    ) {
      const lista =
        mapResultados(starts.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);

      return;
    }

    const partial = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike(`"${coluna}"`, `%${raw}%`)
      .limit(8);

    if (
      ultimaBuscaProdutoRef.current !==
      buscaAtual
    ) {
      return;
    }

    const lista =
      mapResultados(partial.data);

    setSugestoesProduto(lista);
    setProdutoSugestaoAtiva(
      lista.length > 0
    );

    setIndiceProdutoSelecionado(
      lista.length > 0 ? 0 : -1
    );
  };

  const buscarSugestoesProdutoDebounced =
    useRef(
      debounce(
        buscarSugestoesProduto,
        120
      )
    ).current;

  const confirmarSugestaoPrimeira = (
    idx: number,
    codigo: string,
    custo: number,
    produto?: string
  ) => {
    const novo = [...composicao];

    novo[idx] = {
      ...novo[idx],
      codigo,
      produto:
        produto ||
        novo[idx]?.produto ||
        "",
      descricao:
        produto ||
        novo[idx]?.descricao ||
        "",
      custo: (
        Number(custo) || 0
      ).toFixed(2),
      quantidade:
        novo[idx]?.quantidade || "1",
    };

    setComposicao(novo);
  };

  const selecionarSugestao = (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string
  ) => {
    confirmarSugestaoPrimeira(
      idx,
      codigo,
      custo,
      produto
    );

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
    produto?: string
  ) => {
    setComposicao((prev: any[]) => {
      const novoItem = {
        codigo,
        produto: produto || "",
        descricao: produto || "",
        quantidade: "1",
        custo: (
          Number(custo) || 0
        ).toFixed(2),
      };

      const indexVazio =
        prev.findIndex(isLinhaVazia);

      if (indexVazio >= 0) {
        const novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };

        return novo;
      }

      return [
        ...prev,
        novoItem,
      ];
    });

    limparProdutoBusca();
  };

  const adicionarProdutoManualNaComposicao =
    () => {
      const codigo =
        produtoCodigo.trim();

      const descricao =
        produtoDescricao.trim();

      if (!codigo && !descricao) {
        return;
      }

      setComposicao((prev: any[]) => {
        const novoItem = {
          codigo:
            codigo ||
            "Produto sem código",
          produto: descricao,
          descricao,
          quantidade: "1",
          custo: "0",
        };

        const indexVazio =
          prev.findIndex(isLinhaVazia);

        if (indexVazio >= 0) {
          const novo = [...prev];

          novo[indexVazio] = {
            ...novo[indexVazio],
            ...novoItem,
          };

          return novo;
        }

        return [
          ...prev,
          novoItem,
        ];
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
        prev <
        sugestoes.length - 1
          ? prev + 1
          : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceSelecionado((prev) =>
        prev > 0
          ? prev - 1
          : sugestoes.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      const index =
        indiceSelecionado >= 0
          ? indiceSelecionado
          : 0;

      const sugestao =
        sugestoes[index];

      selecionarSugestao(
        sugestao.codigo,
        sugestao.custo,
        idx,
        sugestao.produto
      );
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index =
        indiceSelecionado >= 0
          ? indiceSelecionado
          : 0;

      const sugestao =
        sugestoes[index];

      confirmarSugestaoPrimeira(
        idx,
        sugestao.codigo,
        sugestao.custo,
        sugestao.produto
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
    if (
      !sugestoesProduto.length ||
      !produtoSugestaoAtiva
    ) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setIndiceProdutoSelecionado(
        (prev) =>
          prev <
          sugestoesProduto.length - 1
            ? prev + 1
            : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceProdutoSelecionado(
        (prev) =>
          prev > 0
            ? prev - 1
            : sugestoesProduto.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0
          ? indiceProdutoSelecionado
          : 0;

      const item =
        sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto
        );
      }
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0
          ? indiceProdutoSelecionado
          : 0;

      const item =
        sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto
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
    if (
      sugestoes.length &&
      campoAtivo === row
    ) {
      return;
    }

    const totalRows =
      composicao.length;

    const goNext = () => {
      const nextRow =
        row + 1 < totalRows
          ? row + 1
          : 0;

      inputRefs.current[
        nextRow
      ]?.[col]?.focus();
    };

    const goPrev = () => {
      const prevRow =
        row - 1 >= 0
          ? row - 1
          : totalRows - 1;

      inputRefs.current[
        prevRow
      ]?.[col]?.focus();
    };

    if (
      e.key === "ArrowDown" ||
      e.key === "Enter"
    ) {
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
    refs: React.MutableRefObject<
      HTMLInputElement[]
    >,
    total: number
  ) => {
    const next = () => {
      refs.current[
        (index + 1) % total
      ]?.focus();
    };

    const prev = () => {
      refs.current[
        (index - 1 + total) % total
      ]?.focus();
    };

    if (
      e.key === "ArrowDown" ||
      e.key === "Enter" ||
      (
        e.key === "Tab" &&
        !e.shiftKey
      )
    ) {
      e.preventDefault();
      next();
    } else if (
      e.key === "ArrowUp" ||
      (
        e.key === "Tab" &&
        e.shiftKey
      )
    ) {
      e.preventDefault();
      prev();
    }
  };

  const syncDescontoFromLoja = (
    descontoInternal: string
  ) => {
    setCalculoLoja((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));

    setCalculoShopee((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));

    setCalculoMagalu((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));

    setCalculoMarketplaceClassico(
      (prev) => ({
        ...prev,
        desconto: descontoInternal,
      })
    );

    setCalculoMarketplacePremium(
      (prev) => ({
        ...prev,
        desconto: descontoInternal,
      })
    );
  };

  const handleEmbalagemChangeShared = (
    raw: string
  ) => {
    const value = toInternal(raw);

    setCalculoLoja((prev) => ({
      ...prev,
      embalagem: value,
    }));

    setCalculoMagalu((prev) => ({
      ...prev,
      embalagem: value,
    }));

    setCalculoMarketplaceClassico(
      (prev) => ({
        ...prev,
        embalagem: value,
      })
    );

    setCalculoMarketplacePremium(
      (prev) => ({
        ...prev,
        embalagem: value,
      })
    );
  };

  const handleEmbalagemBlurShared = (
    raw: string
  ) => {
    const internal =
      toInternal(raw || "3");

    const value =
      internal || "3";

    setCalculoLoja((prev) => ({
      ...prev,
      embalagem: value,
    }));

    setCalculoMagalu((prev) => ({
      ...prev,
      embalagem: value,
    }));

    setCalculoMarketplaceClassico(
      (prev) => ({
        ...prev,
        embalagem: value,
      })
    );

    setCalculoMarketplacePremium(
      (prev) => ({
        ...prev,
        embalagem: value,
      })
    );
  };

  const handleEmbalagemChangeShopee = (
    raw: string
  ) => {
    setUserEditedShopeeEmbalagem(true);

    const value =
      toInternal(raw);

    setCalculoShopee((prev) => ({
      ...prev,
      embalagem: value,
    }));
  };

  const handleEmbalagemBlurShopee = (
    raw: string
  ) => {
    const internal =
      toInternal(raw || "");

    if (!internal) {
      setUserEditedShopeeEmbalagem(false);
    }

    const value =
      internal || "3";

    setCalculoShopee((prev) => ({
      ...prev,
      embalagem: value,
    }));
  };

  const calcularPreco = (
    dados: Calculo
  ) => {
    const custo = composicao.reduce(
      (sum, item) =>
        sum +
        (
          parseFloat(item.custo) ||
          0
        ) *
          (
            parseFloat(
              item.quantidade
            ) || 0
          ),
      0
    );

    const desconto =
      (
        parseFloat(
          dados.desconto
        ) || 0
      ) / 100;

    const imposto =
      (
        parseFloat(
          dados.imposto
        ) || 0
      ) / 100;

    const margem =
      (
        parseFloat(
          dados.margem
        ) || 0
      ) / 100;

    const comissao =
      (
        parseFloat(
          dados.comissao
        ) || 0
      ) / 100;

    const marketing =
      (
        parseFloat(
          dados.marketing
        ) || 0
      ) / 100;

    const frete =
      parseFloat(
        dados.frete
      ) || 0;

    const embalagem =
      parseFloat(
        dados.embalagem || "3"
      ) || 0;

    const custoLiquido =
      custo * (1 - desconto);

    const divisor =
      1 -
      (
        imposto +
        margem +
        comissao +
        marketing
      );

    const preco =
      divisor > 0
        ? (
            custoLiquido +
            frete +
            embalagem
          ) / divisor
        : 0;

    return isFinite(preco)
      ? preco
      : 0;
  };

  const precoLoja =
    calcularPreco(calculoLoja);

  const precoShopee =
    calcularPreco(calculoShopee);

  const precoMagalu =
    calcularPreco(calculoMagalu);

  const precoMLClassico =
    calcularPreco(
      calculoMarketplaceClassico
    );

  const precoMLPremium =
    calcularPreco(
      calculoMarketplacePremium
    );

  // =====================
  // Regra automática Shopee
  // =====================
  useEffect(() => {
    let regras: Calculo = {
      desconto:
        calculoShopee.desconto,
      embalagem: "3",
      frete: "4",
      imposto: "14",
      comissao: "20",
      margem: "15",
      marketing: "3",
    };

    if (
      precoShopee >= 80 &&
      precoShopee <= 99.99
    ) {
      regras = {
        desconto:
          calculoShopee.desconto,
        embalagem: "3",
        frete: "16",
        imposto: "14",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    } else if (
      precoShopee >= 100 &&
      precoShopee <= 199.99
    ) {
      regras = {
        desconto:
          calculoShopee.desconto,
        embalagem: "3",
        frete: "20",
        imposto: "14",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    } else if (
      precoShopee >= 200
    ) {
      regras = {
        desconto:
          calculoShopee.desconto,
        embalagem: "3",
        frete: "26",
        imposto: "14",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    }

    setCalculoShopee((prev) => {
      const next: Calculo = {
        ...prev,

        embalagem:
          userEditedShopeeEmbalagem
            ? prev.embalagem
            : regras.embalagem,

        imposto:
          userEditedShopeeImposto
            ? prev.imposto
            : regras.imposto,

        margem:
          userEditedShopeeMargem
            ? prev.margem
            : regras.margem,

        marketing:
          userEditedShopeeMarketing
            ? prev.marketing
            : regras.marketing,

        comissao:
          userEditedShopeeComissao
            ? prev.comissao
            : regras.comissao,

        frete:
          userEditedShopeeFrete
            ? prev.frete
            : regras.frete,
      };

      const semAlteracoes =
        next.embalagem ===
          prev.embalagem &&
        next.imposto ===
          prev.imposto &&
        next.margem ===
          prev.margem &&
        next.marketing ===
          prev.marketing &&
        next.comissao ===
          prev.comissao &&
        next.frete ===
          prev.frete;

      return semAlteracoes
        ? prev
        : next;
    });
  }, [
    precoShopee,
    calculoShopee.desconto,
    userEditedShopeeComissao,
    userEditedShopeeFrete,
    userEditedShopeeImposto,
    userEditedShopeeMargem,
    userEditedShopeeMarketing,
    userEditedShopeeEmbalagem,
  ]);

  useEffect(() => {
    setAcrescimos((prev) => ({
      ...prev,

      precoLoja:
        precoLoja.toFixed(2),

      precoShopee:
        precoShopee.toFixed(2),

      precoMagalu:
        precoMagalu.toFixed(2),

      precoMercadoLivreClassico:
        precoMLClassico.toFixed(2),

      precoMercadoLivrePremium:
        precoMLPremium.toFixed(2),

      freteMercadoLivreClassico:
        calculoMarketplaceClassico.frete ||
        "0",

      freteMercadoLivrePremium:
        calculoMarketplacePremium.frete ||
        "0",
    }));
  }, [
    precoLoja,
    precoShopee,
    precoMagalu,
    precoMLClassico,
    precoMLPremium,
    calculoMarketplaceClassico.frete,
    calculoMarketplacePremium.frete,
    setAcrescimos,
  ]);

  const [isClearing, setIsClearing] =
    useState(false);

  const [clicks, setClicks] =
    useState(0);

  const handleClearAll = () => {
    setClicks((prev) => {
      const newCount =
        prev + 1;

      if (newCount < 5) {
        setIsClearing(true);
        setComposicao([]);

        setProdutoCodigo("");
        setProdutoDescricao("");

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
          embalagem: "3",
        });

        setCalculoShopee({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "4",
          comissao: "20",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoMagalu({
          desconto: "",
          imposto: "14",
          margem: "10",
          frete: "",
          comissao: "20",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoMarketplaceClassico({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "",
          comissao: "11",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoMarketplacePremium({
          desconto: "",
          imposto: "14",
          margem: "15",
          frete: "",
          comissao: "16",
          marketing: "3",
          embalagem: "3",
        });

        setAcrescimos({
          precoLoja: "",
          precoShopee: "",
          precoMagalu: "",
          precoMercadoLivreClassico:
            "",
          precoMercadoLivrePremium:
            "",
          freteMercadoLivreClassico:
            "",
          freteMercadoLivrePremium:
            "",
          acrescimoClassico: 0,
          acrescimoPremium: 0,
        });

        /*
         * As flags são redefinidas somente
         * ao limpar toda a precificação.
         */
        setUserEditedShopeeComissao(
          false
        );

        setUserEditedShopeeFrete(
          false
        );

        setUserEditedShopeeImposto(
          false
        );

        setUserEditedShopeeMargem(
          false
        );

        setUserEditedShopeeMarketing(
          false
        );

        setUserEditedShopeeEmbalagem(
          false
        );

        setTimeout(() => {
          setIsClearing(false);
        }, 300);
      } else {
        setIsClearing(true);

        console.warn(
          "Botão de limpar bloqueado após 5 cliques."
        );
      }

      return newCount;
    });
  };

  useEffect(() => {
    if (clicks === 0) return;

    const timer = setTimeout(
      () => setClicks(0),
      5000
    );

    return () =>
      clearTimeout(timer);
  }, [clicks]);

  const handleDownload = async () => {
    const now = new Date();

    const dataFormatada = now
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");

    const horaFormatada = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}h${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}m`;

    const fileName =
      `PRECIFICACAO_${dataFormatada}_${horaFormatada}.xlsx`;

    const composicaoRows: (
      string | number
    )[][] = [
      ["Composição de Custos"],
      [
        "Gerado em",
        now.toLocaleString("pt-BR"),
      ],
      [],
      [
        "Código",
        "Descrição",
        "Quantidade",
        "Custo Unitário (R$)",
      ],
      ...composicao.map(
        (item: any) => [
          item.codigo || "",
          item.produto ||
            item.descricao ||
            "",
          item.quantidade || "",
          item.custo || "",
        ]
      ),
    ];

    const composicaoSheet =
      XLSX.utils.aoa_to_sheet(
        composicaoRows
      );

    const resumoRows: (
      string | number
    )[][] = [
      ["Resumo de Precificação"],
      [
        "Gerado em",
        now.toLocaleString("pt-BR"),
      ],
      [],
      [
        "Itens na composição",
        composicao.length,
      ],
      [],
      [
        "Custo Total (R$)",
        custoTotal,
      ],
      [
        "Preço Loja (R$)",
        precoLoja,
      ],
      [
        "Preço Shopee (R$)",
        precoShopee,
      ],
      [
        "Preço Magalu (R$)",
        precoMagalu,
      ],
      [
        "Preço ML Clássico (R$)",
        precoMLClassico,
      ],
      [
        "Preço ML Premium (R$)",
        precoMLPremium,
      ],
      [],
      ["Regras Loja"],
      ...Object.entries(calculoLoja),
      [],
      ["Regras Shopee"],
      ...Object.entries(calculoShopee),
      [],
      ["Regras Magalu"],
      ...Object.entries(calculoMagalu),
      [],
      [
        "Regras Mercado Livre Clássico",
      ],
      ...Object.entries(
        calculoMarketplaceClassico
      ),
      [],
      [
        "Regras Mercado Livre Premium",
      ],
      ...Object.entries(
        calculoMarketplacePremium
      ),
    ];

    const resumoSheet =
      XLSX.utils.aoa_to_sheet(
        resumoRows
      );

    const headerStyle = {
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: {
          rgb: "1A8CEB",
        },
      },
      font: {
        bold: true,
        color: {
          rgb: "FFFFFF",
        },
        sz: 11,
      },
      border: {
        top: {
          style: "thin",
          color: {
            rgb: "FFFFFF",
          },
        },
        bottom: {
          style: "thin",
          color: {
            rgb: "FFFFFF",
          },
        },
        left: {
          style: "thin",
          color: {
            rgb: "FFFFFF",
          },
        },
        right: {
          style: "thin",
          color: {
            rgb: "FFFFFF",
          },
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    } as const;

    const applyHeaderStyle = (
      sheet: any,
      headerRow: number,
      cols: number
    ) => {
      const letters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(
          ""
        );

      for (
        let index = 0;
        index < cols;
        index++
      ) {
        const cellRef =
          `${letters[index]}${headerRow}`;

        if (sheet[cellRef]) {
          sheet[cellRef].s =
            headerStyle;
        }
      }
    };

    applyHeaderStyle(
      composicaoSheet,
      4,
      4
    );

    applyHeaderStyle(
      resumoSheet,
      1,
      1
    );

    composicaoSheet["!cols"] = [
      {
        wch: 24,
      },
      {
        wch: 44,
      },
      {
        wch: 16,
      },
      {
        wch: 18,
      },
    ];

    resumoSheet["!cols"] = [
      {
        wch: 32,
      },
      {
        wch: 22,
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      composicaoSheet,
      "Composição"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      resumoSheet,
      "Resumo"
    );

    const workbookOutput =
      XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
      });

    const blob = new Blob(
      [workbookOutput],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    saveAs(blob, fileName);

    await createNotification({
      title:
        "Precificação exportada",

      message:
        `A planilha "${fileName}" foi exportada com ${composicao.length} item(ns) na composição.`,

      action: "status",

      entityType:
        "pricing_calculator_export",

      link:
        "/dashboard/precificacao",
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#070707] via-[#0c0c0c] to-[#070707] px-4 pb-24 pt-6 sm:px-6 sm:pb-8 lg:px-8">
      <div className="mx-auto max-w-[1880px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div
            className={`min-w-0 space-y-4 lg:col-span-3 ${
              campoAtivo !== null ||
              produtoSugestaoAtiva
                ? "z-[120]"
                : "z-0"
            }`}
          >
            <ProductSection
              codigo={
                produtoCodigo
              }
              setCodigo={
                setProdutoCodigo
              }
              descricao={
                produtoDescricao
              }
              setDescricao={
                setProdutoDescricao
              }
              sugestoesProduto={
                sugestoesProduto
              }
              produtoSugestaoAtiva={
                produtoSugestaoAtiva
              }
              indiceProdutoSelecionado={
                indiceProdutoSelecionado
              }
              listaProdutoRef={
                listaProdutoRef
              }
              buscarSugestoesProdutoDebounced={
                buscarSugestoesProdutoDebounced
              }
              handleProdutoSugestoesKeys={
                handleProdutoSugestoesKeys
              }
              selecionarProdutoSugestao={
                selecionarProdutoSugestao
              }
              onAdicionarProduto={
                adicionarProdutoManualNaComposicao
              }
            />

            <CostComposition
              composicao={
                composicao
              }
              setComposicao={
                setComposicao
              }
              custoTotal={
                custoTotal
              }
              adicionarItem={
                adicionarItem
              }
              removerItem={
                removerItem
              }
              sugestoes={
                sugestoes
              }
              campoAtivo={
                campoAtivo
              }
              indiceSelecionado={
                indiceSelecionado
              }
              listaRef={
                listaRef
              }
              inputRefs={
                inputRefs
              }
              buscarSugestoesDebounced={
                buscarSugestoesDebounced
              }
              handleSugestoesKeys={
                handleSugestoesKeys
              }
              handleGridNav={
                handleGridNav
              }
              selecionarSugestao={
                selecionarSugestao
              }
              confirmarSugestaoPrimeira={
                confirmarSugestaoPrimeira
              }
              isEditing={
                isEditing
              }
              setEditing={
                setEditing
              }
              toDisplay={
                toDisplay
              }
              toInternal={
                toInternal
              }
            />
          </div>

          <div className="min-w-0 lg:col-span-9">
            <PriceCalculationSection
              calculoLoja={
                calculoLoja
              }
              setCalculoLoja={
                setCalculoLoja
              }
              calculoShopee={
                calculoShopee
              }
              setCalculoShopee={
                setCalculoShopee
              }
              calculoMagalu={
                calculoMagalu
              }
              setCalculoMagalu={
                setCalculoMagalu
              }
              calculoMLClassico={
                calculoMarketplaceClassico
              }
              setCalculoMLClassico={
                setCalculoMarketplaceClassico
              }
              calculoMLPremium={
                calculoMarketplacePremium
              }
              setCalculoMLPremium={
                setCalculoMarketplacePremium
              }
              precoLoja={
                precoLoja
              }
              precoShopee={
                precoShopee
              }
              precoMagalu={
                precoMagalu
              }
              precoMLClassico={
                precoMLClassico
              }
              precoMLPremium={
                precoMLPremium
              }
              acrescimos={
                acrescimos
              }
              setAcrescimos={
                setAcrescimos
              }
              isEditing={
                isEditing
              }
              setEditing={
                setEditing
              }
              toDisplay={
                toDisplay
              }
              toInternal={
                toInternal
              }
              handleLinearNav={
                handleLinearNav
              }
              calcLojaRefs={
                calcLojaRefs
              }
              calcShopeeRefs={
                calcShopeeRefs
              }
              calcMagaluRefs={
                calcMagaluRefs
              }
              calcMLClassicoRefs={
                calcMLClassicoRefs
              }
              calcMLPremiumRefs={
                calcMLPremiumRefs
              }
              acrescimosRefs={
                acrescimosRefs
              }
              handleEmbalagemBlurShared={
                handleEmbalagemBlurShared
              }
              handleEmbalagemChangeShared={
                handleEmbalagemChangeShared
              }
              handleEmbalagemBlurShopee={
                handleEmbalagemBlurShopee
              }
              handleEmbalagemChangeShopee={
                handleEmbalagemChangeShopee
              }
              handleDownload={
                handleDownload
              }
              handleClearAll={
                handleClearAll
              }
              isClearing={
                isClearing
              }
              clicks={
                clicks
              }
              statusAcrescimo={
                statusAcrescimo
              }
              syncDescontoFromLoja={
                syncDescontoFromLoja
              }
              userEditedShopeeComissao={
                userEditedShopeeComissao
              }
              setUserEditedShopeeComissao={
                setUserEditedShopeeComissao
              }
              userEditedShopeeFrete={
                userEditedShopeeFrete
              }
              setUserEditedShopeeFrete={
                setUserEditedShopeeFrete
              }
              userEditedShopeeImposto={
                userEditedShopeeImposto
              }
              setUserEditedShopeeImposto={
                setUserEditedShopeeImposto
              }
              userEditedShopeeMargem={
                userEditedShopeeMargem
              }
              setUserEditedShopeeMargem={
                setUserEditedShopeeMargem
              }
              userEditedShopeeMarketing={
                userEditedShopeeMarketing
              }
              setUserEditedShopeeMarketing={
                setUserEditedShopeeMarketing
              }
              userEditedShopeeEmbalagem={
                userEditedShopeeEmbalagem
              }
              setUserEditedShopeeEmbalagem={
                setUserEditedShopeeEmbalagem
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}