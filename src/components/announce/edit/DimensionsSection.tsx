"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  Weight,
  MoveVertical,
  MoveHorizontal,
  Box,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const parseValorBR = (v: string) => {
  if (!v) return "";
  return v.replace(/\./g, "").replace(",", ".");
};

const formatDisplayValue = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
};

const fields = [
  {
    label: "Peso embalado",
    key: "peso",
    unit: "g",
    icon: Weight,
    placeholder: "0",
  },
  {
    label: "Altura",
    key: "altura",
    unit: "cm",
    icon: MoveVertical,
    placeholder: "0",
  },
  {
    label: "Largura",
    key: "largura",
    unit: "cm",
    icon: MoveHorizontal,
    placeholder: "0",
  },
  {
    label: "Comprimento",
    key: "comprimento",
    unit: "cm",
    icon: Box,
    placeholder: "0",
  },
];

export const DimensionsSection = ({ produto, setProduto }: any) => {
  const [open, setOpen] = useState(true);

  const handleChange = (key: string, value: string) => {
    setProduto((p: any) => ({
      ...p,
      [key]: value,
    }));
  };

  const handleBlur = (key: string, value: string) => {
    const parsed = parseValorBR(value);

    setProduto((p: any) => ({
      ...p,
      [key]: parsed,
    }));
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left transition-colors duration-300 hover:text-white"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
              4.
            </span>

            <h2 className="text-base font-semibold text-white">
              Peso e medidas
            </h2>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Dimensões reais do produto embalado para cálculo de frete.
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
            key="dimensions-content"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const Icon = field.icon;
                  const value = produto?.[field.key] ?? "";

                  return (
                    <div key={field.key} className="min-w-0">
                      <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
                        <Icon className="h-3.5 w-3.5 text-[#1a8ceb]/75" />
                        {field.label}
                      </Label>

                      <div
                        className="
                          flex h-10 items-center rounded-lg border border-white/10
                          bg-[#101010]
                          focus-within:border-[#1a8ceb]/70
                          focus-within:ring-1 focus-within:ring-[#1a8ceb]/30
                        "
                      >
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={field.placeholder}
                          value={formatDisplayValue(value)}
                          onChange={(e) =>
                            handleChange(field.key, e.target.value)
                          }
                          onBlur={(e) => handleBlur(field.key, e.target.value)}
                          className="
                            h-full flex-1 border-0 bg-transparent px-3 py-0
                            text-sm font-semibold text-white shadow-none outline-none
                            placeholder:text-white/20
                            focus-visible:ring-0 focus-visible:ring-offset-0
                          "
                        />

                        <span className="flex h-full min-w-12 items-center justify-center border-l border-white/10 px-3 text-xs font-semibold text-white/55">
                          {field.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#181818] px-4 py-3">
                <p className="text-xs leading-relaxed text-white/45">
                  Use as medidas do produto já embalado. Essas informações podem
                  impactar diretamente o cálculo de frete e a aprovação do
                  anúncio.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};