"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Info, Plus, X, Loader2, AlertTriangle, DollarSign, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
  descricao?: string;
};

type CompositionSectionProps = {
  composicao: any[];
  setComposicao: any;
  custoTotal?: number | string;
  AnimatedNumber?: React.ComponentType<{ value: number }>;
};

const DefaultAnimatedNumber = ({ value }: { value: number }) => {
  return (
    <>
      {Number(value || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </>
  );
};

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
  let str = String(raw).trim();
  str = str.replace(/[^\d.,-]/g, "");
  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");
  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
};

const normalizeNumberString = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
};

const toInternal = (value: string) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d,.-]/g, "").replace(",", ".");
};

const toInteger = (value: string) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits;
};

const getRowDescription = (item: any) => {
  const descricao = String(
    item?.produto ||
      item?.descricao ||
      item?.Produto ||
      item?.nome ||
      item?.label ||
      ""
  ).trim();
  return descricao;
};

// ---------------------------------------------------------------------------
// Normalização da tabela newsystem.costs
// ---------------------------------------------------------------------------
const normalizarCustoRow = (row: any) => {
  const codigo = String(row?.code ?? "").trim();
  const produto = String(row?.product ?? "").trim();
  const custoRaw = row?.current_cost ?? 0;
  const custo =
    typeof custoRaw === "number"
      ? custoRaw
      : parseInputMoney(String(custoRaw ?? ""));
  return {
    codigo,
    produto,
    descricao: produto,
    custo: Number.isFinite(custo) ? custo : 0,
  };
};

// ---------------------------------------------------------------------------
// Cache global
// ---------------------------------------------------------------------------
const cacheCustoExato = new Map<string, ReturnType<typeof normalizarCustoRow> | null>();
const cacheSugestoes = new Map<string, Sugestao[]>();

const buscarCustoExatoPorCodigo = async (codigo: string) => {
  const codigoLimpo = String(codigo || "").trim();
  if (!codigoLimpo) return null;

  if (cacheCustoExato.has(codigoLimpo)) {
    return cacheCustoExato.get(codigoLimpo) ?? null;
  }

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
    cacheCustoExato.set(codigoLimpo, resultado);
    return resultado;
  }

  const { data: dataLike, error: errorLike } = await supabase
    .schema("newsystem")
    .from("costs")
    .select("code, current_cost, product")
    .ilike("code", codigoLimpo)
    .is("deleted_at", null)
    .limit(1);

  if (errorLike) {
    console.error("Erro ao buscar custo por ilike:", errorLike);
    cacheCustoExato.set(codigoLimpo, null);
    return null;
  }

  if (Array.isArray(dataLike) && dataLike.length > 0) {
    const resultado = normalizarCustoRow(dataLike[0]);
    cacheCustoExato.set(codigoLimpo, resultado);
    return resultado;
  }

  cacheCustoExato.set(codigoLimpo, null);
  return null;
};

// ---------------------------------------------------------------------------
// Dropdown de sugestões
// ---------------------------------------------------------------------------
type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  buscando: boolean;
  listaRef: React.RefObject<HTMLDivElement | null>;
  indiceSelecionado: number;
  onSelect: (codigo: string, custo: number, produto?: string, descricao?: string) => void;
};

const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  buscando,
  listaRef,
  indiceSelecionado,
  onSelect,
}) => {
  if (!isActive || (sugestoes.length === 0 && !buscando)) return null;

  return (
    <div
      ref={listaRef}
      className="
        absolute left-0 top-full z-[9999] mt-1
        max-h-60 w-full min-w-[280px] overflow-y-auto overscroll-contain
        border border-neutral-800 bg-[#0a0a0a]
        shadow-[0_12px_32px_rgba(0,0,0,0.6)]
      "
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
            className={`
              flex w-full items-center justify-between gap-3 border-b
              border-neutral-900 px-3 py-2.5 text-left transition-colors
              last:border-b-0
              ${i === indiceSelecionado ? "bg-[#1a8ceb]/[0.08]" : "hover:bg-neutral-900/60"}
            `}
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
// Linha de item de custo (memoizada)
// ---------------------------------------------------------------------------
type CostItemRowProps = {
  item: any;
  idx: number;
  composicao: any[];
  setComposicao: any;
  removerItem: (idx: number) => void;
  isDuplicado: boolean;
  campoAtivo: number | null;
  sugestoes: Sugestao[];
  buscandoSugestoes: boolean;
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement | null>;
  buscarSugestoes: (termo: string, idx: number) => void;
  handleSugestoesKeys: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => boolean;
  selecionarSugestao: (codigo: string, custo: number, idx: number, produto?: string, descricao?: string) => void;
  inputRefs: React.MutableRefObject<HTMLInputElement[][]>;
  handleGridNav: (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => void;
  editing: Record<string, boolean>;
  setEditing: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

const CostItemRowBase: React.FC<CostItemRowProps> = ({
  item,
  idx,
  composicao,
  setComposicao,
  removerItem,
  isDuplicado,
  campoAtivo,
  sugestoes,
  buscandoSugestoes,
  indiceSelecionado,
  listaRef,
  buscarSugestoes,
  handleSugestoesKeys,
  selecionarSugestao,
  inputRefs,
  handleGridNav,
  editing,
  setEditing,
}) => {
  const description = getRowDescription(item);
  const editingKey = `c-${idx}`;

  const [codigoLocal, setCodigoLocal] = useState(item.codigo || "");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setCodigoLocal(item.codigo || "");
  }, [item.codigo]);

  const custoNum = Number(item.custo) || 0;
  const custoZero = custoNum === 0;

  const salvarCodigoLocal = async () => {
    const codigoAtual = String(composicao[idx]?.codigo || "").trim();
    const codigoNovo = String(codigoLocal || "").trim();

    if (!codigoNovo) {
      const novo = [...composicao];
      novo[idx] = { ...novo[idx], codigo: "", produto: "", descricao: "", custo: 0 };
      setComposicao(novo);
      return;
    }

    const custoAtual = Number(composicao[idx]?.custo || 0);
    if (codigoAtual === codigoNovo && custoAtual > 0) return;

    setBuscandoCodigo(true);
    try {
      const custoEncontrado = await buscarCustoExatoPorCodigo(codigoNovo);
      const novo = [...composicao];

      novo[idx] = {
        ...novo[idx],
        codigo: custoEncontrado?.codigo || codigoNovo,
        produto: custoEncontrado?.produto || novo[idx]?.produto || novo[idx]?.Produto || "",
        descricao: custoEncontrado?.descricao || novo[idx]?.descricao || novo[idx]?.produto || "",
        custo:
          custoEncontrado && Number(custoEncontrado.custo) > 0
            ? Number(custoEncontrado.custo)
            : Number(novo[idx]?.custo || 0),
      };

      setComposicao(novo);
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

  return (
    <div
      className={`
        group relative border-b border-neutral-900 px-4 py-3
        transition-colors last:border-b-0
        ${isDuplicado ? "bg-[#1a8ceb]/[0.03]" : "hover:bg-neutral-950/60"}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Código + descrição + quantidade */}
        <div className="relative min-w-0 flex-1">
          <div className="relative flex items-center gap-1.5">
            <Input
              ref={(el) => {
                if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                inputRefs.current[idx][0] = el!;
              }}
              type="text"
              inputMode="text"
              placeholder="Código"
              value={codigoLocal}
              onChange={(e) => {
                const value = e.target.value;
                setCodigoLocal(value);
                buscarSugestoes(value, idx);
              }}
              onBlur={() => void salvarCodigoLocal()}
              onKeyDown={(e) => {
                const handled = handleSugestoesKeys(e, idx);
                if (handled) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  void salvarCodigoLocal();
                  return;
                }
                handleGridNav(e, idx, 0);
              }}
              className="
                !h-7 !rounded-none !border-0 !bg-transparent !px-0
                !text-[13px] !font-semibold !text-[#1a8ceb] !shadow-none !outline-none
                placeholder:!text-neutral-600 placeholder:!font-medium
                focus:!ring-0 focus:!outline-none
                focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
              "
            />

            {buscandoCodigo && (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-500" />
            )}

            {isDuplicado && (
              <span
                title="Código duplicado na composição"
                className="flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#1a8ceb]"
              >
                <AlertTriangle className="h-3 w-3" />
                duplicado
              </span>
            )}

            <SuggestionDropdown
              isActive={campoAtivo === idx}
              sugestoes={sugestoes}
              buscando={buscandoSugestoes}
              listaRef={listaRef}
              indiceSelecionado={indiceSelecionado}
              onSelect={(codigo, custo, produto, descricao) =>
                selecionarSugestao(codigo, custo, idx, produto, descricao)
              }
            />
          </div>

          {/* Descrição + Quantidade */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
            <span className="truncate">{description || "Sem descrição"}</span>
            <span className="shrink-0 text-neutral-700">/</span>
            <span className="shrink-0 uppercase tracking-wide text-neutral-600">Quantidade</span>
            <Input
              ref={(el) => {
                if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                inputRefs.current[idx][1] = el!;
              }}
              type="text"
              inputMode="numeric"
              value={String(item.quantidade ?? "")}
              onChange={(e) => {
                const novo = [...composicao];
                novo[idx] = { ...novo[idx], quantidade: toInteger(e.target.value) };
                setComposicao(novo);
              }}
              onKeyDown={(e) => handleGridNav(e, idx, 1)}
              className="
                !h-4 !w-8 !border-0 !bg-transparent !p-0
                !text-[11px] !text-neutral-300 !shadow-none !outline-none
                focus:!ring-0 focus:!outline-none
                focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
              "
            />
          </div>
        </div>

        {/* Copiar + Custo + remover */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={copiarCustoUnitario}
            title="Copiar custo unitário"
            className="
              flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center
              text-neutral-600 transition-colors
              hover:text-[#1a8ceb]
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
            "
          >
            {copiado ? (
              <Check className="h-3.5 w-3.5 text-[#1a8ceb]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>

          <div
            className={`
              flex h-7 items-center border px-2
              ${custoZero ? "border-neutral-800" : "border-[#1a8ceb]/40"}
            `}
          >
            <span
              className={`mr-1 text-[11px] font-medium ${
                custoZero ? "text-neutral-600" : "text-[#1a8ceb]"
              }`}
            >
              R$
            </span>
            <Input
              ref={(el) => {
                if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
                inputRefs.current[idx][2] = el!;
              }}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={editing[editingKey] ? normalizeNumberString(item.custo) : formatBR(item.custo)}
              onFocus={() => setEditing((prev) => ({ ...prev, [editingKey]: true }))}
              onBlur={(e) => {
                setEditing((prev) => ({ ...prev, [editingKey]: false }));
                const novo = [...composicao];
                const num = parseInputMoney(e.target.value);
                novo[idx] = { ...novo[idx], custo: Number.isFinite(num) ? num : item.custo };
                setComposicao(novo);
              }}
              onChange={(e) => {
                const novo = [...composicao];
                novo[idx] = { ...novo[idx], custo: toInternal(e.target.value) };
                setComposicao(novo);
              }}
              onKeyDown={(e) => handleGridNav(e, idx, 2)}
              className={`
                !h-full !w-16 !border-0 !bg-transparent !p-0
                !text-right !text-[13px] !font-semibold !shadow-none !outline-none
                focus:!ring-0 focus:!outline-none
                focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
                ${custoZero ? "!text-neutral-600" : "!text-[#1a8ceb]"}
              `}
            />
          </div>

          <button
            type="button"
            onClick={() => removerItem(idx)}
            title="Remover linha"
            className="
              flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center
              text-neutral-600 transition-colors
              hover:text-red-400
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500
            "
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CostItemRow = React.memo(CostItemRowBase, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.isDuplicado === next.isDuplicado &&
    prev.campoAtivo === next.campoAtivo &&
    prev.sugestoes === next.sugestoes &&
    prev.buscandoSugestoes === next.buscandoSugestoes &&
    prev.indiceSelecionado === next.indiceSelecionado &&
    prev.editing === next.editing
  );
});

// ---------------------------------------------------------------------------
// Botão adicionar item
// ---------------------------------------------------------------------------
const AddCostButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="
      flex h-10 w-full items-center justify-center gap-2 border-t
      border-neutral-900 text-[11px] font-medium uppercase tracking-wide
      text-neutral-500 transition-colors
      hover:bg-neutral-950/60 hover:text-[#1a8ceb]
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
    "
  >
    <Plus className="h-3.5 w-3.5" />
    Adicionar item
  </button>
);

// ---------------------------------------------------------------------------
// Card de resumo
// ---------------------------------------------------------------------------
type SummaryCardProps = {
  composicaoSegura: any[];
  custoTotalReal: number;
  AnimatedNumber?: React.ComponentType<{ value: number }>;
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  composicaoSegura,
  custoTotalReal,
  AnimatedNumber = DefaultAnimatedNumber,
}) => {
  return (
    <div className="border border-neutral-800 bg-[#0a0a0a]">
      <div className="border-b border-neutral-900 px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Detalhamento de Custos
        </h3>
      </div>

      <div className="space-y-2 border-b border-neutral-900 px-4 py-3">
        {composicaoSegura.length > 0 ? (
          composicaoSegura.map((item: any, i: number) => {
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
};

// ---------------------------------------------------------------------------
// Seção principal
// ---------------------------------------------------------------------------
const CompositionSection: React.FC<CompositionSectionProps> = ({
  composicao = [],
  setComposicao,
  AnimatedNumber = DefaultAnimatedNumber,
}) => {
  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const listaRef = useRef<HTMLDivElement>(null);

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaIdRef = useRef(0);

  const buscarSugestoes = (termo: string, idx: number) => {
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

    if (cacheSugestoes.has(termoLimpo)) {
      const cache = cacheSugestoes.get(termoLimpo)!;
      setSugestoes(cache);
      setIndiceSelecionado(cache.length > 0 ? 0 : -1);
      setBuscandoSugestoes(false);
      return;
    }

    setBuscandoSugestoes(true);

    debounceRef.current = setTimeout(async () => {
      const buscaAtual = buscaIdRef.current + 1;
      buscaIdRef.current = buscaAtual;

      const { data, error } = await supabase
        .schema("newsystem")
        .from("costs")
        .select("code, current_cost, product")
        .ilike("code", `%${termoLimpo}%`)
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

      const sugestoesFormatadas = data?.map((d: any) => normalizarCustoRow(d)) || [];
      cacheSugestoes.set(termoLimpo, sugestoesFormatadas);

      setCampoAtivo(idx);
      setSugestoes(sugestoesFormatadas);
      setIndiceSelecionado(sugestoesFormatadas.length > 0 ? 0 : -1);
      setBuscandoSugestoes(false);
    }, 250);
  };

  const selecionarSugestao = (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string,
    descricao?: string
  ) => {
    const descricaoFinal =
      produto ||
      descricao ||
      sugestoes.find((s) => s.codigo === codigo)?.produto ||
      sugestoes.find((s) => s.codigo === codigo)?.descricao ||
      "";

    const novo = [...composicao];
    novo[idx] = {
      ...novo[idx],
      codigo,
      produto: descricaoFinal || novo[idx]?.produto || "",
      descricao: descricaoFinal || novo[idx]?.descricao || "",
      custo: Number.isFinite(Number(custo)) ? Number(custo) : 0,
    };

    setComposicao(novo);
    setSugestoes([]);
    setCampoAtivo(null);
    setIndiceSelecionado(-1);
  };

  const adicionarItem = () => {
    setComposicao((prev: any[]) => [
      ...(Array.isArray(prev) ? prev : []),
      { uid: crypto.randomUUID(), codigo: "", produto: "", descricao: "", quantidade: 1, custo: 0 },
    ]);
  };

  const removerItem = (idx: number) => {
    setComposicao((prev: any[]) => (Array.isArray(prev) ? prev.filter((_: any, i: number) => i !== idx) : []));
  };

  const handleSugestoesKeys = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
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
  };

  const handleGridNav = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const len = input.value.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      inputRefs.current[row + 1]?.[col]?.focus();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      inputRefs.current[row - 1]?.[col]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && end === len) {
      e.preventDefault();
      inputRefs.current[row]?.[col + 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && start === 0) {
      e.preventDefault();
      inputRefs.current[row]?.[col - 1]?.focus();
    }
  };

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

  const composicaoSegura = Array.isArray(composicao) ? composicao : [];

  const custoTotalReal = useMemo(() => {
    return composicaoSegura.reduce((acc: number, item: any) => {
      const qtd = parseInt(String(item.quantidade ?? "1"), 10) || 0;
      const custo = Number(item.custo) || 0;
      return acc + custo * qtd;
    }, 0);
  }, [composicaoSegura]);

  const codigosDuplicados = useMemo(() => {
    const contagem = new Map<string, number>();
    composicaoSegura.forEach((item: any) => {
      const codigo = String(item?.codigo || "").trim();
      if (!codigo) return;
      contagem.set(codigo, (contagem.get(codigo) || 0) + 1);
    });
    return new Set([...contagem.entries()].filter(([, c]) => c > 1).map(([codigo]) => codigo));
  }, [composicaoSegura]);

  return (
    <section className="grid grid-cols-1 gap-4 p-0 lg:grid-cols-[1.4fr_1fr]">
      {/* Coluna esquerda: itens de custo */}
      <div className="min-w-0 border border-neutral-800 bg-[#0a0a0a]">
        {composicaoSegura.length > 0 ? (
          composicaoSegura.map((item: any, idx: number) => {
            const codigoAtual = String(item?.codigo || "").trim();
            const isDuplicado = codigoAtual !== "" && codigosDuplicados.has(codigoAtual);

            return (
              <CostItemRow
                key={item.uid || item.id || item.ID || `item-${idx}`}
                item={item}
                idx={idx}
                composicao={composicaoSegura}
                setComposicao={setComposicao}
                removerItem={removerItem}
                isDuplicado={isDuplicado}
                campoAtivo={campoAtivo}
                sugestoes={sugestoes}
                buscandoSugestoes={buscandoSugestoes}
                indiceSelecionado={indiceSelecionado}
                listaRef={listaRef}
                buscarSugestoes={buscarSugestoes}
                handleSugestoesKeys={handleSugestoesKeys}
                selecionarSugestao={selecionarSugestao}
                inputRefs={inputRefs}
                handleGridNav={handleGridNav}
                editing={editing}
                setEditing={setEditing}
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

        <AddCostButton onClick={adicionarItem} />
      </div>

      {/* Coluna direita: detalhamento */}
      <div className="lg:sticky lg:top-0">
        <SummaryCard
          composicaoSegura={composicaoSegura}
          custoTotalReal={custoTotalReal}
          AnimatedNumber={AnimatedNumber}
        />
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
  composicao: any[];
  setComposicao: any;
  custoTotal?: number | string;
  AnimatedNumber?: React.ComponentType<{ value: number }>;
};

export default function CompositionModal({
  open,
  onClose,
  announceId,
  composicao,
  setComposicao,
  AnimatedNumber,
}: CompositionModalProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const carregouRef = useRef<string | null>(null);

  // Carrega a composição existente ao abrir o modal
  useEffect(() => {
    if (!open || !announceId) return;
    if (carregouRef.current === announceId) return;

    setCarregando(true);
    setErro(null);

    (async () => {
      const { data, error } = await supabase
        .schema("newsystem")
        .rpc("get_announce_composition", { p_announce_id: announceId });

      if (error) {
        console.error("Erro ao carregar composição:", error);
        setErro("Não foi possível carregar a composição.");
        setCarregando(false);
        return;
      }

      const mapeado = (data || []).map((row: any) => ({
        uid: row.uid,
        codigo: row.code,
        produto: row.product,
        descricao: row.product,
        custo: Number(row.current_cost) || 0,
        quantidade: row.amount != null ? String(row.amount) : "1",
      }));

      setComposicao(mapeado);
      carregouRef.current = announceId;
      setCarregando(false);
    })();
  }, [open, announceId, setComposicao]);

  // Reseta o "cache" de carregamento quando o modal fecha, para recarregar na próxima abertura
  useEffect(() => {
    if (!open) carregouRef.current = null;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          // Fecha apenas este modal e impede que o ESC se
          // propague e feche também a tela de edição do anúncio.
          e.stopPropagation();
          onClose();
        }}
        className="
          !rounded-none bg-[#0a0a0a] border border-neutral-800 shadow-2xl
          w-[calc(100vw-16px)] max-w-[calc(100vw-16px)]
          max-h-[calc(100dvh-16px)]
          sm:w-[95%] sm:max-w-5xl
          lg:max-w-6xl
          flex flex-col overflow-hidden p-0
        "
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
            className="
              flex h-9 w-full items-center justify-center gap-2
              bg-neutral-900 text-[12px] font-medium uppercase tracking-wide text-white
              transition-opacity hover:opacity-90
            "
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
