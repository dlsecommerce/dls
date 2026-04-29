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
      <DialogContent className="bg-[#0f0f0f] border border-neutral-700 rounded-2xl text-white max-w-md shadow-2xl w-[calc(100vw-24px)] md:w-full p-5 md:p-6 top-[44%] md:top-1/2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
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
          <p className="text-neutral-300 text-sm md:text-base leading-relaxed">
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

        <DialogFooter className="mt-5 flex flex-col-reverse md:flex-row justify-end gap-3">
          {/* Botão cancelar */}
          <Button
            variant="outline"
            type="button"
            className="w-full md:w-auto h-11 md:h-10 border-neutral-700 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>

          {/* Botão salvar (agora fecha o modal ao clicar) */}
          <Button
            type="button"
            className={`w-full md:w-auto h-11 md:h-10 bg-gradient-to-r from-[#1a8ceb] to-[#1472c4] hover:scale-105 text-white flex items-center justify-center gap-2 cursor-pointer ${
              saving ? "opacity-80 cursor-wait" : ""
            }`}
            onClick={() => {
              onConfirm(); // executa o salvamento
              onOpenChange(false); // fecha o modal
            }}
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