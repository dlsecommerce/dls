"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";

// ======================================================
// Detecta tipo de anúncio
// ======================================================
function detectarTipoAnuncio(ref: string = "") {
  const r = ref.toUpperCase();
  return r.includes("PAI") || r.includes("VAR") ? "variações" : "simples";
}

// ======================================================
// HOOK PRINCIPAL
// ======================================================
export function useMarketplaceDetails(id: string | null, lojaParam: string | null) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [produto, setProduto] = useState<any>({
    id: "",
    loja: "",
    id_bling: "",
    id_tray: "",
    id_var: "",
    referencia: "",
    tipo_anuncio: "",
    od: "",
    nome: "",
    marca: "",
    categoria: "",
    peso: "",
    altura: "",
    largura: "",
    comprimento: "",
    embalagem: "",
  });

  const [calculoLoja, setCalculoLoja] = useState({
    desconto: "",
    imposto: "",
    margem: "",
    frete: "",
    comissao: "",
    marketing: "",
  });

  const {
    composicao,
    setComposicao,
    custoTotal,
    setCalculo,
    setAcrescimos,
    adicionarItem,
    removerItem,
  } = usePrecificacao();

  // ======================================================
  // AUTOCOMPLETE CUSTOS + DEBOUNCE 10ms
  // ======================================================
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(0);

  const listaRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<any[]>([]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const buscarSugestoes = async (termo: string, idx: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (!termo.trim()) {
        setSugestoes([]);
        return;
      }

      const { data, error } = await supabase
        .from("custos")
        .select('"Código", "Custo Atual"')
        .ilike('"Código"', `%${termo}%`)
        .limit(5);

      if (error) {
        console.error("Erro ao buscar sugestões:", error);
        return;
      }

      setCampoAtivo(idx);
      setSugestoes(
        data?.map((d) => ({
          codigo: d["Código"],
          custo: Number(d["Custo Atual"]) || 0,
        })) || []
      );
      setIndiceSelecionado(0);
    }, 10);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    const novo = [...composicao];

    novo[idx].codigo = codigo;
    novo[idx].custo = custo.toFixed(2);

    setComposicao(novo);

    setSugestoes([]);
    setCampoAtivo(null);

    setTimeout(() => {
      inputRefs.current[idx + 1]?.focus?.();
    }, 50);
  };

  const handleSugestoesKeys = (e: any, idx: number) => {
    if (!sugestoes.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((p) => (p < sugestoes.length - 1 ? p + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((p) => (p > 0 ? p - 1 : sugestoes.length - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const s = sugestoes[indiceSelecionado];
      selecionarSugestao(s.codigo, s.custo, idx);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setSugestoes([]);
      setCampoAtivo(null);
    }
  };

  // ======================================================
  // BUSCA marketplace_tray_all
  // ======================================================
  const buscarMarketplace = async (id: string) => {
    let { data } = await supabase
      .from("marketplace_tray_all")
      .select("*")
      .eq("ID Tray", id)
      .maybeSingle();

    if (data) return data;

    const { data: alt } = await supabase
      .from("marketplace_tray_all")
      .select("*")
      .eq("ID Bling", id)
      .maybeSingle();

    return alt || null;
  };

  // ======================================================
  // BUSCA anuncios_all — CORRIGIDA COM ID + LOJA
  // ======================================================
  const buscarAnuncioAll = async (id: string, base: any, lojaParam: string) => {
    const lojaNome = lojaParam === "SB" ? "Sóbaquetas" : "Pikot Shop";

    // 1️⃣ Busca principal: ID + Loja
    if (!isNaN(Number(id))) {
      const { data: byIdLoja } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID", Number(id))
        .eq("Loja", lojaNome)
        .maybeSingle();

      if (byIdLoja) return byIdLoja;
    }

    // 2️⃣ Busca secundária sempre filtrando por Loja
    const tentativas = [
      ["ID Tray", base["ID Tray"]],
      ["ID Bling", base["ID Bling"]],
      ["ID Var", base["ID Var"]],
      ["Referência", base["Referência"]],
    ];

    for (const [campo, valor] of tentativas) {
      if (valor) {
        const { data } = await supabase
          .from("anuncios_all")
          .select("*")
          .eq(campo, valor)
          .eq("Loja", lojaNome)
          .maybeSingle();

        if (data) return data;
      }
    }

    return null;
  };

  // ======================================================
  // CARREGAR TUDO
  // ======================================================
  const carregar = useCallback(async () => {
    if (!id || !lojaParam) return;

    setLoading(true);

    const base = await buscarMarketplace(id);
    if (!base) {
      setLoading(false);
      return;
    }

    const anuncioAll = await buscarAnuncioAll(id, base, lojaParam);

    // ======================================================
    // OD correto
    // ======================================================
    let odFinal = anuncioAll?.["OD"] ?? base["OD"] ?? "";

    if (!odFinal && anuncioAll) {
      for (let i = 1; i <= 10; i++) {
        const cod = anuncioAll[`Código ${i}`];
        if (cod && cod.toUpperCase().includes("OD")) {
          odFinal = cod;
          break;
        }
      }
    }

    // ======================================================
    // PREENCHENDO PRODUTO
    // ======================================================
    setProduto({
      id,
      loja: lojaParam === "SB" ? "Sóbaquetas" : "Pikot Shop",
      id_bling: base["ID Bling"] || "",
      id_tray: base["ID Tray"] || "",
      id_var: anuncioAll?.["ID Var"] ?? base["ID Var"] ?? "",
      referencia: base["Referência"] || "",
      tipo_anuncio: detectarTipoAnuncio(base["Referência"]),
      od: odFinal,
      nome: base["Nome"] ?? "",
      marca: base["Marca"] ?? "",
      categoria: base["Categoria"] ?? "",
      peso: anuncioAll?.["Peso"] ?? "",
      altura: anuncioAll?.["Altura"] ?? "",
      largura: anuncioAll?.["Largura"] ?? "",
      comprimento: anuncioAll?.["Comprimento"] ?? "",
      embalagem: base["Embalagem"] ?? "",
    });

    // ======================================================
    // CAMPOS DE CÁLCULO
    // ======================================================
    setCalculoLoja({
      desconto: base["Desconto"] ?? "",
      imposto: base["Imposto"] ?? "",
      margem: base["Margem de Lucro"] ?? "",
      frete: base["Frete"] ?? "",
      comissao: base["Comissão"] ?? "",
      marketing: base["Marketing"] ?? "",
    });

    // ======================================================
    // COMPOSIÇÃO (AGORA FUNCIONA)
    // ======================================================
    const compArr: any[] = [];

    if (anuncioAll) {
      for (let i = 1; i <= 10; i++) {
        const codigo = anuncioAll[`Código ${i}`];
        const qtd = anuncioAll[`Quantidade ${i}`];

        if (codigo) {
          compArr.push({
            codigo: codigo.toString(),
            quantidade: (qtd ?? 1).toString(),
            custo: "0,00",
          });
        }
      }
    }

    setComposicao(
      compArr.length ? compArr : [{ codigo: "", quantidade: "", custo: "" }]
    );

    // Limpa cálculos antigos
    setAcrescimos((prev: any) => ({ ...prev, acrescimo: 0 }));
    setCalculo((prev: any) => ({ ...prev, custo: "0" }));

    setLoading(false);
  }, [id, lojaParam, setComposicao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ======================================================
  // SALVAR
  // ======================================================
  const save = useCallback(async () => {
    if (!id || !lojaParam) return { error: null };

    const tabela = lojaParam === "SB"
      ? "marketplace_tray_sb"
      : "marketplace_tray_pk";

    setSaving(true);

    await supabase
      .from(tabela)
      .update({
        Loja: produto.loja,
        "ID Bling": produto.id_bling,
        "ID Tray": produto.id_tray,
        "ID Var": produto.id_var,
        OD: produto.od,
        Referência: produto.referencia,
        Tipo: produto.tipo_anuncio,
        Nome: produto.nome,
        Marca: produto.marca,
        Categoria: produto.categoria,
        Peso: produto.peso,
        Altura: produto.altura,
        Largura: produto.largura,
        Comprimento: produto.comprimento,
        Embalagem: produto.embalagem,
        Desconto: calculoLoja.desconto,
        Imposto: calculoLoja.imposto,
        "Margem de Lucro": calculoLoja.margem,
        Frete: calculoLoja.frete,
        Comissão: calculoLoja.comissao,
        Marketing: calculoLoja.marketing,
      })
      .eq("ID Tray", produto.id_tray);

    await supabase
      .from("anuncios_all")
      .update({
        OD: produto.od,
        Peso: produto.peso,
        Altura: produto.altura,
        Largura: produto.largura,
        Comprimento: produto.comprimento,
      })
      .or(
        `ID Var.eq.${produto.id_var},ID Tray.eq.${produto.id_tray},ID Bling.eq.${produto.id_bling}`
      );

    setSaving(false);
    return {};
  }, [id, lojaParam, produto, calculoLoja]);

  return {
    loading,
    saving,
    produto,
    setProduto,
    calculoLoja,
    setCalculoLoja,
    composicao,
    setComposicao,
    custoTotal,
    adicionarItem,
    removerItem,
    save,
    campoAtivo,
    sugestoes,
    indiceSelecionado,
    inputRefs,
    listaRef,
    buscarSugestoes,
    handleSugestoesKeys,
    selecionarSugestao,
  };
}
