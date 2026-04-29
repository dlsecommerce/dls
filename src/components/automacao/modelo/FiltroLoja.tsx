"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";

interface FiltroLojaProps {
  selectedLoja: string;
  setSelectedLoja: (value: string) => void;
}

export default function FiltroLoja({ selectedLoja, setSelectedLoja }: FiltroLojaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🔹 Apenas as duas lojas disponíveis
  const lojas = ["Pikot Shop", "Sóbaquetas"];

  return (
    <>
      {/* Desktop original */}
      <div className="hidden md:block">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.9, rotate: -10 }}
              title="Filtrar loja"
              className={`p-2 rounded-full transition-all hover:bg-white/10 
                ${
                  selectedLoja === "Pikot Shop"
                    ? "text-[#1f717b]"
                    : selectedLoja === "Sóbaquetas"
                    ? "text-[#f0ad26]" // cor diferenciada para Sóbaquetas
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
                          ? loja === "Sóbaquetas"
                            ? "bg-[#f0ad26]/20 text-[#f0ad26] border border-[#f0ad26]/40"
                            : "bg-[#1f717b]/25 text-[#1f717b] border border-[#1f717b]/40"
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
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <motion.button
          whileTap={{ scale: 0.94 }}
          title="Filtrar loja"
          onClick={() => setMobileOpen(true)}
          className={`h-11 min-w-11 px-3 rounded-full transition-all flex items-center justify-center gap-2 border touch-manipulation
            ${
              selectedLoja === "Pikot Shop"
                ? "text-[#1f717b] bg-[#1f717b]/10 border-[#1f717b]/30"
                : selectedLoja === "Sóbaquetas"
                ? "text-[#f0ad26] bg-[#f0ad26]/10 border-[#f0ad26]/30"
                : "text-neutral-300 bg-white/5 border-white/10"
            }`}
        >
          <Filter className="w-5 h-5" />
          <span className="text-xs font-semibold max-w-[92px] truncate">
            {selectedLoja}
          </span>
        </motion.button>

        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-[99999] flex items-end">
              <motion.div
                className="absolute inset-0 bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />

              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.35 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 650) {
                    setMobileOpen(false);
                  }
                }}
                initial={{ y: "100%", opacity: 0.8 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.8 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative z-[100000] w-full rounded-t-[28px] border border-white/10 bg-[#0f0f0f] shadow-2xl px-4 pt-3 pb-[calc(64px+env(safe-area-inset-bottom))]"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-base font-semibold text-white">
                      Escolher loja
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Selecione a loja para filtrar os arquivos.
                    </p>
                  </div>

                  <button
                    onClick={() => setMobileOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {lojas.map((loja) => (
                    <button
                      key={loja}
                      onClick={() => {
                        setSelectedLoja(loja);
                        setMobileOpen(false);
                      }}
                      className={`w-full text-left px-4 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] touch-manipulation
                        ${
                          selectedLoja === loja
                            ? loja === "Sóbaquetas"
                              ? "bg-[#f0ad26]/20 text-[#f0ad26] border border-[#f0ad26]/40"
                              : "bg-[#1f717b]/20 text-[#1f717b] border border-[#1f717b]/40"
                            : "text-neutral-300 bg-white/5 border border-white/10"
                        }`}
                    >
                      {loja}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}