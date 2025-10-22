"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LogOut, Loader } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void; // ação que executa o "voltar"
};

export default function ConfirmExitModal({
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);

    // Simula leve atraso antes de redirecionar
    await new Promise((res) => setTimeout(res, 800));

    onConfirm(); // Executa o router.back() do hook
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <LogOut className="w-5 h-5 text-[#e74c3c]" />
            Deseja mesmo voltar?
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          <p className="text-neutral-300">
            As alterações não salvas serão perdidas. Confirma a saída desta
            página?
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
            <strong className="text-red-400">Aviso:</strong> Essa ação não pode ser desfeita.
          </div>
        </motion.div>

        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            className="border-neutral-700 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            className={`bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white cursor-pointer transition-all ${
              loading ? "opacity-80 cursor-wait" : "hover:scale-105"
            }`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin text-white" />
            ) : (
              "Voltar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}