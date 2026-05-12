import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  descricao: "",
  produto: "",
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

const atualizarItem = (
  setComposicao: React.Dispatch<React.SetStateAction<Item[]>>,
  idx: number,
  dados: Partial<Item>
) => {
  setComposicao((prev) => {
    const base = Array.isArray(prev) ? [...prev] : [];

    if (!base[idx]) {
      return base;
    }

    base[idx] = {
      ...base[idx],
      ...dados,
    };

    return base;
  });
};

export default function ComposicaoCustos({
  composicao,
  setComposicao,
  codeRefs,
  qtyRefs,
  costRefs,
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

  const temAlgumItem = composicao.some(itemTemConteudo);
  const deveMostrarTabela = mostrarInputs || temAlgumItem;
  const shouldScrollComposition = composicao.length > 10;

  const handleAdicionarItem = () => {
    setMostrarInputs(true);

    setComposicao((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];

      if (base.length === 0) {
        focusIndexRef.current = 0;
        return [linhaVazia()];
      }

      if (!mostrarInputs && base.length === 1 && isLinhaVazia(base[0])) {
        focusIndexRef.current = 0;
        return base;
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
  }, [composicao.length, mostrarInputs, codeRefs]);

  const removerItem = (idx: number) => {
    setComposicao((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const next = base.filter((_, i) => i !== idx);

      if (next.length === 0) {
        window.setTimeout(() => {
          setMostrarInputs(false);
        }, 0);

        return [linhaVazia()];
      }

      return next;
    });
  };

  const handleKeyDownCusto = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();

      ignoreBlur.current = true;

      window.setTimeout(() => {
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
                const descricao = item.produto || item.descricao || "";

                return (
                  <div
                    key={idx}
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
                          atualizarItem(setComposicao, idx, {
                            codigo: e.target.value,
                            produto: "",
                            descricao: "",
                          });
                        }}
                        onKeyDown={(e) => handleKeyDownCodigo(e, idx)}
                        className={`${inputClass} w-full text-center`}
                      />
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
                          atualizarItem(setComposicao, idx, {
                            quantidade: e.target.value,
                          });
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
                          atualizarItem(setComposicao, idx, {
                            custo: e.target.value,
                          });
                        }}
                        onBlur={() => {
                          if (!ignoreBlur.current) {
                            onBlurCusto(idx);
                          }
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