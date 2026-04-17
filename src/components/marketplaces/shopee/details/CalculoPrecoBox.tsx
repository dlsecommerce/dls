"use client";

import { TrendingUp } from "lucide-react";
import AnimatedNumber from "@/components/marketplaces/tray/details/AnimatedNumber";
import CampoPercentual from "./CampoPercentual";
import AcoesCalculo from "./AcoesCalculo";
import { Label } from "@/components/ui/label";

const CalculoPrecoBox = ({
  calculoLoja,
  setCalculoLoja,
  precoLoja,
  saving,
  handleClearLocal,
  handleSave,
  produto,
}: any) => {
  return (
    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1a8ceb]" />
          <h3 className="text-base font-bold text-white">Cálculo de Preço</h3>
        </div>

        <AcoesCalculo
          saving={saving}
          handleClearLocal={handleClearLocal}
          handleSave={handleSave}
        />
      </div>

      {/* Campos */}
      {["desconto", "frete", "imposto", "comissao", "margem", "marketing"].map(
        (key) => (
          <CampoPercentual
            key={key}
            keyName={key}
            calculoLoja={calculoLoja}
            setCalculoLoja={setCalculoLoja}
            label={
              key === "margem"
                ? "Margem de Lucro (%)"
                : key === "frete"
                ? "Frete (R$)"
                : key.charAt(0).toUpperCase() + key.slice(1) + " (%)"
            }
          />
        )
      )}

      {/* Preço final */}
      <div className="mt-3 text-center">
        <span className="text-white text-xs">Preço de Venda</span>
        <div className="text-xl font-bold text-[#1a8ceb]">
          R$ <AnimatedNumber value={precoLoja} />
        </div>
      </div>

      {/* ID exibido */}
      <div className="mt-4">
        <input
          type="text"
          value={produto?.id?.toString() ?? ""}
          disabled
          className="
            w-full 
            bg-[#202020]
            border border-white/10
            rounded-md
            text-white 
            text-sm
            px-4 
            h-[40px]
            opacity-80 
            cursor-not-allowed
            focus:outline-none
          "
        />
      </div>
    </div>
  );
};

export default CalculoPrecoBox;
