import React from "react";
import { HelpCircle } from "lucide-react";

type HelpTooltipProps = {
  text: string;
};

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ text }) => (
  <div className="relative group flex items-center">
    <HelpCircle
      className="w-4 h-4 text-neutral-400 cursor-pointer"
      tabIndex={0}
    />

    <div
      className="
        absolute left-6 top-1/2 -translate-y-1/2
        text-neutral-400/70 text-xs whitespace-nowrap font-normal
        opacity-0 transition pointer-events-none z-20

        group-hover:opacity-100
        group-focus-within:opacity-100
      "
    >
      {text}
    </div>
  </div>
);