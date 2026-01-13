import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AnimatedNumber } from "./AnimatedNumber";
import { Copy } from "lucide-react";
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

  /* ============================
     COPY PREÇO (SÓ VALOR PT-BR)
     ============================ */
  const copyPreco = async () => {
    const valorSemSimbolo = preco.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await navigator.clipboard.writeText(valorSemSimbolo);
  };

  return (
    <div className="group p-2 rounded-lg bg-black/30 border border-white/10 flex flex-col justify-center items-center">
      <h4 className="text-white font-semibold text-xs mb-1 text-center">
        {nome}
      </h4>

      {keys.map((key, i) => (
        <div key={key} className="mb-1 w-full">
          <Label className="text-neutral-400 text-[10px] block">
            {key === "margem"
              ? "Margem de Lucro (%)"
              : key === "frete"
              ? "Frete (R$)"
              : key.charAt(0).toUpperCase() + key.slice(1) + " (%)"}
          </Label>

          <Input
            ref={(el) => (refs.current[i] = el!)}
            type="text"
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
            className="bg-black/50 border border-white/10 text-white text-[11px] rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
          />

          {key === "desconto" && (
            <div className="mt-1">
              <Label className="text-neutral-400 text-[10px] block">
                Embalagem (R$)
              </Label>
              <Input
                type="text"
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
                className="bg-black/50 border border-white/10 text-white text-[11px] rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
              />
            </div>
          )}
        </div>
      ))}

      {/* ============================
           PREÇO DE VENDA + COPY
         ============================ */}
      <div className="mt-1 flex flex-col items-center justify-center py-1">
        <span className="text-neutral-300 text-[10px]">
          Preço de Venda
        </span>

        <div className="flex items-center gap-2">
          <div className="text-lg font-bold text-[#1a8ceb] leading-tight">
            R$ <AnimatedNumber value={preco} />
          </div>

          <button
            type="button"
            onClick={copyPreco}
            className="-ml-[3px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
            title="Copiar valor"
          >
            <Copy className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
