"use client";

import React, { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import AnimatedNumber from "@/components/marketplaces/magalu/details/AnimatedNumber";
import CalculoPrecoBox from "@/components/marketplaces/magalu/details/CalculoPrecoBox";
import InfoGeraisBox from "@/components/marketplaces/magalu/details/InfoGeraisBox";
import MarketplaceSection from "@/components/marketplaces/magalu/details/MagaluMarketplaceSection";
import { VariationMagaluSection } from "@/components/marketplaces/magalu/details/VariationMagaluSection";

import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import ConfirmExitModal from "@/components/announce/ProductDetails/ConfirmExitModal";
import { LoadingBar } from "@/components/ui/loading-bar";

import { useMarketplaceDetails } from "@/components/marketplaces/magalu/hooks/useMarketplaceDetails";
import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";
import { toastCustom } from "@/utils/toastCustom";

/* ============================================================
   Helper para normalizar o parâmetro "loja" da URL
============================================================ */
function normalizeLojaParam(lojaParam: string | null) {
  const lojaNormalizada = lojaParam
    ?.toUpperCase()
    ?.replace("Ó", "O")
    ?.replace("Ô", "O")
    ?.replace("Á", "A")
    ?.replace("Ã", "A")
    ?.replace("É", "E")
    ?.replace(/\s/g, "")
    ?.trim();

  if (lojaNormalizada === "PIKOTSHOP") return "PK";
  if (lojaNormalizada === "SOBAQUETAS") return "SB";

  return lojaNormalizada || "";
}

/* ============================================================
   Helper para identificar produto pai com variações
============================================================ */
function isProdutoPaiComVariacoes(produto: any) {
  const referencia = String(
    produto?.referencia ??
      produto?.Referencia ??
      produto?.["Referência"] ??
      produto?.sku ??
      "",
  )
    .trim()
    .toUpperCase();

  const tipoAnuncio = String(produto?.tipo_anuncio ?? "")
    .trim()
    .toLowerCase();

  if (referencia.startsWith("PAI-")) return true;
  if (tipoAnuncio === "variacoes") return true;
  if (tipoAnuncio === "com variações") return true;
  if (tipoAnuncio === "com variacoes") return true;

  return false;
}

/* ============================================================
   COMPONENTE WRAPPER
   Força remount quando mudar ID ou loja
============================================================ */
export default function PricingCalculatorMagalu() {
  const searchParams = useSearchParams();

  const id = searchParams.get("id");
  const loja = normalizeLojaParam(searchParams.get("loja"));

  return (
    <PricingCalculatorMagaluInternal
      key={`${id}-${loja}`}
      id={id}
      loja={loja}
    />
  );
}

/* ============================================================
   COMPONENTE INTERNO
============================================================ */
function PricingCalculatorMagaluInternal({
  id,
  loja,
}: {
  id: string | null;
  loja: string;
}) {
  const router = useRouter();
  const loadingBarRef = useRef<any>(null);

  const [variationModalOpen, setVariationModalOpen] = React.useState(false);

  const {
    loading: loadingHook,
    saving,
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    calculoLoja,
    setCalculoLoja,
    save,

    campoAtivo,
    sugestoes,
    indiceSelecionado,
    listaRef,
    buscarSugestoes,
    handleSugestoesKeys,
    selecionarSugestao,
  } = useMarketplaceDetails(id, loja);

  const produtoTela = produto ?? {};
  const composicaoTela = Array.isArray(composicao) ? composicao : [];

  const loading = Boolean(loadingHook || !produto);

  const bloquearTelaPai = Boolean(
    !loading && isProdutoPaiComVariacoes(produtoTela),
  );

  const tituloPagina = useMemo(() => {
    return produtoTela?.nome?.trim() || "Magalu";
  }, [produtoTela?.nome]);

  React.useEffect(() => {
    if (loading) loadingBarRef.current?.start?.();
    else loadingBarRef.current?.finish?.();
  }, [loading]);

  const calcularPreco = () => {
    if (!custoTotal) return 0;

    const custo = Number(custoTotal || 0);

    const parse = (v: any) => parseFloat(String(v).replace(",", ".")) || 0;

    const d = parse(calculoLoja?.desconto) / 100;
    const embalagem = parse(calculoLoja?.embalagem);
    const frete = parse(calculoLoja?.frete);
    const imposto = parse(calculoLoja?.imposto) / 100;
    const margem = parse(calculoLoja?.margem) / 100;
    const comissao = parse(calculoLoja?.comissao) / 100;
    const marketing = parse(calculoLoja?.marketing) / 100;

    const divisor = 1 - (imposto + margem + comissao + marketing);

    const preco =
      divisor > 0 ? (custo * (1 - d) + embalagem + frete) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  const precoLoja = calcularPreco();

  const handleClearLocal = () => {
    if (bloquearTelaPai) {
      setCalculoLoja({
        desconto: "",
        embalagem: "",
        frete: "",
        imposto: "",
        margem: "",
        comissao: "",
        marketing: "",
      });

      return;
    }

    if (window.confirm("Tem certeza?")) {
      setProduto((p: any) => ({
        ...p,
        referencia: "",
        nome: "",
        marca: "",
        categoria: "",
        peso: "",
        altura: "",
        largura: "",
        comprimento: "",
      }));

      setComposicao([{ codigo: "", quantidade: "", custo: "" }]);
    }
  };

  const handleSave = React.useCallback(async () => {
    if (saving || loading) return;

    const { error } = await save();

    if (error) {
      console.error("Erro ao salvar Magalu:", error);

      toastCustom.error(
        "Erro ao salvar precificação Magalu",
        "Não foi possível salvar os percentuais.",
      );

      return;
    }

    try {
      sessionStorage.setItem("magalu-pricing-precisa-recarregar", "1");
    } catch {}

    toastCustom.success(
      "Precificação Magalu salva com sucesso",
      "As alterações foram gravadas no sistema.",
    );

    setTimeout(() => {
      router.push("/dashboard/marketplaces/magalu");
    }, 700);
  }, [saving, loading, save, router]);

  const { showExitModal, confirmExit, setShowExitModal } = useKeyboardShortcuts({
    saving,
    handleSave,
    campoAtivo,
    sugestoesLength: sugestoes?.length || 0,
  });

  React.useEffect(() => {
    if (!variationModalOpen) return;

    if (showExitModal) {
      setShowExitModal(false);
    }
  }, [variationModalOpen, showExitModal, setShowExitModal]);

  const handleVariationModalOpenChange = React.useCallback(
    (open: boolean) => {
      setVariationModalOpen(open);

      if (open) {
        setShowExitModal(false);
      }
    },
    [setShowExitModal],
  );

  const handleConfirmExitOpenChange = React.useCallback(
    (open: boolean) => {
      if (variationModalOpen) {
        setShowExitModal(false);
        return;
      }

      setShowExitModal(open);
    },
    [variationModalOpen, setShowExitModal],
  );

  const setMarketplaces = (value: any) => {
    if (bloquearTelaPai) return;

    if (typeof value === "function") {
      setProduto((p: any) => ({
        ...p,
        marketplaces: value(p?.marketplaces || []),
      }));

      return;
    }

    setProduto((p: any) => ({
      ...p,
      marketplaces: value,
    }));
  };

  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-[#070707] via-[#0b0b0b] to-[#070707] px-4 pb-24 pt-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1880px]">
          {/* TOPO */}
          <header className="mb-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/marketplaces/magalu")}
              className="mb-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Marketplaces
            </button>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="max-w-[1180px] truncate text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {tituloPagina}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
                  <span>ID interno: {produtoTela?.id || id || "Novo"}</span>

                  <span>Loja: {produtoTela?.loja || loja || "PK"}</span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Magalu ativo
                  </span>

                  <span>
                    {loading
                      ? "Carregando dados..."
                      : saving
                        ? "Salvando alterações..."
                        : "Última alteração: agora há pouco"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/marketplaces/magalu")}
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
                  onClick={handleSave}
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

          {/* LAYOUT PRINCIPAL */}
          <div
            className={`
              grid grid-cols-1 items-start gap-5
              xl:grid-cols-[430px_minmax(700px,1fr)_430px]
              ${campoAtivo !== null ? "relative z-[120]" : ""}
            `}
          >
            {/* COLUNA ESQUERDA - COMPOSIÇÃO DO PAI */}
            <aside
              className={`
                min-w-0
                ${
                  bloquearTelaPai
                    ? "pointer-events-none select-none opacity-45"
                    : ""
                }
              `}
              aria-disabled={bloquearTelaPai}
            >
              <CompositionSection
                composicao={composicaoTela}
                setComposicao={setComposicao}
                custoTotal={custoTotal}
                AnimatedNumber={AnimatedNumber}
                campoAtivo={campoAtivo}
                indiceSelecionado={indiceSelecionado}
                listaRef={listaRef}
                sugestoes={sugestoes}
                buscarSugestoes={buscarSugestoes}
                handleSugestoesKeys={handleSugestoesKeys}
                selecionarSugestao={selecionarSugestao}
              />
            </aside>

            {/* COLUNA CENTRAL - DADOS DO PAI */}
            <main
              className={`
                min-w-0 space-y-4
                ${
                  bloquearTelaPai
                    ? "pointer-events-none select-none opacity-45"
                    : ""
                }
              `}
              aria-disabled={bloquearTelaPai}
            >
              <InfoGeraisBox
                produto={produtoTela}
                setProduto={setProduto}
                loading={loading}
                bloquearEdicao={bloquearTelaPai}
              />

              <MarketplaceSection
                marketplaces={produtoTela?.marketplaces || []}
                setMarketplaces={setMarketplaces}
                loading={loading}
                bloquearEdicao={bloquearTelaPai}
              />
            </main>

            {/* COLUNA DIREITA - CÁLCULO E VARIAÇÕES */}
            <aside className="min-w-0 space-y-4">
              <CalculoPrecoBox
                calculoLoja={calculoLoja}
                setCalculoLoja={setCalculoLoja}
                precoLoja={precoLoja}
                produto={produtoTela}
                saving={saving}
                loading={saving}
                handleClearLocal={handleClearLocal}
              />

              <VariationMagaluSection
                produto={produtoTela}
                setProduto={setProduto}
                AnimatedNumber={AnimatedNumber}
                onModalOpenChange={handleVariationModalOpenChange}
              />
            </aside>
          </div>
        </div>
      </div>

      {!variationModalOpen && (
        <ConfirmExitModal
          open={showExitModal}
          onOpenChange={handleConfirmExitOpenChange}
          onConfirm={confirmExit}
        />
      )}
    </>
  );
}