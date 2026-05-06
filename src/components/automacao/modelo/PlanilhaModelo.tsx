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
  AlertCircle,
  Store,
  FileCheck2,
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

  const steps: StepItem[] = useMemo(() => {
    const common: StepItem[] = [
      {
        key: "bling",
        label: "Bling",
        icon: <Package className="h-8 w-8" />,
      },
      {
        key: "vinculo",
        label: "Vínculo Multiloja",
        icon: <Link2 className="h-8 w-8" />,
      },
      {
        key: "modelo",
        label: "Modelo",
        icon: <FileText className="h-8 w-8" />,
      },
    ];

    if (selectedLoja === "Pikot Shop") {
      return [
        {
          key: "bling",
          label: "Bling",
          icon: <Package className="h-8 w-8" />,
        },
        {
          key: "tray",
          label: "Tray",
          icon: <ShoppingCart className="h-8 w-8" />,
        },
        {
          key: "vinculo",
          label: "Vínculo Multiloja",
          icon: <Link2 className="h-8 w-8" />,
        },
        {
          key: "modelo",
          label: "Modelo",
          icon: <FileText className="h-8 w-8" />,
        },
      ];
    }

    return common;
  }, [selectedLoja]);

  const activeKeys = useMemo(() => steps.map((s) => s.key), [steps]);

  const selectedCount = useMemo(() => {
    return activeKeys.filter((k) => planilhas[k] !== null).length;
  }, [activeKeys, planilhas]);

  const allFilesSelected = useMemo(() => {
    return activeKeys.every((k) => planilhas[k] !== null);
  }, [activeKeys, planilhas]);

  const missingSteps = useMemo(() => {
    return steps.filter((step) => !planilhas[step.key]);
  }, [steps, planilhas]);

  const missingLabels = useMemo(() => {
    return missingSteps.map((step) => step.label).join(", ");
  }, [missingSteps]);

  const progressPercent = useMemo(() => {
    if (!steps.length) return 0;

    return Math.round((selectedCount / steps.length) * 100);
  }, [selectedCount, steps.length]);

  const handleClearActive = () => {
    activeKeys.forEach((k) => handleFileSelect(k, null));
    setButtonStatus("idle");
  };

  const handleChangeLoja = (loja: string) => {
    (["bling", "tray", "vinculo", "modelo"] as PlanilhaKey[]).forEach((k) =>
      handleFileSelect(k, null)
    );

    setButtonStatus("idle");
    setSelectedLoja(loja as Loja);
  };

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

  const getButtonContent = () => {
    if (buttonStatus === "processing" || status === "processing") {
      return (
        <>
          <Loader className="h-5 w-5 animate-spin" />
          <span>Processando...</span>
        </>
      );
    }

    if (buttonStatus === "success") {
      return (
        <>
          <CheckCircle2 className="h-5 w-5" />
          <span>Concluído!</span>
        </>
      );
    }

    if (buttonStatus === "error") {
      return "Tentar novamente";
    }

    if (!allFilesSelected) {
      return "Selecionar arquivos";
    }

    return "Iniciar automação";
  };

  const getSummaryStatus = () => {
    if (buttonStatus === "processing" || status === "processing") {
      return {
        label: "Processando arquivos",
        description: "Aguarde enquanto a automação é executada.",
        icon: <Loader className="h-5 w-5 animate-spin" />,
        className: "border-orange-500/25 bg-orange-500/10 text-orange-400",
      };
    }

    if (buttonStatus === "success") {
      return {
        label: "Automação concluída",
        description: "O processamento foi finalizado com sucesso.",
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: "border-green-500/25 bg-green-500/10 text-green-400",
      };
    }

    if (buttonStatus === "error") {
      return {
        label: "Erro no processamento",
        description: "Revise os arquivos e tente novamente.",
        icon: <AlertCircle className="h-5 w-5" />,
        className: "border-red-500/25 bg-red-500/10 text-red-400",
      };
    }

    if (allFilesSelected) {
      return {
        label: "Tudo pronto",
        description: "Todos os arquivos foram selecionados.",
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: "border-green-500/25 bg-green-500/10 text-green-400",
      };
    }

    return {
      label: "Aguardando arquivos",
      description: missingLabels
        ? `Faltam: ${missingLabels}`
        : "Selecione as planilhas necessárias.",
      icon: <AlertCircle className="h-5 w-5" />,
      className: "border-white/10 bg-white/[0.04] text-white/55",
    };
  };

  const summaryStatus = getSummaryStatus();
  const isThreeCards = steps.length === 3;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start overflow-hidden bg-transparent px-4 md:mt-10 md:px-6">
      <div className="mx-auto flex w-full max-w-[1880px] justify-center">
        {/* DESKTOP */}
        <GlassmorphicCard className="relative hidden min-h-[640px] w-full overflow-hidden rounded-3xl border border-white/10 p-8 shadow-2xl md:block">
          <div className="relative z-10 flex h-full min-h-[584px] flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/45">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#1A8CEB]" />
                  Automação de planilhas
                </div>

                <h1 className="text-2xl font-bold leading-tight text-white">
                  Importador de Planilhas
                </h1>

                <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-white/45">
                  Envie os arquivos obrigatórios, confira a prévia e inicie a
                  automação da loja selecionada.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.92, rotate: -10 }}
                  onClick={handleClearActive}
                  title="Limpar arquivos da loja"
                  className="
                    flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl
                    border border-red-500/20 bg-red-500/10 text-red-400
                    transition-all hover:bg-red-500/15 hover:text-red-300
                    active:scale-[0.96]
                  "
                >
                  <Repeat2 className="h-5 w-5" />
                </motion.button>

                <FiltroLoja
                  selectedLoja={selectedLoja}
                  setSelectedLoja={handleChangeLoja}
                />
              </div>
            </div>

            {/* Main layout */}
            <div className="mt-8 grid flex-1 grid-cols-[minmax(0,1fr)_380px] gap-6">
              {/* Left area */}
              <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Arquivos obrigatórios
                    </h2>

                    <p className="mt-1 text-xs text-white/40">
                      Clique no card ou arraste a planilha correspondente.
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/45">
                    {steps.length} arquivos
                  </div>
                </div>

                <div
                  className={cn(
                    "grid w-full gap-5",
                    isThreeCards ? "grid-cols-3" : "grid-cols-4"
                  )}
                >
                  {steps.map((item, i) => (
                    <FileUploadCard
                      key={item.key}
                      label={item.label}
                      selectedFile={planilhas[item.key]}
                      onFileSelect={(f) => {
                        if (!f) {
                          handleFileSelect(item.key, null);
                          return;
                        }

                        setPreviewFile(f);
                        setPendingKey(item.key);
                        setPreviewOpen(true);
                      }}
                      stepNumber={i + 1}
                      icon={item.icon}
                    />
                  ))}
                </div>
              </div>

              {/* Right summary */}
              <aside className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-white">Resumo</h2>

                  <p className="mt-1 text-xs text-white/40">
                    Acompanhe o envio e execute a automação.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]">
                        <Store className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                          Loja
                        </p>

                        <p className="truncate text-sm font-bold text-white">
                          {selectedLoja}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                          Progresso
                        </p>

                        <p className="mt-1 text-2xl font-black text-white">
                          {selectedCount}
                          <span className="text-sm font-bold text-white/35">
                            /{steps.length}
                          </span>
                        </p>
                      </div>

                      <div
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold",
                          allFilesSelected
                            ? "bg-green-500/10 text-green-400"
                            : "bg-white/[0.05] text-white/45"
                        )}
                      >
                        {progressPercent}%
                      </div>
                    </div>

                    <ProgressIndicator
                      totalSteps={steps.length}
                      completedSteps={selectedCount}
                      loading={buttonStatus === "processing"}
                    />
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl border p-4",
                      summaryStatus.className
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {summaryStatus.icon}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {summaryStatus.label}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed opacity-75">
                          {summaryStatus.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleStartAutomation}
                    disabled={!allFilesSelected || status === "processing"}
                    className={`${getButtonColor()} flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-bold shadow-md transition-all ${
                      !allFilesSelected || status === "processing"
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    {getButtonContent()}
                  </motion.button>

                  <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
                    A automação só pode ser iniciada quando todos os arquivos
                    obrigatórios estiverem selecionados.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </GlassmorphicCard>

        {/* MOBILE */}
        <div className="min-h-screen w-full overflow-y-scroll px-0 pb-[calc(180px+env(safe-area-inset-bottom))] pt-4 md:hidden">
          <div className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-background/95 px-4 pb-3 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  Importador de Planilhas
                </h1>

                <p className="truncate text-xs text-muted-foreground">
                  Envie os arquivos necessários
                </p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.92, rotate: -10 }}
                  onClick={handleClearActive}
                  title="Limpar arquivos da loja"
                  className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-400"
                >
                  <Repeat2 className="h-5 w-5" />
                </motion.button>

                <FiltroLoja
                  selectedLoja={selectedLoja}
                  setSelectedLoja={handleChangeLoja}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <GlassmorphicCard className="w-full overflow-hidden rounded-2xl border border-white/10 p-4 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Loja selecionada
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#1A8CEB]">
                    {selectedLoja}
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-muted-foreground">
                  {selectedCount}/{steps.length}
                </div>
              </div>

              <ProgressIndicator
                totalSteps={steps.length}
                completedSteps={selectedCount}
                loading={buttonStatus === "processing"}
              />

              {buttonStatus !== "processing" &&
                !allFilesSelected &&
                missingLabels && (
                  <p className="mt-4 text-center text-[11px] text-muted-foreground">
                    Faltam: {missingLabels}
                  </p>
                )}

              {buttonStatus !== "processing" && allFilesSelected && (
                <p className="mt-4 text-center text-xs font-semibold text-green-500">
                  Todos os arquivos foram selecionados
                </p>
              )}
            </GlassmorphicCard>

            <div className="grid grid-cols-1 gap-3">
              {steps.map((item, i) => (
                <FileUploadCard
                  key={item.key}
                  label={item.label}
                  selectedFile={planilhas[item.key]}
                  onFileSelect={(f) => {
                    if (!f) {
                      handleFileSelect(item.key, null);
                      return;
                    }

                    setPreviewFile(f);
                    setPendingKey(item.key);
                    setPreviewOpen(true);
                  }}
                  stepNumber={i + 1}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-background/95 px-4 pb-[calc(64px+env(safe-area-inset-bottom))] pt-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartAutomation}
              disabled={!allFilesSelected || status === "processing"}
              className={`${getButtonColor()} flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-none transition-all ${
                !allFilesSelected || status === "processing"
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              {getButtonContent()}
            </motion.button>
          </div>
        </div>
      </div>

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