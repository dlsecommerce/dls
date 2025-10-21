"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

import { AnimatedNumber } from "@/components/announce/ProductDetails/AnimatedNumber";
import { HelpTooltip } from "@/components/announce/ProductDetails/HelpTooltip";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import { ProductInfoSection } from "@/components/announce/ProductDetails/ProductInfoSection";
import { DimensionsSection } from "@/components/announce/ProductDetails/DimensionsSection";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Input } from "@/components/ui/input";
import ConfirmExitModal from "@/components/announce/ProductDetails/ConfirmExitModal";

import { useSugestoes } from "@/components/announce/hooks/useSugestoes";
import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";
import { useAnuncioEditor } from "@/components/announce/hooks/useAnuncioEditor";
import { useNewListing } from "@/components/announce/hooks/useNewListing";
import { useAnuncioActions } from "@/components/announce/hooks/useAnuncioActions";

export default function ProductDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || undefined;
  const lojaParam =
    (searchParams.get("loja") as "Pikot Shop" | "Sóbaquetas") || "Pikot Shop";
  const loadingBarRef = useRef<any>(null);

  // ===========================================================
  // 🧠 Hooks principais (modo edição OU novo cadastro)
  // ===========================================================
  const isEditing = Boolean(id);
  const editor = isEditing ? useAnuncioEditor(id) : useNewListing();

  // ✅ correção aplicada aqui
  const {
    produto,
    setProduto,
    composicao = [], // <=== se vier undefined, vira []
    setComposicao,
    custoTotal,
    setCustoTotal,
    loading,
    toInternal,
    toDisplay,
  } = editor;

  const { handleSave, handleDelete, saving, deleting } = useAnuncioActions();

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

  const { showExitModal, confirmExit, setShowExitModal } = useKeyboardShortcuts({
    saving,
    handleSave: () => handleSave(produto, composicao),
    campoAtivo,
    sugestoesLength: sugestoes.length,
  });

  // ===========================================================
  // 🎨 Loading visual (barra superior)
  // ===========================================================
  useEffect(() => {
    if (loading) loadingBarRef.current?.start?.();
    else loadingBarRef.current?.finish?.();
  }, [loading]);

  if (loading) {
    return (
      <>
        <LoadingBar ref={loadingBarRef} />
        <div className="flex items-center justify-center min-h-screen text-white">
          <span className="text-neutral-400 text-sm"></span>
        </div>
      </>
    );
  }

  // ===========================================================
  // 🧩 Renderização principal
  // ===========================================================
  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 💡 Seção de composição */}
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

          {/* 📦 Seção de informações gerais */}
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
              handleSave={() => handleSave(produto, composicao)}
              handleDelete={() => handleDelete(produto)}
              HelpTooltip={HelpTooltip}
              setComposicao={setComposicao}
              setCustoTotal={setCustoTotal}
            />

            {/* 🔹 Campo ID (bloqueado) */}
            <Input
              type="text"
              value={produto?.id?.toString() ?? ""}
              disabled
              className="bg-white/5 border-white/10 text-white text-xs rounded-md opacity-70 cursor-not-allowed"
            />

            {/* 📏 Dimensões */}
            <DimensionsSection
              produto={produto}
              setProduto={setProduto}
              HelpTooltip={HelpTooltip}
            />
          </motion.div>
        </div>
      </div>

      {/* 💬 Modal de confirmação ao sair */}
      <ConfirmExitModal
        open={showExitModal}
        onOpenChange={setShowExitModal}
        onConfirm={confirmExit}
      />
    </>
  );
}
