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
import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
};

// =====================
// Helpers de número
// =====================

// Normaliza string digitada para formato interno (padrão JS):
// - remove separador de milhar (ponto) no padrão pt-BR
// - troca vírgula decimal por ponto
const toInternal = (v: string): string => {
  if (!v) return "";
  // remove espaços
  let s = v.replace(/\s+/g, "");
  // se houver tanto ponto quanto vírgula, assume pt-BR (ponto milhar, vírgula decimal)
  if (s.includes(","))
    s = s.replace(/\./g, "").replace(",", ".");
  // mantém apenas digitos, ponto e sinal negativo
  s = s.replace(/[^\d.-]/g, "");
  // evita múltiplos pontos/sinais malucos
  const parts = s.split(".");
  if (parts.length > 2) {
    s = parts.shift()! + "." + parts.join("");
  }
  return s;
};

// Formata para exibição pt-BR (milhar com ponto e decimal com vírgula)
const toDisplay = (v: string): string => {
  if (!v) return "";
  const num = Number(v);
  if (!isFinite(num)) return v;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// =====================
// Animação de número
// =====================
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

// =====================
// Tooltip
// =====================
const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs whitespace-nowrap font-normal opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
      {text}
    </div>
  </div>
);

export default function PricingCalculatorModern() {
  const {
    composicao,
    setComposicao,
    acrescimos,
    setAcrescimos,
    custoTotal,
    statusAcrescimo, // mantido
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

  // =====================
  // Sugestões Supabase
  // =====================
  const [sugestoes, setSugestoes] = useState<{ codigo: string; custo: number }[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const listaRef = useRef<HTMLDivElement>(null);

  // Refs para navegação por teclado
  const inputRefs = useRef<HTMLInputElement[][]>([]); // composicao[row][col]
  const calcLojaRefs = useRef<HTMLInputElement[]>([]); // 6 campos
  const calcMktRefs = useRef<HTMLInputElement[]>([]);  // 6 campos
  const acrescimosRefs = useRef<HTMLInputElement[]>([]); // 3 campos

  // Controle de foco para formatação pt-BR: enquanto editando, mostramos o que o usuário digitou;
  // ao sair (blur), aplicamos toDisplay; ao voltar ao foco, re-normalizamos.
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const setEditing = (key: string, editing: boolean) => {
    setEditingFields((prev) => {
      const s = new Set(prev);
      if (editing) s.add(key);
      else s.delete(key);
      return s;
    });
  };
  const isEditing = (key: string) => editingFields.has(key);

  // Fecha sugestões ao clicar fora; se houver sugestões abertas, Tab/click fora confirma a 1ª
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;
      const listaEl = listaRef.current;
      const inputEl = inputRefs.current[campoAtivo]?.[0];
      const target = e.target as Node;
      const clickDentroLista = !!(listaEl && listaEl.contains(target));
      const clickNoInputAtivo = !!(inputEl && inputEl.contains(target));
      if (!clickDentroLista && !clickNoInputAtivo) {
        if (sugestoes.length > 0) {
          // confirma a primeira
          const s = sugestoes[0];
          confirmarSugestaoPrimeira(campoAtivo, s.codigo, s.custo);
        }
        setSugestoes([]);
        setCampoAtivo(null);
        setIndiceSelecionado(-1);
        inputEl?.blur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [campoAtivo, sugestoes]);

  // rolagem automática do item selecionado
  useEffect(() => {
    if (listaRef.current && indiceSelecionado >= 0) {
      const el = listaRef.current.children[indiceSelecionado] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [indiceSelecionado]);

  // Busca Supabase (sem autopreencher). Preenche apenas quando aceitar.
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
    setIndiceSelecionado(0); // deixa a 1ª destacada por padrão
  };

  const confirmarSugestaoPrimeira = (idx: number, codigo: string, custo: number) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    novo[idx].custo = (Number(custo) || 0).toFixed(2);
    setComposicao(novo);
  };

  // Seleção manual (clique ou Enter na selecionada)
  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    confirmarSugestaoPrimeira(idx, codigo, custo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);
    setTimeout(() => {
      inputRefs.current[idx]?.[0]?.focus();
    }, 50);
  };

  // Teclas dentro do campo de código (quando lista aberta)
  const handleSugestoesKeys = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (!sugestoes.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((prev) => (prev < sugestoes.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((prev) => (prev > 0 ? prev - 1 : sugestoes.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const i = indiceSelecionado >= 0 ? indiceSelecionado : 0;
      const s = sugestoes[i];
      selecionarSugestao(s.codigo, s.custo, idx);
    } else if (e.key === "Tab") {
      // confirma a primeira ao tab
      const s = sugestoes[0];
      confirmarSugestaoPrimeira(idx, s.codigo, s.custo);
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // fecha sem preencher
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    }
  };

  // Navegação entre inputs da composição (quando lista fechada)
  const handleGridNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => {
    if (sugestoes.length && campoAtivo === row) return; // se a lista está aberta nesse row, não roubar setas/tab
    const totalRows = composicao.length;
    const goNext = () => {
      const nextRow = row + 1 < totalRows ? row + 1 : 0;
      inputRefs.current[nextRow]?.[col]?.focus();
    };
    const goPrev = () => {
      const prevRow = row - 1 >= 0 ? row - 1 : totalRows - 1;
      inputRefs.current[prevRow]?.[col]?.focus();
    };

    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // deixa o navegador decidir o próximo elemento naturalmente (ordem visual),
      // mas evita conflito com lista
      // aqui não previnimos o default
    } else if (e.key === "Tab" && e.shiftKey) {
      // idem para shift+tab
    }
  };

  // Navegação linear nos blocos de cálculo e acréscimos
  const handleLinearNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => {
    const next = () => refs.current[(index + 1) % total]?.focus();
    const prev = () => refs.current[(index - 1 + total) % total]?.focus();

    if (e.key === "ArrowDown" || e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      prev();
    }
  };

  // =====================
  // Cálculos originais (intactos)
  // =====================
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

  // =====================
  // Limpar (com limite de 5 cliques)
  // =====================
  const [isClearing, setIsClearing] = useState(false);
  const [clicks, setClicks] = useState(0);

  const handleClearAll = () => {
    setClicks((prev) => {
      const newCount = prev + 1;

      if (newCount < 5) {
        setIsClearing(true);
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
        setTimeout(() => setIsClearing(false), 300);
      } else {
        setIsClearing(true);
        console.warn("Botão de limpar bloqueado após 5 cliques.");
      }

      return newCount;
    });
  };

  useEffect(() => {
    if (clicks === 0) return;
    const timer = setTimeout(() => setClicks(0), 5000);
    return () => clearTimeout(timer);
  }, [clicks]);

  // =====================
  // Download XLSX com estilo e nome custom
  // =====================
  const handleDownload = () => {
    const now = new Date();
    const dataFormatada = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const horaFormatada = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}h${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}m`;
    const fileName = `PRECIFICACAO_${dataFormatada}_${horaFormatada}.xlsx`;

    // ABA 1: Composição
    const composicaoRows: (string | number)[][] = [
      ["Composição de Custos"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Código", "Quantidade", "Custo (R$)"],
      ...composicao.map((i) => [
        i.codigo || "",
        i.quantidade || "",
        i.custo || "",
      ]),
    ];
    const composicaoSheet = XLSX.utils.aoa_to_sheet(composicaoRows);

    // ABA 2: Resumo
    const resumoRows: (string | number)[][] = [
      ["Resumo de Precificação"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Custo Total (R$)", custoTotal],
      ["Preço Loja (R$)", precoLoja],
      ["Preço Marketplace (R$)", precoMarketplace],
      [],
      ["Regras Loja"],
      ...Object.entries(calculoLoja),
      [],
      ["Regras Marketplace"],
      ...Object.entries(calculoMarketplace),
    ];
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);

    // Estilo de cabeçalho
    const headerStyle = {
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: { rgb: "1A8CEB" },
      },
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 11,
      },
      border: {
        top: { style: "thin", color: { rgb: "FFFFFF" } },
        bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    } as const;

    const applyHeaderStyle = (sheet: any, headerRow: number, cols: number) => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      for (let i = 0; i < cols; i++) {
        const cellRef = `${letters[i]}${headerRow}`;
        if (sheet[cellRef]) sheet[cellRef].s = headerStyle;
      }
    };

    // aplica cabeçalhos
    applyHeaderStyle(composicaoSheet, 4, 3); // linha 4 = "Código ...", 3 cols
    applyHeaderStyle(resumoSheet, 1, 1);     // título
    // larguras
    composicaoSheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
    resumoSheet["!cols"] = [{ wch: 28 }, { wch: 22 }];

    // cria e baixa
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, composicaoSheet, "Composição");
    XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  // =====================
  // Render
  // =====================
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
                    ref={(el) => {
                      if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                      inputRefs.current[idx][0] = el!;
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
                    onBlur={() => {
                      // blur confirma a primeira se houver lista aberta
                      if (campoAtivo === idx && sugestoes.length > 0) {
                        const s = sugestoes[0];
                        confirmarSugestaoPrimeira(idx, s.codigo, s.custo);
                        setSugestoes([]);
                        setCampoAtivo(null);
                        setIndiceSelecionado(-1);
                      }
                    }}
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
                    ref={(el) => {
                      if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                      inputRefs.current[idx][1] = el!;
                    }}
                    type="text"
                    placeholder="1"
                    value={isEditing(`q-${idx}`) ? item.quantidade : toDisplay(item.quantidade)}
                    onFocus={() => setEditing(`q-${idx}`, true)}
                    onBlur={(e) => {
                      setEditing(`q-${idx}`, false);
                      // normaliza internamente
                      const novo = [...composicao];
                      novo[idx].quantidade = toInternal(e.target.value);
                      setComposicao(novo);
                    }}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].quantidade = toInternal(e.target.value);
                      setComposicao(novo);
                    }}
                    onKeyDown={(e) => handleGridNav(e, idx, 1)}
                    className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
                  />
                </div>

                {/* Custo */}
                <div>
                  <Label className="text-neutral-400 text-[10px] block mb-1">
                    Custo (R$)
                  </Label>
                  <Input
                    ref={(el) => {
                      if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                      inputRefs.current[idx][2] = el!;
                    }}
                    type="text"
                    placeholder="100"
                    value={isEditing(`c-${idx}`) ? item.custo : toDisplay(item.custo)}
                    onFocus={() => setEditing(`c-${idx}`, true)}
                    onBlur={(e) => {
                      setEditing(`c-${idx}`, false);
                      const novo = [...composicao];
                      novo[idx].custo = toInternal(e.target.value);
                      setComposicao(novo);
                    }}
                    onChange={(e) => {
                      const novo = [...composicao];
                      novo[idx].custo = toInternal(e.target.value);
                      setComposicao(novo);
                    }}
                    onKeyDown={(e) => handleGridNav(e, idx, 2)}
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
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDownload}
                  title="Baixar planilha Excel"
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <Download className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9, rotate: -15 }}
                  onClick={handleClearAll}
                  disabled={isClearing && clicks >= 5}
                  title={
                    clicks >= 5
                      ? "Botão bloqueado temporariamente após muitos cliques"
                      : "Limpar todos os dados"
                  }
                  className={`p-2 rounded-full transition-all ${
                    isClearing
                      ? "bg-red-500/20 text-red-300 cursor-not-allowed"
                      : "hover:bg-red-500/10 text-red-400 hover:text-red-500"
                  }`}
                >
                  <Trash2
                    className={`w-4 h-4 transition-transform ${
                      isClearing ? "animate-pulse" : ""
                    }`}
                  />
                </motion.button>
              </div>
            </div>

            {/* CAMPOS (Loja e Marketplace) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {[
                {
                  nome: "Preço Loja",
                  state: calculoLoja,
                  set: setCalculoLoja,
                  preco: precoLoja,
                  refs: calcLojaRefs,
                },
                {
                  nome: "Preço Marketplace",
                  state: calculoMarketplace,
                  set: setCalculoMarketplace,
                  preco: precoMarketplace,
                  refs: calcMktRefs,
                },
              ].map((bloco, blocoIndex) => (
                <div
                  key={blocoIndex}
                  className="p-2 rounded-lg bg-black/30 border border-white/10 flex flex-col justify-center items-center"
                >
                  <h4 className="text-white font-semibold text-xs mb-1">
                    {bloco.nome}
                  </h4>
                  {["desconto","frete","imposto","comissao","margem","marketing"].map((key, i) => (
                    <div key={key} className="mb-1 w-full">
                      <Label className="text-neutral-400 text-[10px] block">
                        {key === "margem"
                          ? "Margem de Lucro (%)"
                          : key === "frete"
                          ? "Frete (R$)"
                          : key.charAt(0).toUpperCase() + key.slice(1) + " (%)"}
                      </Label>
                      <Input
                        ref={(el) => (bloco.refs.current[i] = el!)}
                        type="text"
                        value={
                          isEditing(`${blocoIndex}-${key}`)
                            ? (bloco.state as any)[key]
                            : toDisplay((bloco.state as any)[key])
                        }
                        onFocus={() => setEditing(`${blocoIndex}-${key}`, true)}
                        onBlur={(e) => {
                          setEditing(`${blocoIndex}-${key}`, false);
                          bloco.set({
                            ...bloco.state,
                            [key]: toInternal(e.target.value),
                          });
                        }}
                        onChange={(e) =>
                          bloco.set({
                            ...bloco.state,
                            [key]: toInternal(e.target.value),
                          })
                        }
                        onKeyDown={(e) => handleLinearNav(e, i, bloco.refs, 6)}
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
                    ref={(el) => (acrescimosRefs.current[0] = el!)}
                    type="text"
                    value={
                      isEditing("a-precoTray")
                        ? acrescimos.precoTray
                        : toDisplay(acrescimos.precoTray)
                    }
                    onFocus={() => setEditing("a-precoTray", true)}
                    onBlur={(e) => {
                      setEditing("a-precoTray", false);
                      setAcrescimos({
                        ...acrescimos,
                        precoTray: toInternal(e.target.value),
                      });
                    }}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        precoTray: toInternal(e.target.value),
                      })
                    }
                    onKeyDown={(e) => handleLinearNav(e, 0, acrescimosRefs, 3)}
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">
                    Preço Marketplace (R$)
                  </Label>
                  <Input
                    ref={(el) => (acrescimosRefs.current[1] = el!)}
                    type="text"
                    value={
                      isEditing("a-precoML")
                        ? acrescimos.precoMercadoLivre
                        : toDisplay(acrescimos.precoMercadoLivre)
                    }
                    onFocus={() => setEditing("a-precoML", true)}
                    onBlur={(e) => {
                      setEditing("a-precoML", false);
                      setAcrescimos({
                        ...acrescimos,
                        precoMercadoLivre: toInternal(e.target.value),
                      });
                    }}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        precoMercadoLivre: toInternal(e.target.value),
                      })
                    }
                    onKeyDown={(e) => handleLinearNav(e, 1, acrescimosRefs, 3)}
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>
                <div>
                  <Label className="text-neutral-400 text-[10px] mb-1 block">
                    Frete (R$)
                  </Label>
                  <Input
                    ref={(el) => (acrescimosRefs.current[2] = el!)}
                    type="text"
                    value={
                      isEditing("a-frete")
                        ? acrescimos.freteMercadoLivre
                        : toDisplay(acrescimos.freteMercadoLivre)
                    }
                    onFocus={() => setEditing("a-frete", true)}
                    onBlur={(e) => {
                      setEditing("a-frete", false);
                      setAcrescimos({
                        ...acrescimos,
                        freteMercadoLivre: toInternal(e.target.value),
                      });
                    }}
                    onChange={(e) =>
                      setAcrescimos({
                        ...acrescimos,
                        freteMercadoLivre: toInternal(e.target.value),
                      })
                    }
                    onKeyDown={(e) => handleLinearNav(e, 2, acrescimosRefs, 3)}
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                  />
                </div>

                {/* ACRÉSCIMO (mesmo layout) */}
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
                  {/* statusAcrescimo mantido, sem exibir */}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
