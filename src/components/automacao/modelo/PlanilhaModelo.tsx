"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileUploadCard } from "@/components/automacao/modelo/FileUploadCard";
import { ProgressIndicator } from "@/components/automacao/modelo/ProgressIndicator";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import {
  Loader,
  Package,
  ShoppingCart,
  Link2,
  FileText,
  Repeat2,
  CheckCircle2,
} from "lucide-react";
import FiltroLoja from "@/components/automacao/modelo/FiltroLoja";
import { useAutomacaoPlanilhas } from "@/components/automacao/hooks/useAutomacaoPlanilhas";
import PreviewPlanilhaModal from "@/components/automacao/modelo/PreviewPlanilhaModal";

export default function PlanilhaModelo() {
  const { planilhas, handleFileSelect, iniciarAutomacao, status } =
    useAutomacaoPlanilhas();

  const [selectedLoja, setSelectedLoja] = useState("Pikot Shop");
  const [buttonStatus, setButtonStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [pendingKey, setPendingKey] = useState<
    "bling" | "tray" | "vinculo" | "modelo" | null
  >(null);

  const allFilesSelected =
    planilhas.modelo && planilhas.vinculo && planilhas.bling && planilhas.tray;
  const selectedCount = Object.values(planilhas).filter((f) => f !== null).length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  /** 🔹 Limpa todos os arquivos */
  const handleClearAll = () => {
    handleFileSelect("bling", null);
    handleFileSelect("tray", null);
    handleFileSelect("vinculo", null);
    handleFileSelect("modelo", null);
    setButtonStatus("idle");
  };

  /** 🔹 Inicia a automação */
  const handleStartAutomation = async () => {
    if (!planilhas.modelo || !planilhas.vinculo || !planilhas.bling || !planilhas.tray) {
      alert("⚠️ Selecione todas as planilhas: Bling, Tray, Vínculo e Modelo.");
      return;
    }

    try {
      setButtonStatus("processing");
      console.log("🚀 Iniciando automação...");
      await iniciarAutomacao();
      setButtonStatus("success");
    } catch (err) {
      console.error("Erro ao processar:", err);
      setButtonStatus("error");
    } finally {
      setTimeout(() => setButtonStatus("idle"), 4000);
    }
  };

  const getButtonColor = () => {
    switch (buttonStatus) {
      case "processing":
        return "bg-orange-500 hover:bg-orange-600";
      case "success":
        return "bg-green-500 hover:bg-green-600";
      case "error":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-[#1A8CEB] hover:bg-[#1678c9]";
    }
  };

  const getDotColor = () => {
    if (selectedCount === 0) return "bg-neutral-500";
    if (selectedCount < 4) return "bg-neutral-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-transparent overflow-hidden mt-20">
      <div className="w-full max-w-[1400px] mx-auto flex justify-center">
        <GlassmorphicCard className="relative w-full h-[70vh] flex flex-col justify-center items-center p-10 space-y-6 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 overflow-hidden">
          {/* 🔹 Topo com filtro e botão limpar */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9, rotate: -15 }}
              onClick={handleClearAll}
              title="Limpar todos os arquivos"
              className="p-2 hover:bg-white/10 rounded-full transition-all text-red-400 hover:text-red-500"
            >
              <Repeat2 className="w-5 h-5" />
            </motion.button>

            <FiltroLoja
              selectedLoja={selectedLoja}
              setSelectedLoja={setSelectedLoja}
            />
          </div>

          {/* 🔹 Indicador de progresso / carregamento */}
          <ProgressIndicator
            totalSteps={4}
            completedSteps={selectedCount}
            loading={buttonStatus === "processing"}
          />

          {/* 🔹 Cards de upload permanecem visíveis sempre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6">
            {[
              { key: "bling", label: "Bling", icon: <Package className="w-8 h-8" /> },
              { key: "tray", label: "Tray", icon: <ShoppingCart className="w-8 h-8" /> },
              { key: "vinculo", label: "Vínculo Multiloja", icon: <Link2 className="w-8 h-8" /> },
              { key: "modelo", label: "Modelo", icon: <FileText className="w-8 h-8" /> },
            ].map((item, i) => (
              <FileUploadCard
                key={item.key}
                label={item.label}
                selectedFile={planilhas[item.key as keyof typeof planilhas]}
                onFileSelect={(f) => {
                  if (f) {
                    setPreviewFile(f);
                    setPendingKey(item.key as any);
                    setPreviewOpen(true);
                  }
                }}
                stepNumber={i + 1}
                icon={item.icon}
              />
            ))}
          </div>

          {/* 🔹 Status da seleção (some apenas enquanto carrega) */}
          {buttonStatus !== "processing" && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${getDotColor()} animate-pulse`} />
              {selectedCount < 4 ? (
                <span className="text-red-500">
                  {selectedCount}/4 arquivos selecionados
                </span>
              ) : (
                <span className="text-green-500 font-medium">
                  Todos os arquivos selecionados
                </span>
              )}
            </div>
          )}

          {/* 🔹 Botão “Iniciar” */}
          <div className="flex justify-center items-center pt-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartAutomation}
              disabled={!allFilesSelected || status === "processing"}
              className={`${getButtonColor()} px-8 h-12 text-base font-semibold shadow-md transition-all flex items-center justify-center gap-2 rounded-md ${
                !allFilesSelected || status === "processing"
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {buttonStatus === "processing" || status === "processing" ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : buttonStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Concluído!</span>
                </>
              ) : (
                "Iniciar"
              )}
            </motion.button>
          </div>
        </GlassmorphicCard>
      </div>

      {/* 🔹 Modal de preview da planilha */}
      <PreviewPlanilhaModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
        onConfirm={(file) => {
          if (pendingKey) handleFileSelect(pendingKey, file);
          setPreviewOpen(false);
          setPreviewFile(null);
          setPendingKey(null);
        }}
      />
    </div>
  );
}
