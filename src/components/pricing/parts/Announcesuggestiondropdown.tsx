"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { AnnounceRateSuggestion } from "@/components/marketplace/hooks/useannouncerates";

type AnnounceSuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: AnnounceRateSuggestion[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (item: AnnounceRateSuggestion) => void;
  termoBusca?: string;
  isLoading?: boolean;
  aplicandoId?: string | null;
  onHoverIndex?: (index: number) => void;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
};

// ---------- Helpers ----------

const escapeRegExp = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const HighlightedText: React.FC<{ text: string; term?: string }> = ({
  text,
  term,
}) => {
  if (!term || !term.trim()) {
    return <>{text}</>;
  }

  const safeTerm = escapeRegExp(term.trim());

  let regex: RegExp;
  try {
    regex = new RegExp(`(${safeTerm})`, "gi");
  } catch {
    return <>{text}</>;
  }

  const parts = text.split(regex);

  if (parts.length === 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.trim().toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-[#1a8ceb]/25 px-0.5 text-[#8ec9f7]"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

const SkeletonRow: React.FC = () => (
  <div className="flex w-full items-center gap-2.5 rounded px-2.5 py-2">
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-2.5 w-40 animate-pulse rounded bg-white/[0.04]" />
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
      <span className="text-lg opacity-40">🔍</span>
    </div>
    <div className="text-xs font-medium text-white/50">
      Nenhum anúncio encontrado
    </div>
    <div className="text-[11px] text-white/30">
      Verifique a referência ou tente outro termo
    </div>
  </div>
);

// ---------- Componente principal ----------

export const AnnounceSuggestionDropdown: React.FC<AnnounceSuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
  termoBusca,
  isLoading = false,
  aplicandoId = null,
  onHoverIndex,
  onClose,
  anchorRef,
}) => {
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const internalWrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = React.useState(false);

  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const target =
        anchorRef?.current ||
        (internalWrapperRef.current?.parentElement as HTMLElement | null);

      if (!target) return;

      const rect = target.getBoundingClientRect();

      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isActive, anchorRef]);

  React.useEffect(() => {
    const el = itemRefs.current[indiceSelecionado];

    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [indiceSelecionado]);

  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onClose]);

  const showSkeleton = isActive && isLoading;
  const showEmpty = isActive && !isLoading && sugestoes.length === 0;
  const showResults = isActive && !isLoading && sugestoes.length > 0;

  if (!mounted) return null;
  if (!showSkeleton && !showEmpty && !showResults) return null;
  if (!coords) return null;

  const dropdownContent = (
    <AnimatePresence>
      {(showSkeleton || showEmpty || showResults) && (
        <motion.div
          ref={(el) => {
            internalWrapperRef.current = el;
            if (listaRef && "current" in listaRef) {
              (listaRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
          }}
          layout
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className="
            max-h-64 overflow-y-auto overscroll-contain
            rounded border border-white/[0.08]
            bg-[#101010]/95 backdrop-blur-xl
            p-1
            [scrollbar-width:thin]
            [scrollbar-color:rgba(255,255,255,0.15)_transparent]
          "
        >
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {showSkeleton && (
            <div className="space-y-0.5">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {showEmpty && <EmptyState />}

          {showResults &&
            sugestoes.map((s, i) => {
              const isSelected = i === indiceSelecionado;
              const isAplicando = aplicandoId === s.announceId;

              return (
                <motion.button
                  key={`${s.announceId}-${i}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  disabled={isAplicando}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12, delay: i * 0.02 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(s);
                  }}
                  onMouseEnter={() => onHoverIndex?.(i)}
                  className={`
                    relative flex w-full items-center gap-2.5
                    rounded px-2.5 py-2.5 text-left transition-all duration-150
                    min-h-[44px] disabled:opacity-50
                    ${isSelected ? "bg-[#1a8ceb]/[0.12]" : "hover:bg-white/[0.04]"}
                  `}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="announce-suggestion-indicator"
                      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#1a8ceb]"
                      transition={{ duration: 0.15 }}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold tracking-tight text-white">
                      <HighlightedText text={s.reference} term={termoBusca} />
                    </div>

                    {(s.product || s.mark) && (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/40">
                        {s.product && (
                          <span className="truncate">
                            <HighlightedText text={s.product} term={termoBusca} />
                          </span>
                        )}

                        {s.product && s.mark && (
                          <span className="text-white/20">·</span>
                        )}

                        {s.mark && (
                          <span className="shrink-0 font-medium text-white/50">
                            {s.mark}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isAplicando && (
                    <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-[#1a8ceb]" />
                  )}
                </motion.button>
              );
            })}

          {showResults && (
            <div className="mt-1 flex items-center justify-end gap-3 border-t border-white/[0.06] px-2.5 py-1.5 text-[10px] text-white/30">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                Selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  ESC
                </kbd>
                Fechar
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dropdownContent, document.body);
};
