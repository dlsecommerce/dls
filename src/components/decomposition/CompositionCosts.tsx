import React from "react";
import { Layers, HelpCircle, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBR } from "@/components/decomposition/Decomposition";

/* ========== DEBOUNCE 10ms ========== */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export type Item = { codigo: string; quantidade: string; custo: string };

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs font-normal whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
      {text}
    </div>
  </div>
);

type Props = {
  composicao: Item[];
  // 👇 OBS: seu tipo aqui está (v: Item[]) => void, mas você usa setState functional abaixo.
  // Para ficar 100% tipado, o ideal seria: React.Dispatch<React.SetStateAction<Item[]>>
  // Mas vou manter compatível com o que você mandou.
  setComposicao: any;

  codeRefs: React.MutableRefObject<HTMLInputElement[]>;
  qtyRefs: React.MutableRefObject<HTMLInputElement[]>;
  costRefs: React.MutableRefObject<HTMLInputElement[]>;
  listaRef: React.RefObject<HTMLDivElement>;
  campoAtivo: number | null;
  setCampoAtivo: (v: number | null) => void;
  indiceSelecionado: number;
  setIndiceSelecionado: (v: number) => void;
  sugestoes: { codigo: string; custo: number }[];
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
  adicionarItem,
}: Props) {
  /* ========== DEBOUNCED buscarSugestoes ========== */
  const buscarSugestoesDebounced = React.useRef(
    debounce((termo: string, idx: number) => buscarSugestoes(termo, idx), 10)
  ).current;

  /* ========== FLAG PARA EVITAR BUG NO TAB (ignore blur) ========== */
  const ignoreBlur = React.useRef(false);

  const leftColScroll =
    composicao.length > 10
      ? "max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
      : "";

  const removerItem = (idx: number) => {
    setComposicao((prev: Item[]) => prev.filter((_, i) => i !== idx));
  };

  /* ==========================================================
     TAB/ENTER NO CUSTO — cria nova linha APENAS se todos preenchidos
     ========================================================== */
  const handleKeyDownCusto = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();

      const item = composicao[idx];

      const codigoOK = item.codigo.trim().length > 0;
      const quantidadeOK = item.quantidade.trim().length > 0;
      const custoOK = item.custo.trim().length > 0;

      const isLast = idx === composicao.length - 1;

      // Bloqueia onBlur durante o TAB para evitar flick
      ignoreBlur.current = true;

      // Cria nova linha somente se todos os campos estiverem preenchidos
      if (isLast && codigoOK && quantidadeOK && custoOK) {
        setComposicao((prev: Item[]) => [
          ...prev,
          { codigo: "", quantidade: "", custo: "" },
        ]);

        setTimeout(() => {
          ignoreBlur.current = false;
          codeRefs.current[idx + 1]?.focus();
        }, 0);
        return;
      }

      // Caso contrário, só pula para o próximo código
      setTimeout(() => {
        ignoreBlur.current = false;
        codeRefs.current[idx + 1]?.focus();
      }, 0);

      return;
    }
  };

  return (
    <div className="lg:col-span-7 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-5 h-5 text-[#1a8ceb]" />
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Composição
          <HelpTooltip text="Composição de Custos." />
        </h3>
      </div>

      <div className={`space-y-1 ${leftColScroll}`}>
        {composicao.map((item, idx) => (
          <div
            key={idx}
            className="relative grid grid-cols-3 gap-2 mb-1 p-2 rounded-lg bg-black/30 border border-white/10"
          >
            {/* Botão remove */}
            {idx > 0 && (
              <button
                type="button"
                onClick={() => removerItem(idx)}
                className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Código */}
            <div className="relative">
              <Label className="text-neutral-400 text-[10px] block mb-1">
                Código
              </Label>
              <Input
                ref={(el) => (codeRefs.current[idx] = el!)}
                value={item.codigo}
                placeholder="SKU"
                onChange={(e) => {
                  const novo = [...composicao];
                  novo[idx].codigo = e.target.value;
                  setComposicao(novo);

                  // ✅ garante que o dropdown está “vivo” nesse campo
                  setCampoAtivo(idx);

                  // ✅ UX: ao digitar, já aponta pro 1º item
                  setIndiceSelecionado(0);

                  buscarSugestoesDebounced(e.target.value, idx);
                }}
                onKeyDown={(e) => handleKeyDownCodigo(e, idx)}
                onBlur={() => {
                  // ✅ se estiver tab/enter de custo, não auto-seleciona
                  if (!ignoreBlur.current) autoSelecionarPrimeiro(idx);
                }}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />

              {campoAtivo === idx && sugestoes.length > 0 && (
                <div
                  ref={listaRef}
                  className="absolute z-50 mt-1 bg-[#0f0f0f] border border-white/10 rounded-md shadow-lg w-full max-h-40 overflow-y-auto"
                >
                  {sugestoes.map((s, i) => (
                    <div
                      key={`${s.codigo}-${i}`}
                      className={`px-2 py-1 text-xs flex justify-between cursor-pointer ${
                        i === indiceSelecionado
                          ? "bg-[#1a8ceb]/30"
                          : "hover:bg-[#1a8ceb]/20"
                      }`}
                      // ✅ FIX CRÍTICO:
                      // onMouseDown roda ANTES do document.mousedown e ANTES do blur,
                      // então impede o "autoSelecionarPrimeiro" de pegar sempre o 1º.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selecionarSugestao(s.codigo, s.custo, idx);
                      }}
                      onMouseEnter={() => setIndiceSelecionado(i)}
                    >
                      <span className="text-white">{s.codigo}</span>
                      <span className="text-[#1a8ceb]">
                        R$ {formatBR(s.custo)}
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
                ref={(el) => (qtyRefs.current[idx] = el!)}
                value={item.quantidade}
                placeholder="1"
                onChange={(e) => {
                  const novo = [...composicao];
                  novo[idx].quantidade = e.target.value;
                  setComposicao(novo);
                }}
                onBlur={() => onBlurQuantidade(idx)}
                onKeyDown={(e) => handleKeyDownQuantidade(e, idx)}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>

            {/* Custo */}
            <div>
              <Label className="text-neutral-400 text-[10px] block mb-1">
                Custo (R$)
              </Label>
              <Input
                ref={(el) => (costRefs.current[idx] = el!)}
                value={item.custo}
                placeholder="0,00"
                onChange={(e) => {
                  const novo = [...composicao];
                  novo[idx].custo = e.target.value;
                  setComposicao(novo);
                }}
                onBlur={() => {
                  if (!ignoreBlur.current) onBlurCusto(idx);
                }}
                onKeyDown={(e) => handleKeyDownCusto(e, idx)}
                className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
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
    </div>
  );
}
