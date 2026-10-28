"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader,
  Package,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";

import PreviewPlanilhaModal from "@/components/automacao/modelo/PreviewPlanilhaModal";
import { cn } from "@/lib/utils";
import {
  ImagensPlanilhaKey,
  useAtualizarImagensBlingTray,
} from "@/components/automacao/hooks/useAtualizarImagensBlingTray";

const CARDS: {
  key: ImagensPlanilhaKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "tray", label: "Tray", icon: <ShoppingCart className="h-10 w-10" /> },
  { key: "bling", label: "Bling", icon: <Package className="h-10 w-10" /> },
];

type UploadCardProps = {
  label: string;
  icon: React.ReactNode;
  file: File | null;
  onPick: (file: File) => void;
};

function UploadCard({ label, icon, file, onPick }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const abrir = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onPick(dropped);
      }}
      className={cn(
        "group flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-[#1A8CEB]/40",
        dragging
          ? "border-[#1A8CEB]/40 bg-[#1A8CEB]/15"
          : file
          ? "border-[#1A8CEB]/30 bg-white/[0.03]"
          : "border-white/15 bg-transparent hover:border-[#1A8CEB]/30 hover:bg-[#1A8CEB]/5"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onPick(selected);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl border transition-all",
          file
            ? "border-[#1A8CEB]/30 bg-[#1A8CEB]/10 text-[#1A8CEB]"
            : dragging
            ? "border-[#1A8CEB]/40 bg-[#1A8CEB]/15 text-[#1A8CEB]"
            : "border-white/10 bg-white/[0.04] text-white/45 group-hover:border-[#1A8CEB]/30 group-hover:bg-[#1A8CEB]/10 group-hover:text-[#1A8CEB]"
        )}
      >
        {file ? <CheckCircle2 className="h-10 w-10" /> : icon}
      </div>

      <h2 className="mt-6 text-xl font-bold text-white">{label}</h2>

      {file ? (
        <p className="mt-2 w-full truncate px-2 text-sm text-[#1A8CEB]">
          {file.name}
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/45">
          ou clique para selecionar o arquivo
        </p>
      )}

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-white/25">
        Formatos aceitos: .xlsx, .xls ou .csv
      </p>
    </div>
  );
}

export default function AtualizarImagensBlingTray() {
  const {
    planilhas,
    status,
    erro,
    handleFileSelect,
    limparArquivos,
    iniciarAutomacao,
  } = useAtualizarImagensBlingTray();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [pendingKey, setPendingKey] = useState<ImagensPlanilhaKey | null>(null);

  const allSelected = planilhas.tray !== null && planilhas.bling !== null;
  const anySelected = planilhas.tray !== null || planilhas.bling !== null;
  const isProcessing = status === "processing";

  // Processa automaticamente assim que as duas planilhas estiverem confirmadas.
  // Só dispara quando o status está "idle", então não há reprocessamento em loop.
  useEffect(() => {
    if (allSelected && status === "idle") {
      iniciarAutomacao().catch((err) =>
        console.error("Erro ao atualizar imagens:", err)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSelected, status]);

  const abrirPreview = (key: ImagensPlanilhaKey, file: File) => {
    setPendingKey(key);
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const fecharPreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setPendingKey(null);
  };

  const confirmarArquivo = (file: File) => {
    if (pendingKey) handleFileSelect(pendingKey, file);
    fecharPreview();
  };

  const tentarNovamente = () => {
    iniciarAutomacao().catch((err) =>
      console.error("Erro ao atualizar imagens:", err)
    );
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-transparent px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="grid gap-6 md:grid-cols-2">
          {CARDS.map((card) => (
            <UploadCard
              key={card.key}
              label={card.label}
              icon={card.icon}
              file={planilhas[card.key]}
              onPick={(file) => abrirPreview(card.key, file)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8 flex items-center justify-center gap-3 text-sm text-white/60"
            >
              <Loader className="h-5 w-5 animate-spin text-[#1A8CEB]" />
              Processando planilhas...
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8 flex items-center justify-center gap-3 text-sm text-green-400"
            >
              <CheckCircle2 className="h-5 w-5" />
              Planilha gerada. O download foi iniciado.
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="flex items-center gap-3 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{erro || "Erro ao processar. Tente novamente."}</span>
              </div>

              {allSelected && (
                <button
                  type="button"
                  onClick={tentarNovamente}
                  className="flex items-center gap-2 border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.08]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Tentar novamente
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {anySelected && !isProcessing && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                limparArquivos();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/35 transition-colors hover:text-white/60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        )}
      </div>

      <PreviewPlanilhaModal
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) fecharPreview();
        }}
        file={previewFile}
        onConfirm={confirmarArquivo}
      />
    </div>
  );
}
