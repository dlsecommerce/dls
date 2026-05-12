"use client";

import { TrendingUp } from "lucide-react";
import AnimatedNumber from "@/components/marketplaces/tray/details/AnimatedNumber";
import CampoPercentual from "./CampoPercentual";

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
}: any) => {
  const updateCampo = (key: string, value: string) => {
    const internalValue = value.replace(",", ".");

    setCalculoLoja({
      ...calculoLoja,
      [key]: internalValue,
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      {/* Header */}
      <div className="mb-4">
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
          preço final de venda do anúncio no canal Tray.
        </p>
      </div>

      {/* Layout desktop igual à tabela por canal */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="hidden grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] border-b border-white/10 bg-[#181818] lg:grid">
          <div className="px-4 py-4 text-sm font-semibold text-white">
            Canal
          </div>

          {campos.map((campo) => (
            <div
              key={campo.key}
              className="px-2 py-4 text-center text-sm font-semibold text-white"
            >
              {campo.label}

              <div className="mt-1 text-xs text-white/55">{campo.unit}</div>
            </div>
          ))}

          <div className="px-4 py-4 text-center text-sm font-semibold text-white">
            Preço de Venda

            <div className="mt-1 text-xs text-white/55">Calculado (R$)</div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          <div className="group/row grid grid-cols-1 gap-3 bg-[#151515] p-4 lg:grid-cols-[220px_repeat(7,minmax(92px,1fr))_170px] lg:items-center lg:gap-0 lg:p-0">
            {/* Canal */}
            <div className="flex items-center justify-between gap-3 lg:px-4 lg:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1a8ceb]/35 bg-[#1a8ceb]/15 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-[#1a8ceb]" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    Tray
                  </div>

                  <div className="mt-0.5 truncate text-xs text-white/45">
                    Marketplace
                  </div>
                </div>
              </div>
            </div>

            {/* Campos desktop */}
            {campos.map((campo) => (
              <div key={campo.key} className="hidden lg:block lg:px-2 lg:py-5">
                <div className="mx-auto flex h-10 w-full max-w-[96px] items-center rounded-lg border border-white/10 bg-[#070707] px-2 transition focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
                  <input
                    value={formatDisplayValue(calculoLoja?.[campo.key])}
                    inputMode="decimal"
                    onChange={(e) => updateCampo(campo.key, e.target.value)}
                    className="
                      h-full w-full min-w-0 bg-transparent text-center text-sm font-semibold text-white
                      outline-none placeholder:text-white/20
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

            {/* Campos mobile usando o componente original */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {campos.map((campo) => (
                <CampoPercentual
                  key={campo.key}
                  keyName={campo.key}
                  calculoLoja={calculoLoja}
                  setCalculoLoja={setCalculoLoja}
                  label={`${campo.label} ${campo.unit}`}
                />
              ))}
            </div>

            {/* Preço */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 lg:border-t-0 lg:px-4 lg:py-5">
              <span className="text-xs font-medium text-white/45 lg:hidden">
                Preço de Venda
              </span>

              <div className="flex w-full items-center justify-end gap-1.5">
                <span className="text-xl font-bold tabular-nums text-[#1a8ceb]">
                  R$ <AnimatedNumber value={Number(precoLoja || 0)} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalculoPrecoBox;