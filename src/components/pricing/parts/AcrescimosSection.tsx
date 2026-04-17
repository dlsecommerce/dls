import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator, Copy } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { HelpTooltip } from "./HelpTooltip";

type AcrescimosSectionProps = {
  acrescimos: any;
  setAcrescimos: (value: any) => void;
  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;
  handleLinearNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;
  acrescimosRefs: React.MutableRefObject<HTMLInputElement[]>;
  statusAcrescimo: any;
};

export const AcrescimosSection: React.FC<AcrescimosSectionProps> = ({
  acrescimos,
  setAcrescimos,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
  handleLinearNav,
  acrescimosRefs,
}) => {
  const copyPercent = async (value: any) => {
    const n = Number(value ?? 0);
    const text = Number.isFinite(n) ? n.toFixed(2) : "0.00";
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
      <h4 className="font-bold text-white text-xs mb-2 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-[#1a8ceb]" />
        Cálculo de Acréscimos
        <HelpTooltip text="Calculo de Acréscimo." />
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* ============================
             PREÇO LOJA
           ============================ */}
        <div className="flex flex-col gap-2">
          <div>
            <Label className="text-neutral-400 text-[10px] mb-1 block">
              Preço Loja (R$)
            </Label>

            <Input
              ref={(el) => (acrescimosRefs.current[0] = el!)}
              type="text"
              value={
                isEditing("a-precoLoja")
                  ? acrescimos.precoLoja
                  : toDisplay(acrescimos.precoLoja)
              }
              onFocus={() => setEditing("a-precoLoja", true)}
              onBlur={(e) => {
                setEditing("a-precoLoja", false);
                setAcrescimos({
                  ...acrescimos,
                  precoLoja: toInternal(e.target.value),
                });
              }}
              onChange={(e) =>
                setAcrescimos({
                  ...acrescimos,
                  precoLoja: toInternal(e.target.value),
                })
              }
              onKeyDown={(e) => handleLinearNav(e, 0, acrescimosRefs, 5)}
              className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
            />
          </div>
        </div>

        {/* ============================
             PREÇOS + FRETES
           ============================ */}
        <div className="flex flex-col gap-2">

          {/* PREÇOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-neutral-400 text-[10px] mb-1 block">
                Preço Mercado Livre Clássico (R$)
              </Label>
              <Input
                ref={(el) => (acrescimosRefs.current[1] = el!)}
                type="text"
                value={
                  isEditing("a-precoMLClassico")
                    ? acrescimos.precoMercadoLivreClassico
                    : toDisplay(acrescimos.precoMercadoLivreClassico)
                }
                onFocus={() => setEditing("a-precoMLClassico", true)}
                onBlur={(e) => {
                  setEditing("a-precoMLClassico", false);
                  setAcrescimos({
                    ...acrescimos,
                    precoMercadoLivreClassico: toInternal(e.target.value),
                  });
                }}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    precoMercadoLivreClassico: toInternal(e.target.value),
                  })
                }
                onKeyDown={(e) => handleLinearNav(e, 1, acrescimosRefs, 5)}
                className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>

            <div>
              <Label className="text-neutral-400 text-[10px] mb-1 block">
                Preço Mercado Livre Premium (R$)
              </Label>
              <Input
                ref={(el) => (acrescimosRefs.current[2] = el!)}
                type="text"
                value={
                  isEditing("a-precoMLPremium")
                    ? acrescimos.precoMercadoLivrePremium
                    : toDisplay(acrescimos.precoMercadoLivrePremium)
                }
                onFocus={() => setEditing("a-precoMLPremium", true)}
                onBlur={(e) => {
                  setEditing("a-precoMLPremium", false);
                  setAcrescimos({
                    ...acrescimos,
                    precoMercadoLivrePremium: toInternal(e.target.value),
                  });
                }}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    precoMercadoLivrePremium: toInternal(e.target.value),
                  })
                }
                onKeyDown={(e) => handleLinearNav(e, 2, acrescimosRefs, 5)}
                className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
          </div>

          {/* FRETES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-neutral-400 text-[10px] mb-1 block">
                Frete Clássico (R$)
              </Label>
              <Input
                ref={(el) => (acrescimosRefs.current[3] = el!)}
                type="text"
                value={
                  isEditing("a-freteClassico")
                    ? acrescimos.freteMercadoLivreClassico
                    : toDisplay(acrescimos.freteMercadoLivreClassico)
                }
                onFocus={() => setEditing("a-freteClassico", true)}
                onBlur={(e) => {
                  setEditing("a-freteClassico", false);
                  setAcrescimos({
                    ...acrescimos,
                    freteMercadoLivreClassico: toInternal(e.target.value),
                  });
                }}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    freteMercadoLivreClassico: toInternal(e.target.value),
                  })
                }
                onKeyDown={(e) => handleLinearNav(e, 3, acrescimosRefs, 5)}
                className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>

            <div>
              <Label className="text-neutral-400 text-[10px] mb-1 block">
                Frete Premium (R$)
              </Label>
              <Input
                ref={(el) => (acrescimosRefs.current[4] = el!)}
                type="text"
                value={
                  isEditing("a-fretePremium")
                    ? acrescimos.freteMercadoLivrePremium
                    : toDisplay(acrescimos.freteMercadoLivrePremium)
                }
                onFocus={() => setEditing("a-fretePremium", true)}
                onBlur={(e) => {
                  setEditing("a-fretePremium", false);
                  setAcrescimos({
                    ...acrescimos,
                    freteMercadoLivrePremium: toInternal(e.target.value),
                  });
                }}
                onChange={(e) =>
                  setAcrescimos({
                    ...acrescimos,
                    freteMercadoLivrePremium: toInternal(e.target.value),
                  })
                }
                onKeyDown={(e) => handleLinearNav(e, 4, acrescimosRefs, 5)}
                className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
          </div>

          {/* ============================
               BLOCOS DE ACRÉSCIMO
             ============================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">

            {/* CLÁSSICO */}
            <div
              className={`group flex flex-col justify-center items-center text-[11px] rounded-md p-3 transition-all duration-300 ${
                acrescimos.acrescimoClassico > 0
                  ? "bg-green-500/10 border border-green-500/30"
                  : acrescimos.acrescimoClassico < 0
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <span className="text-neutral-300 mb-1">
                Acréscimo Clássico
              </span>

              <span
                className={`font-semibold text-base inline-flex items-center gap-0 ${
                  acrescimos.acrescimoClassico > 0
                    ? "text-green-400"
                    : acrescimos.acrescimoClassico < 0
                    ? "text-red-400"
                    : "text-neutral-400"
                }`}
              >
                <AnimatedNumber value={Number(acrescimos.acrescimoClassico || 0)} />%
                <button
                  type="button"
                  onClick={() => copyPercent(acrescimos.acrescimoClassico)}
                  className="ml-[3px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  title="Copiar"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            </div>

            {/* PREMIUM */}
            <div
              className={`group flex flex-col justify-center items-center text-[11px] rounded-md p-3 transition-all duration-300 ${
                acrescimos.acrescimoPremium > 0
                  ? "bg-green-500/10 border border-green-500/30"
                  : acrescimos.acrescimoPremium < 0
                  ? "bg-red-500/10 border border-red-500/30"  
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <span className="text-neutral-300 mb-1">
                Acréscimo Premium
              </span>

              <span
                className={`font-semibold text-base inline-flex items-center gap-0 ${
                  acrescimos.acrescimoPremium >  0
                    ? "text-green-400"
                    : acrescimos.acrescimoPremium < 0
                    ? "text-red-400"
                    : "text-neutral-400"
                }`}
              >
                <AnimatedNumber value={Number(acrescimos.acrescimoPremium || 0)} />%
                <button
                  type="button"
                  onClick={() => copyPercent(acrescimos.acrescimoPremium)}
                  className="ml-[3px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  title="Copiar"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
