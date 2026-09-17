"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelSelector } from "@/components/announce/edit/Channelselector";

type Loja = "Pikot Shop" | "Sóbaquetas";

const lojas: { nome: Loja; descricao: string }[] = [
  { nome: "Pikot Shop", descricao: "" },
  { nome: "Sóbaquetas", descricao: "" },
];

const getStoreTheme = (loja: Loja) => {
  if (loja === "Sóbaquetas") {
    return {
      text: "text-[#f0ad26]",
      bg: "bg-[#f0ad26]/10",
      border: "border-[#f0ad26]/30",
      hoverBorder: "hover:border-[#f0ad26]/50",
      hoverBg: "hover:bg-[#f0ad26]/[0.06]",
    };
  }
  return {
    text: "text-[#1A8CEB]",
    bg: "bg-[#1A8CEB]/10",
    border: "border-[#1A8CEB]/30",
    hoverBorder: "hover:border-[#1A8CEB]/50",
    hoverBg: "hover:bg-[#1A8CEB]/[0.06]",
  };
};

interface Channel {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (loja: Loja, canais: string[]) => void;
  availableChannels: Channel[];
  isLoadingChannels?: boolean;
}

export default function SelecionarLojaModal({
  open,
  onOpenChange,
  onConfirm,
  availableChannels,
  isLoadingChannels = false,
}: Props) {
  const [step, setStep] = useState<"loja" | "canal">("loja");
  const [lojaSelecionada, setLojaSelecionada] = useState<Loja | null>(null);
  const [canaisSelecionados, setCanaisSelecionados] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  const resetTudo = () => {
    setStep("loja");
    setLojaSelecionada(null);
    setCanaisSelecionados([]);
    setConfirmando(false);
  };

  const handleSelectLoja = (loja: Loja) => {
    setLojaSelecionada(loja);
    setStep("canal");
  };

  const handleConfirmarCanais = () => {
    if (!lojaSelecionada || canaisSelecionados.length === 0 || confirmando) return;
    setConfirmando(true);
    onConfirm(lojaSelecionada, canaisSelecionados);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetTudo();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-32px)] max-w-md border border-white/10 bg-[#0f0f0f]/95 p-6 text-white shadow-2xl backdrop-blur-xl">
        {step === "loja" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-white/90">
                <span className="flex h-9 w-9 items-center justify-center rounded border border-[#1A8CEB]/25 bg-[#1A8CEB]/10 text-[#1A8CEB]">
                  <Store className="h-5 w-5" />
                </span>
                Selecione a loja
              </DialogTitle>
            </DialogHeader>

            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Escolha para qual loja essa planilha Bling será processada.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lojas.map(({ nome }, index) => {
                const theme = getStoreTheme(nome);
                return (
                  <button
                    key={nome}
                    type="button"
                    autoFocus={index === 0}
                    onClick={() => handleSelectLoja(nome)}
                    className={cn(
                      "group flex flex-col items-start gap-3 border px-4 py-4 text-left transition-all",
                      "active:scale-[0.97]",
                      "border-white/10 bg-white/[0.02]",
                      theme.hoverBorder,
                      theme.hoverBg
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded border transition-transform",
                        theme.border,
                        theme.bg,
                        theme.text,
                        "group-hover:scale-110"
                      )}
                    >
                      <Store className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-bold", theme.text)}>
                        {nome}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 self-end text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "canal" && lojaSelecionada && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-white/90">
                Selecione o(s) canal(is)
              </DialogTitle>
            </DialogHeader>

            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Os produtos serão gerados para <b>{lojaSelecionada}</b> em cada
              canal selecionado. Se marcar mais de um canal, cada produto será
              duplicado por canal.
            </p>

            <div className="mt-4">
              <ChannelSelector
                availableChannels={availableChannels}
                selectedChannels={canaisSelecionados}
                onChange={setCanaisSelecionados}
                isLoading={isLoadingChannels}
                required
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("loja")}
                disabled={confirmando}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmarCanais}
                disabled={canaisSelecionados.length === 0 || confirmando}
                className="flex items-center gap-1.5 rounded bg-[#1A8CEB] px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {confirmando ? "Processando..." : "Continuar"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
