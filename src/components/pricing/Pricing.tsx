"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Sparkles,
  TrendingUp,
  Calculator,
  HelpCircle,
  Download,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
};

export default function PricingCalculatorModern() {
  const {
    composicao,
    setComposicao,
    acrescimos,
    setAcrescimos,
    custoTotal,
    statusAcrescimo,
    adicionarItem,
    removerItem,
  } = usePrecificacao();

  const [calculoLoja, setCalculoLoja] = useState<Calculo>({
    desconto: "",
    imposto: "",
    margem: "",
    frete: "",
    comissao: "",
    marketing: "",
  });

  const [calculoMarketplace, setCalculoMarketplace] = useState<Calculo>({
    desconto: "",
    imposto: "",
    margem: "",
    frete: "",
    comissao: "",
    marketing: "",
  });

  const calcularPreco = (dados: Calculo) => {
    const custo = composicao.reduce(
      (sum, item) =>
        sum +
        (parseFloat(item.custo) || 0) * (parseFloat(item.quantidade) || 0),
      0
    );

    const desconto = (parseFloat(dados.desconto) || 0) / 100;
    const imposto = (parseFloat(dados.imposto) || 0) / 100;
    const margem = (parseFloat(dados.margem) || 0) / 100;
    const comissao = (parseFloat(dados.comissao) || 0) / 100;
    const marketing = (parseFloat(dados.marketing) || 0) / 100;
    const frete = parseFloat(dados.frete) || 0;

    const custoLiquido = custo * (1 - desconto);
    const divisor = 1 - (imposto + margem + comissao + marketing);
    const preco = divisor > 0 ? (custoLiquido + frete) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  };

  const precoLoja = calcularPreco(calculoLoja);
  const precoMarketplace = calcularPreco(calculoMarketplace);

  useEffect(() => {
    setAcrescimos((prev) => ({
      ...prev,
      precoTray: precoLoja.toFixed(2),
      precoMercadoLivre: precoMarketplace.toFixed(2),
      freteMercadoLivre: calculoMarketplace.frete || "0",
    }));
  }, [precoLoja, precoMarketplace, calculoMarketplace.frete, setAcrescimos]);

  const handleClearAll = () => {
    setComposicao([]);
    setCalculoLoja({
      desconto: "",
      imposto: "",
      margem: "",
      frete: "",
      comissao: "",
      marketing: "",
    });
    setCalculoMarketplace({
      desconto: "",
      imposto: "",
      margem: "",
      frete: "",
      comissao: "",
      marketing: "",
    });
    setAcrescimos({
      precoTray: "",
      precoMercadoLivre: "",
      freteMercadoLivre: "",
      acrescimo: 0,
    });
  };

  const handleDownload = () => {
    const resumoRows = [
      ["Resumo"],
      ["Data/Hora", new Date().toLocaleString()],
      [],
      ["Custos"],
      ["Custo Total (R$)", custoTotal],
      ["Preço Loja (R$)", precoLoja],
      ["Preço Marketplace (R$)", precoMarketplace],
      [],
      ["Regras Loja"],
      ...Object.entries(calculoLoja),
      [],
      ["Regras Marketplace"],
      ...Object.entries(calculoMarketplace),
      [],
      ["Composição"],
      ["Código", "Quantidade", "Custo"],
      ...composicao.map((i) => [i.codigo, i.quantidade, i.custo]),
    ];

    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `Relatorio_Precificacao_${new Date()
        .toISOString()
        .replace(/[:]/g, "-")}.xlsx`
    );
  };

  const HelpTooltip = ({ text }: { text: string }) => (
    <div className="relative group flex items-center">
      <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs whitespace-nowrap font-normal opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
        {text}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COMPOSIÇÃO */}
        <motion.div
          className="lg:col-span-7 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#1a8ceb]" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Composição
              <HelpTooltip text="Adicione os itens que compõem o custo do produto." />
            </h3>
          </div>

          {/* container com scroll automático */}
          <div
            className={`space-y-1.5 ${
              composicao.length > 10
                ? "max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
                : ""
            }`}
          >
            {composicao.map((item, idx) => (
              <div
                key={idx}
                className="relative grid grid-cols-3 gap-2 mb-1 p-1.5 rounded-lg bg-black/30 border border-white/10"
              >
                <div>
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Código
                  </Label>
                  <Input
                    type="text"
                    placeholder="SKU"
                    value={item.codigo}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].codigo = e.target.value;
                      setComposicao(novo);
                    }}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>

                <div>
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Quantidade
                  </Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={item.quantidade}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].quantidade = e.target.value;
                      setComposicao(novo);
                    }}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>

                <div>
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Custo (R$)
                  </Label>
                  <Input
                    type="number"
                    placeholder="12R$"
                    value={item.custo}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].custo = e.target.value;
                      setComposicao(novo);
                    }}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>

                {idx >= 1 && (
                  <Button
                    onClick={() => removerItem(idx)}
                    size="sm"
                    variant="ghost"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={adicionarItem}
            variant="outline"
            className="w-full border-white/10 text-white text-xs hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all mt-2"
          >
            <Plus className="w-3 h-3 mr-2" /> Incluir Custos
          </Button>

          <div className="mt-3 p-2 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-xl border border-[#1a8ceb]/30">
            <div className="flex justify-between items-center">
              <span className="text-neutral-300 text-xs">Custo Total</span>
              <span className="text-sm font-bold text-white">
                R$ {Number(custoTotal).toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CÁLCULO DE PREÇO + ACRÉSCIMOS */}
        <motion.div
          className="lg:col-span-5 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col justify-between h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1a8ceb]" />
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Cálculo de Preço
                  <HelpTooltip text="Defina descontos, impostos e margens para calcular o preço final de venda." />
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-full">
                  <Download className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
                </button>
                <button onClick={handleClearAll} className="p-2 hover:bg-red-500/10 rounded-full">
                  <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {[
                { nome: "Preço Loja", state: calculoLoja, set: setCalculoLoja, preco: precoLoja },
                {
                  nome: "Preço Marketplace",
                  state: calculoMarketplace,
                  set: setCalculoMarketplace,
                  preco: precoMarketplace,
                },
              ].map((bloco, i) => (
                <div key={i} className="p-2 rounded-lg bg-black/30 border border-white/10">
                  <h4 className="text-white font-semibold text-xs mb-1">{bloco.nome}</h4>
                  {(["desconto", "imposto", "margem", "frete", "comissao", "marketing"] as const).map(
                    (key) => (
                      <div key={key} className="mb-1">
                        <Label className="text-neutral-400 text-[10px] block">
                          {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                          {key === "frete" ? "(R$)" : "(%)"}
                        </Label>
                        <Input
                          type="number"
                          value={bloco.state[key]}
                          onChange={(e) =>
                            bloco.set({ ...bloco.state, [key]: e.target.value })
                          }
                          className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                        />
                      </div>
                    )
                  )}
                  <div className="mt-1 text-right">
                    <span className="text-neutral-300 text-[10px]">Preço de Venda</span>
                    <div className="text-sm font-bold text-[#1a8ceb]">
                      R$ {bloco.preco.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CÁLCULO DE ACRÉSCIMOS */}
            <div className="p-3 rounded-lg bg-black/30 border border-white/10">
              <h4 className="font-bold text-white text-xs mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#1a8ceb]" />
                Cálculo de Acréscimos
                <HelpTooltip text="Compare preços e calcule a diferença percentual entre Loja e Marketplace." />
              </h4>

              <div className="flex flex-col gap-2">
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">Preço Loja (R$)</Label>
                  <Input
                    type="number"
                    value={acrescimos.precoTray}
                    onChange={(e) =>
                      setAcrescimos({ ...acrescimos, precoTray: e.target.value })
                    }
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">
                    Preço Marketplace (R$)
                  </Label>
                  <Input
                    type="number"
                    value={acrescimos.precoMercadoLivre}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        precoMercadoLivre: e.target.value,
                      })
                    }
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">Frete (R$)</Label>
                  <Input
                    type="number"
                    value={acrescimos.freteMercadoLivre}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        freteMercadoLivre: e.target.value,
                      })
                    }
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] mt-1 bg-white/5 rounded-md p-2">
                  <span className="text-neutral-400">Acréscimo:</span>
                  <span
                    className={`font-normal ${
                      acrescimos.acrescimo > 0
                        ? "text-green-500"
                        : acrescimos.acrescimo < 0
                        ? "text-red-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {Number(acrescimos.acrescimo).toFixed(2)}% ({statusAcrescimo})
                  </span>
                </div>
              </div>
            </div>p
          </div>
        </motion.div>
      </div>
    </div>
  );
}
