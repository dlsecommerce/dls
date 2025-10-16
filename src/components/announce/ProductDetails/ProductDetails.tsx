"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

import { AnimatedNumber } from "@/components/announce/ProductDetails/AnimatedNumber";
import { HelpTooltip } from "@/components/announce/ProductDetails/HelpTooltip";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import { ProductInfoSection } from "@/components/announce/ProductDetails/ProductInfoSection";
import { DimensionsSection } from "@/components/announce/ProductDetails/DimensionsSection";

import { useProduto } from "@/components/announce/hooks/useProduto";
import { useComposicao } from "@/components/announce/hooks/useComposicao";
import { useSugestoes } from "@/components/announce/hooks/useSugestoes";
import { useSaveProduto } from "@/components/announce/hooks/useSaveProduto";
import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";

export default function PricingCalculatorModernLike() {
  const router = useRouter();

  const { produto, setProduto } = useProduto();
  const { composicao, setComposicao, toInternal, toDisplay, custoTotal } = useComposicao();
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
  const { saving, handleSave } = useSaveProduto(produto, setProduto, composicao, toInternal);

  useKeyboardShortcuts({ saving, handleSave, router, campoAtivo, sugestoesLength: sugestoes.length });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <CompositionSection
          {...{
            composicao,
            setComposicao,
            toInternal,
            toDisplay,
            custoTotal,
            AnimatedNumber,
            HelpTooltip,
            supabase,
            campoAtivo,
            setCampoAtivo,
            indiceSelecionado,
            setIndiceSelecionado,
            listaRef,
            sugestoes,
            setSugestoes,
            buscarSugestoes,
            anuncioData: produto, 
            setAnuncioData: setProduto, 
          }}
        />

        <motion.div
          className="lg:col-span-5 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col gap-3 h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProductInfoSection
            produto={produto}
            setProduto={setProduto}
            router={router}
            saving={saving}
            handleSave={handleSave}
            HelpTooltip={HelpTooltip}
          />
          <DimensionsSection produto={produto} setProduto={setProduto} HelpTooltip={HelpTooltip} />
        </motion.div>
      </div>
    </div>
  );
}
