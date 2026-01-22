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
  importing: boolean;

  previewRows?: any[];
  warnings?: string[];

  // opcional (se você ainda não estiver gerando erros bloqueadores)
  errors?: string[];

  tipo: "inclusao" | "alteracao";
};

export default function ConfirmImportModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  importing,
  previewRows = [],
  warnings = [],
  errors = [],
  tipo,
}: Props) {
  const keys = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const titulo =
    tipo === "inclusao"
      ? "Confirmar Inclusão de Custos"
      : "Confirmar Alteração de Custos";

  const texto =
    tipo === "inclusao"
      ? "Você está prestes a INCLUIR novos custos na base. Códigos já existentes serão bloqueados."
      : "Você está prestes a ALTERAR custos existentes. Códigos inexistentes serão bloqueados.";

  return (
    <Dialog open={open} onOpenChange={(v) => !importing && onOpenChange(v)}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-3xl shadow-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-neutral-300 leading-relaxed">{texto}</p>

          <p className="text-neutral-300">
            O arquivo contém{" "}
            <span className="text-white font-semibold">{count}</span>{" "}
            registros.
          </p>

          {/* ❌ ERROS BLOQUEADORES */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-600/40 rounded-xl p-3 text-sm text-red-400 flex items-start gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-400">Erros encontrados:</strong>
                <ul className="list-disc list-inside mt-1">
                  {errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
                <p className="mt-1 text-red-500 font-medium">
                  A importação foi bloqueada. Corrija antes de prosseguir.
                </p>
              </div>
            </motion.div>
          )}

          {/* ⚠️ Avisos (não bloqueiam) */}
          {warnings.length > 0 && errors.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300 flex items-start gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-yellow-400">Avisos:</strong>
                <ul className="list-disc list-inside mt-1">
                  {warnings.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* 📋 Preview */}
          {previewRows.length > 0 && (
            <div className="mt-4 max-h-60 overflow-auto rounded-xl border border-neutral-700">
              <table className="w-full text-sm text-neutral-300">
                <thead className="bg-neutral-800 sticky top-0">
                  <tr>
                    {keys.map((k) => (
                      <th
                        key={k}
                        className="text-left p-2 font-semibold whitespace-nowrap"
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className="odd:bg-neutral-900 even:bg-neutral-800/50 transition-colors"
                    >
                      {keys.map((k) => (
                        <td key={k} className="p-2">
                          {row?.[k] ?? "-"}
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
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            disabled={importing}
          >
            Cancelar
          </Button>

          {/* Botão confirmar — DESATIVADO SE HOUVER ERROS */}
          <Button
            className={`
              hover:scale-105 text-white flex items-center gap-2 cursor-pointer
              ${
                tipo === "inclusao"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }
              ${errors.length > 0 ? "opacity-40 cursor-not-allowed" : ""}
            `}
            disabled={importing || errors.length > 0}
            onClick={(e) => {
              e.stopPropagation();
              if (errors.length === 0) onConfirm();
            }}
          >
            {importing ? (
              <>
                <Loader className="animate-spin w-5 h-5" />
                Importando...
              </>
            ) : tipo === "inclusao" ? (
              "Confirmar Inclusão"
            ) : (
              "Confirmar Alteração"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
