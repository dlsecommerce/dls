"use client";

import React from "react";
import { CheckCircle2, X, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  percent: number;
  title?: string;
  current?: number;
  total?: number;
  onClose?: () => void;
};

export default function ExportProgressToastMarketplace({
  open,
  percent,
  title = "Exportando planilha...",
  current,
  total,
  onClose,
}: Props) {
  if (!open) return null;

  const done = percent >= 100;

  const countLabel =
    typeof current === "number" && typeof total === "number" && total > 0
      ? `${current.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} marketplaces`
      : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        fixed left-1/2 top-6 z-[100] w-[92vw] max-w-md
        -translate-x-1/2
        border border-neutral-800 bg-[#0a0a0a]
        px-4 py-3 shadow-2xl
        animate-in fade-in slide-in-from-top-2 duration-200
      "
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-[#1a8ceb]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {done ? "Exportação concluída!" : title}
          </p>

          {countLabel && (
            <p className="mt-0.5 text-xs text-neutral-400">{countLabel}</p>
          )}

          <div className="mt-2 h-1.5 w-full overflow-hidden bg-neutral-900">
            <div
              className="h-full bg-[#1a8ceb] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>

          <p className="mt-1 text-[11px] text-neutral-500 transition-all duration-700 ease-out">
            {percent}%
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 text-neutral-500 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
