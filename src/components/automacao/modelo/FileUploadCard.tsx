"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadCardProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  stepNumber: number;
  icon?: React.ReactNode;

  /** ✅ desliga QUALQUER animação */
  disableEffects?: boolean;
}

const formatFileSize = (size: number) => {
  if (!size) return "";

  const kb = size / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
};

export const FileUploadCard = ({
  label,
  onFileSelect,
  selectedFile,
  stepNumber,
  icon,
  disableEffects = false,
}: FileUploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFile = Boolean(selectedFile);
  const draggingActive = !disableEffects && isDragging;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      onFileSelect(file);
    }

    /**
     * Permite selecionar o mesmo arquivo novamente depois de remover/trocar.
     */
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    if (!disableEffects) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    if (!disableEffects) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!disableEffects) {
      setIsDragging(false);
    }

    const file = e.dataTransfer.files?.[0] || null;

    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    onFileSelect(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Desktop */}
      <GlassmorphicCard
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "relative hidden h-full w-full cursor-pointer overflow-hidden rounded-2xl border md:block",
          "outline-none focus-visible:ring-2 focus-visible:ring-[#1A8CEB]/40",
          disableEffects ? "" : "group transition-all duration-200",
          hasFile
            ? "border-[#1A8CEB]/35 bg-white/[0.035]"
            : draggingActive
            ? "border-[#1A8CEB]/60 bg-white/[0.05]"
            : cn(
                "border-white/10 bg-white/[0.02]",
                disableEffects
                  ? ""
                  : "hover:border-[#1A8CEB]/35 hover:bg-white/[0.035]"
              )
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          className={cn(
            "absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
            hasFile ? "bg-[#1A8CEB]" : "bg-white/15"
          )}
        >
          {stepNumber}
        </div>

        <div
          className={cn(
            "absolute right-3 top-3 z-10 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
            hasFile
              ? "border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]"
              : "border-white/10 bg-white/[0.03] text-white/35"
          )}
        >
          {hasFile ? "Selecionado" : "Pendente"}
        </div>

        {hasFile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            title="Remover arquivo"
            aria-label={`Remover arquivo de ${label}`}
            className={cn(
              "absolute bottom-3 right-3 z-20 h-8 w-8 cursor-pointer rounded-lg border border-red-500/20",
              "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300",
              "active:scale-[0.96]",
              disableEffects
                ? "opacity-100"
                : "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex min-h-[210px] flex-col items-center justify-center px-5 py-6 text-center">
          <div
            className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border",
              hasFile
                ? "border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]"
                : "border-white/10 bg-white/[0.04] text-white/45"
            )}
          >
            {hasFile ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              icon || <FileSpreadsheet className="h-8 w-8" />
            )}
          </div>

          <div className="w-full min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">
              {label}
            </h3>

            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">
              Arquivo obrigatório
            </p>

            {hasFile ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="truncate text-xs font-bold text-[#1A8CEB]">
                  {selectedFile?.name}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-white/35">
                  {selectedFile ? formatFileSize(selectedFile.size) : ""}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">
                  Clique ou arraste o arquivo
                </p>

                <p className="mt-1 text-[10px] text-white/30">
                  Formatos aceitos: .xlsx, .xls ou .csv
                </p>
              </div>
            )}

            <div
              role="button"
              tabIndex={-1}
              onClick={handleButtonClick}
              className={cn(
                "mx-auto mt-4 flex h-9 max-w-[170px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors",
                hasFile
                  ? "border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]"
                  : "border-white/10 bg-white/[0.035] text-white/55 group-hover:border-[#1A8CEB]/25 group-hover:text-[#1A8CEB]"
              )}
            >
              {hasFile ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Trocar arquivo
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Selecionar arquivo
                </>
              )}
            </div>
          </div>
        </div>
      </GlassmorphicCard>

      {/* Mobile */}
      <GlassmorphicCard
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "relative w-full cursor-pointer overflow-hidden rounded-2xl border md:hidden",
          "min-h-[142px] touch-manipulation outline-none active:scale-[0.99]",
          "focus-visible:ring-2 focus-visible:ring-[#1A8CEB]/40",
          disableEffects ? "" : "transition-all duration-200",
          hasFile
            ? "border-[#1A8CEB]/35 bg-white/[0.035]"
            : draggingActive
            ? "border-[#1A8CEB]/60 bg-white/[0.05]"
            : "border-white/10 bg-[#0a0a0a]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid min-h-[142px] grid-cols-[52px_1fr] items-center gap-4 p-4 pr-12">
          <div
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
              hasFile
                ? "border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]"
                : "border-white/10 bg-white/[0.04] text-white/45"
            )}
          >
            {hasFile ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              icon || <FileSpreadsheet className="h-6 w-6" />
            )}

            <div
              className={cn(
                "absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white",
                hasFile ? "bg-[#1A8CEB]" : "bg-white/15"
              )}
            >
              {stepNumber}
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold leading-tight text-foreground">
                  {label}
                </h3>

                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
                    hasFile
                      ? "border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]"
                      : "border-white/10 bg-muted/60 text-muted-foreground"
                  )}
                >
                  {hasFile ? "OK" : "Pendente"}
                </span>
              </div>

              {hasFile ? (
                <>
                  <p className="truncate text-xs font-medium text-[#1A8CEB]">
                    {selectedFile?.name}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {selectedFile ? formatFileSize(selectedFile.size) : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs leading-snug text-muted-foreground">
                    Toque para selecionar sua planilha
                  </p>

                  <p className="text-[10px] text-muted-foreground/70">
                    .xlsx, .xls ou .csv
                  </p>
                </>
              )}
            </div>

            <div
              role="button"
              tabIndex={-1}
              onClick={handleButtonClick}
              className={cn(
                "w-full cursor-pointer rounded-xl px-3 py-2 text-center text-xs font-semibold",
                hasFile
                  ? "bg-[#1A8CEB]/10 text-[#1A8CEB]"
                  : "bg-muted/70 text-muted-foreground"
              )}
            >
              {hasFile ? "Trocar arquivo" : "Enviar arquivo"}
            </div>
          </div>
        </div>

        {hasFile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            title="Remover arquivo"
            aria-label={`Remover arquivo de ${label}`}
            className={cn(
              "absolute right-3 top-3 z-20 h-9 w-9 cursor-pointer rounded-full",
              "bg-[#0a0a0a] text-red-400 hover:bg-red-500 hover:text-white",
              "active:scale-[0.96]"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-muted/70">
            <Upload className="h-4 w-4 opacity-60" />
          </div>
        )}
      </GlassmorphicCard>
    </>
  );
};