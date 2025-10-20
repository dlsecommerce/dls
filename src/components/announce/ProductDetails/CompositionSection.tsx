"use client";
import React from "react";
import { motion } from "framer-motion";
import { Layers, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// ================================
// 🧩 Funções de formatação BR
// ================================
const formatValorBR = (v: any) => {
  const n = parseFloat(String(v).replace(/[^\d,-]/g, "").replace(",", "."));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔧 Ajustado para aceitar 0,5 e 0.5 corretamente
const parseValorBR = (v: string) => {
  if (!v) return "";
  return v
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
};

// ================================
// 🧾 Componente principal
// ================================
export const CompositionSection = ({
  composicao,
  setComposicao,
  custoTotal,
  AnimatedNumber,
  HelpTooltip,
  campoAtivo,
  setCampoAtivo,
  indiceSelecionado,
  setIndiceSelecionado,
  listaRef,
  sugestoes,
  setSugestoes,
  buscarSugestoes,
}: any) => {
  const gridInputRefs = React.useRef<HTMLInputElement[][]>([]);
  const [editingFields, setEditingFields] = React.useState<Set<string>>(new Set());

  const setEditing = (key: string, editing: boolean) => {
    setEditingFields((prev) => {
      const s = new Set(prev);
      if (editing) s.add(key);
      else s.delete(key);
      return s;
    });
  };
  const isEditing = (key: string) => editingFields.has(key);

  const confirmarSugestaoPrimeira = (idx: number, codigo: string, custo: number) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    novo[idx].custo = formatValorBR(custo);
    setComposicao(novo);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    confirmarSugestaoPrimeira(idx, codigo, custo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);
    setTimeout(() => gridInputRefs.current[idx]?.[0]?.focus(), 50);
  };

  const handleSugestoesKeys = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((p: number) => (p < sugestoes.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((p: number) => (p > 0 ? p - 1 : sugestoes.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const i = indiceSelecionado >= 0 ? indiceSelecionado : 0;
      const s = sugestoes[i];
      selecionarSugestao(s.codigo, s.custo, idx);
    } else if (e.key === "Tab") {
      const s = sugestoes[0];
      confirmarSugestaoPrimeira(idx, s.codigo, s.custo);
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    }
  };

  const handleGridNav = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (sugestoes.length && campoAtivo === row) return;
    const total = composicao.length;
    const goNext = () => {
      const nextRow = row + 1 < total ? row + 1 : 0;
      gridInputRefs.current[nextRow]?.[col]?.focus();
    };
    const goPrev = () => {
      const prevRow = row - 1 >= 0 ? row - 1 : total - 1;
      gridInputRefs.current[prevRow]?.[col]?.focus();
    };
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goPrev();
    }
  };

  // ================================
  // 🧮 Render
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

      <div
        className={`space-y-1.5 ${
          composicao.length > 10
            ? "max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
            : ""
        }`}
      >
        {composicao.map((item: any, idx: number) => (
          <div
            key={idx}
            className="relative grid grid-cols-3 gap-2 mb-1 p-1.5 rounded-lg bg-black/30 border border-white/10"
          >
            {/* CÓDIGO */}
            <div className="relative">
              <Label className="text-neutral-400 text-[10px] block mb-1">Código</Label>
              <Input
                ref={(el) => {
                  if (!gridInputRefs.current[idx]) gridInputRefs.current[idx] = [];
                  gridInputRefs.current[idx][0] = el!;
                }}
                type="text"
                placeholder="SKU"
                value={item.codigo}
                onChange={(e) => {
                  const novo = [...composicao];
                  novo[idx].codigo = e.target.value;
                  setComposicao(novo);
                  buscarSugestoes(e.target.value, idx);
                }}
                onKeyDown={(e) => {
                  handleSugestoesKeys(e, idx);
                  handleGridNav(e, idx, 0);
                }}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>

            {/* QUANTIDADE */}
            <div>
              <Label className="text-neutral-400 text-[10px] block mb-1">Quantidade</Label>
              <Input
                ref={(el) => {
                  if (!gridInputRefs.current[idx]) gridInputRefs.current[idx] = [];
                  gridInputRefs.current[idx][1] = el!;
                }}
                type="text"
                inputMode="decimal"
                placeholder="1,00"
                value={item.quantidade}
                onChange={(e) => {
                  // 🔧 aceita "0,5" e "0.5" sem formatar em tempo real
                  const clean = e.target.value
                    .replace(/[^\d.,-]/g, "")
                    .replace(/\./g, "")
                    .replace(",", ".");
                  const novo = [...composicao];
                  novo[idx].quantidade = clean;
                  setComposicao(novo);
                }}
                onBlur={(e) => {
                  // ao sair do campo, formata corretamente
                  const valorNum = parseFloat(parseValorBR(e.target.value));
                  const novo = [...composicao];
                  novo[idx].quantidade = isNaN(valorNum)
                    ? ""
                    : formatValorBR(valorNum);
                  setComposicao(novo);
                }}
                onKeyDown={(e) => handleGridNav(e, idx, 1)}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>

            {/* CUSTO */}
            <div>
              <Label className="text-neutral-400 text-[10px] block mb-1">Custo (R$)</Label>
              <Input
                ref={(el) => {
                  if (!gridInputRefs.current[idx]) gridInputRefs.current[idx] = [];
                  gridInputRefs.current[idx][2] = el!;
                }}
                type="text"
                placeholder="100,00"
                value={isEditing(`c-${idx}`) ? item.custo : formatValorBR(item.custo)}
                onFocus={() => setEditing(`c-${idx}`, true)}
                onBlur={(e) => {
                  setEditing(`c-${idx}`, false);
                  const novo = [...composicao];
                  novo[idx].custo = formatValorBR(e.target.value);
                  setComposicao(novo);
                }}
                onChange={(e) => {
                  const novo = [...composicao];
                  novo[idx].custo = e.target.value;
                  setComposicao(novo);
                }}
                onKeyDown={(e) => handleGridNav(e, idx, 2)}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() =>
          setComposicao((prev: any) => [...prev, { codigo: "", quantidade: "", custo: "" }])
        }
        variant="outline"
        className="w-full border-white/10 text-white text-xs hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all mt-2"
      >
        <Plus className="w-3 h-3 mr-2" /> Incluir Custos
      </Button>

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
