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
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useValidateAds } from "@/components/announce/hooks/useValidateAds";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ACCENT = "#1a8ceb";
const ACCENT_HOVER = "#1579d1";

export default function ValidateAds({ open, onClose }: Props) {
  const { file, setFile, validating, error, success, validar, reset } = useValidateAds();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleClose = useCallback(() => {
    if (validating) return;
    reset();
    onClose();
  }, [validating, reset, onClose]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && validating) return;
      if (!v) handleClose();
    },
    [validating, handleClose]
  );

  useEffect(() => {
    if (open && !validating) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, validating]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f) setFile(f);
    },
    [setFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => validating && e.preventDefault()}
        onInteractOutside={(e) => validating && e.preventDefault()}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-md sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {/* Cabeçalho */}
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">
              Validar Composição de Custo
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          <p className="mb-4 text-[13px] text-neutral-400">
            Envie uma planilha (.xlsx ou .csv) com as colunas{" "}
            <span className="text-neutral-200">Loja</span> e{" "}
            <span className="text-neutral-200">Referência</span> para validar a composição de
            custo dos anúncios.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              flex cursor-pointer flex-col items-center justify-center gap-2
              border-2 border-dashed px-4 py-8 text-center transition-colors
              ${dragActive ? "border-[#1a8ceb] bg-[#1a8ceb]/5" : "border-neutral-800 hover:border-neutral-700"}
            `}
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8" style={{ color: ACCENT }} />
                <span className="text-sm text-white">{file.name}</span>
                <span className="text-xs text-neutral-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-neutral-600" />
                <span className="text-sm text-neutral-400">
                  Arraste o arquivo aqui ou clique para selecionar
                </span>
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 border border-red-900/50 bg-red-950/30 px-3 py-2 text-[13px] text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-3 flex items-start gap-2 border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-[13px] text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Validação concluída. O relatório foi baixado.</span>
            </div>
          )}
        </div>

        {/* Botões */}
        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={validating}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void validar();
            }}
            disabled={!file || validating}
            className="flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium transition-colors sm:h-10 sm:w-auto sm:px-6 disabled:cursor-not-allowed disabled:opacity-40 enabled:cursor-pointer"
            style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
            onMouseEnter={(e) => {
              if (!validating && file) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT_HOVER;
            }}
            onMouseLeave={(e) => {
              if (!validating && file) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
            }}
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              "Validar Composição"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
