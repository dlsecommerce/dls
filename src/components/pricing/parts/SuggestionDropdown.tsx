"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type Sugestao = {
  codigo: string;
  custo: number;
  produto?: string;
  marca?: string;
  packingCost?: number;
  inativo?: boolean; // opcional — não quebra chamadas existentes
};

type SuggestionDropdownProps = {
  isActive: boolean;
  sugestoes: Sugestao[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (
    codigo: string,
    custo: number,
    produto?: string,
    marca?: string,
    packingCost?: number
  ) => void;
  // Props opcionais — todas com fallback seguro
  termoBusca?: string; // usado para highlight
  isLoading?: boolean; // skeleton state
  onHoverIndex?: (index: number) => void; // sync mouse -> teclado
  onClose?: () => void; // Esc
};

// ---------- Helpers ----------

const getBadgeColor = (seed: string) => {
  const colors = [
    "from-[#1a8ceb]/25 to-[#1a8ceb]/5 text-[#5eb2f5]",
    "from-orange-500/25 to-orange-500/5 text-orange-300",
    "from-emerald-500/25 to-emerald-500/5 text-emerald-300",
    "from-purple-500/25 to-purple-500/5 text-purple-300",
    "from-yellow-500/25 to-yellow-500/5 text-yellow-300",
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }

  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (text: string) => {
  const clean = text.trim();
  if (!clean) return "?";

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Escapa caracteres especiais de regex antes de usar no highlight,
// evita erro/crash se o usuário digitar algo como "(" ou "*"
const escapeRegExp = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Renderiza o texto com o termo buscado destacado.
// Se não houver termo ou não houver match, retorna o texto original sem alterações.
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
            className="rounded-sm bg-[#1a8ceb]/25 px-0.5 text-[#8ec9f7]"
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

// ---------- Skeleton (loading state) ----------

const SkeletonRow: React.FC = () => (
  <div className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2">
    <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-2.5 w-32 animate-pulse rounded bg-white/[0.04]" />
    </div>
    <div className="h-6 w-16 shrink-0 animate-pulse rounded-md bg-white/[0.05]" />
  </div>
);

// ---------- Empty state ----------

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
      <span className="text-lg opacity-40">🔍</span>
    </div>
    <div className="text-xs font-medium text-white/50">
      Nenhum produto encontrado
    </div>
    <div className="text-[11px] text-white/30">
      Verifique o código ou tente outro termo
    </div>
  </div>
);

// ---------- Componente principal ----------

export const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
  termoBusca,
  isLoading = false,
  onHoverIndex,
  onClose,
}) => {
  // Refs individuais de cada item, para scroll automático
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Scroll automático para o item selecionado quando navega por teclado
  React.useEffect(() => {
    const el = itemRefs.current[indiceSelecionado];

    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [indiceSelecionado]);

  // Fechar com Esc
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

  if (!showSkeleton && !showEmpty && !showResults) {
    return null;
  }

  return (
    <AnimatePresence>
      {(showSkeleton || showEmpty || showResults) && (
        <motion.div
          ref={listaRef}
          layout
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="
            absolute left-0 top-full z-[999] mt-1.5
            max-h-64 w-full overflow-y-auto overscroll-contain
            rounded-xl border border-white/[0.08]
            bg-[#101010]/95 backdrop-blur-xl
            shadow-[0_20px_50px_rgba(26,140,235,0.08)]
            p-1
            [scrollbar-width:thin]
            [scrollbar-color:rgba(255,255,255,0.15)_transparent]
          "
        >
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* ---------- Loading ---------- */}
          {showSkeleton && (
            <div className="space-y-0.5">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* ---------- Empty ---------- */}
          {showEmpty && <EmptyState />}

          {/* ---------- Resultados ---------- */}
          {showResults &&
            sugestoes.map((s, i) => {
              const isSelected = i === indiceSelecionado;
              const badgeSeed = s.marca || s.codigo;
              const badgeClass = getBadgeColor(badgeSeed);
              const isInativo = Boolean(s.inativo);

              return (
                <motion.button
                  key={`${s.codigo}-${i}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12, delay: i * 0.02 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(s.codigo, s.custo, s.produto, s.marca, s.packingCost);
                  }}
                  onMouseEnter={() => onHoverIndex?.(i)}
                  className={`
                    relative flex w-full items-center gap-2.5
                    rounded-lg px-2.5 py-2.5 text-left transition-all duration-150
                    min-h-[44px]
                    ${isInativo ? "opacity-40" : ""}
                    ${isSelected ? "bg-[#1a8ceb]/[0.12]" : "hover:bg-white/[0.04]"}
                  `}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="suggestion-indicator"
                      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#1a8ceb]"
                      transition={{ duration: 0.15 }}
                    />
                  )}

                  <div
                    className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                      bg-gradient-to-br text-[10px] font-bold
                      ${badgeClass}
                    `}
                  >
                    {getInitials(s.produto || s.codigo)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold tracking-tight text-white">
                      <HighlightedText text={s.codigo} term={termoBusca} />

                      {isInativo && (
                        <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-medium uppercase text-white/40">
                          Inativo
                        </span>
                      )}
                    </div>

                    {s.produto && (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/40">
                        <span className="truncate">
                          <HighlightedText text={s.produto} term={termoBusca} />
                        </span>
                        {s.marca && (
                          <>
                            <span className="text-white/20">·</span>
                            <span className="shrink-0 text-white/35">
                              {s.marca}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`
                        rounded-md px-2 py-1 text-[13px] font-semibold tabular-nums font-mono
                        transition-colors
                        ${isSelected ? "bg-[#1a8ceb]/15 text-[#4db4ff]" : "text-[#1a8ceb]/90"}
                      `}
                    >
                      R$ {s.custo.toFixed(2)}
                    </span>

                    {typeof s.packingCost === "number" && s.packingCost > 0 && (
                      <span className="text-[10px] text-white/30">
                        📦 R$ {s.packingCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}

          {/* Rodapé com dicas de teclado — só aparece com resultados reais */}
          {showResults && (
            <div className="mt-1 flex items-center justify-end gap-3 border-t border-white/[0.06] px-2.5 py-1.5 text-[10px] text-white/30">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono">
                  esc
                </kbd>
                fechar
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
