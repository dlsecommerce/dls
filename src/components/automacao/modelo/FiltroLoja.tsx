"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
} from "@/components/ui/popover";
import { Filter } from "lucide-react";

interface FiltroLojaProps {
  selectedLoja: string;
  setSelectedLoja: (value: string) => void;
}

export default function FiltroLoja({ selectedLoja, setSelectedLoja }: FiltroLojaProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 🔹 Apenas as duas lojas disponíveis
  const lojas = ["Pikot Shop", "Sóbaquetas"];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.9, rotate: -10 }}
          title="Filtrar loja"
          className={`p-2 rounded-full transition-all hover:bg-white/10 
            ${
              selectedLoja === "Pikot Shop"
                ? "text-[#1A8CEB]"
                : selectedLoja === "Sóbaquetas"
                ? "text-[#f472b6]" // cor diferenciada para Sóbaquetas
                : "text-neutral-400 hover:text-white"
            }`}
        >
          <Filter className="w-5 h-5 scale-[0.85]" />
        </motion.button>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          style={{ position: "fixed", zIndex: 9999 }}
          className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 w-44 p-2 rounded-xl shadow-2xl"
          sideOffset={8}
          align="end"
        >
          <p className="text-xs font-semibold text-white/90 mb-2 px-2">
            Escolher loja
          </p>

          <div className="flex flex-col gap-1">
            {lojas.map((loja) => (
              <button
                key={loja}
                onClick={() => {
                  setSelectedLoja(loja);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all 
                  ${
                    selectedLoja === loja
                      ? "bg-[#1A8CEB]/30 text-[#1A8CEB] border border-[#1A8CEB]/40"
                      : "text-neutral-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {loja}
              </button>
            ))}
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
