"use client";
import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Plus,
  Layers,
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
import { supabase } from "@/integrations/supabase/client";

type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
};

// ✅ componente de contagem animada suave (com vírgula e separador de milhar)
const AnimatedNumber = ({ value }: { value: number }) => {
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, (latest) =>
    latest.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.0,
      ease: "easeInOut",
    });
    return controls.stop;
  }, [value]);

  return <motion.span>{formatted}</motion.span>;
};

export default function PricingCalculatorModern() {
  const {
    composicao,
    setComposicao,
    acrescimos,
    setAcrescimos,
    custoTotal,
    statusAcrescimo, // continua disponível, mas não exibiremos o texto
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

  const [sugestoes, setSugestoes] = useState<{ codigo: string; custo: number }[]>(
    []
  );
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);

  // --- ADIÇÕES: navegação por teclado / foco / clique fora ---
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Fecha sugestões ao clicar fora (e tira o foco do input ativo)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;
      const listaEl = listaRef.current;
      const inputEl = inputRefs.current[campoAtivo];
      const target = e.target as Node;
      const clickDentroLista = !!(listaEl && listaEl.contains(target));
      const clickNoInputAtivo = !!(inputEl && inputEl.contains(target as Node));
      if (!clickDentroLista && !clickNoInputAtivo) {
        setSugestoes([]);
        setCampoAtivo(null);
        setIndiceSelecionado(-1);
        inputEl?.blur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [campoAtivo]);

  // rolagem automática do item selecionado
  useEffect(() => {
    if (listaRef.current && indiceSelecionado >= 0) {
      const el = listaRef.current.children[indiceSelecionado] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [indiceSelecionado]);
  // --- FIM ADIÇÕES ---

  // busca por código no Supabase enquanto o usuário digita
  const buscarSugestoes = async (termo: string, idx: number) => {
    if (!termo.trim()) {
      setSugestoes([]);
      return;
    }

    const { data, error } = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${termo}%`)
      .limit(5);

    if (error) {
      console.error("Erro ao buscar sugestões:", error);
      return;
    }

    setCampoAtivo(idx);
    setSugestoes(
      data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
      })) || []
    );
    setIndiceSelecionado(-1);
  };

  // quando o usuário seleciona uma sugestão
  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    novo[idx].custo = custo.toFixed(2);
    setComposicao(novo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);

    // foco automático de volta no campo de código
    setTimeout(() => {
      inputRefs.current[idx]?.focus();
    }, 50);
  };

  // --- ADIÇÃO: handler de teclas nas sugestões ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (!sugestoes.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((prev) =>
        prev < sugestoes.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((prev) =>
        prev > 0 ? prev - 1 : sugestoes.length - 1
      );
    } else if (e.key === "Enter" && indiceSelecionado >= 0) {
      e.preventDefault();
      const s = sugestoes[indiceSelecionado];
      selecionarSugestao(s.codigo, s.custo, idx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    }
  };
  // --- FIM ADIÇÃO ---

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

  const ordemCampos: (keyof Calculo)[] = [
    "desconto",
    "frete",
    "imposto",
    "comissao",
    "margem",
    "marketing",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COMPOSIÇÃO */}
        <motion.div
          className="lg:col-span-7 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg h-full relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-[#1a8ceb]" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Composição
              <HelpTooltip text="Composição de Custos." />
            </h3>
          </div>

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
                {/* Código com busca */}
                <div className="relative">
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Código
                  </Label>
                  <Input
                    ref={(el) => (inputRefs.current[idx] = el!)}
                    type="text"
                    placeholder="SKU"
                    value={item.codigo}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].codigo = e.target.value;
                      setComposicao(novo);
                      buscarSugestoes(e.target.value, idx);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                  {/* Sugestões */}
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
                          <span className="text-[#1a8ceb]">
                            R$ {s.custo.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
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
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
                  />
                </div>

                {/* Custo */}
                <div>
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Custo (R$)
                  </Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={item.custo}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].custo = e.target.value;
                      setComposicao(novo);
                    }}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
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

          {/* CUSTO TOTAL */}
          <div className="mt-3 p-3 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-xl border border-[#1a8ceb]/30">
            <div className="flex flex-col items-center justify-center">
              <span className="text-neutral-300 text-xs mb-1">Custo Total</span>
              <span className="text-xl font-bold text-white">
                R$ <AnimatedNumber value={Number(custoTotal)} />
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
                  <HelpTooltip text="Preços de Venda." />
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

            {/* CAMPOS REORDENADOS */}
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
                <div
                  key={i}
                  className="p-2 rounded-lg bg-black/30 border border-white/10 flex flex-col justify-center items-center"
                >
                  <h4 className="text-white font-semibold text-xs mb-1">
                    {bloco.nome}
                  </h4>
                  {["desconto","frete","imposto","comissao","margem","marketing"].map((key) => (
                    <div key={key} className="mb-1 w-full">
                      <Label className="text-neutral-400 text-[10px] block">
                        {key === "margem"
                          ? "Margem de Lucro (%)"
                          : key === "frete"
                          ? "Frete (R$)"
                          : key.charAt(0).toUpperCase() + key.slice(1) + " (%)"}
                      </Label>
                      <Input
                        type="number"
                        value={bloco.state[key]}
                        onChange={(e) =>
                          bloco.set({
                            ...bloco.state,
                            [key]: e.target.value,
                          })
                        }
                        className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                      />
                    </div>
                  ))}
                  <div className="mt-1 text-center flex flex-col items-center justify-center py-1">
                    <span className="text-neutral-300 text-[10px]">
                      Preço de Venda
                    </span>
                    <div className="text-lg font-bold text-[#1a8ceb] leading-tight">
                      R$ <AnimatedNumber value={bloco.preco} />
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
                <HelpTooltip text="Calculo de Acréscimo." />
              </h4>

              <div className="flex flex-col gap-2">
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">
                    Preço Loja (R$)
                  </Label>
                  <Input
                    type="number"
                    value={acrescimos.precoTray}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        precoTray: e.target.value,
                      })
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
                  <Label className="text-neutral-400 text-[10px] mb-1 block">
                    Frete (R$)
                  </Label>
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

                {/* ACRÉSCIMO COM ANIMAÇÃO (somente cores, sem texto Lucro/Prejuízo/Neutro) */}
                <div
                  className={`flex flex-col justify-center items-center text-[11px] mt-2 rounded-md p-3 transition-all duration-300 ${
                    acrescimos.acrescimo > 0
                      ? "bg-green-500/10 border border-green-500/30"
                      : acrescimos.acrescimo < 0
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <span className="text-neutral-300 mb-1">Acréscimo</span>
                  <span
                    className={`font-semibold text-base transition-colors duration-300 ${
                      acrescimos.acrescimo > 0
                        ? "text-green-400"
                        : acrescimos.acrescimo < 0
                        ? "text-red-400"
                        : "text-neutral-400"
                    }`}
                  >
                    <AnimatedNumber value={Number(acrescimos.acrescimo)} />%
                  </span>
                  {/* Removido o texto statusAcrescimo */}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
