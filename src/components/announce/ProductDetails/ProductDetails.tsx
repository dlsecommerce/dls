"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useMemo } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { AnimatedNumber } from "@/components/announce/ProductDetails/AnimatedNumber";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import { ProductInfoSection } from "@/components/announce/ProductDetails/ProductInfoSection";
import { DimensionsSection } from "@/components/announce/ProductDetails/DimensionsSection";
import { VariationsSection } from "@/components/announce/ProductDetails/VariationsSection";
import { LoadingBar } from "@/components/ui/loading-bar";
import ConfirmExitModal from "@/components/announce/ProductDetails/ConfirmExitModal";

import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";
import {
  useAnuncioEditor,
  lojaNomeToCodigo,
} from "@/components/announce/hooks/useAnuncioEditor";
import { useNewListing } from "@/components/announce/hooks/useNewListing";
import { useAnuncioActions } from "@/components/announce/hooks/useAnuncioActions";

const getField = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return "";
};

const getCleanField = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
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

const normalizarItemComposicao = (item: any) => {
  return {
    ...item,
    codigo: item?.codigo ?? item?.["Código"] ?? "",
    produto: item?.produto ?? item?.Produto ?? item?.descricao ?? "",
    descricao: item?.descricao ?? item?.produto ?? item?.Produto ?? "",
    quantidade: normalizarQuantidade(item?.quantidade ?? item?.Quantidade),
    custo: parseNumero(item?.custo ?? item?.Custo),
  };
};

const calcCustoTotalComposicao = (composicao: any[]) => {
  return (Array.isArray(composicao) ? composicao : []).reduce((total, item) => {
    const quantidade = normalizarQuantidade(item?.quantidade);
    const custo = parseNumero(item?.custo);

    return total + quantidade * custo;
  }, 0);
};

const normalizeLoja = (value: any) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (v === "pk" || v.includes("pikot")) return "PK";
  if (v === "sb" || v.includes("sobaquetas")) return "SB";

  return "";
};

const normalizarReferenciaNova = (value: any) => {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .trim()
    .toUpperCase();
};

const getReferencia = (obj: any) => {
  return getCleanField(obj, "referencia", "Referencia", "Referência", "sku");
};

const getIdBling = (obj: any, fallback?: any) => {
  return getCleanField(
    obj,
    "id_bling",
    "ID Bling",
    "idBling",
    "ID_Bling"
  ) || getCleanField(
    fallback,
    "id_bling",
    "ID Bling",
    "idBling",
    "ID_Bling"
  );
};

const getIdTray = (obj: any, fallback?: any) => {
  return getCleanField(
    obj,
    "id_tray",
    "ID Tray",
    "idTray",
    "ID_Tray"
  ) || getCleanField(
    fallback,
    "id_tray",
    "ID Tray",
    "idTray",
    "ID_Tray"
  );
};

const getIdVar = (obj: any) => {
  return getCleanField(
    obj,
    "id_var",
    "ID Var",
    "idVar",
    "ID_Var",
    "valor",
    "ID",
    "id"
  );
};

const parseReferenciaVariacao = (referenciaRaw: any) => {
  const ref = normalizarReferenciaNova(referenciaRaw);

  if (!ref.startsWith("PAI-") && !ref.startsWith("VAR-")) {
    return null;
  }

  const tipo = ref.startsWith("PAI-") ? "PAI" : "VAR";
  const semPrefixo = ref.slice(4);

  const partes = semPrefixo.split("-").filter(Boolean);

  if (partes.length < 2) return null;

  const marca = partes[0];
  const codigo = partes.slice(1).join("-");

  if (!marca || !codigo) return null;

  const codigoBase = codigo.split("-")[0] || codigo;

  const tokensPai = codigo
    .split(/[_/]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    ref,
    tipo,
    marca,
    codigo,
    codigoBase,
    tokensPai,
  };
};

const referenciaVariacaoPertenceAoPai = (
  referenciaPaiRaw: any,
  referenciaVarRaw: any
) => {
  const pai = parseReferenciaVariacao(referenciaPaiRaw);
  const variacao = parseReferenciaVariacao(referenciaVarRaw);

  if (!pai || !variacao) return false;
  if (pai.tipo !== "PAI") return false;
  if (variacao.tipo !== "VAR") return false;
  if (pai.marca !== variacao.marca) return false;

  if (variacao.codigo === pai.codigo) return true;

  if (pai.tokensPai.includes(variacao.codigo)) return true;

  if (
    pai.codigoBase &&
    variacao.codigoBase &&
    pai.codigoBase === variacao.codigoBase
  ) {
    return true;
  }

  return false;
};

const buildComposicaoFromAnuncio = (anuncio: any) => {
  const itens: any[] = [];

  for (let i = 1; i <= 10; i++) {
    const codigo = getField(anuncio, `Código ${i}`, `codigo_${i}`, `codigo${i}`);
    const quantidade = getField(
      anuncio,
      `Quantidade ${i}`,
      `quantidade_${i}`,
      `quantidade${i}`
    );

    if (String(codigo || "").trim()) {
      itens.push({
        codigo,
        quantidade: normalizarQuantidade(quantidade),
        custo: 0,
        produto: "",
        descricao: "",
      });
    }
  }

  return itens;
};

const carregarCustosDaComposicao = async (composicao: any[]) => {
  const itens = Array.isArray(composicao)
    ? composicao.map(normalizarItemComposicao)
    : [];

  const codigos = Array.from(
    new Set(
      itens
        .map((item) => String(item?.codigo || "").trim())
        .filter(Boolean)
    )
  );

  if (codigos.length === 0) return itens;

  const { data, error } = await supabase
    .from("custos")
    .select('"Código", "Custo Atual", "Produto"')
    .in("Código", codigos);

  if (error) {
    console.error("Erro ao carregar custos da composição:", error);
    return itens;
  }

  const custosPorCodigo = new Map(
    (data || []).map((row: any) => [
      String(row?.["Código"] || "").trim(),
      {
        custo: parseNumero(row?.["Custo Atual"]),
        produto: row?.["Produto"] || "",
      },
    ])
  );

  return itens.map((item) => {
    const codigo = String(item?.codigo || "").trim();
    const encontrado = custosPorCodigo.get(codigo);

    return {
      ...item,
      codigo,
      quantidade: normalizarQuantidade(item?.quantidade),
      custo: encontrado?.custo ?? parseNumero(item?.custo),
      produto: encontrado?.produto || item?.produto || "",
      descricao: encontrado?.produto || item?.descricao || "",
    };
  });
};

const normalizeVariation = (variation: any, produtoPai?: any) => {
  const composicaoExistente = Array.isArray(variation?.composicao)
    ? variation.composicao
    : null;

  const composicaoNormalizada = (
    composicaoExistente ?? buildComposicaoFromAnuncio(variation)
  ).map(normalizarItemComposicao);

  const custoSalvo = parseNumero(
    getField(variation, "custoTotal", "custo_total", "custo", "Custo")
  );

  const idBling = getIdBling(variation, produtoPai);
  const idTray = getIdTray(variation, produtoPai);
  const idVar = getIdVar(variation);

  const referencia = getCleanField(
    variation,
    "referencia",
    "Referência",
    "Referencia",
    "sku"
  );

  return {
    ...variation,

    id: getField(variation, "id", "ID"),
    ID: getField(variation, "ID", "id"),

    loja: getField(variation, "loja", "Loja") || getField(produtoPai, "loja", "Loja"),
    Loja: getField(variation, "Loja", "loja") || getField(produtoPai, "Loja", "loja"),

    nome: getField(variation, "nome", "Nome") || getField(produtoPai, "nome", "Nome"),
    Nome: getField(variation, "Nome", "nome") || getField(produtoPai, "Nome", "nome"),

    referencia,
    Referencia: referencia,
    "Referência": referencia,
    sku: referencia,

    id_var: idVar,
    "ID Var": idVar,

    id_bling: idBling,
    "ID Bling": idBling,

    id_tray: idTray,
    "ID Tray": idTray,

    od: getField(variation, "od", "OD") || "2",
    OD: getField(variation, "OD", "od") || "2",

    marca: getField(variation, "marca", "Marca") || getField(produtoPai, "marca", "Marca"),
    Marca: getField(variation, "Marca", "marca") || getField(produtoPai, "Marca", "marca"),

    categoria:
      getField(variation, "categoria", "Categoria") ||
      getField(produtoPai, "categoria", "Categoria"),
    Categoria:
      getField(variation, "Categoria", "categoria") ||
      getField(produtoPai, "Categoria", "categoria"),

    peso: getField(variation, "peso", "Peso") || getField(produtoPai, "peso", "Peso"),
    Peso: getField(variation, "Peso", "peso") || getField(produtoPai, "Peso", "peso"),

    altura:
      getField(variation, "altura", "Altura") ||
      getField(produtoPai, "altura", "Altura"),
    Altura:
      getField(variation, "Altura", "altura") ||
      getField(produtoPai, "Altura", "altura"),

    largura:
      getField(variation, "largura", "Largura") ||
      getField(produtoPai, "largura", "Largura"),
    Largura:
      getField(variation, "Largura", "largura") ||
      getField(produtoPai, "Largura", "largura"),

    comprimento:
      getField(variation, "comprimento", "Comprimento") ||
      getField(produtoPai, "comprimento", "Comprimento"),
    Comprimento:
      getField(variation, "Comprimento", "comprimento") ||
      getField(produtoPai, "Comprimento", "comprimento"),

    valor: idVar,

    composicao: composicaoNormalizada,

    custoTotal: custoSalvo,
    custo_total: custoSalvo,
    custo: custoSalvo,
    Custo: custoSalvo,
  };
};

const mergeVariacoes = (listaA: any[], listaB: any[]) => {
  const map = new Map<string, any>();

  for (const item of [...listaA, ...listaB]) {
    const key =
      String(getField(item, "ID", "id") || "").trim() ||
      String(getReferencia(item) || "").trim();

    if (!key) continue;

    const existente = map.get(key);

    map.set(key, {
      ...(existente || {}),
      ...item,
    });
  }

  return Array.from(map.values());
};

const buscarVariacoesDiretoPorReferencia = async ({
  loja,
  produtoPai,
}: {
  loja: string;
  produtoPai: any;
}) => {
  const referenciaPai = getReferencia(produtoPai);
  const paiParsed = parseReferenciaVariacao(referenciaPai);

  if (!paiParsed || paiParsed.tipo !== "PAI") return [];

  const tabela = loja === "SB" ? "anuncios_sb" : "anuncios_pk";

  const { data, error } = await supabase
    .from(tabela)
    .select(
      `
      "ID",
      "Loja",
      "ID Bling",
      "ID Tray",
      "ID Var",
      "Referência",
      "Nome",
      "Marca",
      "Categoria",
      "Peso",
      "Altura",
      "Largura",
      "Comprimento",
      "Código 1",
      "Quantidade 1",
      "Código 2",
      "Quantidade 2",
      "Código 3",
      "Quantidade 3",
      "Código 4",
      "Quantidade 4",
      "Código 5",
      "Quantidade 5",
      "Código 6",
      "Quantidade 6",
      "Código 7",
      "Quantidade 7",
      "Código 8",
      "Quantidade 8",
      "Código 9",
      "Quantidade 9",
      "Código 10",
      "Quantidade 10"
    `
    )
    .eq("Loja", loja)
    .ilike("Referência", `VAR-${paiParsed.marca}-%`);

  if (error) {
    console.error("Erro ao buscar variações direto por referência:", error);
    return [];
  }

  return (Array.isArray(data) ? data : [])
    .filter((row: any) =>
      referenciaVariacaoPertenceAoPai(referenciaPai, row?.["Referência"])
    )
    .map((row: any) => normalizeVariation(row, produtoPai));
};

const prepararProdutoParaSalvar = (produto: any, composicao: any[]) => {
  const idBlingPai = getIdBling(produto);
  const idTrayPai = getIdTray(produto);
  const referenciaPai = getReferencia(produto);

  const variacoesOriginais = Array.isArray(produto?.variacoes)
    ? produto.variacoes
    : [];

  const variacoes = variacoesOriginais.map((variacao: any) => {
    const normalizada = normalizeVariation(variacao, produto);

    const idBlingVariacao = getIdBling(normalizada, produto);
    const idTrayVariacao = getIdTray(normalizada, produto);
    const idVarVariacao = getIdVar(normalizada);

    return {
      ...normalizada,

      tipo_anuncio: "variacoes",

      id_bling: idBlingVariacao,
      "ID Bling": idBlingVariacao,

      id_tray: idTrayVariacao,
      "ID Tray": idTrayVariacao,

      id_var: idVarVariacao,
      "ID Var": idVarVariacao,

      od: normalizada.od || normalizada.OD || "2",
      OD: normalizada.OD || normalizada.od || "2",
    };
  });

  return {
    ...produto,

    tipo_anuncio: variacoes.length > 0 ? "variacoes" : produto?.tipo_anuncio,

    id_bling: idBlingPai,
    "ID Bling": idBlingPai,

    id_tray: idTrayPai,
    "ID Tray": idTrayPai,

    referencia: referenciaPai,
    Referencia: referenciaPai,
    "Referência": referenciaPai,
    sku: referenciaPai,

    composicao: Array.isArray(composicao)
      ? composicao.map(normalizarItemComposicao)
      : [],

    variacoes,
  };
};

export default function ProductDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id") || undefined;
  const lojaParam = searchParams.get("loja");

  const lojaCodigo = useMemo(() => {
    return lojaNomeToCodigo(lojaParam) ?? "PK";
  }, [lojaParam]);

  const loadingBarRef = useRef<any>(null);
  const variacoesLoadedKeyRef = useRef<string>("");

  const isEditing = Boolean(id);

  const editor = isEditing ? useAnuncioEditor(id) : useNewListing(lojaCodigo);

  const {
    produto,
    setProduto,
    composicao = [],
    setComposicao,
    custoTotal,
    setCustoTotal,
    loading,
    toInternal,
    toDisplay,
  } = editor as any;

  const produtoTela = produto ?? {};

  const produtoId = useMemo(() => {
    return getField(produtoTela, "ID", "id");
  }, [produtoTela?.ID, produtoTela?.id]);

  const lojaRealProduto = useMemo(() => {
    return (
      normalizeLoja(getField(produtoTela, "Loja", "loja")) ||
      normalizeLoja(lojaParam) ||
      lojaCodigo
    );
  }, [produtoTela?.Loja, produtoTela?.loja, lojaParam, lojaCodigo]);

  const tituloPagina =
    produtoTela?.nome?.trim?.() ||
    produtoTela?.Nome?.trim?.() ||
    "Novo anúncio";

  useEffect(() => {
    if (!produto) return;

    if (isEditing) return;

    setProduto((p: any) => ({
      ...p,
      loja: p?.loja || lojaCodigo,
      Loja: p?.Loja || lojaCodigo,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaCodigo, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    if (loading) return;
    if (!produtoId) return;
    if (!lojaRealProduto) return;

    const referenciaPai = getReferencia(produtoTela);
    const loadKey = `${lojaRealProduto}-${produtoId}-${referenciaPai}`;

    if (variacoesLoadedKeyRef.current === loadKey) return;

    variacoesLoadedKeyRef.current = loadKey;

    let cancelled = false;

    const carregarVariacoes = async () => {
      try {
        const { data, error } = await supabase.rpc("get_variacoes_anuncio", {
          p_loja: lojaRealProduto,
          p_id: Number(produtoId),
        });

        if (cancelled) return;

        if (error) {
          console.error("Erro ao buscar variações pela RPC:", error);
        }

        const variacoesRpc = Array.isArray(data)
          ? data.map((item: any) => normalizeVariation(item, produtoTela))
          : [];

        const variacoesDiretas = await buscarVariacoesDiretoPorReferencia({
          loja: lojaRealProduto,
          produtoPai: produtoTela,
        });

        if (cancelled) return;

        const variacoesBase = mergeVariacoes(variacoesRpc, variacoesDiretas);

        const variacoes = await Promise.all(
          variacoesBase.map(async (variacao: any) => {
            const composicaoComCustos = await carregarCustosDaComposicao(
              Array.isArray(variacao.composicao) ? variacao.composicao : []
            );

            const custoTotalVariacao =
              calcCustoTotalComposicao(composicaoComCustos);

            const normalizada = normalizeVariation(
              {
                ...variacao,
                composicao: composicaoComCustos,
                custoTotal: custoTotalVariacao,
                custo_total: custoTotalVariacao,
                custo: custoTotalVariacao,
                Custo: custoTotalVariacao,
              },
              produtoTela
            );

            return {
              ...normalizada,

              id_bling: getIdBling(normalizada, produtoTela),
              "ID Bling": getIdBling(normalizada, produtoTela),

              id_tray: getIdTray(normalizada, produtoTela),
              "ID Tray": getIdTray(normalizada, produtoTela),

              id_var: getIdVar(normalizada),
              "ID Var": getIdVar(normalizada),
            };
          })
        );

        if (cancelled) return;

        setProduto((p: any) => {
          const idBlingPai = getIdBling(p);
          const idTrayPai = getIdTray(p);

          return {
            ...p,

            loja: normalizeLoja(getField(p, "loja", "Loja")) || lojaRealProduto,
            Loja: normalizeLoja(getField(p, "Loja", "loja")) || lojaRealProduto,

            id_bling: idBlingPai,
            "ID Bling": idBlingPai,

            id_tray: idTrayPai,
            "ID Tray": idTrayPai,

            variacoes,
            total_variacoes: variacoes.length,
            tipo_anuncio: variacoes.length > 0 ? "variacoes" : p?.tipo_anuncio,
          };
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Erro inesperado ao carregar variações:", error);
        }
      }
    };

    carregarVariacoes();

    return () => {
      cancelled = true;
    };
  }, [
    isEditing,
    loading,
    produtoId,
    lojaRealProduto,
    produtoTela?.referencia,
    produtoTela?.Referencia,
    produtoTela?.["Referência"],
    setProduto,
  ]);

  const { handleSave, saving } = useAnuncioActions();

  const handleSaveAtual = () => {
    const produtoPronto = prepararProdutoParaSalvar(produto ?? {}, composicao);

    setProduto((p: any) => ({
      ...p,
      ...produtoPronto,
    }));

    handleSave(produtoPronto, composicao);
  };

  const { showExitModal, confirmExit, setShowExitModal } = useKeyboardShortcuts({
    saving,
    handleSave: handleSaveAtual,
    campoAtivo: null,
    sugestoesLength: 0,
  });

  useEffect(() => {
    if (loading) loadingBarRef.current?.start?.();
    else loadingBarRef.current?.finish?.();
  }, [loading]);

  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-[#070707] via-[#0b0b0b] to-[#070707] px-4 pb-24 pt-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1880px]">
          <header className="mb-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/anuncios")}
              className="mb-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Anúncios
            </button>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="max-w-[1180px] truncate text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {tituloPagina}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
                  <span>
                    ID interno: {getField(produtoTela, "ID", "id") || "Novo"}
                  </span>

                  <span>
                    Loja: {lojaRealProduto || "Não informada"}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Salvamento automático ativo
                  </span>

                  <span>
                    {loading
                      ? "Carregando dados..."
                      : "Última alteração: agora há pouco"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/anuncios")}
                  className="
                    inline-flex h-9 cursor-pointer items-center justify-center rounded-lg
                    border border-white/10 bg-white/[0.04] px-6
                    text-xs font-semibold text-white/75
                    transition-all duration-200
                    hover:border-white/20 hover:bg-white/[0.08] hover:text-white
                    active:scale-[0.98]
                  "
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveAtual}
                  disabled={saving || loading}
                  className="
                    inline-flex h-9 cursor-pointer items-center justify-center rounded-lg
                    border border-[#1a8ceb]/60 bg-[#1a8ceb] px-7
                    text-xs font-bold text-white
                    transition-all duration-200
                    hover:border-[#2d99ee] hover:bg-[#2d99ee]
                    active:scale-[0.98]
                    disabled:cursor-wait disabled:opacity-70
                  "
                >
                  {saving ? "Salvando..." : loading ? "Carregando..." : "Salvar"}
                </button>
              </div>
            </div>
          </header>

          <div
            className="
              grid grid-cols-1 gap-5
              xl:grid-cols-[430px_minmax(700px,1fr)_430px]
            "
          >
            <aside className="min-w-0">
              <CompositionSection
                composicao={composicao}
                setComposicao={setComposicao}
                toInternal={toInternal}
                toDisplay={toDisplay}
                custoTotal={custoTotal}
                AnimatedNumber={AnimatedNumber}
                supabase={supabase}
                anuncioData={produtoTela}
                setAnuncioData={setProduto}
              />
            </aside>

            <main className="min-w-0 space-y-4">
              <ProductInfoSection
                produto={produtoTela}
                setProduto={setProduto}
                router={router}
                saving={saving}
                handleSave={handleSaveAtual}
                handleDelete={() => router.push("/dashboard/anuncios")}
                setComposicao={setComposicao}
                setCustoTotal={setCustoTotal}
              />
            </main>

            <aside className="min-w-0 space-y-4">
              <DimensionsSection produto={produtoTela} setProduto={setProduto} />

              <VariationsSection
                produto={produtoTela}
                setProduto={setProduto}
                AnimatedNumber={AnimatedNumber}
              />
            </aside>
          </div>
        </div>
      </div>

      <ConfirmExitModal
        open={showExitModal}
        onOpenChange={setShowExitModal}
        onConfirm={confirmExit}
      />
    </>
  );
}