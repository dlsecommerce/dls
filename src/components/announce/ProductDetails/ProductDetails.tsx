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
        quantidade: quantidade || "",
        custo: getField(anuncio, `Custo ${i}`, `custo_${i}`, `custo${i}`) || 0,
        produto: "",
        descricao: "",
      });
    }
  }

  return itens;
};

const normalizeVariation = (variation: any) => {
  const composicaoExistente = Array.isArray(variation?.composicao)
    ? variation.composicao
    : null;

  return {
    ...variation,

    id: getField(variation, "id", "ID"),
    ID: getField(variation, "ID", "id"),

    loja: getField(variation, "loja", "Loja"),
    Loja: getField(variation, "Loja", "loja"),

    nome: getField(variation, "nome", "Nome"),
    Nome: getField(variation, "Nome", "nome"),

    referencia: getField(variation, "referencia", "Referência"),
    "Referência": getField(variation, "Referência", "referencia"),

    id_var: getField(variation, "id_var", "ID Var"),
    "ID Var": getField(variation, "ID Var", "id_var"),

    id_bling: getField(variation, "id_bling", "ID Bling"),
    "ID Bling": getField(variation, "ID Bling", "id_bling"),

    id_tray: getField(variation, "id_tray", "ID Tray"),
    "ID Tray": getField(variation, "ID Tray", "id_tray"),

    od: getField(variation, "od", "OD"),
    OD: getField(variation, "OD", "od"),

    marca: getField(variation, "marca", "Marca"),
    Marca: getField(variation, "Marca", "marca"),

    categoria: getField(variation, "categoria", "Categoria"),
    Categoria: getField(variation, "Categoria", "categoria"),

    peso: getField(variation, "peso", "Peso"),
    Peso: getField(variation, "Peso", "peso"),

    altura: getField(variation, "altura", "Altura"),
    Altura: getField(variation, "Altura", "altura"),

    largura: getField(variation, "largura", "Largura"),
    Largura: getField(variation, "Largura", "largura"),

    comprimento: getField(variation, "comprimento", "Comprimento"),
    Comprimento: getField(variation, "Comprimento", "comprimento"),

    sku: getField(variation, "sku", "referencia", "Referência"),
    valor: getField(variation, "valor", "id_var", "ID Var"),

    composicao: composicaoExistente ?? buildComposicaoFromAnuncio(variation),

    custoTotal: getField(
      variation,
      "custoTotal",
      "custo_total",
      "custo",
      "Custo"
    ) || 0,

    custo_total: getField(
      variation,
      "custo_total",
      "custoTotal",
      "custo",
      "Custo"
    ) || 0,

    custo: getField(
      variation,
      "custo",
      "Custo",
      "custoTotal",
      "custo_total"
    ) || 0,

    Custo: getField(
      variation,
      "Custo",
      "custo",
      "custoTotal",
      "custo_total"
    ) || 0,
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

  /**
   * IMPORTANTE:
   * Valores estáveis para evitar que a busca das variações rode de novo
   * a cada alteração em qualquer campo do produto.
   */
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

    /*
      IMPORTANTE:
      Em edição, NÃO sobrescreve a loja que veio do banco.
      Se o anúncio for SB, mas a URL vier sem loja, antes ele podia virar PK.
      Isso fazia a RPC procurar variações na tabela errada.
    */
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

    const loadKey = `${lojaRealProduto}-${produtoId}`;

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
          console.error("Erro ao buscar variações do anúncio:", error);
          return;
        }

        const variacoes = Array.isArray(data)
          ? data.map(normalizeVariation)
          : [];

        setProduto((p: any) => ({
          ...p,

          // mantém a loja real do anúncio
          loja: normalizeLoja(getField(p, "loja", "Loja")) || lojaRealProduto,
          Loja: normalizeLoja(getField(p, "Loja", "loja")) || lojaRealProduto,

          variacoes,
          tipo_anuncio: variacoes.length > 0 ? "variacoes" : p?.tipo_anuncio,
        }));
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
  }, [isEditing, loading, produtoId, lojaRealProduto, setProduto]);

  const { handleSave, saving } = useAnuncioActions();

  /*
    Usa sempre o estado atual do produto.
    Isso garante que produto.variacoes seja enviado para o useAnuncioActions,
    onde pai e variações serão salvos como linhas reais no banco.
  */
  const handleSaveAtual = () => {
    handleSave(produto ?? {}, composicao);
  };

  const { showExitModal, confirmExit, setShowExitModal } = useKeyboardShortcuts({
    saving,
    handleSave: handleSaveAtual,

    /*
      As sugestões agora devem ficar somente dentro do CompositionSection.
      Isso evita que cada letra digitada no código renderize a tela inteira.
    */
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