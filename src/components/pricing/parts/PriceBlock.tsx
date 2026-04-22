import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AnimatedNumber } from "./AnimatedNumber";
import { Copy, X } from "lucide-react";
import type { Calculo } from "../PricingCalculatorModern";

type PriceBlockProps = {
  nome: string;
  blocoIndex: number;
  state: Calculo;
  setState: (c: Calculo) => void;
  preco: number;
  refs: React.MutableRefObject<HTMLInputElement[]>;
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
  handleEmbalagemBlur: (raw: string) => void;
  handleEmbalagemChange: (raw: string) => void;
  onFieldChange?: (key: keyof Calculo, internalValue: string) => void;
  onFieldBlur?: (key: keyof Calculo, internalValue: string) => void;

  onMinimize?: () => void;
};

export const PriceBlock: React.FC<PriceBlockProps> = ({
  nome,
  blocoIndex,
  state,
  setState,
  preco,
  refs,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
  handleLinearNav,
  handleEmbalagemBlur,
  handleEmbalagemChange,
  onFieldChange,
  onFieldBlur,
  onMinimize,
}) => {
  const keys: (keyof Calculo)[] = [
    "desconto",
    "frete",
    "imposto",
    "comissao",
    "margem",
    "marketing",
  ];

  const handleFieldChange = (key: keyof Calculo, raw: string) => {
    const internalValue = toInternal(raw);
    if (onFieldChange) {
      onFieldChange(key, internalValue);
    } else {
      setState({
        ...state,
        [key]: internalValue,
      });
    }
  };

  const handleFieldBlur = (key: keyof Calculo, raw: string) => {
    const internalValue = toInternal(raw);
    if (onFieldBlur) {
      onFieldBlur(key, internalValue);
    } else {
      setState({
        ...state,
        [key]: internalValue,
      });
    }
  };

  const copyPreco = async () => {
    const valorSemSimbolo = preco.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await navigator.clipboard.writeText(valorSemSimbolo);
  };

  return (
    <div className="group relative w-full min-w-0 p-3 sm:p-2 rounded-lg bg-black/30 border border-white/10 flex flex-col justify-center items-center">
      <div className="absolute top-0 right-0 z-20">
        <div className="w-8 h-8 flex items-start justify-end">
          <button
            type="button"
            onClick={onMinimize}
            className={[
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
              "transition-opacity duration-150",
              "p-1",
              "pointer-events-auto",
            ].join(" ")}
            title="Minimizar"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      <h4 className="text-white font-semibold text-sm sm:text-xs mb-2 sm:mb-1 text-center w-full min-w-0">
        {nome}
      </h4>

      {keys.map((key, i) => (
        <div key={key} className="mb-2 sm:mb-1 w-full min-w-0">
          <Label className="text-neutral-400 text-[11px] sm:text-[10px] block">
            {key === "margem"
              ? "Margem de Lucro (%)"
              : key === "frete"
              ? "Frete (R$)"
              : key.charAt(0).toUpperCase() + key.slice(1) + " (%)"}
          </Label>

          <Input
            ref={(el) => (refs.current[i] = el!)}
            type="text"
            inputMode="decimal"
            value={
              isEditing(`${blocoIndex}-${key}`)
                ? (state as any)[key]
                : toDisplay((state as any)[key])
            }
            onFocus={() => setEditing(`${blocoIndex}-${key}`, true)}
            onBlur={(e) => {
              setEditing(`${blocoIndex}-${key}`, false);
              handleFieldBlur(key, e.target.value);
            }}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            onKeyDown={(e) => handleLinearNav(e, i, refs, keys.length)}
            className="w-full min-w-0 bg-black/50 border border-white/10 text-white text-sm sm:text-[11px] rounded-md min-h-[44px] sm:min-h-0 px-3 sm:px-2 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
          />

          {key === "desconto" && (
            <div className="mt-2 sm:mt-1 w-full min-w-0">
              <Label className="text-neutral-400 text-[11px] sm:text-[10px] block">
                Embalagem (R$)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={
                  isEditing(`emb-${blocoIndex}`)
                    ? state.embalagem ?? ""
                    : toDisplay(state.embalagem ?? "")
                }
                onFocus={() => setEditing(`emb-${blocoIndex}`, true)}
                onBlur={(e) => {
                  setEditing(`emb-${blocoIndex}`, false);
                  handleEmbalagemBlur(e.target.value);
                }}
                onChange={(e) => handleEmbalagemChange(e.target.value)}
                className="w-full min-w-0 bg-black/50 border border-white/10 text-white text-sm sm:text-[11px] rounded-md min-h-[44px] sm:min-h-0 px-3 sm:px-2 focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
          )}
        </div>
      ))}

      <div className="mt-2 sm:mt-1 w-full min-w-0 flex flex-col items-center justify-center py-2 sm:py-1 overflow-hidden">
        <span className="text-neutral-300 text-xs sm:text-[10px]">
          Preço de Venda
        </span>

        <div className="flex w-full min-w-0 items-center justify-center gap-2 overflow-hidden sm:w-auto sm:overflow-visible">
          <div className="min-w-0 max-w-full truncate text-xl font-bold leading-tight text-[#1a8ceb] sm:max-w-none sm:text-lg sm:truncate-none">
            R$ <AnimatedNumber value={preco} />
          </div>

          <button
            type="button"
            onClick={copyPreco}
            className="-ml-[3px] shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer transition-opacity"
            title="Copiar"
          >
            <Copy className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};