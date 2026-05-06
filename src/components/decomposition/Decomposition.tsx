"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ComposicaoCustos, {
  Item,
} from "@/components/decomposition/CompositionCosts";
import PrecoVenda from "@/components/decomposition/PriceSale";
import Resultados, {
  type ResultadoView,
} from "@/components/decomposition/Results";
import { DecompositionProductSection } from "@/components/decomposition/DecompositionProductSection";

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

type SugestaoProduto = {
  codigo: string;
  custo: number;
  produto?: string;
};

type TipoBuscaProduto = "codigo" | "descricao";

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => clearTimeout(timer);

  return debounced as T & { cancel: () => void };
}

const linhaVazia = (): Item => ({
  codigo: "",
  quantidade: "",
  custo: "",
});

export default function Decomposition() {
  /* ===== Estado principal ===== */
  const [precoVenda, setPrecoVenda] = useState<string>("");

  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [produtoDescricao, setProdutoDescricao] = useState("");

  const [composicao, setComposicao] = useState<Item[]>([linhaVazia()]);

  /* ===== Sugestões do produto ===== */
  const [sugestoesProduto, setSugestoesProduto] = useState<SugestaoProduto[]>(
    []
  );

  const [produtoSugestaoAtiva, setProdutoSugestaoAtiva] = useState(false);
  const [indiceProdutoSelecionado, setIndiceProdutoSelecionado] =
    useState(-1);

  const listaProdutoRef = useRef<HTMLDivElement>(null);
  const ultimaBuscaProdutoRef = useRef("");

  /* ===== Sugestões Supabase da composição ===== */
  const [sugestoes, setSugestoes] = useState<
    { codigo: string; custo: number }[]
  >([]);

  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);

  /* ===== Refs para navegação ===== */
  const listaRef = useRef<HTMLDivElement>(null);
  const codeRefs = useRef<HTMLInputElement[]>([]);
  const qtyRefs = useRef<HTMLInputElement[]>([]);
  const costRefs = useRef<HTMLInputElement[]>([]);

  const reqIdRef = useRef(0);

  const isLinhaVazia = (item: Item) => {
    return (
      !String(item?.codigo || "").trim() &&
      !String(item?.quantidade || "").trim() &&
      !String(item?.custo || "").trim() &&
      !String(item?.descricao || "").trim() &&
      !String(item?.produto || "").trim()
    );
  };

  /* ===== Cálculos ===== */
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
        return {
          unit: 0,
          total: 0,
          hasCost: c > 0,
        };
      }

      const custoItem = q * c;
      const part = custoItem / custoTotalGeral;
      const total = pv * part;
      const unit = q > 0 ? total / q : 0;

      return {
        unit,
        total,
        hasCost: c > 0,
      };
    });
  }, [composicao, custoTotalGeral, precoVenda]);

  /* ===== Busca de sugestão do Produto ===== */
  const buscarSugestoesProduto = async (
    termo: string,
    tipo: TipoBuscaProduto
  ) => {
    const raw = termo.trim();
    const buscaAtual = `${tipo}:${raw}`;

    ultimaBuscaProdutoRef.current = buscaAtual;

    if (!raw) {
      setSugestoesProduto([]);
      setProdutoSugestaoAtiva(false);
      setIndiceProdutoSelecionado(-1);
      return;
    }

    const coluna = tipo === "codigo" ? "Código" : "Produto";

    const mapResultados = (data: any[] | null) =>
      data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
        produto: d["Produto"] || "",
      })) || [];

    const exact = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .eq(`"${coluna}"`, raw)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    if (exact.data && exact.data.length > 0) {
      const lista = mapResultados(exact.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);
      return;
    }

    const starts = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike(`"${coluna}"`, `${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    if (starts.data && starts.data.length > 0) {
      const lista = mapResultados(starts.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);
      return;
    }

    const partial = await supabase
      .from("custos")
      .select('"Código", "Custo Atual", "Produto"')
      .ilike(`"${coluna}"`, `%${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    const lista = mapResultados(partial.data);

    setSugestoesProduto(lista);
    setProdutoSugestaoAtiva(lista.length > 0);
    setIndiceProdutoSelecionado(lista.length > 0 ? 0 : -1);
  };

  const buscarSugestoesProdutoDebounced = useRef(
    debounce(buscarSugestoesProduto, 120)
  ).current;

  const limparProdutoBusca = () => {
    setProdutoCodigo("");
    setProdutoDescricao("");
    setSugestoesProduto([]);
    setProdutoSugestaoAtiva(false);
    setIndiceProdutoSelecionado(-1);
  };

  const adicionarProdutoNaComposicao = (
    codigo: string,
    custo: number,
    produto?: string
  ) => {
    setComposicao((prev) => {
      const novoItem: Item = {
        codigo,
        quantidade: "1,00",
        custo: formatBR(Number(custo) || 0),
        produto: produto || "",
        descricao: produto || "",
      };

      const indexVazio = prev.findIndex(isLinhaVazia);

      if (indexVazio >= 0) {
        const novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };

        return novo;
      }

      return [...prev, novoItem];
    });
  };

  const selecionarProdutoSugestao = (
    codigo: string,
    custo: number,
    produto?: string
  ) => {
    adicionarProdutoNaComposicao(codigo, custo, produto);
    limparProdutoBusca();
  };

  const adicionarProdutoManualNaComposicao = () => {
    const codigo = produtoCodigo.trim();
    const descricao = produtoDescricao.trim();

    if (!codigo && !descricao) return;

    setComposicao((prev) => {
      const novoItem: Item = {
        codigo: codigo || "Produto sem código",
        quantidade: "1,00",
        custo: "0,00",
        produto: descricao,
        descricao,
      };

      const indexVazio = prev.findIndex(isLinhaVazia);

      if (indexVazio >= 0) {
        const novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };

        return novo;
      }

      return [...prev, novoItem];
    });

    limparProdutoBusca();
  };

  const handleProdutoSugestoesKeys = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!sugestoesProduto.length || !produtoSugestaoAtiva) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setIndiceProdutoSelecionado((prev) =>
        prev < sugestoesProduto.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceProdutoSelecionado((prev) =>
        prev > 0 ? prev - 1 : sugestoesProduto.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;
      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(item.codigo, item.custo, item.produto);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;
      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(item.codigo, item.custo, item.produto);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      limparProdutoBusca();
    }
  };

  /* ===== Fechar sugestões do produto ao clicar fora ===== */
  useEffect(() => {
    const handleClickOutsideProduto = (e: MouseEvent) => {
      if (!produtoSugestaoAtiva) return;

      const listaEl = listaProdutoRef.current;
      const target = e.target as Node;

      const clickDentroLista = !!(listaEl && listaEl.contains(target));

      if (!clickDentroLista) {
        setProdutoSugestaoAtiva(false);
        setIndiceProdutoSelecionado(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideProduto);

    return () =>
      document.removeEventListener("mousedown", handleClickOutsideProduto);
  }, [produtoSugestaoAtiva]);

  /* ===== Supabase: buscar sugestões da composição ===== */
  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();

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

    setIndiceSelecionado((data?.length ?? 0) > 0 ? 0 : -1);
  };

  const selecionarSugestao = (codigo: string, custo: number, idx: number) => {
    const novo = [...composicao];

    novo[idx].codigo = codigo;
    novo[idx].custo = formatBR(custo);

    setComposicao(novo);

    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);

    setTimeout(() => qtyRefs.current[idx]?.focus(), 0);
  };

  const autoSelecionarPrimeiro = async (idx: number) => {
    const termo = composicao[idx]?.codigo?.trim();

    if (!termo) return;

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

  /* ===== Fechar sugestões da composição ao clicar fora ===== */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (campoAtivo === null) return;

      const listaEl = listaRef.current;
      const inputEl = codeRefs.current[campoAtivo];
      const target = e.target as Node;

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

    if (next >= 0 && refs.current[next]) {
      refs.current[next].focus();
    }
  };

  const moveHorizontal = (
    idx: number,
    dir: "left" | "right",
    current: "code" | "qty" | "cost"
  ) => {
    if (dir === "right") {
      if (current === "code") {
        qtyRefs.current[idx]?.focus();
      } else if (current === "qty") {
        costRefs.current[idx]?.focus();
      } else if (current === "cost") {
        codeRefs.current[idx + 1]?.focus();
      }
    } else {
      if (current === "cost") {
        qtyRefs.current[idx]?.focus();
      } else if (current === "qty") {
        codeRefs.current[idx]?.focus();
      } else if (current === "code" && costRefs.current[idx - 1]) {
        costRefs.current[idx - 1].focus();
      }
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
  };

  const onBlurPrecoVenda = () => {
    const v = parseBR(precoVenda);

    setPrecoVenda(v ? formatBR(v) : "");
  };

  /* ===== Ações gerais ===== */
  const adicionarItem = () => {
    setComposicao((prev) => [...prev, linhaVazia()]);
  };

  /* ===== Views de resultado ===== */
  const resultadosView: ResultadoView[] = composicao
    .filter((i) => i.codigo.trim())
    .map((item, idx) => {
      const r = resultadosCalc[idx] || {
        unit: 0,
        total: 0,
        hasCost: false,
      };

      return {
        codigo: item.codigo,
        unitFmt: r.unit ? formatBR(r.unit) : "",
        totalFmt: r.total ? formatBR(r.total) : "",
        hasCost: r.hasCost,
      };
    });

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#070707] via-[#0c0c0c] to-[#070707] px-4 pb-24 pt-6 sm:px-6 sm:pb-8 lg:px-8">
      <div className="mx-auto max-w-[1880px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="min-w-0">
                <DecompositionProductSection
                  codigo={produtoCodigo}
                  setCodigo={setProdutoCodigo}
                  descricao={produtoDescricao}
                  setDescricao={setProdutoDescricao}
                  sugestoesProduto={sugestoesProduto}
                  produtoSugestaoAtiva={produtoSugestaoAtiva}
                  indiceProdutoSelecionado={indiceProdutoSelecionado}
                  listaProdutoRef={listaProdutoRef}
                  buscarSugestoesProdutoDebounced={
                    buscarSugestoesProdutoDebounced
                  }
                  handleProdutoSugestoesKeys={handleProdutoSugestoesKeys}
                  selecionarProdutoSugestao={selecionarProdutoSugestao}
                  onAdicionarProduto={adicionarProdutoManualNaComposicao}
                />
              </div>

              <div className="min-w-0">
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
                  onBlurQuantidade={onBlurQuantidade}
                  onBlurCusto={onBlurCusto}
                  adicionarItem={adicionarItem}
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 self-start lg:col-span-4">
            <div className="space-y-4">
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
                enableScroll={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}