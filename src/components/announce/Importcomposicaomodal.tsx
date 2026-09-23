"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  FileSpreadsheet,
  Layers,
  RefreshCcw,
  Check,
} from "lucide-react";

export type ImportMode = "merge" | "replace";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (mode: ImportMode) => void;
  loading?: boolean;
  fileName?: string | null;
};

const GREEN = "#22c55e";
const GREEN_HOVER = "#34d365";
const RED = "#ef4444";
const ORANGE = "#f97316";

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

function ModeOption({
  active,
  onClick,
  icon,
  title,
  description,
  accent,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex w-full items-start gap-3 border p-3 text-left transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        active ? "border-current" : "border-neutral-800 hover:border-neutral-600",
      ].join(" ")}
      style={active ? { borderColor: accent, backgroundColor: `${accent}0f` } : undefined}
    >
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: active ? accent : "#3f3f46",
          backgroundColor: active ? accent : "transparent",
        }}
      >
        {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: active ? accent : "#a3a3a3" }}>{icon}</span>
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.05em]"
            style={{ color: active ? accent : "#e5e5e5" }}
          >
            {title}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </button>
  );
}

export default function ImportComposicaoModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  fileName,
}: Props) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmedReplace, setConfirmedReplace] = useState(false);

  const confirmClickLock = useRef(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loading) confirmClickLock.current = false;
  }, [loading]);

  useEffect(() => {
    if (open) {
      setMode("merge");
      setConfirmedReplace(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && !loading) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, loading]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && loading) return;
      onOpenChange(v);
    },
    [loading, onOpenChange]
  );

  const canConfirm = mode === "merge" || confirmedReplace;

  const handleConfirm = useCallback(() => {
    if (confirmClickLock.current || loading || !canConfirm) return;
    confirmClickLock.current = true;
    onConfirm(mode);
  }, [loading, canConfirm, mode, onConfirm]);

  const ACCENT = mode === "replace" ? RED : GREEN;
  const ACCENT_HOVER = mode === "replace" ? RED : GREEN_HOVER;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
        onInteractOutside={(e) => loading && e.preventDefault()}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-lg sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">
              Importar Composição
            </DialogTitle>
          </div>
          {fileName && (
            <p className="mt-1 truncate text-[11px] text-neutral-500">Arquivo: {fileName}</p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          <SectionHeader
            icon={<Layers className="h-3.5 w-3.5" />}
            title="Modo de importação"
            description="Escolha como as composições existentes serão tratadas"
          />

          <div className="space-y-2">
            <ModeOption
              active={mode === "merge"}
              onClick={() => {
                setMode("merge");
                setConfirmedReplace(false);
              }}
              icon={<Layers className="h-3.5 w-3.5" />}
              title="Adicionar / Atualizar"
              description="Mantém as composições já existentes. Itens da planilha são inseridos ou atualizados, sem remover o que já estava cadastrado."
              accent={GREEN}
              disabled={loading}
            />
            <ModeOption
              active={mode === "replace"}
              onClick={() => setMode("replace")}
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
              title="Substituir composição"
              description="Remove todos os itens de composição dos anúncios presentes na planilha e insere apenas os novos. Itens não incluídos na planilha serão excluídos."
              accent={RED}
              disabled={loading}
            />
          </div>

          {mode === "replace" && (
            <>
              <div className="my-4 h-px bg-neutral-900" />
              <div
                className="border border-neutral-800 p-3"
                style={{ borderLeft: `2px solid ${RED}` }}
              >
                <div className="flex gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center border border-neutral-800"
                    style={{ color: RED }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <strong
                      className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: RED }}
                    >
                      Ação destrutiva
                    </strong>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Composições de anúncios presentes na planilha serão totalmente
                      substituídas. Itens não listados serão removidos permanentemente.
                    </p>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setConfirmedReplace((v) => !v)}
                        disabled={loading}
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors cursor-pointer",
                          confirmedReplace
                            ? "border-white bg-white"
                            : "border-neutral-600 bg-transparent hover:border-neutral-400",
                        ].join(" ")}
                      >
                        {confirmedReplace && (
                          <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                        )}
                      </button>
                      Entendo que essa ação vai remover composições que não estiverem
                      na planilha.
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

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
              handleConfirm();
            }}
            title={!canConfirm ? "Confirme a ação para continuar" : undefined}
            className={[
              "flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium",
              "transition-colors sm:h-10 sm:w-auto sm:px-6",
              "disabled:cursor-not-allowed disabled:opacity-50",
              canConfirm ? "cursor-pointer" : "",
            ].join(" ")}
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
            ) : mode === "replace" ? (
              "Confirmar Substituição"
            ) : (
              "Confirmar Importação"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
