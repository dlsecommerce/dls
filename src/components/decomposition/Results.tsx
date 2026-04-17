import React from "react";
import { HelpCircle, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Item } from "@/components/decomposition/CompositionCosts";

export type ResultadoView = {
  codigo: string;
  unitFmt: string;
  totalFmt: string;
  hasCost: boolean;
};

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs font-normal whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
      {text}
    </div>
  </div>
);

type Props = {
  resultados: ResultadoView[];
  composicao: Item[];
  precoVenda: string;
  enableScroll: boolean;
};

export default function Resultados({
  resultados,
  composicao,
  precoVenda,
  enableScroll,
}: Props) {
  // Garante que tenha pelo menos 1 bloco de exemplo
  const blocos = composicao.length > 0 ? composicao : [{ codigo: "", quantidade: "", custo: "" }];

  // Ativa scroll automático ao atingir 10 blocos
  const wrapperClass =
    composicao.length >= 10
      ? "max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1a8ceb]/30 scrollbar-track-transparent"
      : "";

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1a8ceb]" />
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Resultados
            <HelpTooltip text="Resultados do Preço de Venda." />
          </h3>
        </div>
      </div>

      {/* Lista */}
      <div className={wrapperClass}>
        {blocos.map((item, idx) => {
          const resultado = resultados[idx];
          const hasCost = resultado?.hasCost ?? !!item.custo;

          return (
            <div
              key={idx}
              className={`p-2 rounded-lg border mb-2 transition-colors ${
                hasCost
                  ? "bg-[#1a8ceb]/10 border-[#1a8ceb]/30"
                  : "bg-black/30 border-white/10"
              }`}
            >
              <span className="text-white text-xs block mb-1">
                {item.codigo || "SKU"}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-neutral-300 text-[10px] block mb-1">
                    Unitário (R$)
                  </Label>
                  <Input
                    value={resultado?.unitFmt || ""}
                    placeholder="0,00"
                    readOnly
                    className={`text-xs rounded-md bg-black/50 text-white ${
                      hasCost
                        ? "border-[#1a8ceb]/50 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                        : "border-white/10 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                    }`}
                  />
                </div>

                <div>
                  <Label className="text-neutral-300 text-[10px] block mb-1">
                    Total (R$)
                  </Label>
                  <Input
                    value={resultado?.totalFmt || ""}
                    placeholder="0,00"
                    readOnly
                    className={`text-xs rounded-md bg-black/50 text-white ${
                      hasCost
                        ? "border-[#1a8ceb]/50 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                        : "border-white/10 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
