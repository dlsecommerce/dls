"use client";

import { useEffect, useMemo, useState } from "react";
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
import PreviewPlanilhaModal from "@/components/automacao/modelo/PreviewPlanilhaModal";
import { useAutomacaoPlanilhas } from "@/components/automacao/hooks/useAutomacaoPlanilhas";
import { cn } from "@/lib/utils";

type PlanilhaKey = "bling" | "tray" | "vinculo" | "modelo";
type Loja = "Pikot Shop" | "Sóbaquetas" | "Sobaquetas";

type StepItem = {
  key: PlanilhaKey;
  label: string;
  icon: React.ReactNode;
};

export default function PlanilhaModelo() {
  const { planilhas, handleFileSelect, iniciarAutomacao, status } =
    useAutomacaoPlanilhas();

  const [selectedLoja, setSelectedLoja] = useState<Loja>("Pikot Shop");
  const [buttonStatus, setButtonStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [pendingKey, setPendingKey] = useState<PlanilhaKey | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  /** ✅ Define quais cards aparecem por loja */
  const steps: StepItem[] = useMemo(() => {
    const common: StepItem[] = [
      { key: "bling", label: "Bling", icon: <Package className="w-8 h-8" /> },
      {
        key: "vinculo",
        label: "Vínculo Multiloja",
        icon: <Link2 className="w-8 h-8" />,
      },
      { key: "modelo", label: "Modelo", icon: <FileText className="w-8 h-8" /> },
    ];

    if (selectedLoja === "Pikot Shop") {
      return [
        { key: "bling", label: "Bling", icon: <Package className="w-8 h-8" /> },
        { key: "tray", label: "Tray", icon: <ShoppingCart className="w-8 h-8" /> },
        {
          key: "vinculo",
          label: "Vínculo Multiloja",
          icon: <Link2 className="w-8 h-8" />,
        },
        { key: "modelo", label: "Modelo", icon: <FileText className="w-8 h-8" /> },
      ];
    }

    return common; // Sóbaquetas/Sobaquetas => 3 cards
  }, [selectedLoja]);

  const activeKeys = useMemo(() => steps.map((s) => s.key), [steps]);

  const selectedCount = useMemo(() => {
    return activeKeys.filter((k) => planilhas[k] !== null).length;
  }, [activeKeys, planilhas]);

  const allFilesSelected = useMemo(() => {
    return activeKeys.every((k) => planilhas[k] !== null);
  }, [activeKeys, planilhas]);

  /** 🔹 Limpa só o que está ativo na loja atual */
  const handleClearActive = () => {
    activeKeys.forEach((k) => handleFileSelect(k, null));
    setButtonStatus("idle");
  };

  /** 🔹 Ao trocar loja, limpa tudo para evitar “vazamento” */
  const handleChangeLoja = (loja: string) => {
    (["bling", "tray", "vinculo", "modelo"] as PlanilhaKey[]).forEach((k) =>
      handleFileSelect(k, null)
    );
    setButtonStatus("idle");
    setSelectedLoja(loja as Loja);
  };

  /** 🔹 Inicia automação */
  const handleStartAutomation = async () => {
    if (!allFilesSelected) {
      alert("⚠️ Selecione todas as planilhas necessárias para essa loja.");
      return;
    }

    try {
      setButtonStatus("processing");
      await iniciarAutomacao(selectedLoja);
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
    if (!allFilesSelected) return "bg-neutral-500";
    return "bg-green-500";
  };

  /** ✅ Centralização do grid quando tiver 3 cards */
  const isThreeCards = steps.length === 3;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-transparent overflow-hidden md:mt-20">
      <div className="w-full max-w-[1400px] mx-auto flex justify-center">
        {/* DESKTOP - ORIGINAL PRESERVADO */}
        <GlassmorphicCard className="hidden md:flex relative w-full h-[70vh] flex-col justify-center items-center p-10 space-y-6 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* 🔹 Topo com filtro e botão limpar */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9, rotate: -15 }}
              onClick={handleClearActive}
              title="Limpar arquivos da loja"
              className="p-2 hover:bg-white/10 rounded-full transition-all text-red-400 hover:text-red-500"
            >
              <Repeat2 className="w-5 h-5" />
            </motion.button>

            <FiltroLoja
              selectedLoja={selectedLoja}
              setSelectedLoja={handleChangeLoja}
            />
          </div>

          {/* 🔹 Indicador de progresso (dinâmico) */}
          <ProgressIndicator
            totalSteps={steps.length}
            completedSteps={selectedCount}
            loading={buttonStatus === "processing"}
          />

          {/* 🔹 Cards de upload (Sóbaquetas centralizado COMO ESTAVA) */}
          <div
            className={cn(
              "grid gap-8 px-6 w-full",
              "grid-cols-1 sm:grid-cols-2",
              isThreeCards ? "lg:grid-cols-3" : "lg:grid-cols-4",
              isThreeCards ? "max-w-[1050px] mx-auto" : "max-w-none"
            )}
          >
            {steps.map((item, i) => (
              <FileUploadCard
                key={item.key}
                label={item.label}
                selectedFile={planilhas[item.key]}
                // ✅ Tray agora fica IGUAL aos outros (não passa disableEffects)
                onFileSelect={(f) => {
                  if (f) {
                    setPreviewFile(f);
                    setPendingKey(item.key);
                    setPreviewOpen(true);
                  }
                }}
                stepNumber={i + 1}
                icon={item.icon}
              />
            ))}
          </div>

          {/* 🔹 Status da seleção */}
          {buttonStatus !== "processing" && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${getDotColor()} animate-pulse`} />
              {!allFilesSelected ? (
                <span className="text-red-500">
                  {selectedCount}/{steps.length} arquivos selecionados
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

        {/* MOBILE - CAMADA SEPARADA */}
        <div className="md:hidden w-full min-h-screen px-4 pt-4 pb-[calc(180px+env(safe-area-inset-bottom))] overflow-y-scroll">
          <div className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-3 bg-background/95 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Modelo
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedCount}/{steps.length} arquivos selecionados
                </p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.92, rotate: -10 }}
                  onClick={handleClearActive}
                  title="Limpar arquivos da loja"
                  className="h-11 w-11 rounded-full border border-red-500/25 bg-red-500/10 text-red-400 flex items-center justify-center touch-manipulation"
                >
                  <Repeat2 className="w-5 h-5" />
                </motion.button>

                <FiltroLoja
                  selectedLoja={selectedLoja}
                  setSelectedLoja={handleChangeLoja}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <GlassmorphicCard className="w-full rounded-2xl border border-white/10 p-4 shadow-xl overflow-hidden">
              <ProgressIndicator
                totalSteps={steps.length}
                completedSteps={selectedCount}
                loading={buttonStatus === "processing"}
              />

              {buttonStatus !== "processing" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${getDotColor()} animate-pulse`} />
                  {!allFilesSelected ? (
                    <span className="text-red-500 font-medium">
                      Faltam {steps.length - selectedCount} arquivo(s)
                    </span>
                  ) : (
                    <span className="text-green-500 font-semibold">
                      Todos os arquivos selecionados
                    </span>
                  )}
                </div>
              )}
            </GlassmorphicCard>

            <div className="grid grid-cols-1 gap-3">
              {steps.map((item, i) => (
                <FileUploadCard
                  key={item.key}
                  label={item.label}
                  selectedFile={planilhas[item.key]}
                  onFileSelect={(f) => {
                    if (f) {
                      setPreviewFile(f);
                      setPendingKey(item.key);
                      setPreviewOpen(true);
                    }
                  }}
                  stepNumber={i + 1}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          <div className="fixed left-0 right-0 bottom-0 z-30 px-4 pt-3 pb-[calc(64px+env(safe-area-inset-bottom))] bg-background/95 border-t border-white/10">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartAutomation}
              disabled={!allFilesSelected || status === "processing"}
              className={`${getButtonColor()} w-full h-14 text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 rounded-2xl touch-manipulation ${
                !allFilesSelected || status === "processing"
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {buttonStatus === "processing" || status === "processing" ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : buttonStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Concluído!</span>
                </>
              ) : (
                "Iniciar automação"
              )}
            </motion.button>
          </div>
        </div>
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