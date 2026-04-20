"use client";
import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

import { HelpTooltip } from "./parts/HelpTooltip";
import { CostComposition } from "./parts/CostComposition";
import { PriceCalculationSection } from "./parts/PriceCalculationSection";

export type Calculo = {
  desconto: string;
  imposto: string;
  margem: string;
  frete: string;
  comissao: string;
  marketing: string;
  embalagem?: string;
};

type Sugestao = { codigo: string; custo: number };

// =====================
// Helpers de número
// =====================
const toInternal = (v: string): string => {
  if (!v) return "";
  let s = v.replace(/\s+/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  s = s.replace(/[^\d.-]/g, "");
  const parts = s.split(".");
  if (parts.length > 2) {
    s = parts.shift()! + "." + parts.join("");
  }
  return s;
};

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
// Debounce genérico
// =====================
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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

  // =====================
  // Cálculos por canal
  // =====================
  const [calculoLoja, setCalculoLoja] = useState<Calculo>({
    desconto: "",
    imposto: "12",
    margem: "15",
    frete: "",
    comissao: "6",
    marketing: "3",
    embalagem: "3",
  });

  // ✅ Shopee já inicia alinhada à regra base (até 79,99)
  const [calculoShopee, setCalculoShopee] = useState<Calculo>({
    desconto: "",
    imposto: "12",
    margem: "15",
    frete: "4",
    comissao: "20",
    marketing: "3",
    embalagem: "3",
  });

  const [calculoMarketplaceClassico, setCalculoMarketplaceClassico] =
    useState<Calculo>({
      desconto: "",
      imposto: "12",
      margem: "15",
      frete: "",
      comissao: "11",
      marketing: "3",
      embalagem: "3",
    });

  const [calculoMarketplacePremium, setCalculoMarketplacePremium] =
    useState<Calculo>({
      desconto: "",
      imposto: "12",
      margem: "15",
      frete: "",
      comissao: "16",
      marketing: "3",
      embalagem: "3",
    });

  // =====================
  // FLAGS PARA EDIÇÃO MANUAL SHOPEE
  // =====================
  const [userEditedShopeeComissao, setUserEditedShopeeComissao] =
    useState(false);
  const [userEditedShopeeFrete, setUserEditedShopeeFrete] = useState(false);

  // ✅ NOVO: permitir editar também imposto/margem/marketing/embalagem na Shopee
  const [userEditedShopeeImposto, setUserEditedShopeeImposto] =
    useState(false);
  const [userEditedShopeeMargem, setUserEditedShopeeMargem] = useState(false);
  const [userEditedShopeeMarketing, setUserEditedShopeeMarketing] =
    useState(false);
  const [userEditedShopeeEmbalagem, setUserEditedShopeeEmbalagem] =
    useState(false);

  // =====================
  // ✅ OPÇÃO B: ao mudar COMPOSIÇÃO (custos), Shopee volta pro automático
  // =====================
  useEffect(() => {
    setUserEditedShopeeComissao(false);
    setUserEditedShopeeFrete(false);
    setUserEditedShopeeImposto(false);
    setUserEditedShopeeMargem(false);
    setUserEditedShopeeMarketing(false);
    setUserEditedShopeeEmbalagem(false);
  }, [composicao]);

  // =====================
  // Sugestões Supabase
  // =====================
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const listaRef = useRef<HTMLDivElement>(null);

  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const calcLojaRefs = useRef<HTMLInputElement[]>([]);
  const calcShopeeRefs = useRef<HTMLInputElement[]>([]);
  const calcMLClassicoRefs = useRef<HTMLInputElement[]>([]);
  const calcMLPremiumRefs = useRef<HTMLInputElement[]>([]);
  const acrescimosRefs = useRef<HTMLInputElement[]>([]);

  // Controle de edição
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

  // Fechar sugestões ao clicar fora
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

  // Rolagem automática
  useEffect(() => {
    if (listaRef.current && indiceSelecionado >= 0) {
      const el = listaRef.current.children[indiceSelecionado] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [indiceSelecionado]);

  // ============================================================
  // 🔥 BUSCA REFINADA (EXATO → COMEÇA COM → CONTÉM)
  // ============================================================

  // ✅ FIX: não pode ser "let" local porque reseta a cada render
  const ultimaBuscaRef = useRef("");

  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();
    ultimaBuscaRef.current = raw;

    if (!raw) {
      setSugestoes([]);
      return;
    }

    // 1 — EXATA
    const exact = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .eq('"Código"', raw)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) return;

    if (exact.data && exact.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(
        exact.data.map((d) => ({
          codigo: d["Código"],
          custo: Number(d["Custo Atual"]) || 0,
        }))
      );
      setIndiceSelecionado(0);
      return;
    }

    // 2 — COMEÇA COM
    const starts = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) return;

    if (starts.data && starts.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(
        starts.data.map((d) => ({
          codigo: d["Código"],
          custo: Number(d["Custo Atual"]) || 0,
        }))
      );
      setIndiceSelecionado(0);
      return;
    }

    // 3 — CONTÉM (fallback)
    const partial = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${raw}%`)
      .limit(5);

    if (ultimaBuscaRef.current !== raw) return;

    setCampoAtivo(idx);
    setSugestoes(
      partial.data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
      })) || []
    );
    setIndiceSelecionado(0);
  };

  const buscarSugestoesDebounced = useRef(debounce(buscarSugestoes, 120))
    .current;

  const confirmarSugestaoPrimeira = (
    idx: number,
    codigo: string,
    custo: number
  ) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    novo[idx].custo = (Number(custo) || 0).toFixed(2);
    setComposicao(novo);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    confirmarSugestaoPrimeira(idx, codigo, custo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);
    setTimeout(() => {
      inputRefs.current[idx]?.[0]?.focus();
    }, 50);
  };

  // Navegação
  const handleSugestoesKeys = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      const i = indiceSelecionado >= 0 ? indiceSelecionado : 0;
      const s = sugestoes[i];
      selecionarSugestao(s.codigo, s.custo, idx);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const i = indiceSelecionado >= 0 ? indiceSelecionado : 0;
      confirmarSugestaoPrimeira(idx, sugestoes[i].codigo, sugestoes[i].custo);
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

  const handleGridNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => {
    if (sugestoes.length && campoAtivo === row) return;
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
    }
  };

  const handleLinearNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => {
    const next = () => refs.current[(index + 1) % total]?.focus();
    const prev = () => refs.current[(index - 1 + total) % total]?.focus();

    if (
      e.key === "ArrowDown" ||
      e.key === "Enter" ||
      (e.key === "Tab" && !e.shiftKey)
    ) {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      prev();
    }
  };

  // =====================
  // SINCRONIZAÇÃO DE DESCONTO
  // =====================
  const syncDescontoFromLoja = (descontoInternal: string) => {
    setCalculoLoja((prev) => ({ ...prev, desconto: descontoInternal }));
    setCalculoShopee((prev) => ({ ...prev, desconto: descontoInternal }));
    setCalculoMarketplaceClassico((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));
    setCalculoMarketplacePremium((prev) => ({
      ...prev,
      desconto: descontoInternal,
    }));
  };

  // =====================
  // EMBALAGEM COMPARTILHADA (menos Shopee)
  // =====================
  const handleEmbalagemChangeShared = (raw: string) => {
    const v = toInternal(raw);
    setCalculoLoja((p) => ({ ...p, embalagem: v }));
    setCalculoMarketplaceClassico((p) => ({ ...p, embalagem: v }));
    setCalculoMarketplacePremium((p) => ({ ...p, embalagem: v }));
  };

  const handleEmbalagemBlurShared = (raw: string) => {
    const internal = toInternal(raw || "3");
    const v = internal || "3";
    setCalculoLoja((p) => ({ ...p, embalagem: v }));
    setCalculoMarketplaceClassico((p) => ({ ...p, embalagem: v }));
    setCalculoMarketplacePremium((p) => ({ ...p, embalagem: v }));
  };

  // ✅ Shopee: Embalagem editável + trava automático ao editar
  const handleEmbalagemChangeShopee = (raw: string) => {
    setUserEditedShopeeEmbalagem(true);
    const v = toInternal(raw);
    setCalculoShopee((p) => ({ ...p, embalagem: v }));
  };

  const handleEmbalagemBlurShopee = (raw: string) => {
    const internal = toInternal(raw || "");
    if (!internal) setUserEditedShopeeEmbalagem(false);
    const v = internal || "3";
    setCalculoShopee((p) => ({ ...p, embalagem: v }));
  };

  // =====================
  // Cálculo de preço por canal
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
    const embalagem = parseFloat(dados.embalagem || "3") || 0;

    const custoLiquido = custo * (1 - desconto);
    const divisor = 1 - (imposto + margem + comissao + marketing);
    const preco =
      divisor > 0 ? (custoLiquido + frete + embalagem) / divisor : 0;
    return isFinite(preco) ? preco : 0;
  };

  const precoLoja = calcularPreco(calculoLoja);
  const precoShopee = calcularPreco(calculoShopee);
  const precoMLClassico = calcularPreco(calculoMarketplaceClassico);
  const precoMLPremium = calcularPreco(calculoMarketplacePremium);

  // =====================
  // ✅ REGRA SHOPEE POR FAIXA DE PREÇO (AUTOMÁTICA)
  // =====================
  useEffect(() => {
    let regras = {
      embalagem: "3",
      frete: "4",
      imposto: "12",
      comissao: "20",
      margem: "15",
      marketing: "3",
    };

    if (precoShopee >= 80 && precoShopee <= 99.99) {
      regras = {
        embalagem: "3",
        frete: "16",
        imposto: "12",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    } else if (precoShopee >= 100 && precoShopee <= 199.99) {
      regras = {
        embalagem: "3",
        frete: "20",
        imposto: "12",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    } else if (precoShopee >= 200) {
      regras = {
        embalagem: "3",
        frete: "26",
        imposto: "12",
        comissao: "14",
        margem: "15",
        marketing: "3",
      };
    }

    setCalculoShopee((prev) => ({
      ...prev,
      embalagem: userEditedShopeeEmbalagem ? prev.embalagem : regras.embalagem,
      imposto: userEditedShopeeImposto ? prev.imposto : regras.imposto,
      margem: userEditedShopeeMargem ? prev.margem : regras.margem,
      marketing: userEditedShopeeMarketing ? prev.marketing : regras.marketing,
      comissao: userEditedShopeeComissao ? prev.comissao : regras.comissao,
      frete: userEditedShopeeFrete ? prev.frete : regras.frete,
    }));
  }, [
    precoShopee,
    userEditedShopeeComissao,
    userEditedShopeeFrete,
    userEditedShopeeImposto,
    userEditedShopeeMargem,
    userEditedShopeeMarketing,
    userEditedShopeeEmbalagem,
  ]);

  // =============================
  // SINCRONIZAR PREÇOS PARA A SEÇÃO DE ACRÉSCIMOS
  // =============================
  useEffect(() => {
    setAcrescimos((prev) => ({
      ...prev,
      precoLoja: precoLoja.toFixed(2),
      precoMercadoLivreClassico: precoMLClassico.toFixed(2),
      precoMercadoLivrePremium: precoMLPremium.toFixed(2),
      freteMercadoLivreClassico: calculoMarketplaceClassico.frete || "0",
      freteMercadoLivrePremium: calculoMarketplacePremium.frete || "0",
    }));
  }, [
    precoLoja,
    precoMLClassico,
    precoMLPremium,
    calculoMarketplaceClassico.frete,
    calculoMarketplacePremium.frete,
  ]);

  // =====================
  // LIMPAR TUDO
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
          imposto: "12",
          margem: "15",
          frete: "",
          comissao: "6",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoShopee({
          desconto: "",
          imposto: "12",
          margem: "15",
          frete: "4",
          comissao: "20",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoMarketplaceClassico({
          desconto: "",
          imposto: "12",
          margem: "15",
          frete: "",
          comissao: "11",
          marketing: "3",
          embalagem: "3",
        });

        setCalculoMarketplacePremium({
          desconto: "",
          imposto: "12",
          margem: "15",
          frete: "",
          comissao: "16",
          marketing: "3",
          embalagem: "3",
        });

        setAcrescimos({
          precoLoja: "",
          precoMercadoLivreClassico: "",
          precoMercadoLivrePremium: "",
          freteMercadoLivreClassico: "",
          freteMercadoLivrePremium: "",
          acrescimoClassico: 0,
          acrescimoPremium: 0,
        });

        setUserEditedShopeeComissao(false);
        setUserEditedShopeeFrete(false);
        setUserEditedShopeeImposto(false);
        setUserEditedShopeeMargem(false);
        setUserEditedShopeeMarketing(false);
        setUserEditedShopeeEmbalagem(false);

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
  // DOWNLOAD XLSX
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

    const composicaoRows: (string | number)[][] = [
      ["Composição de Custos"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Código", "Quantidade", "Custo (R$)"],
      ...composicao.map((i: any) => [
        i.codigo || "",
        i.quantidade || "",
        i.custo || "",
      ]),
    ];
    const composicaoSheet = XLSX.utils.aoa_to_sheet(composicaoRows);

    const resumoRows: (string | number)[][] = [
      ["Resumo de Precificação"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Custo Total (R$)", custoTotal],
      ["Preço Loja (R$)", precoLoja],
      ["Preço Shopee (R$)", precoShopee],
      ["Preço ML Clássico (R$)", precoMLClassico],
      ["Preço ML Premium (R$)", precoMLPremium],
      [],
      ["Regras Loja"],
      ...Object.entries(calculoLoja),
      [],
      ["Regras Shopee"],
      ...Object.entries(calculoShopee),
      [],
      ["Regras Mercado Livre Clássico"],
      ...Object.entries(calculoMarketplaceClassico),
      [],
      ["Regras Mercado Livre Premium"],
      ...Object.entries(calculoMarketplacePremium),
    ];
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);

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

    applyHeaderStyle(composicaoSheet, 4, 3);
    applyHeaderStyle(resumoSheet, 1, 1);

    composicaoSheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
    resumoSheet["!cols"] = [{ wch: 32 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, composicaoSheet, "Composição");
    XLSX.utils.book_append_sheet(wb, resumoSheet, "Resumo");

    const wbout = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  // =====================
  // RENDER
  // =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] px-2 pt-8 pb-6 sm:p-4 md:p-8 sm:pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4">
        {/* COMPOSIÇÃO */}
        <motion.div
          className={`lg:col-span-6 p-3 sm:p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg h-full relative ${
            campoAtivo !== null ? "z-[120]" : "z-0"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-3 sm:mb-2 min-w-0">
            <Layers className="w-5 h-5 text-[#1a8ceb] flex-shrink-0" />
            <h3 className="text-base font-bold text-white flex items-center gap-2 min-w-0">
              <span className="truncate">Composição</span>
              <HelpTooltip text="Composição de Custos." />
            </h3>
          </div>

          <CostComposition
            composicao={composicao}
            setComposicao={setComposicao}
            custoTotal={custoTotal}
            adicionarItem={adicionarItem}
            removerItem={removerItem}
            sugestoes={sugestoes}
            campoAtivo={campoAtivo}
            indiceSelecionado={indiceSelecionado}
            listaRef={listaRef}
            inputRefs={inputRefs}
            buscarSugestoesDebounced={buscarSugestoesDebounced}
            handleSugestoesKeys={handleSugestoesKeys}
            handleGridNav={handleGridNav}
            selecionarSugestao={selecionarSugestao}
            confirmarSugestaoPrimeira={confirmarSugestaoPrimeira}
            isEditing={isEditing}
            setEditing={setEditing}
            toDisplay={toDisplay}
            toInternal={toInternal}
          />
        </motion.div>

        {/* CÁLCULO DE PREÇO + ACRÉSCIMOS */}
        <PriceCalculationSection
          calculoLoja={calculoLoja}
          setCalculoLoja={setCalculoLoja}
          calculoShopee={calculoShopee}
          setCalculoShopee={setCalculoShopee}
          calculoMLClassico={calculoMarketplaceClassico}
          setCalculoMLClassico={setCalculoMarketplaceClassico}
          calculoMLPremium={calculoMarketplacePremium}
          setCalculoMLPremium={setCalculoMarketplacePremium}
          precoLoja={precoLoja}
          precoShopee={precoShopee}
          precoMLClassico={precoMLClassico}
          precoMLPremium={precoMLPremium}
          acrescimos={acrescimos}
          setAcrescimos={setAcrescimos}
          isEditing={isEditing}
          setEditing={setEditing}
          toDisplay={toDisplay}
          toInternal={toInternal}
          handleLinearNav={handleLinearNav}
          calcLojaRefs={calcLojaRefs}
          calcShopeeRefs={calcShopeeRefs}
          calcMLClassicoRefs={calcMLClassicoRefs}
          calcMLPremiumRefs={calcMLPremiumRefs}
          acrescimosRefs={acrescimosRefs}
          handleEmbalagemBlurShared={handleEmbalagemBlurShared}
          handleEmbalagemChangeShared={handleEmbalagemChangeShared}
          handleEmbalagemBlurShopee={handleEmbalagemBlurShopee}
          handleEmbalagemChangeShopee={handleEmbalagemChangeShopee}
          handleDownload={handleDownload}
          handleClearAll={handleClearAll}
          isClearing={isClearing}
          clicks={clicks}
          statusAcrescimo={statusAcrescimo}
          syncDescontoFromLoja={syncDescontoFromLoja}
          userEditedShopeeComissao={userEditedShopeeComissao}
          setUserEditedShopeeComissao={setUserEditedShopeeComissao}
          userEditedShopeeFrete={userEditedShopeeFrete}
          setUserEditedShopeeFrete={setUserEditedShopeeFrete}
          userEditedShopeeImposto={userEditedShopeeImposto}
          setUserEditedShopeeImposto={setUserEditedShopeeImposto}
          userEditedShopeeMargem={userEditedShopeeMargem}
          setUserEditedShopeeMargem={setUserEditedShopeeMargem}
          userEditedShopeeMarketing={userEditedShopeeMarketing}
          setUserEditedShopeeMarketing={setUserEditedShopeeMarketing}
          userEditedShopeeEmbalagem={userEditedShopeeEmbalagem}
          setUserEditedShopeeEmbalagem={setUserEditedShopeeEmbalagem}
        />
      </div>
    </div>
  );
}