"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, TrendingUp, ShoppingBag } from "lucide-react";
import AnimatedNumber from "@/components/marketplaces/shopee/details/AnimatedNumber";

const campos = [
  {
    key: "desconto",
    label: "Desconto",
    unit: "(%)",
    suffix: "%",
  },
  {
    key: "embalagem",
    label: "Embalagem",
    unit: "(R$)",
    suffix: "R$",
  },
  {
    key: "frete",
    label: "Frete",
    unit: "(R$)",
    suffix: "R$",
  },
  {
    key: "imposto",
    label: "Imposto",
    unit: "(%)",
    suffix: "%",
  },
  {
    key: "comissao",
    label: "Comissão",
    unit: "(%)",
    suffix: "%",
  },
  {
    key: "margem",
    label: "Margem de Lucro",
    unit: "(%)",
    suffix: "%",
  },
  {
    key: "marketing",
    label: "Marketing",
    unit: "(%)",
    suffix: "%",
  },
];

const formatDisplayValue = (value: any) => {
  if (value === undefined || value === null || value === "") return "";

  return String(value).replace(".", ",");
};

const CalculoPrecoBox = ({
  calculoLoja,
  setCalculoLoja,
  precoLoja,
  loading,
}: any) => {
  const [open, setOpen] = useState(true);

  const updateCampo = (key: string, value: string) => {
    const internalValue = value.replace(",", ".");

    setCalculoLoja({
      ...calculoLoja,
      [key]: internalValue,
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left transition-colors duration-300 hover:text-white"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
              3.
            </span>

            <h2 className="truncate text-base font-semibold text-white">
              Preço de Venda por Canal
            </h2>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Configure os percentuais, custos e margens usados para calcular o
            preço final de venda do anúncio na Shopee.
          </p>
        </div>

        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-1 shrink-0"
        >
          <ChevronUp className="h-4 w-4 text-white/45" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="calculo-preco-shopee-content"
            initial={{
              height: 0,
              opacity: 0,
              y: -6,
            }}
            animate={{
              height: "auto",
              opacity: 1,
              y: 0,
            }}
            exit={{
              height: 0,
              opacity: 0,
              y: -6,
            }}
            transition={{
              height: {
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: 0.45,
                ease: "easeOut",
              },
              y: {
                duration: 0.45,
                ease: "easeOut",
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#151515]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#181818] px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1a8ceb]/35 bg-[#1a8ceb]/15 shadow-sm">
                      <ShoppingBag className="h-5 w-5 text-[#1a8ceb]" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        Shopee
                      </div>

                      <div className="mt-0.5 truncate text-xs text-white/45">
                        Marketplace
                      </div>
                    </div>
                  </div>

                  <TrendingUp className="hidden h-5 w-5 text-[#1a8ceb]/60 sm:block" />
                </div>

                <div className="divide-y divide-white/10">
                  {campos.map((campo) => (
                    <div
                      key={campo.key}
                      className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_140px] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {campo.label}
                        </div>

                        <div className="mt-0.5 text-xs text-white/45">
                          {campo.unit}
                        </div>
                      </div>

                      <div className="flex h-10 w-full items-center rounded-lg border border-white/10 bg-[#070707] px-2 transition focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
                        <input
                          value={formatDisplayValue(calculoLoja?.[campo.key])}
                          inputMode="decimal"
                          disabled={loading}
                          placeholder="0,00"
                          onChange={(e) =>
                            !loading && updateCampo(campo.key, e.target.value)
                          }
                          className="
                            h-full w-full min-w-0 bg-transparent text-right text-sm font-semibold text-white
                            outline-none placeholder:text-white/20
                            disabled:cursor-not-allowed disabled:opacity-60
                            focus:outline-none focus:ring-0
                            focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
                          "
                        />

                        <span className="ml-1 shrink-0 text-xs font-semibold text-white/45">
                          {campo.suffix}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 gap-2 bg-[#181818] px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        Preço de Venda
                      </div>

                      <div className="mt-0.5 text-xs text-white/45">
                        Calculado (R$)
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xl font-bold tabular-nums text-[#1a8ceb]">
                        R$ <AnimatedNumber value={Number(precoLoja || 0)} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CalculoPrecoBox;