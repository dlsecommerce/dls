"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

import { AnimatedNumber } from "@/components/announce/ProductDetails/AnimatedNumber";
import { HelpTooltip } from "@/components/announce/ProductDetails/HelpTooltip";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import { ProductInfoSection } from "@/components/announce/ProductDetails/ProductInfoSection";
import { DimensionsSection } from "@/components/announce/ProductDetails/DimensionsSection";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Input } from "@/components/ui/input";

import { useSugestoes } from "@/components/announce/hooks/useSugestoes";
import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";
import { useAnuncioEditor } from "@/components/announce/hooks/useAnuncioEditor";
import { useRef, useEffect } from "react";

export default function PricingCalculatorModernLike() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || undefined;

  const loadingBarRef = useRef<any>(null);

  // 🔹 Hook principal (novo ou edição)
  const {
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    setCustoTotal,
    loading,
    saving,
    deleting,
    handleSave,
    handleDelete,
    toInternal,
    toDisplay,
  } = useAnuncioEditor(id);

  // 🔹 Sugestões automáticas
  const {
    sugestoes,
    setSugestoes,
    campoAtivo,
    setCampoAtivo,
    indiceSelecionado,
    setIndiceSelecionado,
    listaRef,
    buscarSugestoes,
  } = useSugestoes();

  // 🔹 Atalhos de teclado
  useKeyboardShortcuts({
    saving,
    handleSave,
    router,
    campoAtivo,
    sugestoesLength: sugestoes.length,
  });

  // 🔹 Controla a barra de progresso
  useEffect(() => {
    if (loading) {
      loadingBarRef.current?.start?.();
    } else {
      loadingBarRef.current?.finish?.();
    }
  }, [loading]);

  // 🔹 Tela de carregamento
  if (loading) {
    return (
      <>
        <LoadingBar ref={loadingBarRef} />
        <div className="flex items-center justify-center min-h-screen text-white">
          <span className="text-neutral-400 text-sm">
          </span>
        </div>
      </>
    );
  }

  // 🔹 Layout principal
  return (
    <>
      <LoadingBar ref={loadingBarRef} />
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 🔹 Composição de Custos */}
          <CompositionSection
            composicao={composicao}
            setComposicao={setComposicao}
            toInternal={toInternal}
            toDisplay={toDisplay}
            custoTotal={custoTotal}
            AnimatedNumber={AnimatedNumber}
            HelpTooltip={HelpTooltip}
            supabase={supabase}
            campoAtivo={campoAtivo}
            setCampoAtivo={setCampoAtivo}
            indiceSelecionado={indiceSelecionado}
            setIndiceSelecionado={setIndiceSelecionado}
            listaRef={listaRef}
            sugestoes={sugestoes}
            setSugestoes={setSugestoes}
            buscarSugestoes={buscarSugestoes}
            anuncioData={produto}
            setAnuncioData={setProduto}
          />

          {/* 🔹 Informações Gerais + Medidas */}
          <motion.div
            className="lg:col-span-5 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col gap-3 h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ProductInfoSection
              produto={produto}
              setProduto={setProduto}
              router={router}
              saving={saving}
              handleSave={handleSave}
              handleDelete={handleDelete}
              HelpTooltip={HelpTooltip}
              setComposicao={setComposicao}
              setCustoTotal={setCustoTotal}
            />

            {/* Exibe o ID atual (somente leitura) */}
            <Input
              type="text"
              value={produto?.id?.toString() ?? ""}
              disabled
              className="bg-white/5 border-white/10 text-white text-xs rounded-md opacity-70 cursor-not-allowed"
            />

            {/* 🔹 Dimensões do Produto */}
            <DimensionsSection
              produto={produto}
              setProduto={setProduto}
              HelpTooltip={HelpTooltip}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
}
