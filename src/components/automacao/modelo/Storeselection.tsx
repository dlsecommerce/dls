"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Loja = "Pikot Shop" | "Sóbaquetas";

const lojas: { nome: Loja; descricao: string }[] = [
  { nome: "Pikot Shop" },
  { nome: "Sóbaquetas" },
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (loja: Loja) => void;
}

export default function SelecionarLojaModal({
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const [selecionando, setSelecionando] = useState<Loja | null>(null);

  const handleSelect = (loja: Loja) => {
    if (selecionando) return;
    setSelecionando(loja);
    onSelect(loja);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelecionando(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-32px)] max-w-md border border-white/10 bg-[#0f0f0f]/95 p-6 text-white shadow-2xl backdrop-blur-xl">
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
          {lojas.map(({ nome, descricao }, index) => {
            const theme = getStoreTheme(nome);
            const isSelecionando = selecionando === nome;
            const isBloqueado = selecionando !== null && !isSelecionando;

            return (
              <button
                key={nome}
                type="button"
                autoFocus={index === 0}
                disabled={selecionando !== null}
                onClick={() => handleSelect(nome)}
                className={cn(
                  "group flex flex-col items-start gap-3 border px-4 py-4 text-left transition-all",
                  "active:scale-[0.97] disabled:cursor-not-allowed",
                  "border-white/10 bg-white/[0.02]",
                  !isBloqueado && theme.hoverBorder,
                  !isBloqueado && theme.hoverBg,
                  isSelecionando && "opacity-80",
                  isBloqueado && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded border transition-transform",
                    theme.border,
                    theme.bg,
                    theme.text,
                    !isBloqueado && "group-hover:scale-110"
                  )}
                >
                  <Store className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-bold", theme.text)}>
                    {nome}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    {descricao}
                  </p>
                </div>

                <ArrowRight
                  className={cn(
                    "h-4 w-4 self-end text-white/20 transition-transform",
                    !isBloqueado && "group-hover:translate-x-0.5 group-hover:text-white/40"
                  )}
                />
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-white/30">
          Você poderá revisar os dados antes de confirmar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
