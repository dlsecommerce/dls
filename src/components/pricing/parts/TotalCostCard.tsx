import React from "react";
import { AnimatedNumber } from "./AnimatedNumber";

type TotalCostCardProps = {
  custoTotal: number | string;
};

export const TotalCostCard: React.FC<TotalCostCardProps> = ({ custoTotal }) => (
  <div className="mt-3 rounded-xl border border-white/10 bg-[#1a8ceb] p-4 shadow-sm sm:p-3">
    <div className="flex flex-col items-center justify-center">
      <span className="mb-1 text-sm text-white sm:text-xs">
        Custo Total
      </span>

      <span className="text-center text-2xl font-bold tabular-nums text-white sm:text-xl">
        R$ <AnimatedNumber value={Number(custoTotal)} />
      </span>
    </div>
  </div>
);