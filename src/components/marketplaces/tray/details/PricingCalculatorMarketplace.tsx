"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { useSearchParams } from "next/navigation";

import AnimatedNumber from "@/components/marketplaces/tray/details/AnimatedNumber";
import ComposicaoList from "@/components/marketplaces/tray/details/ComposicaoList";
import CalculoPrecoBox from "@/components/marketplaces/tray/details/CalculoPrecoBox";
import MedidasBox from "@/components/marketplaces/tray/details/MedidasBox";
import InfoGeraisBox from "@/components/marketplaces/tray/details/InfoGeraisBox";

import { useMarketplaceDetails } from "@/components/marketplaces/tray/hooks/useMarketplaceDetails";

export default function PricingCalculatorMarketplace() {
  const searchParams = useSearchParams();

  const id = searchParams.get("id");
  const lojaParam = searchParams.get("loja");

  const lojaNormalizada = lojaParam
    ?.toUpperCase()
    ?.replace("Ó", "O")
    ?.replace("Ô", "O")
    ?.replace("Á", "A")
    ?.replace("Ã", "A")
    ?.replace("É", "E")
    ?.replace(/\s/g, "")
    ?.trim();

  const loja =
    lojaNormalizada === "Pikot Shop" ? "PK" :
    lojaNormalizada === "Sóbaquetas" ? "SB" :
    lojaNormalizada || "";

  const {
    produto,
    setProduto,
    composicao,
    setComposicao,
    adicionarItem,
    removerItem,
    custoTotal,
    calculoLoja,
    setCalculoLoja,

    /** 🔥 CAMPOS QUE FALTAVAM */
    campoAtivo,
    sugestoes,
    indiceSelecionado,
    inputRefs,
    listaRef,
    buscarSugestoes,
    handleSugestoesKeys,
    selecionarSugestao

  } = useMarketplaceDetails(id, loja);

  const calcularPreco = () => {
    if (!custoTotal) return 0;

    const custo = Number(custoTotal || 0);
    const parse = (v: any) =>
      parseFloat(String(v).replace(",", ".")) || 0;

    const d = parse(calculoLoja.desconto) / 100;
    const i = parse(calculoLoja.imposto) / 100;
    const m = parse(calculoLoja.margem) / 100;
    const c = parse(calculoLoja.comissao) / 100;
    const mk = parse(calculoLoja.marketing) / 100;
    const f = parse(calculoLoja.frete);

    const divisor = 1 - (i + m + c + mk);

    const preco = divisor > 0 ? (custo * (1 - d) + f + 2.5) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  const precoLoja = calcularPreco();

  const handleClearLocal = () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT SIDE */}
        <motion.div
          className="lg:col-span-7 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg h-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-[#1a8ceb]" />
              <h3 className="text-base font-bold text-white">Composição</h3>
            </div>

            {/* 🔥 AGORA COMPLETO */}
            <ComposicaoList
              composicao={composicao}
              adicionarItem={adicionarItem}
              removerItem={removerItem}
              setComposicao={setComposicao}

              campoAtivo={campoAtivo}
              sugestoes={sugestoes}
              indiceSelecionado={indiceSelecionado}
              inputRefs={inputRefs}
              listaRef={listaRef}
              buscarSugestoes={buscarSugestoes}
              handleSugestoesKeys={handleSugestoesKeys}
              selecionarSugestao={selecionarSugestao}
            />

            <div className="mt-3 p-3 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-xl border border-[#1a8ceb]/30 text-center">
              <span className="text-neutral-300 text-xs">Custo Total</span>
              <div className="text-xl font-bold text-white">
                R$ <AnimatedNumber value={Number(custoTotal || 0)} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          className="lg:col-span-5 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col gap-3 h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CalculoPrecoBox
            calculoLoja={calculoLoja}
            setCalculoLoja={setCalculoLoja}
            precoLoja={precoLoja}
            produto={produto}
            saving={false}
            handleClearLocal={handleClearLocal}
          />

          <MedidasBox produto={produto} setProduto={setProduto} />
        </motion.div>
      </div>

      <InfoGeraisBox produto={produto} setProduto={setProduto} />
    </div>
  );
}
