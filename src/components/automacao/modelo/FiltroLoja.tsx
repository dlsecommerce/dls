"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
} from "@/components/ui/popover";
import { Check, ChevronDown, Filter, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiltroLojaProps {
  selectedLoja: string;
  setSelectedLoja: (value: string) => void;
}

const lojas = ["Pikot Shop", "Sóbaquetas"];

const getStoreTheme = (loja: string) => {
  if (loja === "Sóbaquetas") {
    return {
      text: "text-[#f0ad26]",
      bg: "bg-[#f0ad26]/10",
      border: "border-[#f0ad26]/30",
      activeBg: "bg-[#f0ad26]/20",
      activeBorder: "border-[#f0ad26]/40",
      dot: "bg-[#f0ad26]",
    };
  }

  return {
    text: "text-[#1A8CEB]",
    bg: "bg-[#1A8CEB]/10",
    border: "border-[#1A8CEB]/30",
    activeBg: "bg-[#1A8CEB]/15",
    activeBorder: "border-[#1A8CEB]/40",
    dot: "bg-[#1A8CEB]",
  };
};

export default function FiltroLoja({
  selectedLoja,
  setSelectedLoja,
}: FiltroLojaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedTheme = getStoreTheme(selectedLoja);

  return (
    <>
      {/* Desktop */}
      <div className="hidden max-w-full md:block">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              title="Filtrar loja"
              className={cn(
                "flex h-11 max-w-[220px] cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-3.5",
                "bg-white/[0.035] text-sm font-semibold transition-all",
                "hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]",
                selectedTheme.border
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                  selectedTheme.bg,
                  selectedTheme.border,
                  selectedTheme.text
                )}
              >
                <Store className="h-4 w-4" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                  Loja
                </span>

                <span
                  className={cn(
                    "mt-1 block w-full truncate text-left text-xs font-bold",
                    selectedTheme.text
                  )}
                >
                  {selectedLoja}
                </span>
              </span>

              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-white/35 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </motion.button>
          </PopoverTrigger>

          <PopoverPortal>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={10}
              collisionPadding={16}
              avoidCollisions
              className="
                z-[9999] w-[min(16rem,calc(100vw-2rem))]
                rounded-2xl border border-white/10 bg-[#0f0f0f]/95
                p-2 shadow-2xl backdrop-blur-xl
              "
            >
              <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 shrink-0 text-white/45" />

                  <p className="truncate text-xs font-bold text-white">
                    Escolher loja
                  </p>
                </div>

                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  Ao trocar a loja, os arquivos selecionados são limpos para
                  evitar inconsistências.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                {lojas.map((loja) => {
                  const isSelected = selectedLoja === loja;
                  const theme = getStoreTheme(loja);

                  return (
                    <button
                      key={loja}
                      type="button"
                      onClick={() => {
                        setSelectedLoja(loja);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all",
                        "active:scale-[0.98]",
                        isSelected
                          ? cn(theme.activeBg, theme.text, theme.activeBorder)
                          : "border-transparent text-neutral-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            isSelected ? theme.dot : "bg-white/20"
                          )}
                        />

                        <span className="truncate font-semibold">{loja}</span>
                      </span>

                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          title="Filtrar loja"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "flex h-11 min-w-11 max-w-[160px] cursor-pointer touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-full border px-3 transition-all",
            selectedTheme.text,
            selectedTheme.bg,
            selectedTheme.border
          )}
        >
          <Store className="h-5 w-5 shrink-0" />

          <span className="min-w-0 truncate text-xs font-semibold">
            {selectedLoja}
          </span>

          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </motion.button>

        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-[99999] flex items-end overflow-hidden">
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
                className="
                  relative z-[100000] w-full max-w-full rounded-t-[28px]
                  border border-white/10 bg-[#0f0f0f] px-4
                  pb-[calc(64px+env(safe-area-inset-bottom))]
                  pt-3 shadow-2xl
                "
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">
                      Escolher loja
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      A troca de loja limpa os arquivos selecionados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {lojas.map((loja) => {
                    const isSelected = selectedLoja === loja;
                    const theme = getStoreTheme(loja);

                    return (
                      <button
                        key={loja}
                        type="button"
                        onClick={() => {
                          setSelectedLoja(loja);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                          isSelected
                            ? cn(theme.activeBg, theme.text, theme.activeBorder)
                            : "border-white/10 bg-white/5 text-neutral-300"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              isSelected ? theme.dot : "bg-white/20"
                            )}
                          />

                          <span className="truncate">{loja}</span>
                        </span>

                        {isSelected && <Check className="h-5 w-5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}