"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ComposicaoCustos, {
  Item,
} from "@/components/decomposition/CompositionCosts";
import PrecoVenda from "@/components/decomposition/PriceSale";
import Resultados, { ResultadoView } from "@/components/decomposition/Results";

/* ===== Helpers de formatação BR ===== */
export const formatBR = (num: number) =>
  Number.isFinite(num)
    ? num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

export const parseBR = (val: string): number => {
  if (!val) return 0;
  let s = val.toString().trim();
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export default function Decomposition() {
  /* ===== Estado principal ===== */
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [composicao, setComposicao] = useState<Item[]>([
    { codigo: "", quantidade: "", custo: "" }, // 1 linha inicial
  ]);

  /* ===== Sugestões (Supabase) ===== */
  const [sugestoes, setSugestoes] = useState<{ codigo: string; custo: number }[]>(
    []
  );
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);

  /* ===== Refs para navegação ===== */
  const listaRef = useRef<HTMLDivElement>(null);
  const codeRefs = useRef<HTMLInputElement[]>([]);
  const qtyRefs = useRef<HTMLInputElement[]>([]);
  const costRefs = useRef<HTMLInputElement[]>([]);

  // ✅ FIX: evita resposta velha sobrescrever a nova (corrida de requisições)
  const reqIdRef = useRef(0);

  /* ===== Cálculo proporcional ===== */
  const custoTotalGeral = useMemo(() => {
    return composicao.reduce((acc, item) => {
      const q = parseBR(item.quantidade);
      const c = parseBR(item.custo);
      return acc + q * c;
    }, 0);
  }, [composicao]);

  const resultadosCalc = useMemo(() => {
    const pv = parseBR(precoVenda);
    return composicao.map((item) => {
      const q = parseBR(item.quantidade);
      const c = parseBR(item.custo);
      if (!item.codigo || custoTotalGeral === 0) {
        return { unit: 0, total: 0, hasCost: c > 0 };
      }
      const custoItem = q * c;
      const part = custoItem / custoTotalGeral;
      const total = pv * part;
      const unit = q > 0 ? total / q : 0;
      return { unit, total, hasCost: c > 0 };
    });
  }, [composicao, custoTotalGeral, precoVenda]);

  /* ===== Supabase: buscar sugestões ===== */
  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();

    // id desta busca
    const myReqId = ++reqIdRef.current;

    if (!raw) {
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
      return;
    }

    const { data, error } = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${raw}%`)
      .limit(5);

    // ✅ se chegou outra busca depois dessa, ignora este resultado
    if (myReqId !== reqIdRef.current) return;

    if (error) {
      console.error("Erro Supabase:", error);
      return;
    }

    setCampoAtivo(idx);
    setSugestoes(
      data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
      })) || []
    );

    // ✅ UX: deixa o primeiro selecionado
    setIndiceSelecionado((data?.length ?? 0) > 0 ? 0 : -1);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    const novo = [...composicao];
    novo[idx].codigo = codigo;
    // custo já formatado visualmente
    novo[idx].custo = formatBR(custo);
    setComposicao(novo);

    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);

    // vai para quantidade
    setTimeout(() => qtyRefs.current[idx]?.focus(), 0);
  };

  const autoSelecionarPrimeiro = async (idx: number) => {
    const termo = composicao[idx]?.codigo?.trim();
    if (!termo) return;

    // ✅ usa as sugestões já abertas do mesmo campo
    if (campoAtivo === idx && sugestoes.length > 0) {
      const s = sugestoes[0];
      selecionarSugestao(s.codigo, s.custo, idx);
      return;
    }

    const { data } = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${termo}%`)
      .limit(1);

    if (data && data.length > 0) {
      const s = {
        codigo: data[0]["Código"],
        custo: Number(data[0]["Custo Atual"]) || 0,
      };
      selecionarSugestao(s.codigo, s.custo, idx);
    }
  };

  /* ===== Fechar sugestões ao clicar fora ===== */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;

      const listaEl = listaRef.current;
      const inputEl = codeRefs.current[campoAtivo];
      const target = e.target as Node;

      // se clicou na lista OU no input ativo, não fecha
      if (listaEl?.contains(target) || inputEl?.contains(target)) return;

      autoSelecionarPrimeiro(campoAtivo);
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [campoAtivo, sugestoes, composicao]);

  /* ===== Navegação ===== */
  const moveVertical = (
    refs: React.MutableRefObject<HTMLInputElement[]>,
    idx: number,
    dir: "up" | "down"
  ) => {
    const next = dir === "down" ? idx + 1 : idx - 1;
    if (next >= 0 && refs.current[next]) refs.current[next].focus();
  };

  const moveHorizontal = (
    idx: number,
    dir: "left" | "right",
    current: "code" | "qty" | "cost"
  ) => {
    if (dir === "right") {
      if (current === "code") qtyRefs.current[idx]?.focus();
      else if (current === "qty") costRefs.current[idx]?.focus();
      else if (current === "cost") codeRefs.current[idx + 1]?.focus();
    } else {
      if (current === "cost") qtyRefs.current[idx]?.focus();
      else if (current === "qty") codeRefs.current[idx]?.focus();
      else if (current === "code" && costRefs.current[idx - 1])
        costRefs.current[idx - 1].focus();
    }
  };

  const handleKeyDownCodigo = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (sugestoes.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceSelecionado((p) =>
          e.key === "ArrowDown"
            ? (p + 1) % sugestoes.length
            : (p - 1 + sugestoes.length) % sugestoes.length
        );
        return;
      }
      if (e.key === "Enter" && indiceSelecionado >= 0) {
        e.preventDefault();
        const s = sugestoes[indiceSelecionado];
        selecionarSugestao(s.codigo, s.custo, idx);
        return;
      }
    }

    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      autoSelecionarPrimeiro(idx).then(() => qtyRefs.current[idx]?.focus());
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveVertical(codeRefs, idx, "down");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveVertical(codeRefs, idx, "up");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveHorizontal(idx, "right", "code");
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveHorizontal(idx, "left", "code");
      return;
    }
  };

  const handleKeyDownQuantidade = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      costRefs.current[idx]?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveVertical(qtyRefs, idx, e.key === "ArrowDown" ? "down" : "up");
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveHorizontal(idx, e.key === "ArrowRight" ? "right" : "left", "qty");
      return;
    }
  };

  const handleKeyDownCusto = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();

      // Se for a última linha e inserir custo, cria nova linha (novo bloco de resultados)
      const isLast = idx === composicao.length - 1;
      const temCusto = parseBR(composicao[idx].custo) > 0;
      const temCodigo = composicao[idx].codigo.trim().length > 0;

      if (isLast && (temCusto || temCodigo)) {
        setComposicao((prev) => [
          ...prev,
          { codigo: "", quantidade: "", custo: "" },
        ]);
        setTimeout(() => codeRefs.current[idx + 1]?.focus(), 0);
      } else {
        codeRefs.current[idx + 1]?.focus();
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveVertical(costRefs, idx, e.key === "ArrowDown" ? "down" : "up");
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveHorizontal(idx, e.key === "ArrowRight" ? "right" : "left", "cost");
      return;
    }
  };

  /* ===== Formatação BR no blur ===== */
  const onBlurQuantidade = (idx: number) => {
    const n = parseBR(composicao[idx].quantidade);
    const novo = [...composicao];
    novo[idx].quantidade = n ? formatBR(n) : "";
    setComposicao(novo);
  };

  const onBlurCusto = (idx: number) => {
    const n = parseBR(composicao[idx].custo);
    const novo = [...composicao];
    novo[idx].custo = n ? formatBR(n) : "";
    setComposicao(novo);

    // Se for última linha e inseriu custo, cria nova linha automaticamente
    if (
      idx === composicao.length - 1 &&
      n > 0 &&
      composicao[idx].codigo.trim()
    ) {
      setComposicao((prev) => [...prev, { codigo: "", quantidade: "", custo: "" }]);
    }
  };

  const onBlurPrecoVenda = () => {
    const v = parseBR(precoVenda);
    setPrecoVenda(v ? formatBR(v) : "");
  };

  /* ===== Ações gerais ===== */
  const adicionarItem = () =>
    setComposicao((prev) => [...prev, { codigo: "", quantidade: "", custo: "" }]);

  const removerTodasLinhas = () => {
    // Mantém o preço de venda
    setComposicao([{ codigo: "", quantidade: "", custo: "" }]);
  };

  /* ===== Views de resultado (com formatação pronta) ===== */
  const resultadosView: ResultadoView[] = composicao
    .filter((i) => i.codigo.trim())
    .map((item, idx) => {
      const r = resultadosCalc[idx] || { unit: 0, total: 0, hasCost: false };
      return {
        codigo: item.codigo,
        unitFmt: r.unit ? formatBR(r.unit) : "",
        totalFmt: r.total ? formatBR(r.total) : "",
        hasCost: r.hasCost,
      };
    });

  /* ===== Scroll condicional em resultados ===== */
  const enableResultsScroll = resultadosView.length > 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-4 md:p-8 pt-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <ComposicaoCustos
          composicao={composicao}
          setComposicao={setComposicao}
          codeRefs={codeRefs}
          qtyRefs={qtyRefs}
          costRefs={costRefs}
          listaRef={listaRef}
          campoAtivo={campoAtivo}
          setCampoAtivo={setCampoAtivo}
          indiceSelecionado={indiceSelecionado}
          setIndiceSelecionado={setIndiceSelecionado}
          sugestoes={sugestoes}
          buscarSugestoes={buscarSugestoes}
          selecionarSugestao={selecionarSugestao}
          autoSelecionarPrimeiro={autoSelecionarPrimeiro}
          handleKeyDownCodigo={handleKeyDownCodigo}
          handleKeyDownQuantidade={handleKeyDownQuantidade}
          handleKeyDownCusto={handleKeyDownCusto}
          onBlurQuantidade={onBlurQuantidade}
          onBlurCusto={onBlurCusto}
          adicionarItem={adicionarItem}
        />

        <div className="lg:col-span-5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg">
          <PrecoVenda
            precoVenda={precoVenda}
            setPrecoVenda={setPrecoVenda}
            onBlurPrecoVenda={onBlurPrecoVenda}
            composicao={composicao}
            setComposicao={setComposicao}
            resultados={resultadosView}
            setResultados={() => {}}
          />

          <Resultados
            resultados={resultadosView}
            composicao={composicao}
            precoVenda={precoVenda}
            enableScroll={enableResultsScroll}
            onDownloadExcel={(wbName) => {
              // noop aqui; implementado dentro do componente com XLSX
              return;
            }}
            limparTudo={removerTodasLinhas}
          />
        </div>
      </div>
    </div>
  );
}
