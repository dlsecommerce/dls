"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, TrendingUp, Calculator, HelpCircle, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrecificacao } from "@/hooks/usePrecificacao";

import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

export default function PricingCalculatorModern() {
  const {
    composicao,
    setComposicao,
    calculo,
    setCalculo,
    acrescimos,
    setAcrescimos,
    custoTotal,
    precoVenda,
    statusAcrescimo,
    adicionarItem,
    removerItem,
    alteracoes,
  } = usePrecificacao();

  // 📊 Função para gerar planilha
  const handleDownload = () => {
    const resumoRows = [
      ["Resumo"],
      ["Data/Hora", new Date().toLocaleString()],
      [],
      ["Custos"],
      ["Custo Total (R$)", custoTotal],
      ["Preço de Venda (R$)", precoVenda],
      [],
      ["Regras"],
      ["Desconto (%)", calculo.desconto],
      ["Comissão (%)", calculo.comissao],
      ["Imposto (%)", calculo.imposto],
      ["Lucro (%)", calculo.margem],
      ["Marketing (%)", calculo.marketing],
      ["Frete (R$)", calculo.frete],
      [],
      ["Composição"],
      ["Código", "Quantidade", "Custo"],
      ...composicao.map((i) => [i.codigo, i.quantidade, i.custo]),
    ];
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);

    const altHeader = ["Data/Hora", "Tipo", "Campo", "De", "Para", "Detalhe"];
    const altRows = alteracoes.length
      ? alteracoes.map((a) => [a.timestamp, a.tipo, a.campo, a.de, a.para, a.detalhe || ""])
      : [["—", "—", "—", "—", "—", "—"]];
    const alterSheet = XLSX.utils.aoa_to_sheet([altHeader, ...altRows]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");
    XLSX.utils.book_append_sheet(wb, alterSheet, "Alterações");

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const nome = `Relatorio_Precificacao_${new Date().toISOString().replace(/[:]/g, "-")}.xlsx`;
    saveAs(blob, nome);
  };

  const HelpTooltip = ({ text }: { text: string }) => (
    <div className="relative group flex items-center">
      <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
      <div
        className="absolute left-6 top-1/2 -translate-y-1/2 
                   text-neutral-400/70 text-sm whitespace-nowrap font-normal
                   opacity-0 group-hover:opacity-100 transition pointer-events-none z-20"
      >
        {text}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-28">
      {/* fundo animado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#1a8ceb] rounded-full blur-[120px] opacity-10"
          animate={{ scale: [1, 1.4, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="w-full px-4 md:px-8 relative z-10 space-y-8">
        {/* linha 1: composição e cálculo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* composição */}
          <motion.div
            className="lg:col-span-7 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-[#1a8ceb]" />
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Composição
                <HelpTooltip text="Adicione os códigos, quantidades e custos dos itens que compõem o anúncio." />
              </h3>
            </div>

            <AnimatePresence>
              <div className="space-y-3 mb-4">
                {composicao.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group"
                  >
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-black/30 border border-white/10 hover:border-[#1a8ceb]/50 transition-all duration-300">
                      <div>
                        <Label className="text-neutral-400 text-xs mb-1 block">Código</Label>
                        <Input
                          value={item.codigo}
                          onChange={(e) => {
                            const newComp = [...composicao];
                            newComp[idx].codigo = e.target.value;
                            setComposicao(newComp);
                          }}
                          className="bg-black/50 border-white/10 text-white rounded-lg placeholder-neutral-500 
                                     focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                          placeholder="Ex: SKU"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-400 text-xs mb-1 block">Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => {
                            const newComp = [...composicao];
                            newComp[idx].quantidade = e.target.value;
                            setComposicao(newComp);
                          }}
                          className="bg-black/50 border-white/10 text-white rounded-lg placeholder-neutral-500 
                                     focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                          placeholder="Ex: 5"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-400 text-xs mb-1 block">Custo (R$)</Label>
                        <Input
                          type="number"
                          value={item.custo}
                          onChange={(e) => {
                            const newComp = [...composicao];
                            newComp[idx].custo = e.target.value;
                            setComposicao(newComp);
                          }}
                          className="bg-black/50 border-white/10 text-white rounded-lg placeholder-neutral-500 
                                     focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                          placeholder="Ex: 150"
                        />
                      </div>
                    </div>
                    {composicao.length > 1 && (
                      <Button
                        onClick={() => removerItem(idx)}
                        size="sm"
                        variant="ghost"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            <Button
              onClick={adicionarItem}
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Incluir Custos
            </Button>

            {/* custo total */}
            <motion.div
              className="mt-6 p-6 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-2xl border border-[#1a8ceb]/30"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex justify-between items-center">
                <span className="text-neutral-300 text-lg">Custo Total</span>
                <motion.span
                  className="text-2xl font-bold text-white"
                  key={custoTotal}
                  initial={{ scale: 1.1, color: "#1a8ceb" }}
                  animate={{ scale: 1, color: "#ffffff" }}
                >
                  R$ {custoTotal.toFixed(2)}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>

          {/* cálculo */}
          <motion.div
            className="lg:col-span-5 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1a8ceb]" />
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Cálculo de Preço
                  <HelpTooltip text="Defina o preço de venda do seu anúncio." />
                </h3>
              </div>

              {/* Ícone de Download */}
              <button
                onClick={handleDownload}
                className="p-2 rounded-full hover:bg-white/10 transition"
                title="Baixar Relatório"
              >
                <Download className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Desconto (%)", key: "desconto" },
                { label: "Imposto (%)", key: "imposto" },
                { label: "Margem de Lucro (%)", key: "margem" },
                { label: "Frete (R$)", key: "frete" },
                { label: "Comissão (%)", key: "comissao" },
                { label: "Marketing (%)", key: "marketing" },
              ].map((field) => (
                <div key={field.key}>
                  <Label className="text-neutral-400 text-sm mb-1 block">{field.label}</Label>
                  <Input
                    type="number"
                    value={calculo[field.key as keyof typeof calculo]}
                    onChange={(e) =>
                      setCalculo({
                        ...calculo,
                        [field.key]: e.target.value,
                      })
                    }
                    className="bg-black/50 border border-white/10 text-white rounded-lg placeholder-neutral-500 
                               focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                    placeholder="Ex: 100"
                  />
                </div>
              ))}
            </div>

            {/* preço venda */}
            <motion.div
              className="p-6 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-2xl border border-[#1a8ceb]/30 mb-6"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex justify-between items-center">
                <span className="text-neutral-300">Preço de Venda</span>
                <motion.span
                  className="text-3xl font-bold text-[#1a8ceb]"
                  key={precoVenda}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  R$ {precoVenda.toFixed(2)}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* linha 2: cálculo de acréscimos */}
        <motion.div
          className="lg:col-span-12 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#1a8ceb]" />
            Cálculo de Acréscimos
            <HelpTooltip text="Faça o acréscimo para definição do preço de venda para o marketplace." />
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-neutral-400 text-sm mb-1 block">Preço Base (R$)</Label>
              <Input
                type="number"
                value={acrescimos.precoTray}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    precoTray: e.target.value,
                  })
                }
                className="bg-black/50 border border-white/10 text-white rounded-lg placeholder-neutral-500 
                           focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                placeholder="Ex: 200"
              />
            </div>
            <div>
              <Label className="text-neutral-400 text-sm mb-1 block">Preço Final (R$)</Label>
              <Input
                type="number"
                value={acrescimos.precoMercadoLivre}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    precoMercadoLivre: e.target.value,
                  })
                }
                className="bg-black/50 border border-white/10 text-white rounded-lg placeholder-neutral-500 
                           focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                placeholder="Ex: 250"
              />
            </div>
            <div>
              <Label className="text-neutral-400 text-sm mb-1 block">Frete (R$)</Label>
              <Input
                type="number"
                value={acrescimos.freteMercadoLivre}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    freteMercadoLivre: e.target.value,
                  })
                }
                className="bg-black/50 border border-white/10 text-white rounded-lg placeholder-neutral-500 
                           focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                placeholder="Ex: 30"
              />
            </div>
          </div>

          {/* resultado do cálculo */}
          <div className="space-y-2 p-4 bg-white/5 rounded-xl">
            <div className="flex justify-between items-center text-sm">
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
                {acrescimos.acrescimo.toFixed(1)}% ({statusAcrescimo})
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
