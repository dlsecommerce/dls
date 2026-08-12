"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Loader2,
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  X,
} from "lucide-react";

import { unlockAudio } from "@/utils/sound";

export type Tipo = "inclusao" | "alteracao";

type PreviewRow = Record<string, unknown>;

type InlineMessage = {
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
} | null;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void;
  loading: boolean;
  preview?: PreviewRow[];
  warnings?: string[];
  errors?: string[];
  tipo: Tipo;
  customTitle?: string;
  customText?: string;
};

/** Cores e ícones */
const GREEN = "#22c55e";
const GREEN_HOVER = "#34d365";
const RED = "#ef4444";
const ORANGE = "#f97316";

/** Componente cabeçalho das seções */
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

/** Utils de preview */
const COLUMN_PRIORITY = ["code_id"];

/** Tradução das colunas técnicas para rótulos em português */
const COLUMN_LABELS: Record<string, string> = {
  code_id: "Código",
  store: "Loja",
  product: "Produto",
  mark: "Marca",
  current_cost: "Custo Atual",
  previous_cost: "Custo Antigo",
  packaging_cost: "Embalagem",
  created_at: "Criado em",
  updated_at: "Atualizado em",
};

function translateColumn(key: string): string {
  return COLUMN_LABELS[key] ?? key;
}

function sortPreviewKeys(keys: string[]): string[] {
  const priority = COLUMN_PRIORITY.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !COLUMN_PRIORITY.includes(k));
  return [...priority, ...rest];
}

function isNumericValue(value: unknown): boolean {
  return (
    typeof value === "number" ||
    (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()))
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

/** Caixa de alerta (erros / avisos) */
function AlertBox({
  variant,
  title,
  messages,
  footer,
}: {
  variant: "error" | "warning";
  title: string;
  messages: string[];
  footer?: string;
}) {
  const isError = variant === "error";
  const color = isError ? RED : ORANGE;

  return (
    <div
      role={isError ? "alert" : "status"}
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
            {title} ({messages.length})
          </strong>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-[11px] text-neutral-400">
            {messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          {footer && (
            <p className="mt-1 text-[11px] font-medium" style={{ color: RED }}>
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tabela de pré-visualização */
function PreviewTable({ preview, keys }: { preview: PreviewRow[]; keys: string[] }) {
  if (keys.length === 0) {
    return (
      <div className="w-full border border-neutral-800 p-4 text-center text-[11px] text-neutral-600">
        Nenhuma coluna detectada no arquivo.
      </div>
    );
  }

  return (
    <div className="w-full border border-neutral-800 overflow-hidden">
      <div className="h-56 overflow-auto">
        <table className="w-full min-w-full text-[11.5px] text-neutral-400">
          <caption className="sr-only">Pré-visualização dos registros a serem importados</caption>
          <thead className="sticky top-0 z-10 bg-neutral-900">
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="whitespace-nowrap p-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500"
                  title={k}
                >
                  {translateColumn(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-t border-neutral-900 hover:bg-neutral-900/60 transition-colors">
                {keys.map((k) => {
                  const raw = row?.[k];
                  const value = formatCellValue(raw);
                  return (
                    <td
                      key={k}
                      className={`max-w-[220px] overflow-hidden whitespace-nowrap p-2 text-ellipsis ${
                        isNumericValue(raw) ? "text-right tabular-nums" : "text-left"
                      }`}
                      title={value}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Toast embutido */
function InlineToast({ message, onClose }: { message: InlineMessage; onClose: () => void }) {
  if (!message) return null;

  const color =
    message.type === "success"
      ? GREEN
      : message.type === "error"
      ? RED
      : message.type === "warning"
      ? ORANGE
      : "#a3a3a3";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-3 border border-neutral-800 p-3"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div>
        <strong className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
          {message.title}
        </strong>
        {message.description && (
          <span className="text-[10.5px] text-neutral-500">{message.description}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar mensagem"
        className="shrink-0 text-neutral-600 hover:text-neutral-300 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Componente modal principal (Anúncios) */
export default function ConfirmImportModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  preview = [],
  warnings = [],
  errors = [],
  tipo,
  customTitle,
  customText,
}: Props) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0 && !hasErrors;
  const isInclusao = tipo === "inclusao";

  const confirmClickLock = useRef(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const [inlineMessage, setInlineMessage] = useState<InlineMessage>(null);

  const keys = useMemo(
    () => (preview.length > 0 ? sortPreviewKeys(Object.keys(preview[0])) : []),
    [preview]
  );

  const titulo =
    customTitle ?? (isInclusao ? "Confirmar Inclusão de Anúncios" : "Confirmar Alteração de Anúncios");

  const texto =
    customText ??
    (isInclusao
      ? "Você está prestes a INCLUIR novos anúncios no sistema."
      : "Você está prestes a ALTERAR anúncios existentes.");

  const targetLabel = `${count} ${count === 1 ? "registro" : "registros"} detectado(s)`;

  // Botão de confirmação: sempre VERDE, exceto quando há erros bloqueantes (VERMELHO/desabilitado)
  const ACCENT = hasErrors ? RED : GREEN;
  const ACCENT_HOVER = GREEN_HOVER;

  useEffect(() => {
    if (open && !loading) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, loading]);

  useEffect(() => {
    if (!loading) confirmClickLock.current = false;
  }, [loading]);

  useEffect(() => {
    if (!open) setInlineMessage(null);
  }, [open]);

  const resetState = useCallback(() => {
    setInlineMessage(null);
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && loading) return;
      if (!v && hasWarnings) {
        setInlineMessage({
          type: "info",
          title: "Importação cancelada",
          description: "Nenhum dado foi processado.",
        });
      }
      if (!v) resetState();
      onOpenChange(v);
    },
    [loading, hasWarnings, onOpenChange, resetState]
  );

  const handleConfirm = useCallback(async () => {
    if (confirmClickLock.current || loading) return;

    if (hasErrors) {
      setInlineMessage({
        type: "error",
        title: "Importação bloqueada",
        description: "Corrija os erros para continuar.",
      });
      return;
    }

    confirmClickLock.current = true;

    if (hasWarnings) {
      setInlineMessage({
        type: "warning",
        title: "Atenção",
        description: "Existem avisos na importação.",
      });
    }

    await unlockAudio();

    setInlineMessage({
      type: "info",
      title: "Importação iniciada",
      description: "Processando arquivo...",
    });

    void onConfirm();
  }, [hasErrors, hasWarnings, loading, onConfirm]);

  const canConfirm = !hasErrors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
        onInteractOutside={(e) => loading && e.preventDefault()}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-2xl sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {/* Cabeçalho */}
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">{titulo}</DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{targetLabel}</p>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          {/* Resumo do arquivo */}
          <div>
            <SectionHeader
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              title="Resumo da importação"
              description={texto}
            />
            <div className="flex items-center gap-2 border border-neutral-800 px-3 py-2">
              <span className="text-[11px] text-neutral-500">O arquivo contém</span>
              <span
                className="border px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: "#1a8ceb40", color: "#1a8ceb", backgroundColor: "#1a8ceb14" }}
              >
                {count} {count === 1 ? "registro" : "registros"}
              </span>
              {preview.length > 0 && preview.length < count && (
                <span className="text-[10px] text-neutral-600">(amostra de {preview.length})</span>
              )}
            </div>
          </div>

          {/* Alertas */}
          {(hasErrors || hasWarnings) && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div aria-live="polite" className="space-y-2">
                {hasErrors && (
                  <AlertBox
                    variant="error"
                    title="Erros encontrados"
                    messages={errors}
                    footer="A importação foi bloqueada."
                  />
                )}
                {hasWarnings && <AlertBox variant="warning" title="Avisos" messages={warnings} />}
              </div>
            </>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div>
                <SectionHeader
                  icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                  title="Pré-visualização"
                  description="Amostra dos dados que serão processados"
                />
                <PreviewTable preview={preview} keys={keys} />
              </div>
            </>
          )}

          {/* Toast embutido */}
          {inlineMessage && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <InlineToast message={inlineMessage} onClose={() => setInlineMessage(null)} />
            </>
          )}
        </div>

        {/* Botões */}
        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(false);
            }}
            className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={!canConfirm || loading}
            onClick={(e) => {
              e.stopPropagation();
              void handleConfirm();
            }}
            title={hasErrors ? "Corrija os erros para continuar" : undefined}
            className={`
              flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium
              transition-colors sm:h-10 sm:w-auto sm:px-6
              disabled:cursor-not-allowed disabled:opacity-50
              ${canConfirm ? "cursor-pointer" : ""}
            `}
            style={canConfirm ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}
            onMouseEnter={(e) => {
              if (canConfirm) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT_HOVER;
            }}
            onMouseLeave={(e) => {
              if (canConfirm) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : hasErrors ? (
              "Corrija os erros"
            ) : isInclusao ? (
              "Confirmar Inclusão"
            ) : (
              "Confirmar Alteração"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
