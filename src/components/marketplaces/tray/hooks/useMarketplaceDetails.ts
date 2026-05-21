"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { createNotification } from "@/lib/createNotification";

type LojaCode = "PK" | "SB" | "";

type CalculoLoja = {
  desconto: string;
  embalagem: string;
  frete: string;
  imposto: string;
  margem: string;
  comissao: string;
  marketing: string;
};

function detectarTipoAnuncio(ref: string = "") {
  const r = String(ref ?? "")
    .trim()
    .toUpperCase();

  if (!r) return "Simples";

  const temPaiOuVar =
    r.includes("PAI-") ||
    r.includes("VAR-") ||
    r.includes("PAI -") ||
    r.includes("VAR -");

  return temPaiOuVar ? "Com variações" : "Simples";
}

function normalizeLojaCode(lojaRaw: string | null | undefined): LojaCode {
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
    params.marketplaceId,
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
    String(value || ""),
  );
}

function parseNumero(value: any) {
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
}

function toNumericOrNull(value: any) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();

  if (raw === "") return null;

  const parsed = parseNumero(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function toTextOrNull(value: any) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();

  return raw === "" ? null : raw;
}

function sanitizeCalculoLoja(calculoLoja: Partial<CalculoLoja>): CalculoLoja {
  return {
    desconto: String(calculoLoja.desconto ?? "").replace(/[^\d.,-]/g, ""),
    embalagem: String(calculoLoja.embalagem ?? "").replace(/[^\d.,-]/g, ""),
    frete: String(calculoLoja.frete ?? "").replace(/[^\d.,-]/g, ""),
    imposto: String(calculoLoja.imposto ?? "").replace(/[^\d.,-]/g, ""),
    margem: String(calculoLoja.margem ?? "").replace(/[^\d.,-]/g, ""),
    comissao: String(calculoLoja.comissao ?? "").replace(/[^\d.,-]/g, ""),
    marketing: String(calculoLoja.marketing ?? "").replace(/[^\d.,-]/g, ""),
  };
}

function calcularPrecoLoja(params: {
  custo: any;
  calculoLoja: Partial<CalculoLoja>;
}) {
  const custo = parseNumero(params.custo);
  const calculoSeguro = sanitizeCalculoLoja(params.calculoLoja);

  const desconto = parseNumero(calculoSeguro.desconto) / 100;
  const imposto = parseNumero(calculoSeguro.imposto) / 100;
  const margem = parseNumero(calculoSeguro.margem) / 100;
  const comissao = parseNumero(calculoSeguro.comissao) / 100;
  const marketing = parseNumero(calculoSeguro.marketing) / 100;

  const embalagem = parseNumero(calculoSeguro.embalagem);
  const frete = parseNumero(calculoSeguro.frete);

  const divisor = 1 - (imposto + margem + comissao + marketing);

  if (custo <= 0 || divisor <= 0) return 0;

  const preco = (custo * (1 - desconto) + embalagem + frete) / divisor;

  return Number.isFinite(preco) ? Number(preco.toFixed(2)) : 0;
}

function marcarTabelaTrayParaRecarregar() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem("tray-pricing-precisa-recarregar", String(Date.now()));
  } catch {}
}

function getReferenciaItem(item: any) {
  return String(
    item?.referencia ??
      item?.Referencia ??
      item?.["Referência"] ??
      item?.sku ??
      item?.dados?.referencia ??
      item?.dados?.Referencia ??
      item?.dados?.["Referência"] ??
      item?.dados?.sku ??
      "",
  ).trim();
}

function getIdMarketplaceItem(item: any) {
  return String(
    item?.marketplace_id ??
      item?.id_marketplace ??
      item?.id ??
      item?.dados?.marketplace_id ??
      item?.dados?.id_marketplace ??
      item?.dados?.id ??
      "",
  ).trim();
}

function getIdLogicoItem(item: any) {
  return String(
    item?.ID ??
      item?.id_logico ??
      item?.anuncio_id ??
      item?.id_anuncio ??
      item?.dados?.ID ??
      item?.dados?.id_logico ??
      item?.dados?.anuncio_id ??
      item?.dados?.id_anuncio ??
      "",
  ).trim();
}

function getCustoItem(item: any) {
  return (
    item?.custoTotal ??
    item?.custo_total ??
    item?.custo ??
    item?.Custo ??
    item?.dados?.custoTotal ??
    item?.dados?.custo_total ??
    item?.dados?.custo ??
    item?.dados?.Custo ??
    0
  );
}

function getCalculoItem(item: any): CalculoLoja {
  return sanitizeCalculoLoja({
    desconto:
      item?.calculoLoja?.desconto ??
      item?.desconto ??
      item?.Desconto ??
      item?.dados?.calculoLoja?.desconto ??
      item?.dados?.desconto ??
      item?.dados?.Desconto ??
      "",

    embalagem:
      item?.calculoLoja?.embalagem ??
      item?.embalagem ??
      item?.Embalagem ??
      item?.dados?.calculoLoja?.embalagem ??
      item?.dados?.embalagem ??
      item?.dados?.Embalagem ??
      "",

    frete:
      item?.calculoLoja?.frete ??
      item?.frete ??
      item?.Frete ??
      item?.dados?.calculoLoja?.frete ??
      item?.dados?.frete ??
      item?.dados?.Frete ??
      "",

    imposto:
      item?.calculoLoja?.imposto ??
      item?.imposto ??
      item?.Imposto ??
      item?.dados?.calculoLoja?.imposto ??
      item?.dados?.imposto ??
      item?.dados?.Imposto ??
      "",

    margem:
      item?.calculoLoja?.margem ??
      item?.margem ??
      item?.margem_lucro ??
      item?.["Margem de Lucro"] ??
      item?.dados?.calculoLoja?.margem ??
      item?.dados?.margem ??
      item?.dados?.margem_lucro ??
      item?.dados?.["Margem de Lucro"] ??
      "",

    comissao:
      item?.calculoLoja?.comissao ??
      item?.comissao ??
      item?.Comissao ??
      item?.Comissão ??
      item?.dados?.calculoLoja?.comissao ??
      item?.dados?.comissao ??
      item?.dados?.Comissao ??
      item?.dados?.Comissão ??
      "",

    marketing:
      item?.calculoLoja?.marketing ??
      item?.marketing ??
      item?.Marketing ??
      item?.dados?.calculoLoja?.marketing ??
      item?.dados?.marketing ??
      item?.dados?.Marketing ??
      "",
  });
}

function montarCamposPercentuaisSupabase(calculo: CalculoLoja) {
  return {
    Desconto: toNumericOrNull(calculo.desconto),
    Imposto: toNumericOrNull(calculo.imposto),
    "Margem de Lucro": toNumericOrNull(calculo.margem),
    Frete: toNumericOrNull(calculo.frete),
    Comissão: toNumericOrNull(calculo.comissao),
    Marketing: toNumericOrNull(calculo.marketing),
    Embalagem: toNumericOrNull(calculo.embalagem),
  };
}

function montarCamposPercentuaisSistema(calculo: CalculoLoja) {
  const calculoSeguro = sanitizeCalculoLoja(calculo);

  return {
    calculoLoja: calculoSeguro,

    desconto: calculoSeguro.desconto,
    Desconto: calculoSeguro.desconto,

    embalagem: calculoSeguro.embalagem,
    Embalagem: calculoSeguro.embalagem,

    frete: calculoSeguro.frete,
    Frete: calculoSeguro.frete,

    imposto: calculoSeguro.imposto,
    Imposto: calculoSeguro.imposto,

    margem: calculoSeguro.margem,
    margem_lucro: calculoSeguro.margem,
    "Margem de Lucro": calculoSeguro.margem,

    comissao: calculoSeguro.comissao,
    Comissao: calculoSeguro.comissao,
    Comissão: calculoSeguro.comissao,

    marketing: calculoSeguro.marketing,
    Marketing: calculoSeguro.marketing,
  };
}

function normalizarCalculoItem(calculo: CalculoLoja): CalculoLoja {
  return sanitizeCalculoLoja({
    desconto: calculo.desconto,
    embalagem: calculo.embalagem,
    frete: calculo.frete,
    imposto: calculo.imposto,
    margem: calculo.margem,
    comissao: calculo.comissao,
    marketing: calculo.marketing,
  });
}

function normalizarQuantidade(value: any) {
  if (value === null || value === undefined || value === "") return 1;

  const numero = parseNumero(value);

  return numero > 0 ? numero : 1;
}

function normalizarComposicao(composicao: any[]) {
  return (Array.isArray(composicao) ? composicao : []).map((item: any) => ({
    ...item,
    codigo: item?.codigo ?? item?.Codigo ?? item?.Código ?? "",
    produto: item?.produto ?? item?.Produto ?? item?.descricao ?? "",
    descricao: item?.descricao ?? item?.produto ?? item?.Produto ?? "",
    quantidade: normalizarQuantidade(item?.quantidade ?? item?.Quantidade),
    custo: parseNumero(item?.custo ?? item?.Custo),
  }));
}

function calcCustoTotal(composicao: any[]) {
  return normalizarComposicao(composicao).reduce((total, item) => {
    const quantidade = normalizarQuantidade(item?.quantidade);
    const custo = parseNumero(item?.custo);

    return total + quantidade * custo;
  }, 0);
}

export function useMarketplaceDetails(
  idParam: string | null,
  lojaParam: string | null,
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
    variacoes: [],
  });

  const [calculoLoja, setCalculoLoja] = useState<CalculoLoja>({
    desconto: "",
    embalagem: "",
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
        })) || [],
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
    [],
  );

  const buscarMarketplacePorIdInterno = async (
    marketplaceId: string,
    loja: string,
  ) => {
    const tabela =
      loja === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

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

  const mapPercentuaisDoMarketplace = (mp: any): CalculoLoja => {
    return sanitizeCalculoLoja({
      desconto: mp?.Desconto ?? "",
      imposto: mp?.Imposto ?? "",
      margem: mp?.["Margem de Lucro"] ?? "",
      frete: mp?.Frete ?? "",
      comissao: mp?.["Comissão"] ?? mp?.Comissão ?? "",
      marketing: mp?.Marketing ?? "",
      embalagem: mp?.Embalagem ?? "",
    });
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
        itens.map((item) => buscarCustoPorCodigo(item.codigo)),
      );

      return itens.map((item, idx) => ({
        codigo: item.codigo,
        quantidade: item.quantidade,
        custo: (custos[idx] || 0).toFixed(2),
      }));
    },
    [buscarCustoPorCodigo],
  );

  const buscarVariacoesDoPai = async (referenciaPai: string, loja: string) => {
    const refPai = String(referenciaPai || "").trim();

    if (!refPai.toUpperCase().startsWith("PAI-")) return [];

    const chaveVariacao = refPai.replace(/^PAI-/i, "VAR-");

    const tabela =
      loja === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .eq("Referência", chaveVariacao);

    if (error) {
      console.error("Erro ao buscar variações do pai:", {
        tabela,
        referenciaPai,
        chaveVariacao,
        error,
      });

      return [];
    }

    return Array.isArray(data)
      ? data.map((item) => {
          const calc = normalizarCalculoItem(mapPercentuaisDoMarketplace(item));
          const custo = getCustoItem(item);
          const preco = calcularPrecoLoja({
            custo,
            calculoLoja: calc,
          });

          return {
            ...item,

            marketplace_id: item?.id || "",
            anuncio_id: item?.anuncio_id || item?.ID || "",
            id_logico: item?.ID || item?.anuncio_id || "",

            tipo_anuncio: "variacoes",

            referencia: item?.["Referência"] ?? "",
            Referencia: item?.["Referência"] ?? "",
            "Referência": item?.["Referência"] ?? "",
            sku: item?.["Referência"] ?? "",

            nome: item?.Nome ?? "",
            Nome: item?.Nome ?? "",

            marca: item?.Marca ?? "",
            Marca: item?.Marca ?? "",

            categoria: item?.Categoria ?? "",
            Categoria: item?.Categoria ?? "",

            preco,
            precoLoja: preco,
            preco_loja: preco,
            "Preço de Venda": preco,

            ...montarCamposPercentuaisSistema(calc),

            dados: {
              ...(item?.dados || {}),
              ...item,
              tipo_anuncio: "variacoes",
              referencia: item?.["Referência"] ?? "",
              Referencia: item?.["Referência"] ?? "",
              "Referência": item?.["Referência"] ?? "",
              sku: item?.["Referência"] ?? "",
              preco,
              precoLoja: preco,
              preco_loja: preco,
              "Preço de Venda": preco,
              ...montarCamposPercentuaisSistema(calc),
            },
          };
        })
      : [];
  };

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

      const idInternoAnuncio = String(
        mp.anuncio_id || mp.ID || idParam || "",
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
        lojaCode,
      );

      if (!anuncio) {
        console.warn("Anuncio não encontrado para ID interno:", {
          idInternoAnuncio,
          lojaCode,
        });

        return;
      }

      const compArr = await montarComposicao(anuncio);
      const pct = normalizarCalculoItem(mapPercentuaisDoMarketplace(mp));

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
      const variacoes = await buscarVariacoesDoPai(referenciaFinal, lojaCode);
      const precoPai = calcularPrecoLoja({
        custo: calcCustoTotal(compArr),
        calculoLoja: pct,
      });

      setProduto({
        marketplace_id: mp.id || "",
        anuncio_id: String(anuncio["ID"] || idInternoAnuncio),
        id_logico: anuncio["ID"] || idInternoAnuncio,

        loja: getLojaLabel(lojaCode),
        id_bling: anuncio["ID Bling"] || mp["ID Bling"] || "",
        id_tray: anuncio["ID Tray"] || mp["ID Tray"] || "",
        id_var: anuncio["ID Var"] || mp["ID Var"] || "",
        referencia: referenciaFinal,
        Referencia: referenciaFinal,
        "Referência": referenciaFinal,
        sku: referenciaFinal,

        tipo_anuncio: tipoAnuncioFinal,
        od: odFinal,

        nome: anuncio["Nome"] ?? mp["Nome"] ?? "",
        marca: anuncio["Marca"] ?? mp["Marca"] ?? "",
        categoria: anuncio["Categoria"] ?? mp["Categoria"] ?? "",
        peso: anuncio["Peso"] ?? "",
        altura: anuncio["Altura"] ?? "",
        largura: anuncio["Largura"] ?? "",
        comprimento: anuncio["Comprimento"] ?? "",

        embalagem: pct.embalagem,

        preco: precoPai,
        precoLoja: precoPai,
        preco_loja: precoPai,
        "Preço de Venda": precoPai,

        ...montarCamposPercentuaisSistema(pct),

        variacoes,
      });

      setCalculoLoja({
        desconto: pct.desconto,
        embalagem: pct.embalagem,
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

  useEffect(() => {
    const calculoAtual = normalizarCalculoItem(calculoLoja);
    const custoAtual = custoTotal || calcCustoTotal(composicao);

    const precoAtual = calcularPrecoLoja({
      custo: custoAtual,
      calculoLoja: calculoAtual,
    });

    setProduto((prev: any) => ({
      ...prev,

      embalagem: calculoAtual.embalagem,

      ...montarCamposPercentuaisSistema(calculoAtual),

      preco: precoAtual,
      precoLoja: precoAtual,
      preco_loja: precoAtual,
      "Preço de Venda": precoAtual,
    }));
  }, [calculoLoja, custoTotal, composicao]);

  const atualizarMarketplacePorIdentificador = async (params: {
    tabela: string;
    item: any;
    campos: any;
  }) => {
    const idMarketplace = getIdMarketplaceItem(params.item);
    const idLogico = getIdLogicoItem(params.item);
    const referencia = getReferenciaItem(params.item);

    const tentativas: Array<{ campo: string; valor: string }> = [];

    if (idMarketplace && isUuid(idMarketplace)) {
      tentativas.push({ campo: "id", valor: idMarketplace });
    }

    if (idLogico) {
      tentativas.push({ campo: "ID", valor: idLogico });
    }

    if (referencia) {
      tentativas.push({ campo: "Referência", valor: referencia });
    }

    if (!tentativas.length) {
      console.warn(
        "Item sem identificador para atualizar marketplace:",
        params.item,
      );

      return false;
    }

    for (const tentativa of tentativas) {
      const { data, error } = await supabase
        .from(params.tabela)
        .update(params.campos)
        .eq(tentativa.campo, tentativa.valor)
        .select("id");

      if (error) {
        console.error("Erro ao tentar atualizar marketplace:", {
          tabela: params.tabela,
          campo: tentativa.campo,
          valor: tentativa.valor,
          error,
        });

        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        return true;
      }
    }

    console.warn("Nenhuma linha de marketplace foi atualizada:", {
      tabela: params.tabela,
      identificadores: tentativas,
      campos: params.campos,
      item: params.item,
    });

    return false;
  };

  const atualizarAnuncioPorIdentificador = async (params: {
    item: any;
    campos: any;
  }) => {
    const idLogico = getIdLogicoItem(params.item);
    const referencia = getReferenciaItem(params.item);
    const tabelaAnuncios = lojaCode === "SB" ? "anuncios_sb" : "anuncios_pk";

    const tentativas: Array<{ campo: string; valor: string }> = [];

    if (idLogico) {
      tentativas.push({ campo: "ID", valor: idLogico });
    }

    if (referencia) {
      tentativas.push({ campo: "Referência", valor: referencia });
    }

    if (!tentativas.length) {
      console.warn("Item sem identificador para atualizar anúncio:", params.item);
      return false;
    }

    for (const tentativa of tentativas) {
      const { data, error } = await supabase
        .from(tabelaAnuncios)
        .update(params.campos)
        .eq(tentativa.campo, tentativa.valor)
        .eq("Loja", lojaCode)
        .select("ID");

      if (error) {
        console.error("Erro ao tentar atualizar anúncio:", {
          tabela: tabelaAnuncios,
          campo: tentativa.campo,
          valor: tentativa.valor,
          lojaCode,
          error,
        });

        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        return true;
      }
    }

    console.warn("Nenhuma linha de anúncio foi atualizada:", {
      tabela: tabelaAnuncios,
      lojaCode,
      identificadores: tentativas,
      campos: params.campos,
      item: params.item,
    });

    return false;
  };

  const save = useCallback(async (produtoOverride?: any) => {
    const produtoSalvar = produtoOverride ?? produto;

    if (!produtoSalvar.marketplace_id || !produtoSalvar.anuncio_id || !lojaCode) {
      return { error: null };
    }

    const tabela =
      lojaCode === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";
    const tabelaAnuncios = lojaCode === "SB" ? "anuncios_sb" : "anuncios_pk";

    const tipoAnuncioFinal = detectarTipoAnuncio(produtoSalvar.referencia);

    const calculoPai = normalizarCalculoItem(calculoLoja);
    const precoPai = calcularPrecoLoja({
      custo: custoTotal || calcCustoTotal(composicao),
      calculoLoja: calculoPai,
    });

    const camposPercentuaisPai = {
      ...montarCamposPercentuaisSupabase(calculoPai),
      "Preço de Venda": precoPai,
    };

    setSaving(true);

    try {
      const { error: errMp } = await supabase
        .from(tabela)
        .update(camposPercentuaisPai)
        .eq("id", produtoSalvar.marketplace_id);

      if (errMp) throw errMp;

      const { error: errAn } = await supabase
        .from(tabelaAnuncios)
        .update({
          OD: toTextOrNull(produtoSalvar.od),
          Peso: toNumericOrNull(produtoSalvar.peso),
          Altura: toNumericOrNull(produtoSalvar.altura),
          Largura: toNumericOrNull(produtoSalvar.largura),
          Comprimento: toNumericOrNull(produtoSalvar.comprimento),
          Referência: toTextOrNull(produtoSalvar.referencia),
        })
        .eq("ID", produtoSalvar.anuncio_id)
        .eq("Loja", lojaCode);

      if (errAn) throw errAn;

      const variacoes = Array.isArray(produtoSalvar?.variacoes)
        ? produtoSalvar.variacoes
        : [];

      const variacoesAtualizadas = [];

      for (const variacao of variacoes) {
        const referenciaVariacao = getReferenciaItem(variacao);
        const calculoVariacao = normalizarCalculoItem(getCalculoItem(variacao));

        const custoVariacao = getCustoItem(variacao);
        const precoVariacao = calcularPrecoLoja({
          custo: custoVariacao,
          calculoLoja: calculoVariacao,
        });

        const camposPercentuaisVariacao = {
          ...montarCamposPercentuaisSupabase(calculoVariacao),
          "Preço de Venda": precoVariacao,
        };

        if (
          !referenciaVariacao &&
          !getIdMarketplaceItem(variacao) &&
          !getIdLogicoItem(variacao)
        ) {
          console.warn("Variação sem identificador para salvar:", variacao);

          variacoesAtualizadas.push(variacao);
          continue;
        }

        const salvouMarketplace = await atualizarMarketplacePorIdentificador({
          tabela,
          item: variacao,
          campos: camposPercentuaisVariacao,
        });

        const salvouAnuncio = await atualizarAnuncioPorIdentificador({
          item: variacao,
          campos: {
            Referência: toTextOrNull(referenciaVariacao),
            ...camposPercentuaisVariacao,
          },
        });

        if (!salvouMarketplace && !salvouAnuncio) {
          throw new Error(
            `Nenhuma linha foi atualizada para a variação ${
              referenciaVariacao || "(sem referência)"
            }.`,
          );
        }

        const variacaoAtualizada = {
          ...variacao,

          ...montarCamposPercentuaisSistema(calculoVariacao),

          preco: precoVariacao,
          precoLoja: precoVariacao,
          preco_loja: precoVariacao,
          "Preço de Venda": precoVariacao,

          dados: {
            ...(variacao?.dados || {}),

            ...montarCamposPercentuaisSistema(calculoVariacao),

            preco: precoVariacao,
            precoLoja: precoVariacao,
            preco_loja: precoVariacao,
            "Preço de Venda": precoVariacao,
          },
        };

        variacoesAtualizadas.push(variacaoAtualizada);
      }

      setProduto((prev: any) => ({
        ...prev,

        tipo_anuncio: tipoAnuncioFinal,
        embalagem: calculoPai.embalagem,

        ...montarCamposPercentuaisSistema(calculoPai),

        preco: precoPai,
        precoLoja: precoPai,
        preco_loja: precoPai,
        "Preço de Venda": precoPai,

        variacoes: variacoesAtualizadas,
      }));

      setCalculoLoja(calculoPai);

      await createNotification({
        title: "Precificação Tray atualizada",
        message: `A precificação Tray do anúncio "${getProdutoLabel(
          produtoSalvar,
        )}" foi atualizada.`,
        action: "update",
        entityType: "marketplace_tray_pricing",
        entityId: String(produtoSalvar.id_logico || produtoSalvar.anuncio_id),
        link: getTrayNotificationLink({
          marketplaceId: String(
            produtoSalvar.id_logico || produtoSalvar.anuncio_id,
          ),
          loja: getLojaLabel(lojaCode),
        }),
      });

      marcarTabelaTrayParaRecarregar();
      await carregar();

      return { error: null };
    } catch (error) {
      console.error("Erro ao salvar precificação Tray:", error);

      return { error };
    } finally {
      setSaving(false);
    }
  }, [produto, calculoLoja, lojaCode, custoTotal, composicao, carregar]);

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