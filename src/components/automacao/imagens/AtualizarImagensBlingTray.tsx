"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Images,
  Loader,
  Package,
  Repeat2,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { FileUploadCard } from "@/components/automacao/modelo/FileUploadCard";
import { ProgressIndicator } from "@/components/automacao/modelo/ProgressIndicator";
import PreviewPlanilhaModal from "@/components/automacao/modelo/PreviewPlanilhaModal";
import { cn } from "@/lib/utils";
import {
  ImagensPlanilhaKey,
  useAtualizarImagensBlingTray,
} from "@/components/automacao/hooks/useAtualizarImagensBlingTray";

type StepItem = {
  key: ImagensPlanilhaKey;
  label: string;
  description: string;
  icon: React.ReactNode;
};

export default function AtualizarImagensBlingTray() {
  const {
    planilhas,
    status,
    erro,
    handleFileSelect,
    limparArquivos,
    iniciarAutomacao,
  } = useAtualizarImagensBlingTray();

  const [buttonStatus, setButtonStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [pendingKey, setPendingKey] = useState<ImagensPlanilhaKey | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const steps: StepItem[] = useMemo(
    () => [
      {
        key: "tray",
        label: "Tray",
        description:
          "Planilha origem das imagens. O sistema lê as URLs e organiza tudo em uma única sequência.",
        icon: <ShoppingCart className="h-8 w-8" />,
      },
      {
        key: "bling",
        label: "Bling",
        description:
          "Planilha que será atualizada com os links na coluna URL Imagens Externas.",
        icon: <Package className="h-8 w-8" />,
      },
    ],
    []
  );

  const selectedCount = useMemo(() => {
    return steps.filter((step) => planilhas[step.key] !== null).length;
  }, [steps, planilhas]);

  const allFilesSelected = useMemo(() => {
    return steps.every((step) => planilhas[step.key] !== null);
  }, [steps, planilhas]);

  const missingLabels = useMemo(() => {
    return steps
      .filter((step) => !planilhas[step.key])
      .map((step) => step.label)
      .join(", ");
  }, [steps, planilhas]);

  const progressPercent = useMemo(() => {
    return Math.round((selectedCount / steps.length) * 100);
  }, [selectedCount, steps.length]);

  const handleClear = () => {
    limparArquivos();
    setButtonStatus("idle");
  };

  const handleStartAutomation = async () => {
    if (!allFilesSelected) {
      alert("⚠️ Selecione as planilhas Bling e Tray.");
      return;
    }

    try {
      setButtonStatus("processing");
      await iniciarAutomacao();
      setButtonStatus("success");
    } catch (err) {
      console.error("Erro ao atualizar imagens:", err);
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
          <span>Processando imagens...</span>
        </>
      );
    }

    if (buttonStatus === "success") {
      return (
        <>
          <CheckCircle2 className="h-5 w-5" />
          <span>Planilha gerada!</span>
        </>
      );
    }

    if (buttonStatus === "error") {
      return "Tentar novamente";
    }

    if (!allFilesSelected) {
      return "Selecione Bling e Tray";
    }

    return "Gerar planilha atualizada";
  };

  const getSummaryStatus = () => {
    if (buttonStatus === "processing" || status === "processing") {
      return {
        label: "Processando arquivos",
        description:
          "Lendo o Tray, agrupando as imagens e preenchendo o Bling.",
        icon: <Loader className="h-5 w-5 animate-spin" />,
        className: "border-orange-500/25 bg-orange-500/10 text-orange-400",
      };
    }

    if (buttonStatus === "success") {
      return {
        label: "Concluído com sucesso",
        description:
          "A planilha Bling atualizada foi gerada e o download foi iniciado.",
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: "border-green-500/25 bg-green-500/10 text-green-400",
      };
    }

    if (buttonStatus === "error" || status === "error") {
      return {
        label: "Erro no processamento",
        description: erro || "Revise os arquivos e tente novamente.",
        icon: <AlertCircle className="h-5 w-5" />,
        className: "border-red-500/25 bg-red-500/10 text-red-400",
      };
    }

    if (allFilesSelected) {
      return {
        label: "Tudo pronto",
        description: "Agora você já pode gerar a planilha Bling atualizada.",
        icon: <CheckCircle2 className="h-5 w-5" />,
        className: "border-green-500/25 bg-green-500/10 text-green-400",
      };
    }

    return {
      label: "Aguardando planilhas",
      description: missingLabels
        ? `Faltam: ${missingLabels}`
        : "Selecione as planilhas necessárias.",
      icon: <AlertCircle className="h-5 w-5" />,
      className: "border-white/10 bg-white/[0.04] text-white/55",
    };
  };

  const summaryStatus = getSummaryStatus();

  return (
    <div className="flex min-h-screen w-full items-start justify-center overflow-hidden bg-transparent px-4 py-6 md:px-6 md:py-10">
      <div className="w-full max-w-[1380px]">
        {/* DESKTOP */}
        <div className="hidden md:block">
          <div className="grid min-h-[640px] grid-cols-[360px_minmax(0,1fr)] gap-6">
            {/* Lateral */}
            <GlassmorphicCard className="relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-2xl">
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/45">
                    <Images className="h-3.5 w-3.5 text-[#1A8CEB]" />
                    Automação de imagens
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.92, rotate: -10 }}
                    onClick={handleClear}
                    title="Limpar arquivos"
                    aria-label="Limpar arquivos"
                    className="
                      flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl
                      border border-red-500/20 bg-red-500/10 text-red-400
                      transition-all hover:bg-red-500/15 hover:text-red-300
                      active:scale-[0.96]
                    "
                  >
                    <Repeat2 className="h-5 w-5" />
                  </motion.button>
                </div>

                <h1 className="text-3xl font-black leading-tight text-white">
                  Bling via Tray
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-white/45">
                  Envie as duas planilhas para transferir os links de imagens do
                  Tray para o Bling automaticamente.
                </p>

                <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/35">
                      Progresso
                    </p>

                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        allFilesSelected
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/[0.05] text-white/45"
                      )}
                    >
                      {progressPercent}%
                    </span>
                  </div>

                  <p className="mb-4 text-4xl font-black text-white">
                    {selectedCount}
                    <span className="text-base font-bold text-white/35">
                      /{steps.length}
                    </span>
                  </p>

                  <ProgressIndicator
                    totalSteps={steps.length}
                    completedSteps={selectedCount}
                    loading={buttonStatus === "processing"}
                  />
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                        summaryStatus.className
                      )}
                    >
                      {summaryStatus.icon}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">
                        {summaryStatus.label}
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-white/40">
                        {summaryStatus.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleStartAutomation}
                    disabled={!allFilesSelected || status === "processing"}
                    className={`${getButtonColor()} flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-md transition-all ${
                      !allFilesSelected || status === "processing"
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    {getButtonContent()}
                  </motion.button>
                </div>
              </div>
            </GlassmorphicCard>

            {/* Principal */}
            <GlassmorphicCard className="relative overflow-hidden rounded-3xl border border-white/10 p-7 shadow-2xl">
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-8">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/45">
                    <Sparkles className="h-3.5 w-3.5 text-[#1A8CEB]" />
                    Fluxo simplificado
                  </div>

                  <h2 className="text-2xl font-black text-white">
                    Selecione os arquivos
                  </h2>

                  <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-white/45">
                    A planilha Tray será usada como origem das imagens. A
                    planilha Bling será o arquivo final atualizado.
                  </p>
                </div>

                <div className="grid flex-1 grid-cols-2 items-start gap-6">
                  <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-[#1A8CEB]">
                        Etapa 1
                      </p>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Enviar Tray
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-white/40">
                        Arquivo que contém as colunas de imagens dos anúncios.
                      </p>
                    </div>

                    <FileUploadCard
                      label="Tray"
                      selectedFile={planilhas.tray}
                      onFileSelect={(file) => {
                        if (!file) {
                          handleFileSelect("tray", null);
                          return;
                        }

                        setPreviewFile(file);
                        setPendingKey("tray");
                        setPreviewOpen(true);
                      }}
                      stepNumber={1}
                      icon={<ShoppingCart className="h-8 w-8" />}
                    />
                  </div>

                  <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-[#1A8CEB]">
                        Etapa 2
                      </p>

                      <h3 className="mt-1 text-xl font-black text-white">
                        Enviar Bling
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-white/40">
                        Arquivo que receberá as imagens externas atualizadas.
                      </p>
                    </div>

                    <FileUploadCard
                      label="Bling"
                      selectedFile={planilhas.bling}
                      onFileSelect={(file) => {
                        if (!file) {
                          handleFileSelect("bling", null);
                          return;
                        }

                        setPreviewFile(file);
                        setPendingKey("bling");
                        setPreviewOpen(true);
                      }}
                      stepNumber={2}
                      icon={<Package className="h-8 w-8" />}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#1A8CEB]/20 bg-[#1A8CEB]/10 text-[#1A8CEB]">
                      <Images className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">
                        Resultado esperado
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-white/40">
                        Será baixada uma nova planilha Bling com a coluna{" "}
                        <span className="font-bold text-white/70">
                          URL Imagens Externas
                        </span>{" "}
                        preenchida conforme os produtos encontrados no Tray.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassmorphicCard>
          </div>
        </div>

        {/* MOBILE */}
        <div className="min-h-screen w-full overflow-y-auto pb-[calc(140px+env(safe-area-inset-bottom))] md:hidden">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/45">
                  <Images className="h-3.5 w-3.5 text-[#1A8CEB]" />
                  Automação
                </div>

                <h1 className="text-xl font-black leading-tight text-white">
                  Bling via Tray
                </h1>

                <p className="mt-1 text-xs leading-relaxed text-white/40">
                  Atualize imagens externas do Bling usando os links do Tray.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.92, rotate: -10 }}
                type="button"
                onClick={handleClear}
                title="Limpar arquivos"
                aria-label="Limpar arquivos"
                className="
                  flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl
                  border border-red-500/20 bg-red-500/10 text-red-400
                "
              >
                <Repeat2 className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-white/35">
                  Progresso
                </p>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    allFilesSelected
                      ? "bg-green-500/10 text-green-500"
                      : "bg-white/[0.05] text-white/45"
                  )}
                >
                  {selectedCount}/{steps.length}
                </span>
              </div>

              <ProgressIndicator
                totalSteps={steps.length}
                completedSteps={selectedCount}
                loading={buttonStatus === "processing"}
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <FileUploadCard
              label="Tray"
              selectedFile={planilhas.tray}
              onFileSelect={(file) => {
                if (!file) {
                  handleFileSelect("tray", null);
                  return;
                }

                setPreviewFile(file);
                setPendingKey("tray");
                setPreviewOpen(true);
              }}
              stepNumber={1}
              icon={<ShoppingCart className="h-8 w-8" />}
            />

            <FileUploadCard
              label="Bling"
              selectedFile={planilhas.bling}
              onFileSelect={(file) => {
                if (!file) {
                  handleFileSelect("bling", null);
                  return;
                }

                setPreviewFile(file);
                setPendingKey("bling");
                setPreviewOpen(true);
              }}
              stepNumber={2}
              icon={<Package className="h-8 w-8" />}
            />
          </div>

          <div
            className={cn(
              "mt-4 rounded-2xl border p-4",
              summaryStatus.className
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{summaryStatus.icon}</div>

              <div className="min-w-0">
                <p className="text-sm font-bold">{summaryStatus.label}</p>

                <p className="mt-1 text-xs leading-relaxed opacity-75">
                  {summaryStatus.description}
                </p>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-background/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleStartAutomation}
              disabled={!allFilesSelected || status === "processing"}
              className={`${getButtonColor()} flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-black text-white shadow-md transition-all ${
                !allFilesSelected || status === "processing"
                  ? "cursor-not-allowed opacity-50"
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
        onOpenChange={(open) => {
          setPreviewOpen(open);

          if (!open) {
            setPreviewFile(null);
            setPendingKey(null);
          }
        }}
        file={previewFile}
        onConfirm={(file) => {
          if (pendingKey) {
            handleFileSelect(pendingKey, file);
          }

          setPreviewOpen(false);
          setPreviewFile(null);
          setPendingKey(null);
        }}
      />
    </div>
  );
}