"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteModal({
  open,
  onOpenChange,
  count,
  loading = false,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        className="
          w-[calc(100vw-1.5rem)]
          max-w-md
          rounded-2xl
          border border-neutral-700
          bg-[#0f0f0f]
          p-4 sm:p-6
          text-white
          shadow-2xl
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            Excluir Anúncio(s)
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          <p className="text-sm leading-6 text-neutral-300 sm:text-base">
            Deseja realmente excluir{" "}
            <span className="font-semibold text-white">{count}</span>{" "}
            {count === 1 ? "anúncio selecionado" : "anúncios selecionados"}?
          </p>

          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-5 text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <strong className="text-red-400">Atenção:</strong> Esta ação é
              permanente e não poderá ser desfeita.
            </div>
          </div>
        </motion.div>

        <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            className="
              h-11 w-full
              cursor-pointer
              border-neutral-700
              text-white
              transition-all
              active:scale-[0.98]
              sm:w-auto
              sm:hover:scale-105
            "
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            className="
              flex h-11 w-full
              cursor-pointer
              items-center justify-center gap-2
              bg-gradient-to-r from-[#ef4444] to-[#dc2626]
              text-white
              active:scale-[0.98]
              sm:w-auto
              sm:hover:scale-105
            "
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader className="h-5 w-5 animate-spin" /> : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}