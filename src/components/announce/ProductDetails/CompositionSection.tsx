"use client";

import React, { useEffect, useRef, useState } from "react";
import { Info, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  custoTotal: number | string;
  AnimatedNumber?: React.ComponentType<{ value: number }>;

  toInternal?: any;
  toDisplay?: any;
  supabase?: any;
  anuncioData?: any;
  setAnuncioData?: any;
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

const getRowTitle = (item: any) => {
  const codigo = String(item?.codigo || "").trim();

  if (codigo) return codigo;

  return "Novo custo";
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

const normalizarCustoRow = (row: any) => {
  const codigo = String(row?.["Código"] ?? row?.codigo ?? "").trim();
  const produto = String(row?.["Produto"] ?? row?.produto ?? "").trim();

  const custoRaw =
    row?.["Custo Atual"] ??
    row?.["Custo"] ??
    row?.custo_atual ??
    row?.custo ??
    0;

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

const buscarCustoExatoPorCodigo = async (codigo: string) => {
  const codigoLimpo = String(codigo || "").trim();

  if (!codigoLimpo) return null;

  /**
   * IMPORTANTE:
   * Em filtros do supabase-js, use o nome da coluna SEM aspas internas:
   * .eq("Código", codigo)
   *
   * Errado:
   * .eq('"Código"', codigo)
   */
  const { data: dataExata, error: errorExata } = await supabase
    .from("custos")
    .select('"Código", "Custo Atual", "Produto"')
    .eq("Código", codigoLimpo)
    .limit(1);

  if (errorExata) {
    console.error("Erro ao buscar custo exato:", errorExata);
  }

  if (Array.isArray(dataExata) && dataExata.length > 0) {
    return normalizarCustoRow(dataExata[0]);
  }

  /**
   * Fallback:
   * se não achou exato, tenta ilike sem aspas internas.
   */
  const { data: dataLike, error: errorLike } = await supabase
    .from("custos")
    .select('"Código", "Custo Atual", "Produto"')
    .ilike("Código", codigoLimpo)
    .limit(1);

  if (errorLike) {
    console.error("Erro ao buscar custo por ilike:", errorLike);
    return null;
  }

  if (Array.isArray(dataLike) && dataLike.length > 0) {
    return normalizarCustoRow(dataLike[0]);
  }

  return null;
};

type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  listaRef: React.RefObject<HTMLDivElement | null>;
  indiceSelecionado: number;
  onSelect: (
    codigo: string,
    custo: number,
    produto?: string,
    descricao?: string
  ) => void;
};

const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
}) => {
  if (!isActive || sugestoes.length === 0) return null;

  return (
    <div
      ref={listaRef}
      className="
        absolute left-0 top-full z-[9999] mt-1
        max-h-60 w-full min-w-[280px] overflow-y-auto overscroll-contain
        rounded-lg border border-white/10 bg-[#0f0f0f]
        shadow-[0_18px_40px_rgba(0,0,0,0.55)]
      "
    >
      {sugestoes.map((s, i) => (
        <button
          key={`${s.codigo}-${i}`}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.codigo, s.custo, s.produto, s.descricao);
          }}
          className={`
            flex min-h-[52px] w-full cursor-pointer items-center
            justify-between gap-3 px-3 py-2 text-left transition
            ${
              i === indiceSelecionado
                ? "bg-[#1a8ceb]/30"
                : "hover:bg-[#1a8ceb]/20"
            }
          `}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-sm font-semibold text-white">
              {s.codigo || "Sem código"}
            </div>

            {(s.produto || s.descricao) && (
              <div className="mt-0.5 truncate text-xs text-white/45">
                {s.produto || s.descricao}
              </div>
            )}
          </div>

          <span className="shrink-0 text-right text-sm font-semibold text-[#1a8ceb]">
            R$ {formatBR(s.custo)}
          </span>
        </button>
      ))}
    </div>
  );
};

type CostItemRowProps = {
  item: any;
  idx: number;
  composicao: any[];
  setComposicao: any;
  removerItem: (idx: number) => void;

  campoAtivo: number | null;
  sugestoes: Sugestao[];
  indiceSelecionado: number;
  listaRef: React.RefObject<HTMLDivElement | null>;
  buscarSugestoes: (termo: string, idx: number) => void;
  handleSugestoesKeys: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => boolean;
  selecionarSugestao: (
    codigo: string,
    custo: number,
    idx: number,
    produto?: string,
    descricao?: string
  ) => void;

  inputRefs: React.MutableRefObject<HTMLInputElement[][]>;
  handleGridNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => void;

  editing: Record<string, boolean>;
  setEditing: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

const codeInputClass = `
  !h-10 !rounded-lg !border !border-white/10 !bg-[#070707] !px-3
  !text-sm !font-semibold !text-white !shadow-none !outline-none
  placeholder:!text-white/30
  focus:!border-[#1a8ceb]/70 focus:!ring-1 focus:!ring-[#1a8ceb]/30
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
`;

const cleanInnerInputClass = `
  !h-full !border-0 !bg-transparent !p-0
  !text-sm !font-semibold !text-white
  !shadow-none !outline-none
  placeholder:!text-white/25
  focus:!ring-0 focus:!outline-none
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
`;

const CostItemRow: React.FC<CostItemRowProps> = ({
  item,
  idx,
  composicao,
  setComposicao,
  removerItem,
  campoAtivo,
  sugestoes,
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
  const title = getRowTitle(item);
  const description = getRowDescription(item);
  const editingKey = `c-${idx}`;

  const [codigoLocal, setCodigoLocal] = useState(item.codigo || "");

  useEffect(() => {
    setCodigoLocal(item.codigo || "");
  }, [item.codigo]);

  const salvarCodigoLocal = async () => {
    const codigoAtual = String(composicao[idx]?.codigo || "").trim();
    const codigoNovo = String(codigoLocal || "").trim();

    if (!codigoNovo) {
      const novo = [...composicao];

      novo[idx] = {
        ...novo[idx],
        codigo: "",
        produto: "",
        descricao: "",
        custo: 0,
      };

      setComposicao(novo);
      return;
    }

    const custoAtual = Number(composicao[idx]?.custo || 0);

    if (codigoAtual === codigoNovo && custoAtual > 0) return;

    const custoEncontrado = await buscarCustoExatoPorCodigo(codigoNovo);

    const novo = [...composicao];

    novo[idx] = {
      ...novo[idx],
      codigo: custoEncontrado?.codigo || codigoNovo,
      produto:
        custoEncontrado?.produto ||
        novo[idx]?.produto ||
        novo[idx]?.Produto ||
        "",
      descricao:
        custoEncontrado?.descricao ||
        novo[idx]?.descricao ||
        novo[idx]?.produto ||
        "",
      custo:
        custoEncontrado && Number(custoEncontrado.custo) > 0
          ? Number(custoEncontrado.custo)
          : Number(novo[idx]?.custo || 0),
    };

    setComposicao(novo);
  };

  return (
    <div className="group grid grid-cols-1 items-end gap-2 border-b border-white/10 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_82px_128px_auto] sm:gap-2.5">
      <div className="relative min-w-0 self-center">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {title}
          </span>

          <span className="mt-0.5 block min-h-[16px] truncate text-xs font-medium text-white/45">
            {description || "Sem descrição"}
          </span>
        </div>

        <div className="relative mt-2">
          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][0] = el!;
            }}
            type="text"
            inputMode="text"
            placeholder="Código do custo"
            value={codigoLocal}
            onChange={(e) => {
              const value = e.target.value;

              setCodigoLocal(value);
              buscarSugestoes(value, idx);
            }}
            onBlur={() => {
              void salvarCodigoLocal();
            }}
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
            className={codeInputClass}
          />

          <SuggestionDropdown
            isActive={campoAtivo === idx}
            sugestoes={sugestoes}
            listaRef={listaRef}
            indiceSelecionado={indiceSelecionado}
            onSelect={(codigo, custo, produto, descricao) =>
              selecionarSugestao(codigo, custo, idx, produto, descricao)
            }
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          Quant.
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][1] = el!;
            }}
            type="text"
            inputMode="decimal"
            placeholder="1"
            value={normalizeNumberString(item.quantidade || "")}
            onChange={(e) => {
              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                quantidade: toInternal(e.target.value),
              };

              setComposicao(novo);
            }}
            onKeyDown={(e) => handleGridNav(e, idx, 1)}
            className={`${cleanInnerInputClass} !text-center`}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          Custo
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <span className="mr-1.5 text-sm font-semibold text-white/80">R$</span>

          <Input
            ref={(el) => {
              if (!inputRefs.current[idx]) inputRefs.current[idx] = [];
              inputRefs.current[idx][2] = el!;
            }}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={
              editing[editingKey]
                ? normalizeNumberString(item.custo)
                : formatBR(item.custo)
            }
            onFocus={() =>
              setEditing((prev) => ({
                ...prev,
                [editingKey]: true,
              }))
            }
            onBlur={(e) => {
              setEditing((prev) => ({
                ...prev,
                [editingKey]: false,
              }));

              const novo = [...composicao];
              const num = parseInputMoney(e.target.value);

              novo[idx] = {
                ...novo[idx],
                custo: Number.isFinite(num) ? num : item.custo,
              };

              setComposicao(novo);
            }}
            onChange={(e) => {
              const novo = [...composicao];

              novo[idx] = {
                ...novo[idx],
                custo: toInternal(e.target.value),
              };

              setComposicao(novo);
            }}
            onKeyDown={(e) => handleGridNav(e, idx, 2)}
            className={`${cleanInnerInputClass} !text-right`}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={() => removerItem(idx)}
        size="sm"
        variant="ghost"
        className="
          h-9 w-full cursor-pointer rounded-lg border border-red-500/20
          bg-red-500/10 p-0 text-red-400 transition-all
          hover:bg-red-500/20 hover:text-red-300
          active:scale-[0.96]
          sm:h-10 sm:w-10
        "
        title="Remover linha"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

type AddCostButtonProps = {
  onClick: () => void;
};

const AddCostButton: React.FC<AddCostButtonProps> = ({ onClick }) => (
  <Button
    type="button"
    onClick={onClick}
    variant="outline"
    className="
      mt-3 flex h-10 w-full items-center justify-center rounded-xl
      border border-white/10 bg-transparent
      px-4 text-xs font-semibold text-white/85
      shadow-none transition-all duration-200
      hover:border-white/20 hover:bg-white/[0.03] hover:text-white
      active:scale-[0.99]
      focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/50
      focus-visible:ring-offset-0
      sm:h-9 sm:text-xs
    "
  >
    <Plus className="mr-2 h-3.5 w-3.5 text-white/70" />
    Adicionar item de custo
  </Button>
);

type TotalCostCardProps = {
  custoTotal: number | string;
  AnimatedNumber?: React.ComponentType<{ value: number }>;
};

const TotalCostCard: React.FC<TotalCostCardProps> = ({
  custoTotal,
  AnimatedNumber = DefaultAnimatedNumber,
}) => (
  <div className="mt-3 rounded-xl border border-[#1a8ceb]/25 bg-[#101010] p-4 sm:p-3">
    <div className="flex flex-col items-center justify-center">
      <span className="mb-1 text-sm font-medium text-white/50 sm:text-xs">
        Custo Total
      </span>

      <span className="text-center text-2xl font-bold tabular-nums text-[#1a8ceb] sm:text-xl">
        R$ <AnimatedNumber value={Number(custoTotal || 0)} />
      </span>
    </div>
  </div>
);

export const CompositionSection: React.FC<CompositionSectionProps> = ({
  composicao = [],
  setComposicao,
  custoTotal = 0,
  AnimatedNumber = DefaultAnimatedNumber,
}) => {
  const inputRefs = useRef<HTMLInputElement[][]>([]);
  const listaRef = useRef<HTMLDivElement>(null);

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaIdRef = useRef(0);

  const listScrollClass = "overflow-visible";

  const buscarSugestoes = (termo: string, idx: number) => {
    const termoLimpo = String(termo || "").trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!termoLimpo) {
      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
      return;
    }

    setCampoAtivo(idx);

    debounceRef.current = setTimeout(async () => {
      const buscaAtual = buscaIdRef.current + 1;
      buscaIdRef.current = buscaAtual;

      /**
       * IMPORTANTE:
       * Em filtros do supabase-js, use o nome da coluna SEM aspas internas:
       * .ilike("Código", ...)
       */
      const { data, error } = await supabase
        .from("custos")
        .select('"Código", "Custo Atual", "Produto"')
        .ilike("Código", `%${termoLimpo}%`)
        .limit(8);

      if (buscaAtual !== buscaIdRef.current) return;

      if (error) {
        console.error("Erro ao buscar custos:", error);
        setSugestoes([]);
        setIndiceSelecionado(-1);
        return;
      }

      const sugestoesFormatadas =
        data?.map((d: any) => normalizarCustoRow(d)) || [];

      setCampoAtivo(idx);
      setSugestoes(sugestoesFormatadas);
      setIndiceSelecionado(sugestoesFormatadas.length > 0 ? 0 : -1);
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
      {
        uid: crypto.randomUUID(),
        codigo: "",
        produto: "",
        descricao: "",
        quantidade: 1,
        custo: 0,
      },
    ]);
  };

  const removerItem = (idx: number) => {
    setComposicao((prev: any[]) =>
      Array.isArray(prev) ? prev.filter((_: any, i: number) => i !== idx) : []
    );
  };

  const handleSugestoesKeys = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
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

      if (s) {
        selecionarSugestao(s.codigo, s.custo, idx, s.produto, s.descricao);
      }

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

  const handleGridNav = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => {
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
      if (listaRef.current?.contains(e.target as Node)) {
        return;
      }

      setSugestoes([]);
      setCampoAtivo(null);
      setIndiceSelecionado(-1);
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const composicaoSegura = Array.isArray(composicao) ? composicao : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
          2.
        </span>

        <h2 className="text-base font-semibold text-white">
          Composição de Custo
        </h2>
      </div>

      <div className={`space-y-2 ${listScrollClass}`}>
        {composicaoSegura.length > 0 ? (
          composicaoSegura.map((item: any, idx: number) => (
            <CostItemRow
              key={item.uid || item.id || item.ID || `item-${idx}`}
              item={item}
              idx={idx}
              composicao={composicaoSegura}
              setComposicao={setComposicao}
              removerItem={removerItem}
              campoAtivo={campoAtivo}
              sugestoes={sugestoes}
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
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-5 text-center">
            <p className="text-sm font-medium text-white/75">
              Nenhum custo adicionado
            </p>

            <p className="mt-1 text-xs text-white/40">
              Adicione produtos para calcular o custo total.
            </p>
          </div>
        )}
      </div>

      <AddCostButton onClick={adicionarItem} />

      <TotalCostCard
        custoTotal={custoTotal || 0}
        AnimatedNumber={AnimatedNumber}
      />

      <div className="mt-4 rounded-xl border border-white/10 bg-[#181818] px-4 py-3">
        <div className="flex gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />

          <p className="text-xs leading-relaxed text-white/45">
            Os valores de impostos e comissões podem variar conforme as políticas
            de cada marketplace.
          </p>
        </div>
      </div>
    </section>
  );
};