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
import { Loader, Save } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
};

export default function ConfirmSaveModal({
  open,
  onOpenChange,
  onConfirm,
  saving,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-[#1a8ceb]" />
            Confirmar Salvamento
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          <p className="text-neutral-300">
            Deseja realmente salvar as alterações deste anúncio?
          </p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-sm text-blue-300 flex items-start gap-2">
            <Save className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-400">Dica:</strong> Verifique todos
              os campos antes de confirmar o salvamento.
            </div>
          </div>
        </motion.div>

        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className={`bg-gradient-to-r from-[#1a8ceb] to-[#1472c4] hover:scale-105 text-white flex items-center gap-2 cursor-pointer ${
              saving ? "opacity-80 cursor-wait" : ""
            }`}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? (
              <>
              <Loader className="w-5 h-5 animate-spin" />
              </>
            ) : (
              <>
              <Save className="w-5 h-5" />
              Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
