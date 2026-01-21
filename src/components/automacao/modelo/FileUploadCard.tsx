"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Upload, CheckCircle2, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadCardProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  stepNumber: number;
  icon?: React.ReactNode;

  /** ✅ desliga QUALQUER animação (ex.: Tray do Pikot) */
  disableEffects?: boolean;
}

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disableEffects) setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (!disableEffects) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disableEffects) setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onFileSelect(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const draggingActive = !disableEffects && isDragging;

  return (
    <GlassmorphicCard
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative w-full h-full overflow-hidden cursor-pointer",

        // ❌ remove TODA transição quando disableEffects
        disableEffects ? "" : "transition-all duration-300 group",

        selectedFile
          ? "bg-blue-500/10 border-none ring-1 ring-blue-500/40"
          : draggingActive
          ? "border-2 border-blue-400 bg-blue-400/10"
          : cn(
              "border-2 border-border",
              disableEffects
                ? ""
                : "hover:border-blue-400/50 hover:shadow-lg hover:scale-[1.02]"
            )
      )}
    >
      {/* Badge */}
      <div
        className={cn(
          "absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md z-10",
          selectedFile ? "bg-blue-500" : "bg-blue-400"
        )}
      >
        {stepNumber}
      </div>

      {/* Remover */}
      {selectedFile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 w-7 h-7 z-10",
            disableEffects
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-red-500 hover:text-white"
          )}
          onClick={handleRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Conteúdo */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px] space-y-3">
        <div
          className={cn(
            "rounded-full p-4",
            selectedFile
              ? "bg-blue-500 text-white"
              : "bg-blue-500/10 text-blue-400",
            // ❌ SEM scale quando disableEffects
            disableEffects ? "" : selectedFile && "scale-110 transition-transform"
          )}
        >
          {selectedFile ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            icon || <FileSpreadsheet className="w-8 h-8" />
          )}
        </div>

        <div className="text-center space-y-1 w-full px-2">
          <h3 className="font-semibold text-foreground">{label}</h3>
          {selectedFile ? (
            <p className="text-xs text-blue-500 font-medium truncate">
              {selectedFile.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Clique ou arraste o arquivo
            </p>
          )}
        </div>

        <Upload
          className={cn(
            "w-5 h-5",
            selectedFile ? "opacity-0 scale-0" : "opacity-40 scale-100",
            disableEffects ? "" : "transition-all duration-300"
          )}
        />
      </div>
    </GlassmorphicCard>
  );
};
