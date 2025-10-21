"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ================================
// Tooltip auxiliar
// ================================
const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs whitespace-nowrap font-normal opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
      {text}
    </div>
  </div>
);

// ================================
// Formatação BR
// ================================
const toDisplay = (v: any) => {
  const num = parseFloat(String(v).replace(",", "."));
  if (isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ================================
// Componente principal
// ================================
export const CompositionSection = ({
  composicao,
  setComposicao,
  custoTotal,
  AnimatedNumber,
}: any) => {
  const gridRefs = useRef<HTMLInputElement[][]>([]);
  const [sugestoes, setSugestoes] = useState<{ codigo: string; custo: number }[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const listaRef = useRef<HTMLDivElement>(null);

  // ================================
  // Buscar custos do Supabase
  // ================================
  const buscarSugestoes = async (termo: string, idx: number) => {
    if (!termo.trim()) {
      setSugestoes([]);
      return;
    }

    const { data, error } = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${termo}%`)
      .limit(6);

    if (error) {
      console.error("Erro ao buscar custos:", error);
      return;
    }

    setCampoAtivo(idx);
    setSugestoes(
      data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
      })) || []
    );
    setIndiceSelecionado(0);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    novo[idx].custo = custo.toFixed(2);
    setComposicao(novo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);
  };

  // ================================
  // Fecha lista ao clicar fora
  // ================================
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!listaRef.current?.contains(e.target as Node)) {
        setSugestoes([]);
        setCampoAtivo(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ================================
  // Renderização principal
  // ================================
  return (
    <motion.div
      className="lg:col-span-7 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg h-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-5 h-5 text-[#1a8ceb]" />
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Composição <HelpTooltip text="Composição de Custos." />
        </h3>
      </div>

      {/* LISTAGEM DE ITENS */}
      <div
        className={`space-y-1.5 ${
          composicao.length > 10
            ? "max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
            : ""
        }`}
      >
        <AnimatePresence initial={false}>
          {composicao.map((item: any, idx: number) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative grid grid-cols-3 gap-2 mb-1 p-1.5 rounded-lg bg-black/30 border border-white/10"
            >
              {/* Código */}
              <div className="relative">
                <Label className="text-neutral-400 text-[10px] mb-1 block">Código</Label>
                <Input
                  ref={(el) => {
                    if (!gridRefs.current[idx]) gridRefs.current[idx] = [];
                    gridRefs.current[idx][0] = el!;
                  }}
                  value={item.codigo}
                  placeholder="SKU"
                  onChange={(e) => {
                    const novo = [...composicao];
                    novo[idx].codigo = e.target.value;
                    setComposicao(novo);
                    buscarSugestoes(e.target.value, idx);
                  }}
                  onKeyDown={(e) => {
                    const input = e.currentTarget;
                    const start = input.selectionStart ?? 0;
                    const end = input.selectionEnd ?? 0;
                    const len = input.value.length;

                    // 🔹 Sugestões abertas
                    if (campoAtivo === idx && sugestoes.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setIndiceSelecionado((p) =>
                          p < sugestoes.length - 1 ? p + 1 : 0
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setIndiceSelecionado((p) =>
                          p > 0 ? p - 1 : sugestoes.length - 1
                        );
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const s = sugestoes[indiceSelecionado];
                        if (s) selecionarSugestao(s.codigo, s.custo, idx);
                        return;
                      }
                      if (e.key === "Escape") {
                        setSugestoes([]);
                        setCampoAtivo(null);
                        return;
                      }
                    }

                    // 🔹 Navegação vertical
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      gridRefs.current[idx + 1]?.[0]?.focus();
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      gridRefs.current[idx - 1]?.[0]?.focus();
                      return;
                    }

                    // 🔹 Navegação horizontal (texto → campo)
                    if (e.key === "ArrowRight" && end === len) {
                      e.preventDefault();
                      gridRefs.current[idx]?.[1]?.focus();
                      return;
                    }
                    if (e.key === "ArrowLeft" && start === 0) {
                      e.preventDefault();
                      gridRefs.current[idx]?.[2]?.focus();
                      return;
                    }
                  }}
                  className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                />
                {campoAtivo === idx && sugestoes.length > 0 && (
                  <div
                    ref={listaRef}
                    className="absolute z-50 mt-1 bg-[#0f0f0f] border border-white/10 rounded-md shadow-lg w-full max-h-40 overflow-y-auto"
                  >
                    {sugestoes.map((s, i) => (
                      <div
                        key={i}
                        className={`px-2 py-1 text-xs text-white cursor-pointer flex justify-between ${
                          i === indiceSelecionado
                            ? "bg-[#1a8ceb]/30"
                            : "hover:bg-[#1a8ceb]/20"
                        }`}
                        onClick={() => selecionarSugestao(s.codigo, s.custo, idx)}
                      >
                        <span>{s.codigo}</span>
                        <span className="text-[#1a8ceb]">R$ {s.custo.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantidade */}
              <div>
                <Label className="text-neutral-400 text-[10px] mb-1 block">Quantidade</Label>
                <Input
                  ref={(el) => {
                    if (!gridRefs.current[idx]) gridRefs.current[idx] = [];
                    gridRefs.current[idx][1] = el!;
                  }}
                  value={item.quantidade}
                  placeholder="1"
                  onChange={(e) => {
                    const novo = [...composicao];
                    novo[idx].quantidade = e.target.value;
                    setComposicao(novo);
                  }}
                  className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                />
              </div>

              {/* Custo + botão X */}
              <div className="relative">
                <Label className="text-neutral-400 text-[10px] mb-1 block">Custo (R$)</Label>
                <Input
                  ref={(el) => {
                    if (!gridRefs.current[idx]) gridRefs.current[idx] = [];
                    gridRefs.current[idx][2] = el!;
                  }}
                  value={toDisplay(item.custo)}
                  placeholder="100,00"
                  onChange={(e) => {
                    const novo = [...composicao];
                    novo[idx].custo = e.target.value;
                    setComposicao(novo);
                  }}
                  className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                />

                {/* ❌ Botão encaixado na linha do rounded */}
                {idx >= 1 && (
                  <Button
                    onClick={() =>
                      setComposicao((prev: any) =>
                        prev.filter((_: any, i: number) => i !== idx)
                      )
                    }
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2
                               w-5 h-5 p-0 flex items-center justify-center 
                               bg-red-500/20 hover:bg-red-500/40 text-red-400 
                               border border-red-500/30 rounded-full shadow-sm 
                               transition-all cursor-pointer"
                    title="Remover linha"
                  >
                    ×
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ➕ Adicionar linha */}
      <Button
        onClick={() =>
          setComposicao((prev: any) => [...prev, { codigo: "", quantidade: "", custo: "" }])
        }
        variant="outline"
        className="w-full border-white/10 text-white text-xs hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all mt-2"
      >
        <Plus className="w-3 h-3 mr-2" /> Incluir Custos
      </Button>

      {/* 💰 Total */}
      <div className="mt-3 p-3 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-xl border border-[#1a8ceb]/30">
        <div className="flex flex-col items-center justify-center">
          <span className="text-neutral-300 text-xs mb-1">Custo Total</span>
          <span className="text-xl font-bold text-white">
            R$ <AnimatedNumber value={custoTotal} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
