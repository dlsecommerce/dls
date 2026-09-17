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
  marca?: string; // ✅ NOVO
  packingCost?: number; // ✅ NOVO
};

type SugestaoComposicao = {
  codigo: string;
  custo: number;
  produto?: string;
  marca?: string; // ✅ NOVO
  packingCost?: number; // ✅ NOVO
};

type TipoBuscaProduto = "codigo" | "descricao";

// ✅ Colunas padronizadas para newsystem.costs
const SELECT_COLS = "code, current_cost, product, packing_cost, mark";

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

// ✅ Mapeia resultado do newsystem.costs para o formato SugestaoProduto/Composicao
const mapCostsResultado = (data: any[] | null) =>
  data?.map((item) => ({
    codigo: item.code,
    custo: Number(item.current_cost) || 0,
    produto: item.product || "",
    marca: item.mark || "",
    packingCost: Number(item.packing_cost) || 0,
  })) || [];

export default function Decomposition() {
  /* ===== Estado principal ===== */
  const [precoVenda, setPrecoVenda] = useState<string>("");

  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [produtoDescricao, setProdutoDescricao] = useState("");
  const [produtoMarca, setProdutoMarca] = useState(""); // ✅ NOVO

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
  const [sugestoes, setSugestoes] = useState<SugestaoComposicao[]>([]);

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
      !String((item as any)?.descricao || "").trim() &&
      !String((item as any)?.produto || "").trim()
    );
  };

  // ✅ Resolve a marca ativa a partir do primeiro item preenchido da composição
  const resolveMarcaAtiva = (lista: Item[]): string => {
    const item = lista.find((i: any) => String(i?.marca || "").trim());
    return (item as any)?.marca || "";
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

  /* ===== Busca de sugestão do Produto (newsystem.costs) ===== */
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

    const coluna = tipo === "codigo" ? "code" : "product";

    const exact = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .eq(coluna, raw)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    if (exact.data && exact.data.length > 0) {
      const lista = mapCostsResultado(exact.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);
      return;
    }

    const starts = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike(coluna, `${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    if (starts.data && starts.data.length > 0) {
      const lista = mapCostsResultado(starts.data);

      setSugestoesProduto(lista);
      setProdutoSugestaoAtiva(true);
      setIndiceProdutoSelecionado(0);
      return;
    }

    const partial = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike(coluna, `%${raw}%`)
      .limit(8);

    if (ultimaBuscaProdutoRef.current !== buscaAtual) return;

    const lista = mapCostsResultado(partial.data);

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

  // ✅ Agora recebe também marca/packingCost e grava em `composicao`.
  // Os campos extras usam cast seguro (as Item) — se `CompositionCosts.tsx`
  // ainda não conhece `marca`/`embalagem`, eles ficam guardados no objeto
  // mas não afetam a UI existente (comportamento aditivo, sem quebra).
  const adicionarProdutoNaComposicao = (
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string,
    packingCost?: number
  ) => {
    setComposicao((prev) => {
      const novoItem = {
        codigo,
        quantidade: "1,00",
        custo: formatBR(Number(custo) || 0),
        produto: produto || "",
        descricao: produto || "",
        marca: marca || "",
        embalagem: formatBR(Number(packingCost) || 0),
      } as Item;

      const indexVazio = prev.findIndex(isLinhaVazia);

      let novo: Item[];

      if (indexVazio >= 0) {
        novo = [...prev];

        novo[indexVazio] = {
          ...novo[indexVazio],
          ...novoItem,
        };
      } else {
        novo = [...prev, novoItem];
      }

      setProdutoMarca(resolveMarcaAtiva(novo));

      return novo;
    });
  };

  const selecionarProdutoSugestao = (
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string,
    packingCost?: number
  ) => {
    adicionarProdutoNaComposicao(codigo, custo, produto, marca, packingCost);
    limparProdutoBusca();
  };

  const adicionarProdutoManualNaComposicao = () => {
    const codigo = produtoCodigo.trim();
    const descricao = produtoDescricao.trim();

    if (!codigo && !descricao) return;

    setComposicao((prev) => {
      const novoItem = {
        codigo: codigo || "Produto sem código",
        quantidade: "1,00",
        custo: "0,00",
        produto: descricao,
        descricao,
        marca: "",
        embalagem: "0,00",
      } as Item;

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
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto,
          item.marca,
          item.packingCost
        );
      }
    } else if (e.key === "Tab") {
      e.preventDefault();

      const index =
        indiceProdutoSelecionado >= 0 ? indiceProdutoSelecionado : 0;
      const item = sugestoesProduto[index];

      if (item) {
        selecionarProdutoSugestao(
          item.codigo,
          item.custo,
          item.produto,
          item.marca,
          item.packingCost
        );
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

  /* ===== Supabase: buscar sugestões da composição (newsystem.costs) ===== */
  const buscarSugestoes = async (termo: string, idx: number) => {
    const raw = termo.trim();

    const myReqId = ++reqIdRef.current;

    if (!raw) {
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
      return;
    }

    const exact = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .eq("code", raw)
      .limit(5);

    if (myReqId !== reqIdRef.current) return;

    if (exact.data && exact.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(mapCostsResultado(exact.data));
      setIndiceSelecionado(0);
      return;
    }

    const starts = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike("code", `${raw}%`)
      .limit(5);

    if (myReqId !== reqIdRef.current) return;

    if (starts.data && starts.data.length > 0) {
      setCampoAtivo(idx);
      setSugestoes(mapCostsResultado(starts.data));
      setIndiceSelecionado(0);
      return;
    }

    const partial = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike("code", `%${raw}%`)
      .limit(5);

    if (myReqId !== reqIdRef.current) return;

    const lista = mapCostsResultado(partial.data);

    setCampoAtivo(idx);
    setSugestoes(lista);
    setIndiceSelecionado(lista.length > 0 ? 0 : -1);
  };

  // ✅ Agora grava marca/embalagem também ao selecionar item da composição
  const selecionarSugestao = (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string,
    marca?: string,
    packingCost?: number
  ) => {
    const novo = [...composicao];

    novo[idx] = {
      ...novo[idx],
      codigo,
      custo: formatBR(custo),
      produto: produto || (novo[idx] as any)?.produto || "",
      marca: marca || "",
      embalagem: formatBR(Number(packingCost) || 0),
    } as Item;

    setComposicao(novo);
    setProdutoMarca(resolveMarcaAtiva(novo));

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

      selecionarSugestao(s.codigo, s.custo, idx, s.produto, s.marca, s.packingCost);
      return;
    }

    const { data } = await supabase
      .schema("newsystem")
      .from("costs")
      .select(SELECT_COLS)
      .ilike("code", `%${termo}%`)
      .limit(1);

    if (data && data.length > 0) {
      const [s] = mapCostsResultado(data);

      selecionarSugestao(s.codigo, s.custo, idx, s.produto, s.marca, s.packingCost);
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

        selecionarSugestao(
          s.codigo,
          s.custo,
          idx,
          s.produto,
          s.marca,
          s.packingCost
        );
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
