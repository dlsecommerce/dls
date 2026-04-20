"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

type Sugestao = {
  id: string;
  label: string;
  href: string;
  category: string;
  description?: string;
};

type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  listaRef: React.RefObject<HTMLDivElement | null>;
  indiceSelecionado: number;
  onSelect: (href: string) => void;
  position: {
    top: number;
    left: number;
    width: number;
  };
};

export const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
  position,
}) => {
  const [mounted, setMounted] = useState(false);
  const [safeWidth, setSafeWidth] = useState(position.width);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateSafeWidth = () => {
      const isMobile = window.innerWidth < 640;
      const availableWidth = window.innerWidth - position.left - 24;

      const calculatedWidth = isMobile
        ? Math.min(position.width, availableWidth)
        : Math.min(Math.max(position.width + 100, 560), availableWidth);

      setSafeWidth(calculatedWidth);
    };

    updateSafeWidth();
    window.addEventListener("resize", updateSafeWidth);

    return () => {
      window.removeEventListener("resize", updateSafeWidth);
    };
  }, [mounted, position]);

  if (!mounted || !isActive || !sugestoes.length) {
    return null;
  }

  return createPortal(
    <div
      ref={listaRef}
      className="fixed z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${safeWidth}px`,
      }}
    >
      <GlassmorphicCard
        className="
          overflow-hidden
          rounded-xl
          border-white/10
          bg-[#111111]/40
          backdrop-blur-2xl
          shadow-[0_18px_50px_rgba(0,0,0,0.35)]
        "
      >
        <div className="border-b border-white/5 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45 sm:text-xs">
            <Search className="h-4 w-4" />
            Sugestões de pesquisa
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-1 sm:py-2">
          {sugestoes.map((s, i) => {
            const isSelected = i === indiceSelecionado;

            return (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(s.href)}
                className={`
                  group relative flex w-full cursor-pointer flex-col items-start gap-3
                  px-3 py-3 text-left transition-all duration-150
                  sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-4 sm:py-4
                  ${isSelected ? "bg-[#1a8ceb]/12" : "hover:bg-[#1a8ceb]/8"}
                `}
              >
                <span
                  className={`
                    absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-all
                    ${
                      isSelected
                        ? "bg-[#1a8ceb] opacity-100"
                        : "bg-transparent opacity-0 group-hover:opacity-100"
                    }
                  `}
                />

                <div className="min-w-0 flex-1 pl-2">
                  <div
                    className={`
                      text-sm font-semibold transition-colors sm:text-base
                      ${
                        isSelected
                          ? "text-white"
                          : "text-white/90 group-hover:text-white"
                      }
                    `}
                  >
                    {s.label}
                  </div>

                  {s.description && (
                    <div
                      className={`
                        mt-1 text-xs leading-5 transition-colors sm:text-sm sm:leading-relaxed
                        ${
                          isSelected
                            ? "text-white/75"
                            : "text-white/55 group-hover:text-white/70"
                        }
                      `}
                    >
                      {s.description}
                    </div>
                  )}
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <span
                    className={`
                      inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px]
                      font-medium uppercase tracking-wide transition-all sm:px-3 sm:py-1.5 sm:text-xs
                      ${
                        isSelected
                          ? "border-[#1a8ceb]/30 bg-[#1a8ceb]/10 text-[#58b7ff]"
                          : "border-white/10 bg-white/[0.03] text-white/50 group-hover:border-[#1a8ceb]/20 group-hover:text-[#58b7ff]"
                      }
                    `}
                  >
                    {s.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </GlassmorphicCard>
    </div>,
    document.body
  );
};