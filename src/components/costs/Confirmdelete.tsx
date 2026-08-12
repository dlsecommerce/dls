// ConfirmDelete.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "danger" | "warning";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
  title?: string;
  itemLabel?: string;
  itemLabelPlural?: string;
  items?: string[];
  severity?: Severity;
  requireExtraConfirmThreshold?: number;
  errorMessage?: string | null;
};

const SEVERITY_MAP = {
  danger: {
    icon: "text-red-500",
    box: "border-red-500/30 bg-red-500/5 text-red-400",
    button: "bg-red-600 hover:bg-red-500",
  },
  warning: {
    icon: "text-amber-500",
    box: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    button: "bg-amber-600 hover:bg-amber-500",
  },
} as const;

export default function ConfirmDelete({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  title = "Excluir Produto(s)",
  itemLabel = "produto selecionado",
  itemLabelPlural = "produtos selecionados",
  items,
  severity = "danger",
  requireExtraConfirmThreshold = 20,
  errorMessage,
}: Props) {
  const s = SEVERITY_MAP[severity];
  const needsExtraConfirm = count >= requireExtraConfirmThreshold;
  const [extraConfirmed, setExtraConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isBusy = loading || submitting;

  useEffect(() => {
    if (!open) {
      setExtraConfirmed(false);
      setSubmitting(false);
    }
  }, [open]);

  const confirmDisabled = isBusy || (needsExtraConfirm && !extraConfirmed);

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const previewItems = items?.slice(0, 3);
  const remainingCount = items ? Math.max(items.length - 3, 0) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isBusy) return;
        onOpenChange(v);
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => isBusy && e.preventDefault()}
        onInteractOutside={(e) => isBusy && e.preventDefault()}
        data-testid="confirm-delete-dialog"
        className="
          w-[calc(100vw-16px)] max-w-[calc(100vw-16px)]
          sm:max-w-md
          max-h-[calc(100dvh-16px)] overflow-y-auto
          !rounded-[2px] border border-neutral-800
          bg-[#0a0a0a] text-white
          p-0
          [&>button]:hidden
        "
      >
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-neutral-800 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <AlertTriangle className={cn("h-4 w-4", s.icon)} />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-neutral-300">
            Deseja realmente excluir{" "}
            <span className="font-semibold text-red-500">{count}</span>{" "}
            {count === 1 ? itemLabel : itemLabelPlural}?
          </p>

          {previewItems && (
            <ul className="border border-neutral-800 bg-neutral-900/40 p-2 text-xs text-neutral-500 space-y-1">
              {previewItems.map((name, i) => (
                <li key={i} className="truncate">• {name}</li>
              ))}
              {remainingCount > 0 && (
                <li className="text-neutral-600">
                  e mais {remainingCount} {remainingCount === 1 ? "item" : "itens"}...
                </li>
              )}
            </ul>
          )}

          <div className={cn("flex items-start gap-2 border p-3 text-sm", s.box)}>
            <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon)} />
            <span>
              <strong>Atenção:</strong> Esta ação é permanente e não poderá ser desfeita.
            </span>
          </div>

          {needsExtraConfirm && (
            <label className="flex items-start gap-2 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={extraConfirmed}
                onChange={(e) => setExtraConfirmed(e.target.checked)}
                disabled={isBusy}
                className="mt-0.5 h-4 w-4 accent-red-500"
              />
              Confirmo que quero excluir esses {count} itens em massa.
            </label>
          )}

          {errorMessage && (
            <div role="alert" className="border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
            className="h-9 w-full sm:w-auto px-4 border border-neutral-700 text-sm text-white hover:bg-neutral-900 disabled:opacity-50 rounded-[2px] cursor-pointer disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={handleConfirm}
            className={cn(
              "h-9 w-full sm:w-auto px-4 flex items-center justify-center gap-2 text-sm font-medium text-white disabled:opacity-60 rounded-[2px] cursor-pointer disabled:cursor-not-allowed",
              s.button
            )}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
