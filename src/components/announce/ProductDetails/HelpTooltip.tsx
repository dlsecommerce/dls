"use client";

import { HelpCircle } from "lucide-react";

export const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-5 h-5 md:w-4 md:h-4 text-neutral-400 cursor-pointer" />

    <div
      className="
        absolute left-7 md:left-6 top-1/2 -translate-y-1/2
        text-neutral-400/80 md:text-neutral-400/70
        text-sm md:text-xs
        whitespace-nowrap font-normal
        opacity-0 group-hover:opacity-100
        transition pointer-events-none z-20
        bg-[#0f0f0f] md:bg-transparent
        px-2 py-1 rounded-md md:p-0
        shadow-md md:shadow-none
      "
    >
      {text}
    </div>
  </div>
);