"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Loader,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useAutomacaoPlanilhas } from "@/components/automacao/hooks/useautomationspreadsheets";
import PreviewPlanilhaModal from "@/components/automacao/modelo/Previewspreadsheet";
import SelecionarLojaModal from "@/components/automacao/modelo/Storeselection";
import { cn } from "@/lib/utils";

type Loja = "Pikot Shop" | "Sóbaquetas";

export default function PlanilhaModelo() {
  const { status, errorMessage, resetResultado, iniciarAutomacao } =
    useAutomacaoPlanilhas();

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [lojaModalOpen, setLojaModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isProcessing = status === "uploading" || status === "processing";
  const isDone = status === "done";
  const isError = status === "error";

  const startFlow = (file: File) => {
    setRawFile(file);
    setLojaModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startFlow(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startFlow(file);
  }, []);

  const handleLojaSelect = (loja: Loja) => {
    setSelectedLoja(loja);
    setLojaModalOpen(false);
    setPreviewOpen(true);
  };

  const handlePreviewConfirm = async (file: File) => {
    setPreviewOpen(false);

    if (selectedLoja) {
      try {
        await iniciarAutomacao(selectedLoja, file);
      } catch (err) {
        console.error("Falha na automação:", err);
      }
    }
  };

  const handleReset = () => {
    resetResultado();
    setRawFile(null);
    setSelectedLoja(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {status === "idle" && !isProcessing && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              className="flex min-h-[420px] w-full cursor-pointer flex-col items-center justify-center text-center outline-none"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleInputChange}
              />

              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-2xl border transition-all",
                  isDragging
                    ? "border-[#1A8CEB]/40 bg-[#1A8CEB]/15 text-[#1A8CEB]"
                    : "border-white/10 bg-white/[0.04] text-white/45 hover:border-[#1A8CEB]/30 hover:bg-[#1A8CEB]/10 hover:text-[#1A8CEB]"
                )}
              >
                <UploadCloud className="h-10 w-10" />
              </div>

              <h1 className="mt-6 text-xl font-bold text-white">
                Arraste sua planilha Bling aqui
              </h1>

              <p className="mt-2 text-sm text-white/45">
                ou clique para selecionar o arquivo
              </p>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-white/25">
                Formatos aceitos: .xlsx, .xls ou .csv
              </p>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex min-h-[420px] flex-col items-center justify-center text-center"
            >
              <Loader className="h-12 w-12 animate-spin text-[#1A8CEB]" />
              <h2 className="mt-5 text-lg font-bold text-white">
                Processando planilha...
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Isso pode levar alguns segundos.
              </p>
            </motion.div>
          )}

          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex min-h-[420px] flex-col items-center justify-center text-center"
            >
              <AlertCircle className="h-12 w-12 text-red-400" />
              <h2 className="mt-5 text-lg font-bold text-red-300">
                Erro no processamento
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/45">
                {errorMessage}
              </p>

              <button
                onClick={handleReset}
                className="mt-6 flex items-center gap-2 border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </button>
            </motion.div>
          )}

          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex min-h-[420px] flex-col items-center justify-center text-center"
            >
              <CheckCircle2 className="h-14 w-14 text-green-400" />

              <h2 className="mt-5 text-lg font-bold text-white">
                Planilha gerada com sucesso!
              </h2>

              <button
                onClick={handleReset}
                className="mt-8 flex items-center gap-2 text-xs font-semibold text-white/35 hover:text-white/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Processar outra planilha
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SelecionarLojaModal
        open={lojaModalOpen}
        onOpenChange={setLojaModalOpen}
        onSelect={handleLojaSelect}
      />

      <PreviewPlanilhaModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={rawFile}
        onConfirm={handlePreviewConfirm}
      />
    </div>
  );
}
