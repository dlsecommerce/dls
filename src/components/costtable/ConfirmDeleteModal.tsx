"use client";

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
  onConfirm: () => void;
  loading: boolean;
};

export default function ConfirmDeleteModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100vw-24px)]
          max-w-[calc(100vw-24px)]
          sm:max-w-md
          bg-[#0f0f0f]/95
          backdrop-blur-xl
          border
          border-neutral-700
          rounded-2xl
          text-white
          shadow-2xl
          p-4
          sm:p-6
        "
      >
        <DialogHeader>
          <DialogTitle
            className="
              flex items-center gap-2
              text-base sm:text-lg
              font-semibold text-white
              pr-6 sm:pr-0
            "
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
            Excluir Produto(s)
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            Deseja realmente excluir{" "}
            <span className="text-white font-semibold">{count}</span>{" "}
            {count === 1 ? "produto selecionado" : "produtos selecionados"}?
          </p>

          <div
            className="
              bg-red-500/10
              border border-red-500/30
              rounded-xl
              p-3
              text-sm
              text-red-300
              flex items-start gap-2
            "
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed text-sm">
              <strong className="text-red-400">Atenção:</strong> Esta ação é
              permanente e não poderá ser desfeita.
            </div>
          </div>
        </motion.div>

        <DialogFooter
          className="
            mt-5
            flex flex-col-reverse gap-2
            sm:flex-row sm:justify-end
            sm:gap-3
          "
        >
          <Button
            variant="outline"
            className="
              w-full sm:w-auto
              border-neutral-700
              text-white
              transition-all
              cursor-pointer
              hover:scale-100 sm:hover:scale-105
            "
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            className="
              w-full sm:w-auto
              bg-gradient-to-r from-[#ef4444] to-[#dc2626]
              text-white
              flex items-center justify-center gap-2
              cursor-pointer
              transition-all
              hover:scale-100 sm:hover:scale-105
            "
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}