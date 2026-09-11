"use client";

import React, { useCallback, useRef, useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useValidateAds } from "@/components/announce/hooks/useValidateAds";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ValidateAds({ open, onClose }: Props) {
  const { file, setFile, validating, error, success, validar, reset } = useValidateAds();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleClose = () => {
    reset();
    onClose();
  };

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md border border-neutral-800 bg-neutral-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#1a8ceb]" />
            <h2 className="text-sm font-semibold text-white">Validar Composição de Custo</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-neutral-500 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="mb-4 text-[13px] text-neutral-400">
            Envie uma planilha (.xlsx ou .csv) com as colunas{" "}
            <span className="text-neutral-200">store</span> e{" "}
            <span className="text-neutral-200">reference</span> para validar a composição de
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
                <FileSpreadsheet className="h-8 w-8 text-[#1a8ceb]" />
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-neutral-900 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-4 text-sm text-neutral-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={validar}
            disabled={!file || validating}
            className="
              flex h-10 items-center gap-2 border border-[#1a8ceb] bg-[#1a8ceb]
              px-4 text-sm font-medium text-white transition-colors
              hover:bg-[#1579d1] hover:border-[#1579d1]
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:cursor-pointer
            "
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              "Validar Composição"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
