"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { createNotification } from "@/lib/createNotification";

function detectarTipoAnuncio(ref: string = "") {
  const r = String(ref ?? "")
    .trim()
    .toUpperCase();

  if (!r) return "Simples";

  // Regra correta:
  // - Se NÃO contém PAI- nem VAR- => Simples
  // - Se contém PAI-/PAI - ou VAR-/VAR - => Com variações
  const temPaiOuVar =
    r.includes("PAI-") ||
    r.includes("VAR-") ||
    r.includes("PAI -") ||
    r.includes("VAR -");

  return temPaiOuVar ? "Com variações" : "Simples";
}

function normalizeLojaCode(
  lojaRaw: string | null | undefined
): "PK" | "SB" | "" {
  const s = String(lojaRaw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "");

  if (s === "PK" || s.startsWith("PK") || s.includes("PIKOT")) return "PK";
  if (s === "SB" || s.startsWith("SB") || s.includes("SOBA")) return "SB";

  return "";
}

function getLojaLabel(lojaCode: string) {
  if (lojaCode === "SB") return "Sóbaquetas";
  if (lojaCode === "PK") return "Pikot Shop";
  return lojaCode;
}

function getTrayNotificationLink(params: {
  marketplaceId: string;
  loja: string;
}) {
  return `/dashboard/marketplaces/tray/edit?id=${encodeURIComponent(
    params.marketplaceId
  )}&loja=${encodeURIComponent(params.loja)}`;
}

function getProdutoLabel(produto: any) {
  return (
    produto?.nome ||
    produto?.referencia ||
    produto?.id_logico ||
    produto?.marketplace_id ||
    "anúncio"
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function useMarketplaceDetails(
  idParam: string | null,
  lojaParam: string | null
) {
  const lojaCode = normalizeLojaCode(lojaParam);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [produto, setProduto] = useState<any>({
    marketplace_id: "",
    anuncio_id: "",
    id_logico: "",

    loja: "",
    id_bling: "",
    id_tray: "",
    id_var: "",
    referencia: "",
    tipo_anuncio: "Simples",
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

      if (s) {
        selecionarSugestao(s.codigo, s.custo, idx);
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setSugestoes([]);
      setCampoAtivo(null);
    }
  };

  const buscarCustoPorCodigo = useCallback(
    async (codigo: string): Promise<number> => {
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
    },
    []
  );

  /**
   * Busca marketplace pelo ID interno/lógico.
   *
   * Padrão correto:
   * /dashboard/marketplaces/tray/edit?id=13946&loja=Pikot%20Shop
   *
   * idParam = coluna "ID"
   *
   * Também tenta "ID Tray" como fallback para URLs antigas:
   * /edit?id=2940857&loja=PK
   *
   * Só tenta campo "id" se o valor realmente for UUID.
   */
  const buscarMarketplacePorIdInterno = async (
    marketplaceId: string,
    loja: string
  ) => {
    const tabela = loja === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

    const idBusca = String(marketplaceId || "").trim();

    if (!idBusca) return null;

    const campos = isUuid(idBusca)
      ? ["id", "ID", "ID Tray"]
      : ["ID", "ID Tray"];

    for (const campo of campos) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .eq(campo, idBusca)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar marketplace:", {
          tabela,
          campo,
          idBusca,
          error,
        });

        continue;
      }

      if (data) return data;
    }

    console.warn("Marketplace não encontrado:", {
      tabela,
      idBusca,
      campos,
    });

    return null;
  };

  /**
   * Busca anúncio pelo ID interno/lógico.
   *
   * Importante:
   * anuncios_all NÃO tem coluna "id".
   * O campo correto é "ID".
   */
  const buscarAnuncioPorIdInterno = async (idInterno: string, loja: string) => {
    const lojaNome = loja === "SB" ? "SB" : "PK";
    const idBusca = String(idInterno || "").trim();

    if (!idBusca) return null;

    const { data, error } = await supabase
      .from("anuncios_all")
      .select("*")
      .eq("ID", idBusca)
      .eq("Loja", lojaNome)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar anuncio por ID interno:", {
        idBusca,
        lojaNome,
        error,
      });

      return null;
    }

    return data;
  };

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
    if (!idParam || !lojaCode) return;

    setLoading(true);

    try {
      const mp = await buscarMarketplacePorIdInterno(idParam, lojaCode);

      if (!mp) {
        console.warn("Marketplace não encontrado:", {
          idParam,
          lojaParam,
          lojaCode,
        });

        return;
      }

      /**
       * ID interno/lógico para buscar em anuncios_all.
       *
       * Prioridade:
       * 1. mp.anuncio_id, porque na sua tabela marketplace ele está guardando o ID interno.
       * 2. mp.ID
       * 3. idParam, caso a URL já venha com o ID interno.
       */
      const idInternoAnuncio = String(
        mp.anuncio_id || mp.ID || idParam || ""
      ).trim();

      if (!idInternoAnuncio) {
        console.warn("Marketplace sem ID interno do anúncio:", {
          idParam,
          lojaParam,
          lojaCode,
          mp,
        });

        return;
      }

      const anuncio = await buscarAnuncioPorIdInterno(
        idInternoAnuncio,
        lojaCode
      );

      if (!anuncio) {
        console.warn("Anuncio não encontrado para ID interno:", {
          idInternoAnuncio,
          lojaCode,
        });

        return;
      }

      const compArr = await montarComposicao(anuncio);

      const pct = mapPercentuaisDoMarketplace(mp);

      let odFinal = anuncio["OD"] ?? "";

      if (!odFinal) {
        for (let i = 1; i <= 10; i++) {
          const cod = anuncio[`Código ${i}`];

          if (cod && String(cod).toUpperCase().includes("OD")) {
            odFinal = cod;
            break;
          }
        }
      }

      const referenciaFinal = anuncio["Referência"] || mp["Referência"] || "";
      const tipoAnuncioFinal = detectarTipoAnuncio(referenciaFinal);

      setProduto({
        marketplace_id: mp.id || "",
        anuncio_id: String(anuncio["ID"] || idInternoAnuncio),
        id_logico: anuncio["ID"] || idInternoAnuncio,

        loja: getLojaLabel(lojaCode),
        id_bling: anuncio["ID Bling"] || mp["ID Bling"] || "",
        id_tray: anuncio["ID Tray"] || mp["ID Tray"] || "",
        id_var: anuncio["ID Var"] || mp["ID Var"] || "",
        referencia: referenciaFinal,
        tipo_anuncio: tipoAnuncioFinal,
        od: odFinal,

        nome: anuncio["Nome"] ?? mp["Nome"] ?? "",
        marca: anuncio["Marca"] ?? mp["Marca"] ?? "",
        categoria: anuncio["Categoria"] ?? mp["Categoria"] ?? "",
        peso: anuncio["Peso"] ?? "",
        altura: anuncio["Altura"] ?? "",
        largura: anuncio["Largura"] ?? "",
        comprimento: anuncio["Comprimento"] ?? "",

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
  }, [
    idParam,
    lojaParam,
    lojaCode,
    montarComposicao,
    setAcrescimos,
    setCalculo,
    setComposicao,
  ]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * Save:
   * - marketplace_tray_pk/sb atualiza pelo UUID da linha marketplace: mp.id
   * - anuncios_all atualiza pelo ID interno/lógico: coluna "ID"
   */
  const save = useCallback(async () => {
    if (!produto.marketplace_id || !produto.anuncio_id || !lojaCode) {
      return { error: null };
    }

    const tabela =
      lojaCode === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

    const tipoAnuncioFinal = detectarTipoAnuncio(produto.referencia);

    setSaving(true);

    try {
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

      if (errMp) throw errMp;

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
          Tipo: tipoAnuncioFinal,
        })
        .eq("ID", produto.anuncio_id)
        .eq("Loja", lojaCode);

      if (errAn) throw errAn;

      setProduto((prev: any) => ({
        ...prev,
        tipo_anuncio: tipoAnuncioFinal,
      }));

      await createNotification({
        title: "Precificação Tray atualizada",
        message: `A precificação Tray do anúncio "${getProdutoLabel(
          produto
        )}" foi atualizada.`,
        action: "update",
        entityType: "marketplace_tray_pricing",
        entityId: String(produto.id_logico || produto.anuncio_id),
        link: getTrayNotificationLink({
          marketplaceId: String(produto.id_logico || produto.anuncio_id),
          loja: getLojaLabel(lojaCode),
        }),
      });

      return { error: null };
    } catch (error) {
      console.error("Erro ao salvar precificação Tray:", error);

      return { error };
    } finally {
      setSaving(false);
    }
  }, [produto, calculoLoja, lojaCode]);

  /**
   * Wrapper do setProduto.
   *
   * Isso garante que, quando a referência for alterada na tela,
   * o campo tipo_anuncio também seja atualizado automaticamente:
   *
   * - Sem PAI-/VAR- => Simples
   * - Com PAI-/VAR- => Com variações
   */
  const setProdutoComTipo = useCallback((value: any) => {
    setProduto((prev: any) => {
      const next =
        typeof value === "function" ? value(prev) : { ...prev, ...value };

      const referenciaMudou =
        Object.prototype.hasOwnProperty.call(next, "referencia") &&
        String(next.referencia ?? "") !== String(prev?.referencia ?? "");

      if (!referenciaMudou) return next;

      return {
        ...next,
        tipo_anuncio: detectarTipoAnuncio(next.referencia),
      };
    });
  }, []);

  return {
    loading,
    saving,
    produto,
    setProduto: setProdutoComTipo,
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