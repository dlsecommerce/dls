"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, Plus, X, Loader2, AlertTriangle, DollarSign, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type ItemComposicao = {
  uid?: string;
  id?: string;
  codigo: string;
  produto?: string;
  descricao?: string;
  custo: number;
  quantidade: string;
  [key: string]: any;
};

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
  descricao?: string;
};

type CustoRow = {
  codigo: string;
  produto: string;
  descricao: string;
  custo: number;
};

type PatchItem =
  | Partial<ItemComposicao>
  | ((item: ItemComposicao) => Partial<ItemComposicao>);

const CACHE_TTL_MS = 60_000;
const EMPTY_SUGESTOES: Sugestao[] = [];
const EMPTY_LISTA: ItemComposicao[] = [];

const DefaultAnimatedNumber = ({ value }: { value: number }) => (
  <>
    {Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
  </>
);

const formatBR = (v: any) => {
  const num = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseInputMoney = (raw: string): number => {
  if (!raw || !String(raw).trim()) return NaN;
  let str = String(raw).trim().replace(/[^\d.,-]/g, "");
  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");
  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
};

const toInteger = (value: string) => String(value ?? "").replace(/[^\d]/g, "");

// Escapa curingas do ILIKE (% e _) para que o termo seja tratado literalmente
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const getRowDescription = (item: any) =>
  String(item?.produto || item?.descricao || item?.Produto || item?.nome || item?.label || "").trim();

// ---------------------------------------------------------------------------
// Normalização e busca em newsystem.costs
// ---------------------------------------------------------------------------
const normalizarCustoRow = (row: any): CustoRow => {
  const codigo = String(row?.code ?? "").trim();
  const produto = String(row?.product ?? "").trim();
  const custoRaw = row?.current_cost ?? 0;
  const custo = typeof custoRaw === "number" ? custoRaw : parseInputMoney(String(custoRaw ?? ""));
  return {
    codigo,
    produto,
    descricao: produto,
    custo: Number.isFinite(custo) ? custo : 0,
  };
};

type CacheEntry<T> = { valor: T; t: number };

const lerCache = <T,>(m: Map<string, CacheEntry<T>>, k: string): T | undefined => {
  const e = m.get(k);
  if (!e) return undefined;
  if (Date.now() - e.t > CACHE_TTL_MS) {
    m.delete(k);
    return undefined;
  }
  return e.valor;
};

const cacheCustoExato = new Map<string, CacheEntry<CustoRow | null>>();
const cacheSugestoes = new Map<string, CacheEntry<Sugestao[]>>();

const buscarCustoExatoPorCodigo = async (codigo: string): Promise<CustoRow | null> => {
  const codigoLimpo = String(codigo || "").trim();
  if (!codigoLimpo) return null;

  const emCache = lerCache(cacheCustoExato, codigoLimpo);
  if (emCache !== undefined) return emCache;

  const { data: dataExata, error: errorExata } = await supabase
    .schema("newsystem")
    .from("costs")
    .select("code, current_cost, product")
    .eq("code", codigoLimpo)
    .is("deleted_at", null)
    .limit(1);

  if (errorExata) console.error("Erro ao buscar custo exato:", errorExata);

  if (Array.isArray(dataExata) && dataExata.length > 0) {
    const resultado = normalizarCustoRow(dataExata[0]);
    cacheCustoExato.set(codigoLimpo, { valor: resultado, t: Date.now() });
    return resultado;
  }

  // Fallback case-insensitive, com curingas escapados
  const { data: dataLike, error: errorLike } = await supabase
    .schema("newsystem")
    .from("costs")
    .select("code, current_cost, product")
    .ilike("code", escapeLike(codigoLimpo))
    .is("deleted_at", null)
    .limit(1);

  if (errorLike) {
    console.error("Erro ao buscar custo por ilike:", errorLike);
    return null; // não cacheia erro
  }

  const resultado =
    Array.isArray(dataLike) && dataLike.length > 0 ? normalizarCustoRow(dataLike[0]) : null;
  cacheCustoExato.set(codigoLimpo, { valor: resultado, t: Date.now() });
  return resultado;
};

// ---------------------------------------------------------------------------
// Dropdown de sugestões
// ---------------------------------------------------------------------------
type SuggestionDropdownProps = {
  sugestoes: Sugestao[];
  buscando: boolean;
  listaRef: React.RefObject<HTMLDivElement | null>;
  indiceSelecionado: number;
  onSelect: (codigo: string, custo: number, produto?: string, descricao?: string) => void;
};

const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  sugestoes,
  buscando,
  listaRef,
  indiceSelecionado,
  onSelect,
}) => {
  if (sugestoes.length === 0 && !buscando) return null;

  return (
    <div
      ref={listaRef}
      className="absolute left-0 top-full z-[9999] mt-1 max-h-60 w-full min-w-[280px] overflow-y-auto overscroll-contain border border-neutral-800 bg-[#0a0a0a] shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
    >
      {buscando && (
        <div className="flex items-center gap-2 px-3 py-3 text-[11px] tracking-wide text-neutral-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          BUSCANDO
        </div>
      )}

      {!buscando &&
        sugestoes.map((s, i) => (
          <button
            key={`${s.codigo}-${i}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s.codigo, s.custo, s.produto, s.descricao);
            }}
            className={`flex w-full items-center justify-between gap-3 border-b border-neutral-900 px-3 py-2.5 text-left transition-colors last:border-b-0 ${
              i === indiceSelecionado ? "bg-[#1a8ceb]/[0.08]" : "hover:bg-neutral-900/60"
            }`}
          >
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="truncate text-[13px] font-medium text-[#1a8ceb]">
                {s.codigo || "Sem código"}
              </div>
              {(s.produto || s.descricao) && (
                <div className="mt-0.5 truncate text-[11px] text-neutral-500">
                  {s.produto || s.descricao}
                </div>
              )}
            </div>
            <span className="shrink-0 text-right text-[13px] font-medium text-neutral-300">
              R$ {formatBR(s.custo)}
            </span>
          </button>
        ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Linha de item de custo
// Não recebe a composição inteira: recebe só o próprio item e callbacks
// estáveis. Alterações passam por `onAtualizar`, que usa atualização funcional.
// ---------------------------------------------------------------------------
type CostItemRowProps = {
  item: ItemComposicao;
  idx: number;
  isDuplicado: boolean;
  isAtivo: boolean;
  sugestoes: Sugestao[];
  buscandoSugestoes: boolean;
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement | null>;
  inputRefs: React.MutableRefObject<HTMLInputElement[][]>;
  onAtualizar: (idx: number, patch: PatchItem) => void;
  onRemover: (idx: number) => void;
  onBuscarSugestoes: (termo: string, idx: number) => void;
  onTeclasSugestoes: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => boolean;
  onSelecionarSugestao: (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string,
    descricao?: string
  ) => void;
  onGridNav: (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => void;
};

const CostItemRowBase: React.FC<CostItemRowProps> = ({
  item,
  idx,
  isDuplicado,
  isAtivo,
  sugestoes,
  buscandoSugestoes,
  indiceSelecionado,
  listaRef,
  inputRefs,
  onAtualizar,
  onRemover,
  onBuscarSugestoes,
  onTeclasSugestoes,
  onSelecionarSugestao,
  onGridNav,
}) => {
  const [codigoLocal, setCodigoLocal] = useState(item.codigo || "");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [codigoErro, setCodigoErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // null = não está editando o custo; string = rascunho digitado
  const [custoDraft, setCustoDraft] = useState<string | null>(null);

  useEffect(() => {
    setCodigoLocal(item.codigo || "");
    setCodigoErro(null);
  }, [item.codigo]);

  const description = getRowDescription(item);
  const custoNum = Number(item.custo) || 0;
  const custoZero = custoNum === 0;

  // Confirma o código digitado: só aceita o que existe em newsystem.costs
  const confirmarCodigo = async () => {
    const novo = codigoLocal.trim();
    const atual = String(item.codigo || "").trim();

    if (novo === atual) {
      setCodigoLocal(atual);
      return;
    }

    if (!novo) {
      onAtualizar(idx, { codigo: "", produto: "", descricao: "", custo: 0 });
      return;
    }

    setBuscandoCodigo(true);
    try {
      const encontrado = await buscarCustoExatoPorCodigo(novo);

      if (!encontrado) {
        setCodigoLocal(atual);
        setCodigoErro(`Código "${novo}" não existe no cadastro de custos`);
        return;
      }

      onAtualizar(idx, {
        codigo: encontrado.codigo,
        produto: encontrado.produto,
        descricao: encontrado.descricao,
        custo: encontrado.custo,
      });
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const copiarCustoUnitario = async () => {
    try {
      await navigator.clipboard.writeText(formatBR(custoNum));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1200);
    } catch (e) {
      console.error("Erro ao copiar custo:", e);
    }
  };

  const setRef = (col: number) => (el: HTMLInputElement | null) => {
    if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
    inputRefs.current[idx][col] = el as HTMLInputElement;
  };

  return (
    <div
      className={`group relative border-b border-neutral-900 px-4 py-3 transition-colors last:border-b-0 ${
        isDuplicado ? "bg-[#1a8ceb]/[0.03]" : "hover:bg-neutral-950/60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="relative min-w-0 flex-1">
          <div className="relative flex items-center gap-1.5">
            <Input
              ref={setRef(0)}
              type="text"
              inputMode="text"
              placeholder="Código"
              value={codigoLocal}
              onChange={(e) => {
                setCodigoLocal(e.target.value);
                setCodigoErro(null);
                onBuscarSugestoes(e.target.value, idx);
              }}
              onBlur={() => void confirmarCodigo()}
              onKeyDown={(e) => {
                if (onTeclasSugestoes(e, idx)) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  void confirmarCodigo();
                  return;
                }
                onGridNav(e, idx, 0);
              }}
              className="!h-7 !rounded-none !border-0 !bg-transparent !px-0 !text-[13px] !font-semibold !text-[#1a8ceb] !shadow-none !outline-none placeholder:!text-neutral-600 placeholder:!font-medium focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none"
            />

            {buscandoCodigo && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-500" />}

            {isDuplicado && (
              <span
                title="Código duplicado na composição"
                className="flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#1a8ceb]"
              >
                <AlertTriangle className="h-3 w-3" />
                duplicado
              </span>
            )}

            {isAtivo && (
              <SuggestionDropdown
                sugestoes={sugestoes}
                buscando={buscandoSugestoes}
                listaRef={listaRef}
                indiceSelecionado={indiceSelecionado}
                onSelect={(codigo, custo, produto, descricao) =>
                  onSelecionarSugestao(codigo, custo, idx, produto, descricao)
                }
              />
            )}
          </div>

          {codigoErro && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {codigoErro}
            </p>
          )}

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
            <span className="truncate">{description || "Sem descrição"}</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="shrink-0 uppercase tracking-wide text-neutral-600">Quantidade</span>
            <Input
              ref={setRef(1)}
              type="text"
              inputMode="numeric"
              value={String(item.quantidade ?? "")}
              onChange={(e) => onAtualizar(idx, { quantidade: toInteger(e.target.value) })}
              onBlur={() =>
                onAtualizar(idx, (it) => ({
                  quantidade: (Number(it.quantidade) || 0) > 0 ? it.quantidade : "1",
                }))
              }
              onKeyDown={(e) => onGridNav(e, idx, 1)}
              className="!h-4 !w-8 !border-0 !bg-transparent !p-0 !text-[11px] !text-neutral-300 !shadow-none !outline-none focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={copiarCustoUnitario}
            title="Copiar custo unitário"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-neutral-600 transition-colors hover:text-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-[#1a8ceb]" /> : <Copy className="h-3 w-3" />}
          </button>

          <div
            className={`flex h-7 items-center border px-2 ${
              custoZero ? "border-neutral-800" : "border-[#1a8ceb]/40"
            }`}
          >
            <span
              className={`mr-1 text-[11px] font-medium ${custoZero ? "text-neutral-600" : "text-[#1a8ceb]"}`}
            >
              R$
            </span>
            <Input
              ref={setRef(2)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={custoDraft !== null ? custoDraft : formatBR(item.custo)}
              onFocus={() => setCustoDraft(custoZero ? "" : String(custoNum).replace(".", ","))}
              onBlur={() => setCustoDraft(null)}
              onChange={(e) => {
                const valor = e.target.value;
                setCustoDraft(valor);
                const n = parseInputMoney(valor);
                onAtualizar(idx, { custo: Number.isFinite(n) ? n : 0 });
              }}
              onKeyDown={(e) => onGridNav(e, idx, 2)}
              className={`!h-full !w-16 !border-0 !bg-transparent !p-0 !text-right !text-[13px] !font-semibold !shadow-none !outline-none focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none ${
                custoZero ? "!text-neutral-600" : "!text-[#1a8ceb]"
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => onRemover(idx)}
            title="Remover linha"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-neutral-600 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Sem comparador customizado: o React compara as props por igualdade rasa,
// e os callbacks são estáveis, então só a linha afetada re-renderiza.
const CostItemRow = React.memo(CostItemRowBase);

// ---------------------------------------------------------------------------
// Card de resumo
// ---------------------------------------------------------------------------
type SummaryCardProps = {
  composicaoSegura: ItemComposicao[];
  custoTotalReal: number;
  AnimatedNumber: React.ComponentType<{ value: number }>;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ composicaoSegura, custoTotalReal, AnimatedNumber }) => (
  <div className="border border-neutral-800 bg-[#0a0a0a]">
    <div className="border-b border-neutral-900 px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Detalhamento de Custos
      </h3>
    </div>

    <div className="space-y-2 border-b border-neutral-900 px-4 py-3">
      {composicaoSegura.length > 0 ? (
        composicaoSegura.map((item, i) => {
          const desc = getRowDescription(item) || `Item ${i + 1}`;
          const qtd = parseInt(String(item.quantidade ?? "1"), 10) || 0;
          const subtotal = (Number(item.custo) || 0) * qtd;

          return (
            <div key={item.uid || item.id || `resumo-${i}`} className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-[#1a8ceb]">
                  {item.codigo || `Item ${i + 1}`}
                  {qtd !== 1 && <span className="ml-1 text-neutral-600">× {qtd}</span>}
                </p>
                <p className="truncate text-[11px] text-neutral-600">{desc}</p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-neutral-400">
                R$ {formatBR(subtotal)}
              </span>
            </div>
          );
        })
      ) : (
        <p className="text-[12px] text-neutral-600">Nenhum item adicionado</p>
      )}
    </div>

    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">Custo Total</span>
        <span className="text-lg font-semibold tabular-nums text-[#1a8ceb]">
          R$ <AnimatedNumber value={custoTotalReal} />
        </span>
      </div>
    </div>

    <div className="flex gap-2 border-t border-neutral-900 px-4 py-3">
      <Info className="mt-0.5 h-3 w-3 shrink-0 text-neutral-600" />
      <p className="text-[10.5px] leading-relaxed text-neutral-600">
        Impostos e comissões podem variar conforme cada marketplace.
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Seção principal
// ---------------------------------------------------------------------------
type CompositionSectionProps = {
  composicao: ItemComposicao[];
  setComposicao: any; // setState do hook (aceita atualização funcional)
  AnimatedNumber?: React.ComponentType<{ value: number }>;
};

const CompositionSection: React.FC<CompositionSectionProps> = ({
  composicao,
  setComposicao,
  AnimatedNumber = DefaultAnimatedNumber,
}) => {
  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const listaRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaIdRef = useRef(0);

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);

  const lista: ItemComposicao[] = Array.isArray(composicao) ? composicao : EMPTY_LISTA;

  // Todas as alterações passam por atualização funcional sobre o estado atual
  const atualizarItem = useCallback(
    (idx: number, patch: PatchItem) => {
      setComposicao((prev: ItemComposicao[]) => {
        const base = Array.isArray(prev) ? prev : [];
        const atual = base[idx];
        if (!atual) return base;
        const delta = typeof patch === "function" ? patch(atual) : patch;
        const novo = [...base];
        novo[idx] = { ...atual, ...delta };
        return novo;
      });
    },
    [setComposicao]
  );

  const removerItem = useCallback(
    (idx: number) => {
      setComposicao((prev: ItemComposicao[]) =>
        Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []
      );
    },
    [setComposicao]
  );

  const adicionarItem = () => {
    setComposicao((prev: ItemComposicao[]) => [
      ...(Array.isArray(prev) ? prev : []),
      { uid: crypto.randomUUID(), codigo: "", produto: "", descricao: "", quantidade: "1", custo: 0 },
    ]);
  };

  const buscarSugestoes = useCallback((termo: string, idx: number) => {
    const termoLimpo = String(termo || "").trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!termoLimpo) {
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
      setBuscandoSugestoes(false);
      return;
    }

    setCampoAtivo(idx);

    const emCache = lerCache(cacheSugestoes, termoLimpo);
    if (emCache !== undefined) {
      setSugestoes(emCache);
      setIndiceSelecionado(emCache.length > 0 ? 0 : -1);
      setBuscandoSugestoes(false);
      return;
    }

    setBuscandoSugestoes(true);

    debounceRef.current = setTimeout(async () => {
      const buscaAtual = ++buscaIdRef.current;

      const { data, error } = await supabase
        .schema("newsystem")
        .from("costs")
        .select("code, current_cost, product")
        .ilike("code", `%${escapeLike(termoLimpo)}%`)
        .is("deleted_at", null)
        .limit(8);

      if (buscaAtual !== buscaIdRef.current) return;

      if (error) {
        console.error("Erro ao buscar custos:", error);
        setSugestoes([]);
        setIndiceSelecionado(-1);
        setBuscandoSugestoes(false);
        return;
      }

      const formatadas: Sugestao[] = (data ?? []).map((d: any) => normalizarCustoRow(d));
      cacheSugestoes.set(termoLimpo, { valor: formatadas, t: Date.now() });

      setCampoAtivo(idx);
      setSugestoes(formatadas);
      setIndiceSelecionado(formatadas.length > 0 ? 0 : -1);
      setBuscandoSugestoes(false);
    }, 250);
  }, []);

  const selecionarSugestao = useCallback(
    (codigo: string, custo: number, idx: number, produto?: string, descricao?: string) => {
      const desc = produto || descricao || "";
      atualizarItem(idx, {
        codigo,
        produto: desc,
        descricao: desc,
        custo: Number.isFinite(Number(custo)) ? Number(custo) : 0,
      });
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    },
    [atualizarItem]
  );

  const handleSugestoesKeys = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (campoAtivo !== idx || sugestoes.length === 0) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceSelecionado((p) => (p < sugestoes.length - 1 ? p + 1 : 0));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceSelecionado((p) => (p > 0 ? p - 1 : sugestoes.length - 1));
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const s = sugestoes[indiceSelecionado];
        if (s) selecionarSugestao(s.codigo, s.custo, idx, s.produto, s.descricao);
        return true;
      }
      if (e.key === "Escape") {
        setSugestoes([]);
        setCampoAtivo(null);
        setIndiceSelecionado(-1);
        return true;
      }
      return false;
    },
    [campoAtivo, sugestoes, indiceSelecionado, selecionarSugestao]
  );

  const handleGridNav = useCallback((e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const len = input.value.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      inputRefs.current[row + 1]?.[col]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      inputRefs.current[row - 1]?.[col]?.focus();
    } else if (e.key === "ArrowRight" && end === len) {
      e.preventDefault();
      inputRefs.current[row]?.[col + 1]?.focus();
    } else if (e.key === "ArrowLeft" && start === 0) {
      e.preventDefault();
      inputRefs.current[row]?.[col - 1]?.focus();
    }
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (listaRef.current?.contains(e.target as Node)) return;
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    };

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const custoTotalReal = useMemo(
    () =>
      lista.reduce((acc, item) => {
        const qtd = parseInt(String(item.quantidade ?? "1"), 10) || 0;
        return acc + (Number(item.custo) || 0) * qtd;
      }, 0),
    [lista]
  );

  const codigosDuplicados = useMemo(() => {
    const contagem = new Map<string, number>();
    lista.forEach((item) => {
      const codigo = String(item?.codigo || "").trim();
      if (!codigo) return;
      contagem.set(codigo, (contagem.get(codigo) || 0) + 1);
    });
    return new Set([...contagem.entries()].filter(([, c]) => c > 1).map(([codigo]) => codigo));
  }, [lista]);

  return (
    <section className="grid grid-cols-1 gap-4 p-0 lg:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0 border border-neutral-800 bg-[#0a0a0a]">
        {lista.length > 0 ? (
          lista.map((item, idx) => {
            const codigoAtual = String(item?.codigo || "").trim();
            const isAtivo = campoAtivo === idx;

            return (
              <CostItemRow
                key={item.uid || item.id || `item-${idx}`}
                item={item}
                idx={idx}
                isDuplicado={codigoAtual !== "" && codigosDuplicados.has(codigoAtual)}
                isAtivo={isAtivo}
                sugestoes={isAtivo ? sugestoes : EMPTY_SUGESTOES}
                buscandoSugestoes={isAtivo && buscandoSugestoes}
                indiceSelecionado={isAtivo ? indiceSelecionado : -1}
                listaRef={listaRef}
                inputRefs={inputRefs}
                onAtualizar={atualizarItem}
                onRemover={removerItem}
                onBuscarSugestoes={buscarSugestoes}
                onTeclasSugestoes={handleSugestoesKeys}
                onSelecionarSugestao={selecionarSugestao}
                onGridNav={handleGridNav}
              />
            );
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-neutral-400">Nenhum custo adicionado</p>
            <p className="mt-1 text-[11px] text-neutral-600">
              Adicione produtos para calcular o custo total.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={adicionarItem}
          className="flex h-10 w-full items-center justify-center gap-2 border-t border-neutral-900 text-[11px] font-medium uppercase tracking-wide text-neutral-500 transition-colors hover:bg-neutral-950/60 hover:text-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar item
        </button>
      </div>

      <div className="lg:sticky lg:top-0">
        <SummaryCard composicaoSegura={lista} custoTotalReal={custoTotalReal} AnimatedNumber={AnimatedNumber} />
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
type CompositionModalProps = {
  open: boolean;
  onClose: () => void;
  announceId: string;
  composicao: ItemComposicao[];
  setComposicao: any;
  AnimatedNumber?: React.ComponentType<{ value: number }>;
  /** Incremente após salvar no banco para forçar recarga da composição. */
  versao?: number;
};

const mapearComposicao = (row: any): ItemComposicao => ({
  uid: row.uid,
  codigo: row.code,
  produto: row.product,
  descricao: row.product,
  custo: Number(row.current_cost) || 0,
  quantidade: row.amount != null ? String(row.amount) : "1",
});

export default function CompositionModal({
  open,
  onClose,
  announceId,
  composicao,
  setComposicao,
  AnimatedNumber,
  versao = 0,
}: CompositionModalProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const carregadoKeyRef = useRef<string | null>(null);

  // Carrega a composição ao abrir, ou quando o id/versão mudam.
  // O cleanup cancela respostas atrasadas de uma carga anterior.
  useEffect(() => {
    if (!open) {
      carregadoKeyRef.current = null;
      return;
    }
    if (!announceId) return;

    const key = `${announceId}:${versao}`;
    if (carregadoKeyRef.current === key) return;

    let cancelado = false;
    setCarregando(true);
    setErro(null);

    (async () => {
      const { data, error } = await supabase
        .schema("newsystem")
        .rpc("get_announce_composition", { p_announce_id: announceId });

      if (cancelado) return;

      if (error) {
        console.error("Erro ao carregar composição:", error);
        setErro("Não foi possível carregar a composição.");
        setCarregando(false);
        return;
      }

      setComposicao((data ?? []).map(mapearComposicao));
      carregadoKeyRef.current = key;
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [open, announceId, versao, setComposicao]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          // Fecha só este modal, sem propagar o ESC para a tela de edição
          e.stopPropagation();
          onClose();
        }}
        className="!rounded-none bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:w-[95%] sm:max-w-5xl lg:max-w-6xl flex flex-col overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 px-4 pt-4 pb-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-300">
            <DollarSign className="h-4 w-4 text-[#1a8ceb]" />
            Composição de Custo
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pt-6">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando composição...
            </div>
          ) : (
            <CompositionSection
              composicao={composicao}
              setComposicao={setComposicao}
              AnimatedNumber={AnimatedNumber}
            />
          )}

          {erro && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {erro}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-900 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-full items-center justify-center gap-2 bg-neutral-900 text-[12px] font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
