// ConfirmDelete.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, ClipboardList } from "lucide-react";

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

const RED = "#ef4444";
const AMBER = "#f59e0b";

const SEVERITY_COLOR: Record<Severity, string> = {
  danger: RED,
  warning: AMBER,
};

const SEVERITY_HOVER: Record<Severity, string> = {
  danger: "#f87171",
  warning: "#fbbf24",
};

/** Componente cabeçalho das seções (idêntico ao ConfirmImportModal) */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center border border-neutral-800 text-neutral-500">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-300">{title}</p>
        <p className="text-[10px] text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

/** Caixa de alerta (mesmo padrão do ConfirmImportModal) */
function AlertBox({
  color,
  title,
  message,
}: {
  color: string;
  title: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="border border-neutral-800 p-3"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-neutral-800"
          style={{ color }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div>
          <strong className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
            {title}
          </strong>
          <p className="mt-1.5 text-[11px] text-neutral-400">{message}</p>
        </div>
      </div>
    </div>
  );
}

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
  const ACCENT = SEVERITY_COLOR[severity];
  const ACCENT_HOVER = SEVERITY_HOVER[severity];

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
  const targetLabel = `${count} ${count === 1 ? itemLabel : itemLabelPlural}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isBusy) return;
        onOpenChange(v);
      }}
    >
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => isBusy && e.preventDefault()}
        onInteractOutside={(e) => isBusy && e.preventDefault()}
        data-testid="confirm-delete-dialog"
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl rounded-none w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-md sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] [&>button]:hidden"
      >
        {/* Cabeçalho */}
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">{title}</DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{targetLabel}</p>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          {/* Resumo */}
          <div>
            <SectionHeader
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              title="Resumo da exclusão"
              description="Confira os itens antes de confirmar."
            />
            <div className="flex items-center gap-2 border border-neutral-800 px-3 py-2">
              <span className="text-[11px] text-neutral-500">Deseja excluir</span>
              <span
                className="border px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: `${ACCENT}40`, color: ACCENT, backgroundColor: `${ACCENT}14` }}
              >
                {count} {count === 1 ? itemLabel : itemLabelPlural}
              </span>
            </div>
          </div>

          {/* Preview de itens */}
          {previewItems && previewItems.length > 0 && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div>
                <SectionHeader
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  title="Itens selecionados"
                  description="Amostra dos itens que serão excluídos"
                />
                <div className="border border-neutral-800 p-2">
                  <ul className="space-y-1 text-[11px] text-neutral-400">
                    {previewItems.map((name, i) => (
                      <li key={i} className="truncate">• {name}</li>
                    ))}
                    {remainingCount > 0 && (
                      <li className="text-neutral-600">
                        e mais {remainingCount} {remainingCount === 1 ? "item" : "itens"}...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Alerta de permanência */}
          <div className="my-5 h-px bg-neutral-900" />
          <AlertBox
            color={ACCENT}
            title="Atenção"
            message="Esta ação é permanente e não poderá ser desfeita."
          />

          {/* Confirmação extra */}
          {needsExtraConfirm && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <label className="flex items-start gap-2 text-[13px] text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extraConfirmed}
                  onChange={(e) => setExtraConfirmed(e.target.checked)}
                  disabled={isBusy}
                  className="mt-0.5 h-4 w-4 accent-red-500"
                />
                Confirmo que quero excluir esses {count} itens em massa.
              </label>
            </>
          )}

          {/* Erro */}
          {errorMessage && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <AlertBox color={RED} title="Erro" message={errorMessage} />
            </>
          )}
        </div>

        {/* Botões */}
        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="flex h-11 w-full items-center justify-center rounded-none border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={(e) => {
              e.stopPropagation();
              void handleConfirm();
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-none border text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6 cursor-pointer"
            style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
            onMouseEnter={(e) => {
              if (!confirmDisabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT_HOVER;
            }}
            onMouseLeave={(e) => {
              if (!confirmDisabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
            }}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
