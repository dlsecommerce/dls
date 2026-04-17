import React from "react";
import { AnimatedNumber } from "./AnimatedNumber";

type TotalCostCardProps = {
  custoTotal: number | string;
};

export const TotalCostCard: React.FC<TotalCostCardProps> = ({ custoTotal }) => (
  <div className="mt-3 p-3 bg-gradient-to-br from-[#1a8ceb]/20 to-[#1a8ceb]/5 rounded-xl border border-[#1a8ceb]/30">
    <div className="flex flex-col items-center justify-center">
      <span className="text-neutral-300 text-xs mb-1">Custo Total</span>
      <span className="text-xl font-bold text-white">
        R$ <AnimatedNumber value={Number(custoTotal)} />
      </span>
    </div>
  </div>
);
