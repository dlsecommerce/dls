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
  preview?: any[];
  warnings?: string[]; // 👈 adicionamos suporte a avisos
};

export default function ConfirmImportModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  preview = [],
  warnings = [],
}: Props) {
  const keys = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Confirmar Importação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-neutral-300">
            Foram detectados{" "}
            <span className="text-white font-semibold">{count}</span>{" "}
            custos no arquivo. Deseja realmente importá-los?
          </p>

          {/* ⚠️ Bloco de aviso visual */}
          {warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300 flex items-start gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-yellow-400">Atenção:</strong>
                <ul className="list-disc list-inside mt-1">
                  {warnings.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* 📋 Prévia dos dados */}
          {preview.length > 0 && (
            <div className="mt-4 max-h-60 overflow-auto rounded-xl border border-neutral-700">
              <table className="w-full text-sm text-neutral-300">
                <thead className="bg-neutral-800 sticky top-0">
                  <tr>
                    {keys.map((k) => (
                      <th key={k} className="text-left p-2 font-semibold whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      className="odd:bg-neutral-900 even:bg-neutral-800/50 transition-colors"
                    >
                      {keys.map((k) => (
                        <td key={k} className="p-2">
                          {row[k] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Botões */}
        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:scale-105 cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:scale-105 text-white flex items-center gap-2 cursor-pointer"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin w-5 h-5" />
                Importando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
