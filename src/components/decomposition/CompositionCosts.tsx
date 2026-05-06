import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBR } from "@/components/decomposition/Decomposition";

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export type Item = {
  codigo: string;
  quantidade: string;
  custo: string;
  descricao?: string;
  produto?: string;
};

type Props = {
  composicao: Item[];
  setComposicao: React.Dispatch<React.SetStateAction<Item[]>>;
  codeRefs: React.MutableRefObject<HTMLInputElement[]>;
  qtyRefs: React.MutableRefObject<HTMLInputElement[]>;
  costRefs: React.MutableRefObject<HTMLInputElement[]>;
  listaRef: React.RefObject<HTMLDivElement>;
  campoAtivo: number | null;
  setCampoAtivo: (v: number | null) => void;
  indiceSelecionado: number;
  setIndiceSelecionado: (v: number) => void;
  sugestoes: { codigo: string; custo: number; produto?: string }[];
  buscarSugestoes: (termo: string, idx: number) => void;
  selecionarSugestao: (codigo: string, custo: number, idx: number) => void;
  autoSelecionarPrimeiro: (idx: number) => Promise<void>;
  handleKeyDownCodigo: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => void;
  handleKeyDownQuantidade: (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => void;
  onBlurQuantidade: (idx: number) => void;
  onBlurCusto: (idx: number) => void;
  adicionarItem: () => void;
};

const inputClass = `
  h-10 min-w-0 rounded-lg border-white/10 bg-[#070707] px-3
  text-sm font-semibold text-white shadow-none outline-none
  placeholder:text-white/20
  focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
  focus-visible:ring-0 focus-visible:ring-offset-0
`;

const linhaVazia = (): Item => ({
  codigo: "",
  quantidade: "",
  custo: "",
});

const itemTemConteudo = (item: Item) => {
  return (
    String(item?.codigo || "").trim() ||
    String(item?.quantidade || "").trim() ||
    String(item?.custo || "").trim() ||
    String(item?.descricao || "").trim() ||
    String(item?.produto || "").trim()
  );
};

const isLinhaVazia = (item: Item) => !itemTemConteudo(item);

export default function ComposicaoCustos({
  composicao,
  setComposicao,
  codeRefs,
  qtyRefs,
  costRefs,
  listaRef,
  campoAtivo,
  setCampoAtivo,
  indiceSelecionado,
  setIndiceSelecionado,
  sugestoes,
  buscarSugestoes,
  selecionarSugestao,
  autoSelecionarPrimeiro,
  handleKeyDownCodigo,
  handleKeyDownQuantidade,
  onBlurQuantidade,
  onBlurCusto,
}: Props) {
  const ignoreBlur = React.useRef(false);
  const focusIndexRef = React.useRef<number | null>(null);

  const [mostrarInputs, setMostrarInputs] = React.useState(() =>
    composicao.some(itemTemConteudo)
  );

  const buscarSugestoesDebounced = React.useRef(
    debounce((termo: string, idx: number) => buscarSugestoes(termo, idx), 10)
  ).current;

  const temAlgumItem = composicao.some(itemTemConteudo);
  const deveMostrarTabela = mostrarInputs || temAlgumItem;
  const shouldScrollComposition = composicao.length > 10;

  const handleAdicionarItem = () => {
    setMostrarInputs(true);

    setComposicao((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];

      if (!mostrarInputs && base.length === 1 && isLinhaVazia(base[0])) {
        focusIndexRef.current = 0;
        return base;
      }

      if (base.length === 0) {
        focusIndexRef.current = 0;
        return [linhaVazia()];
      }

      const novoIndex = base.length;
      focusIndexRef.current = novoIndex;

      return [...base, linhaVazia()];
    });
  };

  React.useEffect(() => {
    if (focusIndexRef.current === null) return;

    const index = focusIndexRef.current;
    focusIndexRef.current = null;

    requestAnimationFrame(() => {
      codeRefs.current[index]?.focus();
    });
  }, [composicao.length, codeRefs]);

  const removerItem = (idx: number) => {
    setComposicao((prev) => {
      const next = prev.filter((_, i) => i !== idx);

      return next.length > 0 ? next : [linhaVazia()];
    });

    setCampoAtivo((campoAtual) => {
      if (campoAtual === null) return null;
      if (campoAtual === idx) return null;
      if (campoAtual > idx) return campoAtual - 1;

      return campoAtual;
    });

    setIndiceSelecionado(-1);

    setTimeout(() => {
      setComposicao((current) => {
        const temLinhaReal = current.some(itemTemConteudo);

        if (!temLinhaReal && current.length === 1 && isLinhaVazia(current[0])) {
          setMostrarInputs(false);
        }

        return current;
      });
    }, 0);
  };

  const handleKeyDownCusto = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();

      ignoreBlur.current = true;

      setTimeout(() => {
        ignoreBlur.current = false;

        const nextInput = codeRefs.current[idx + 1];

        if (nextInput) {
          nextInput.focus();
        }
      }, 0);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
            2.
          </span>

          <h2 className="truncate text-base font-semibold text-white">
            Composição de Custo
          </h2>
        </div>

        <Button
          type="button"
          onClick={handleAdicionarItem}
          variant="outline"
          className="
            h-9 shrink-0 cursor-pointer rounded-lg border border-[#1a8ceb]/50
            bg-transparent px-4 text-xs font-semibold text-[#1a8ceb]
            shadow-none
            hover:bg-[#1a8ceb]/10 hover:text-[#4da7f0]
            active:scale-[0.97]
          "
        >
          <Plus className="mr-2 h-4 w-4" />
          Incluir Custos
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {deveMostrarTabela ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-white/10">
            <div
              className="
                hidden border-b border-white/10 bg-[#181818] lg:grid
                lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)_minmax(92px,0.7fr)_minmax(110px,0.85fr)_64px]
              "
            >
              <div className="min-w-0 px-3 py-4 text-center text-sm font-semibold text-white">
                Código / SKU
              </div>

              <div className="min-w-0 px-3 py-4 text-center text-sm font-semibold text-white">
                Descrição
              </div>

              <div className="min-w-0 px-3 py-4 text-right text-sm font-semibold text-white">
                Quantidade
              </div>

              <div className="min-w-0 px-3 py-4 text-right text-sm font-semibold text-white">
                Custo Unitário
              </div>

              <div className="min-w-0 px-3 py-4 text-right text-sm font-semibold text-white">
                Ações
              </div>
            </div>

            <div
              className={`
                min-w-0 divide-y divide-white/10
                ${
                  shouldScrollComposition
                    ? "max-h-[620px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
                    : ""
                }
              `}
            >
              {composicao.map((item, idx) => {
                const descricao =
                  item.produto || item.descricao || item.codigo || "";

                return (
                  <div
                    key={`${idx}-${item.codigo || "item"}`}
                    className="
                      grid min-w-0 grid-cols-1 gap-3 bg-[#151515] p-4
                      lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)_minmax(92px,0.7fr)_minmax(110px,0.85fr)_64px]
                      lg:items-center lg:gap-0 lg:p-0
                    "
                  >
                    <div className="relative min-w-0 lg:px-3 lg:py-3">
                      <label className="mb-1.5 block text-xs font-medium text-white/45 lg:hidden">
                        Código / SKU
                      </label>

                      <Input
                        ref={(el) => {
                          if (el) codeRefs.current[idx] = el;
                        }}
                        value={item.codigo}
                        placeholder="SKU"
                        onChange={(e) => {
                          const novo = [...composicao];

                          novo[idx] = {
                            ...novo[idx],
                            codigo: e.target.value,
                          };

                          setComposicao(novo);
                          setCampoAtivo(idx);
                          setIndiceSelecionado(0);
                          buscarSugestoesDebounced(e.target.value, idx);
                        }}
                        onKeyDown={(e) => handleKeyDownCodigo(e, idx)}
                        onBlur={() => {
                          if (!ignoreBlur.current && item.codigo.trim()) {
                            autoSelecionarPrimeiro(idx);
                          }
                        }}
                        className={`${inputClass} w-full text-center`}
                      />

                      {campoAtivo === idx && sugestoes.length > 0 && (
                        <div
                          ref={listaRef}
                          className="
                            absolute left-3 right-3 z-50 mt-1 max-h-48 overflow-y-auto
                            rounded-md border border-white/10 bg-[#0f0f0f] shadow-xl
                          "
                        >
                          {sugestoes.map((s, i) => (
                            <div
                              key={`${s.codigo}-${i}`}
                              className={`flex cursor-pointer justify-between gap-3 px-3 py-2 text-xs ${
                                i === indiceSelecionado
                                  ? "bg-[#1a8ceb]/30"
                                  : "hover:bg-[#1a8ceb]/20"
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                selecionarSugestao(s.codigo, s.custo, idx);
                              }}
                              onMouseEnter={() => setIndiceSelecionado(i)}
                            >
                              <span className="min-w-0 truncate font-semibold text-white">
                                {s.codigo}
                              </span>

                              <span className="shrink-0 font-semibold text-[#1a8ceb]">
                                R$ {formatBR(s.custo)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 lg:px-3 lg:py-3">
                      <label className="mb-1.5 block text-xs font-medium text-white/45 lg:hidden">
                        Descrição
                      </label>

                      <div className="flex h-10 min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-white/10 bg-[#070707] px-3">
                        <span
                          title={descricao}
                          className={`block w-full min-w-0 overflow-hidden truncate whitespace-nowrap text-center text-sm font-semibold ${
                            descricao ? "text-white" : "text-white/20"
                          }`}
                        >
                          {descricao || "PRODUTO"}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 lg:px-3 lg:py-3">
                      <label className="mb-1.5 block text-xs font-medium text-white/45 lg:hidden">
                        Quantidade
                      </label>

                      <Input
                        ref={(el) => {
                          if (el) qtyRefs.current[idx] = el;
                        }}
                        value={item.quantidade}
                        placeholder="1"
                        inputMode="decimal"
                        onChange={(e) => {
                          const novo = [...composicao];

                          novo[idx] = {
                            ...novo[idx],
                            quantidade: e.target.value,
                          };

                          setComposicao(novo);
                        }}
                        onBlur={() => onBlurQuantidade(idx)}
                        onKeyDown={(e) => handleKeyDownQuantidade(e, idx)}
                        className={`${inputClass} w-full text-right tabular-nums`}
                      />
                    </div>

                    <div className="min-w-0 lg:px-3 lg:py-3">
                      <label className="mb-1.5 block text-xs font-medium text-white/45 lg:hidden">
                        Custo Unitário
                      </label>

                      <Input
                        ref={(el) => {
                          if (el) costRefs.current[idx] = el;
                        }}
                        value={item.custo}
                        placeholder="0,00"
                        inputMode="decimal"
                        onChange={(e) => {
                          const novo = [...composicao];

                          novo[idx] = {
                            ...novo[idx],
                            custo: e.target.value,
                          };

                          setComposicao(novo);
                        }}
                        onBlur={() => {
                          if (!ignoreBlur.current) onBlurCusto(idx);
                        }}
                        onKeyDown={(e) => handleKeyDownCusto(e, idx)}
                        className={`${inputClass} w-full text-right tabular-nums`}
                      />
                    </div>

                    <div className="flex min-w-0 items-center justify-end lg:px-3 lg:py-3">
                      <Button
                        type="button"
                        onClick={() => removerItem(idx)}
                        variant="ghost"
                        className="
                          h-9 w-9 cursor-pointer rounded-lg border border-red-500/20
                          bg-red-500/10 p-0 text-red-400 transition
                          hover:bg-red-500/20 hover:text-red-300
                          active:scale-[0.96]
                        "
                        title="Remover custo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-white/75">
              Nenhum custo adicionado
            </p>

            <p className="mt-1 text-xs text-white/40">
              Adicione produtos para calcular o custo total.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}