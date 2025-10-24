"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadCardProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  stepNumber: number;
  icon?: React.ReactNode;
}

export const FileUploadCard = ({
  label,
  onFileSelect,
  selectedFile,
  stepNumber,
  icon,
}: FileUploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onFileSelect(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <GlassmorphicCard
      className={cn(
        "relative w-full h-full overflow-hidden cursor-pointer transition-all duration-300 group",
        selectedFile
          ? // 🔹 Estado selecionado: azul translúcido sem borda
            "bg-blue-500/10 border-none ring-1 ring-blue-500/40 shadow-[0_0_15px_rgba(30,144,255,0.3)]"
          : isDragging
          ? // 🔹 Estado ao arrastar
            "border-2 border-blue-400 bg-blue-400/10 animate-pulse"
          : // 🔹 Estado normal
            "border-2 border-border hover:border-blue-400/50 hover:shadow-lg hover:scale-[1.02]"
      )}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* === BADGE AZUL COM NÚMERO FIXO === */}
      <div
        className={cn(
          "absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md transition-all duration-300 z-10",
          selectedFile ? "bg-blue-500" : "bg-blue-400"
        )}
      >
        {stepNumber}
      </div>

      {/* === BOTÃO DE REMOVER === */}
      {selectedFile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 hover:text-white"
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

      {/* === CONTEÚDO CENTRAL === */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px] space-y-3">
        {/* ÍCONE PRINCIPAL (com check ao selecionar) */}
        <div
          className={cn(
            "rounded-full p-4 transition-all duration-300",
            selectedFile
              ? "bg-blue-500 text-white scale-110"
              : "bg-blue-500/10 text-blue-400"
          )}
        >
          {selectedFile ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            icon || <FileSpreadsheet className="w-8 h-8" />
          )}
        </div>

        {/* TÍTULO E NOME DO ARQUIVO */}
        <div className="text-center space-y-1 w-full px-2">
          <h3 className="font-semibold text-foreground">{label}</h3>
          {selectedFile ? (
            <p className="text-xs text-blue-500 font-medium truncate max-w-full">
              {selectedFile.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Clique ou arraste o arquivo
            </p>
          )}
        </div>

        {/* ÍCONE DE UPLOAD (desaparece ao selecionar) */}
        <Upload
          className={cn(
            "w-5 h-5 transition-all duration-300",
            selectedFile ? "opacity-0 scale-0" : "opacity-40 scale-100",
            isDragging && "scale-125 opacity-70"
          )}
        />
      </div>
    </GlassmorphicCard>
  );
};
