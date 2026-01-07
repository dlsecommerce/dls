"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";

function detectarTipoAnuncio(ref: string = "") {
  if (!ref) return "Simples";
  const r = ref.toUpperCase();
  const ehPai = r.includes("PAI -");
  const ehVar = r.includes("VAR -");
  return ehPai || ehVar ? "Com variações" : "Simples";
}

export function useMarketplaceDetails(
  idParam: string | null,
  lojaParam: string | null
) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * produto.id = UUID (PK real do banco)
   * produto.id_logico = campo "ID" de negócio
   */
  const [produto, setProduto] = useState<any>({
    id: "", // 🔥 UUID
    id_logico: "",
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

  const selecionarSugestao = (
    codigo: string,
    custo: number,
    idx: number
  ) => {
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
      setIndiceSelecionado((p) =>
        p < sugestoes.length - 1 ? p + 1 : 0
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((p) =>
        p > 0 ? p - 1 : sugestoes.length - 1
      );
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

  const buscarCustoPorCodigo = useCallback(async (codigo: string): Promise<number> => {
    if (!codigo) return 0;

    const { data, error } = await supabase
      .from("custos")
      .select('"Custo Atual"')
      .eq('"Código"', codigo)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar custo por código:", codigo, error);
      return 0;
    }

    return data ? Number(data["Custo Atual"]) || 0 : 0;
  }, []);

  /**
   * 🔎 BUSCA DO ANÚNCIO (LEITURA)
   */
  const buscarAnuncio = async (valor: string, loja: string) => {
    const lojaNome = loja === "SB" ? "SB" : "PK";

    if (!isNaN(Number(valor))) {
      const { data } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID", Number(valor))
        .eq("Loja", lojaNome)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (data) return data;
    }

    {
      const { data } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID Tray", valor)
        .eq("Loja", lojaNome)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (data) return data;
    }

    {
      const { data } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID Bling", valor)
        .eq("Loja", lojaNome)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (data) return data;
    }

    return null;
  };

  /**
   * 🔎 BUSCA DE PERCENTUAIS (VIEW)
   */
  const buscarPercentuais = async (anuncio: any, loja: string) => {
    const lojaNome = loja === "SB" ? "SB" : "PK";

    const { data, error } = await supabase
      .from("marketplace_tray_all")
      .select(
        'Desconto, Embalagem, Frete, Imposto, "Margem de Lucro", Comissão, Marketing'
      )
      .eq("ID", anuncio["ID"])
      .eq("Loja", lojaNome)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Erro ao buscar percentuais:", error);
      return null;
    }

    return data;
  };

  const montarComposicao = useCallback(
    async (anuncio: any) => {
      const itens: { codigo: string; quantidade: string }[] = [];

      for (let i = 1; i <= 10; i++) {
        const codigo = anuncio[`Código ${i}`];
        const qtd = anuncio[`Quantidade ${i}`];

        if (codigo) {
          itens.push({
            codigo: codigo.toString(),
            quantidade: (qtd ?? 1).toString(),
          });
        }
      }

      if (!itens.length) {
        return [{ codigo: "", quantidade: "", custo: "" }];
      }

      const custos = await Promise.all(
        itens.map((item) => buscarCustoPorCodigo(item.codigo))
      );

      return itens.map((item, idx) => ({
        codigo: item.codigo,
        quantidade: item.quantidade,
        custo: (custos[idx] || 0).toFixed(2),
      }));
    },
    [buscarCustoPorCodigo]
  );

  const carregar = useCallback(async () => {
    if (!idParam || !lojaParam) return;

    setLoading(true);

    try {
      const anuncio = await buscarAnuncio(idParam, lojaParam);
      if (!anuncio) return;

      const [percentuais, compArr] = await Promise.all([
        buscarPercentuais(anuncio, lojaParam),
        montarComposicao(anuncio),
      ]);

      let odFinal = anuncio["OD"] ?? "";

      if (!odFinal) {
        for (let i = 1; i <= 10; i++) {
          const cod = anuncio[`Código ${i}`];
          if (cod && cod.toUpperCase().includes("OD")) {
            odFinal = cod;
            break;
          }
        }
      }

      setProduto({
        id: anuncio.id, // 🔥 UUID
        id_logico: anuncio["ID"],
        loja: lojaParam === "SB" ? "Sóbaquetas" : "Pikot Shop",
        id_bling: anuncio["ID Bling"] || "",
        id_tray: anuncio["ID Tray"] || "",
        id_var: anuncio["ID Var"] || "",
        referencia: anuncio["Referência"] || "",
        tipo_anuncio: detectarTipoAnuncio(anuncio["Referência"]),
        od: odFinal,
        nome: anuncio["Nome"] ?? "",
        marca: anuncio["Marca"] ?? "",
        categoria: anuncio["Categoria"] ?? "",
        peso: anuncio["Peso"] ?? "",
        altura: anuncio["Altura"] ?? "",
        largura: anuncio["Largura"] ?? "",
        comprimento: anuncio["Comprimento"] ?? "",
        embalagem:
          percentuais?.Embalagem ??
          anuncio["Embalagem"] ??
          "",
      });

      setCalculoLoja({
        desconto: percentuais?.Desconto ?? "",
        imposto: percentuais?.Imposto ?? "",
        margem: percentuais?.["Margem de Lucro"] ?? "",
        frete: percentuais?.Frete ?? "",
        comissao: percentuais?.Comissão ?? "",
        marketing: percentuais?.Marketing ?? "",
      });

      setComposicao(compArr);
      setAcrescimos((p: any) => ({ ...p, acrescimo: 0 }));
      setCalculo((p: any) => ({ ...p, custo: "0" }));
    } finally {
      setLoading(false);
    }
  }, [idParam, lojaParam, montarComposicao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * 💾 SAVE — UPDATE DETERMINÍSTICO (UUID)
   */
  const save = useCallback(async () => {
    if (!produto.id || !lojaParam) return { error: null };

    const tabela =
      lojaParam === "SB"
        ? "marketplace_tray_sb"
        : "marketplace_tray_pk";

    setSaving(true);

    try {
      await supabase
        .from(tabela)
        .update({
          Desconto: calculoLoja.desconto,
          Imposto: calculoLoja.imposto,
          "Margem de Lucro": calculoLoja.margem,
          Frete: calculoLoja.frete,
          Comissão: calculoLoja.comissao,
          Marketing: calculoLoja.marketing,
          Embalagem: produto.embalagem,
        })
        .eq("id", produto.id); // ✅ UUID

      await supabase
        .from("anuncios_all")
        .update({
          OD: produto.od,
          Peso: produto.peso,
          Altura: produto.altura,
          Largura: produto.largura,
          Comprimento: produto.comprimento,
          Embalagem: produto.embalagem,
          Referência: produto.referencia,
          Tipo: produto.tipo_anuncio,
        })
        .eq("id", produto.id); // ✅ UUID

      return {};
    } finally {
      setSaving(false);
    }
  }, [produto, calculoLoja, lojaParam]);

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
