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

/**
 * ✅ Ajuste principal:
 * - O idParam que chega na tela de details deve ser o UUID do marketplace_tray_pk/sb (PK dessas tabelas).
 * - A partir desse UUID, buscamos o registro marketplace (que contém anuncio_id).
 * - Depois buscamos o anúncio em anuncios_all usando anuncio_id.
 * - Save: atualiza marketplace por marketplace_id (UUID) e anuncios_all por anuncio_id.
 *
 * Isso resolve:
 * - Não carregar ao clicar em Edit (quando antes você passava o ID lógico e tentava achar no lugar errado)
 * - Save atualizando linhas erradas (mistura de ids)
 */
export function useMarketplaceDetails(
  idParam: string | null,
  lojaParam: string | null
) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * produto.marketplace_id = UUID do marketplace_tray_pk/sb
   * produto.anuncio_id = id (PK) do anuncios_all
   * produto.id_logico = campo "ID" de negócio (coluna "ID" do anuncios_all)
   */
  const [produto, setProduto] = useState<any>({
    marketplace_id: "", // ✅ UUID marketplace_tray_*
    anuncio_id: "", // ✅ id do anuncios_all (FK em marketplace)
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
   * 🔎 Buscar registro do marketplace (PK = UUID) na tabela correta (sb/pk)
   */
  const buscarMarketplacePorId = async (marketplaceId: string, loja: string) => {
    const tabela = loja === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .eq("id", marketplaceId) // ✅ UUID do marketplace
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar marketplace:", { tabela, marketplaceId, error });
      return null;
    }

    return data;
  };

  /**
   * 🔎 Buscar anúncio por anuncio_id (FK)
   */
  const buscarAnuncioPorAnuncioId = async (anuncioId: string, loja: string) => {
    const lojaNome = loja === "SB" ? "SB" : "PK";

    const { data, error } = await supabase
      .from("anuncios_all")
      .select("*")
      .eq("id", anuncioId) // ✅ PK do anuncios_all
      .eq("Loja", lojaNome)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar anuncio por anuncio_id:", { anuncioId, lojaNome, error });
      return null;
    }

    return data;
  };

  /**
   * 🔎 BUSCA DE PERCENTUAIS
   * Agora: vem do próprio registro marketplace (sb/pk), e não da view por ID lógico.
   * (evita misturar ID lógico x UUID e evita pegar linha errada se a view tiver duplicidade)
   */
  const mapPercentuaisDoMarketplace = (mp: any) => {
    return {
      desconto: mp?.Desconto ?? "",
      imposto: mp?.Imposto ?? "",
      margem: mp?.["Margem de Lucro"] ?? "",
      frete: mp?.Frete ?? "",
      comissao: mp?.["Comissão"] ?? mp?.Comissão ?? "",
      marketing: mp?.Marketing ?? "",
      embalagem: mp?.Embalagem ?? "",
    };
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

      const custos = await Promise.all(itens.map((item) => buscarCustoPorCodigo(item.codigo)));

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
      // 1) pega marketplace pelo UUID (idParam)
      const mp = await buscarMarketplacePorId(idParam, lojaParam);
      if (!mp) {
        console.warn("Marketplace não encontrado:", { idParam, lojaParam });
        return;
      }

      if (!mp.anuncio_id) {
        console.warn("Marketplace sem anuncio_id:", { idParam, lojaParam, mp });
        return;
      }

      // 2) pega anúncio pelo anuncio_id
      const anuncio = await buscarAnuncioPorAnuncioId(String(mp.anuncio_id), lojaParam);
      if (!anuncio) {
        console.warn("Anuncio não encontrado para anuncio_id:", { anuncio_id: mp.anuncio_id });
        return;
      }

      // 3) composição (vem do anuncio)
      const compArr = await montarComposicao(anuncio);

      // 4) percentuais (vem do marketplace)
      const pct = mapPercentuaisDoMarketplace(mp);

      // 5) OD fallback (mesma lógica)
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

      // 6) set states com IDs corretos
      setProduto({
        marketplace_id: mp.id, // ✅ UUID marketplace_tray_*
        anuncio_id: mp.anuncio_id, // ✅ FK para anuncios_all.id
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

        // Embalagem: prioridade marketplace > anuncio
        embalagem: pct.embalagem || anuncio["Embalagem"] || "",
      });

      setCalculoLoja({
        desconto: pct.desconto,
        imposto: pct.imposto,
        margem: pct.margem,
        frete: pct.frete,
        comissao: pct.comissao,
        marketing: pct.marketing,
      });

      setComposicao(compArr);
      setAcrescimos((p: any) => ({ ...p, acrescimo: 0 }));
      setCalculo((p: any) => ({ ...p, custo: "0" }));
    } finally {
      setLoading(false);
    }
  }, [idParam, lojaParam, montarComposicao, setAcrescimos, setCalculo, setComposicao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * 💾 SAVE — cada tabela com seu PK correto
   */
  const save = useCallback(async () => {
    if (!produto.marketplace_id || !produto.anuncio_id || !lojaParam) return { error: null };

    const tabela = lojaParam === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

    setSaving(true);

    try {
      // ✅ 1) Atualiza marketplace pelo UUID
      const { error: errMp } = await supabase
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
        .eq("id", produto.marketplace_id);

      if (errMp) console.error("Erro ao salvar marketplace:", errMp);

      // ✅ 2) Atualiza anuncios_all pelo anuncio_id (FK)
      const { error: errAn } = await supabase
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
        .eq("id", produto.anuncio_id);

      if (errAn) console.error("Erro ao salvar anuncio:", errAn);

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
