"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader, Percent, ArrowLeft } from "lucide-react";

// 🧩 Componentes reutilizados
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { ProductInfoSection } from "@/components/announce/ProductDetails/ProductInfoSection";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";
import { DimensionsSection } from "@/components/announce/ProductDetails/DimensionsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function MarketplacePricingDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const loja = searchParams.get("loja");

  const [produto, setProduto] = useState<any>(null);
  const [composicao, setComposicao] = useState<any[]>([]);
  const [custoTotal, setCustoTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Campos percentuais
  const [percentuais, setPercentuais] = useState({
    embalagem: 0,
    desconto: 0,
    frete: 0,
    comissao: 0,
    imposto: 0,
    marketing: 0,
    margem: 0,
  });

  // ===========================================================
  // 🔹 Carrega dados do Supabase
  // ===========================================================
  useEffect(() => {
    if (!id || !loja) return;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("marketplace_tray_all")
        .select("*")
        .eq("ID", id)
        .eq("Loja", loja)
        .single();

      if (error) {
        console.error("Erro ao carregar produto:", error);
        setLoading(false);
        return;
      }

      setProduto(data);

      setPercentuais({
        embalagem: data["Embalagem"] || 0,
        desconto: data["Desconto"] || 0,
        frete: data["Frete"] || 0,
        comissao: data["Comissão"] || 0,
        imposto: data["Imposto"] || 0,
        marketing: data["Marketing"] || 0,
        margem: data["Margem de Lucro"] || 0,
      });

      setLoading(false);
    };

    load();
  }, [id, loja]);

  // ===========================================================
  // 🧮 Cálculo do preço sugerido
  // ===========================================================
  const precoCalculado = React.useMemo(() => {
    const c = Number(produto?.Custo || 0);
    const f = Number(percentuais.frete || 0);
    const e = Number(percentuais.embalagem || 0);
    const d = Number(percentuais.desconto || 0);
    const co = Number(percentuais.comissao || 0);
    const i = Number(percentuais.imposto || 0);
    const m = Number(percentuais.marketing || 0);
    const ml = Number(percentuais.margem || 0);

    if (c === 0) return 0;

    const valor =
      (c + e + f) /
      (1 -
        (d / 100 + co / 100 + i / 100 + m / 100 + ml / 100));

    return valor;
  }, [produto, percentuais]);

  // ===========================================================
  // 💾 Salvamento no Supabase
  // ===========================================================
  const handleSave = async () => {
    if (!id || !loja) return;
    setSaving(true);

    const { error } = await supabase
      .from("marketplace_tray_all")
      .update({
        Embalagem: percentuais.embalagem,
        Desconto: percentuais.desconto,
        Frete: percentuais.frete,
        Comissão: percentuais.comissao,
        Imposto: percentuais.imposto,
        Marketing: percentuais.marketing,
        "Margem de Lucro": percentuais.margem,
        "Preço de Venda": precoCalculado,
        "Atualizado em": new Date().toISOString(),
      })
      .eq("ID", id)
      .eq("Loja", loja);

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações.");
    } else {
      alert("Dados salvos com sucesso!");
    }
  };

  // ===========================================================
  // 🧱 Renderização
  // ===========================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-neutral-400">
        <Loader className="animate-spin w-6 h-6 mr-2" /> Carregando dados...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <GlassmorphicCard>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <ArrowLeft
                onClick={() => router.push("/dashboard/marketplaces")}
                className="w-5 h-5 text-white opacity-70 hover:opacity-100 cursor-pointer"
              />
              <h2 className="text-white font-bold text-lg">
                Edição de Precificação — {produto?.Nome}
              </h2>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1a8ceb] hover:bg-[#0f7ad6] text-white text-sm"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin mr-2" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>

          {/* 🧾 Informações do Produto */}
          <ProductInfoSection
            produto={produto}
            setProduto={setProduto}
            router={router}
            saving={saving}
            handleSave={handleSave}
            HelpTooltip={() => <></>}
            setComposicao={setComposicao}
            setCustoTotal={setCustoTotal}
          />

          {/* ⚙️ Composição de Custos */}
          <CompositionSection
            composicao={composicao}
            setComposicao={setComposicao}
            custoTotal={custoTotal}
            AnimatedNumber={({ value }: any) => (
              <span>{value.toFixed(2)}</span>
            )}
          />

          {/* 📊 Percentuais */}
          <motion.div
            className="mt-6 p-4 rounded-xl bg-black/30 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-[#1a8ceb]" />
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Percentuais de Precificação
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries(percentuais).map(([campo, valor]) => (
                <div key={campo}>
                  <Label className="text-neutral-400 text-[10px] block mb-1 capitalize">
                    {campo}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) =>
                      setPercentuais((p) => ({
                        ...p,
                        [campo]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-lg bg-[#1a8ceb]/10 border border-[#1a8ceb]/20 flex flex-col items-center">
              <span className="text-sm text-neutral-300 mb-1">
                Preço de Venda Sugerido
              </span>
              <span className="text-2xl font-bold text-[#4ade80]">
                R$ {precoCalculado.toFixed(2)}
              </span>
            </div>
          </motion.div>

          {/* 📏 Peso e Medidas */}
          <DimensionsSection
            produto={produto}
            setProduto={setProduto}
            HelpTooltip={() => <></>}
          />
        </GlassmorphicCard>
      </div>
    </div>
  );
}
