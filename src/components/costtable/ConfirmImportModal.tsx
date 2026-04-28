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
import { toast } from "sonner";
import { unlockAudio } from "@/utils/sound";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void;
  loading: boolean;
  preview?: any[];
  warnings?: string[];
  errors?: string[];
  tipo: "inclusao" | "alteracao";
};

const toastCustom = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      className: "bg-green-600 border border-green-500 text-white shadow-lg",
      duration: 3500,
    }),

  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      className: "bg-red-600 border border-red-500 text-white shadow-lg",
      duration: 4500,
    }),

  warning: (title: string, description?: string) =>
    toast.warning(title, {
      description,
      className: "bg-orange-500 border border-orange-400 text-white shadow-lg",
      duration: 4000,
      position: "top-center",
    }),

  message: (title: string, description?: string) =>
    toast.message(title, {
      description,
      className: "bg-neutral-900 border border-neutral-700 text-white shadow-lg",
      duration: 3000,
    }),
};

export default function ConfirmImportModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  preview = [],
  warnings = [],
  errors = [],
  tipo,
}: Props) {
  const keys = preview.length > 0 ? Object.keys(preview[0]) : [];

  const titulo =
    tipo === "inclusao"
      ? "Confirmar Inclusão de Anúncios"
      : "Confirmar Alteração de Anúncios";

  const texto =
    tipo === "inclusao"
      ? "Você está prestes a INCLUIR novos anúncios no sistema."
      : "Você está prestes a ALTERAR anúncios existentes.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="
          bg-[#0f0f0f]/95 backdrop-blur-xl
          border border-neutral-700
          rounded-2xl text-white
          shadow-2xl

          w-[calc(100vw-16px)]
          max-w-[calc(100vw-16px)]
          max-h-[calc(100dvh-16px)]

          sm:max-w-3xl
          sm:max-h-[85vh]

          overflow-hidden
          min-w-0
          p-4 sm:p-6

          flex flex-col
          pb-[calc(1rem+env(safe-area-inset-bottom))]
        "
      >
        <DialogHeader className="min-w-0 shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold text-white">
            {titulo}
          </DialogTitle>
        </DialogHeader>

        {/* MIolo */}
        <div className="mt-3 min-w-0 flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {texto}
          </p>

          <p className="text-neutral-300 text-sm sm:text-base">
            O arquivo contém{" "}
            <span className="text-white font-semibold">{count}</span>{" "}
            registros.
          </p>

          {/* ERROS */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-600/40 rounded-xl p-3 text-sm text-red-400 flex items-start gap-2 min-w-0"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
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

          {/* WARNINGS */}
          {warnings.length > 0 && errors.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300 flex items-start gap-2 min-w-0"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <strong className="text-yellow-400">Avisos:</strong>
                <ul className="list-disc list-inside mt-1">
                  {warnings.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* PREVIEW */}
          {preview.length > 0 && (
            <div className="mt-2 w-full min-w-0 rounded-xl border border-neutral-700 overflow-hidden">
              <div className="h-52 sm:h-56 w-full min-w-0 overflow-auto">
                <table className="min-w-max text-xs sm:text-sm text-neutral-300">
                  <thead className="bg-neutral-800 sticky top-0 z-10">
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
                    {preview.map((row, i) => (
                      <tr
                        key={i}
                        className="odd:bg-neutral-900 even:bg-neutral-800/50"
                      >
                        {keys.map((k) => (
                          <td
                            key={k}
                            className="p-2 whitespace-nowrap max-w-[180px] sm:max-w-[240px] overflow-hidden text-ellipsis"
                            title={String(row?.[k] ?? "-")}
                          >
                            {row?.[k] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="mt-5 shrink-0 min-w-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            className="
              w-full sm:w-auto
              h-11 sm:h-auto
              border-neutral-700 text-white
              cursor-pointer
              hover:scale-100 sm:hover:scale-105
            "
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            className={`
              w-full sm:w-auto
              h-11 sm:h-auto
              text-white flex items-center justify-center gap-2 cursor-pointer
              hover:scale-100 sm:hover:scale-105
              ${
                tipo === "inclusao"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }
              ${errors.length > 0 ? "opacity-40 cursor-not-allowed" : ""}
            `}
            disabled={loading || errors.length > 0}
            onClick={async (e) => {
              e.stopPropagation();

              if (errors.length > 0) {
                toastCustom.error(
                  "Importação bloqueada",
                  "Corrija os erros para conseguir confirmar."
                );
                return;
              }

              if (warnings.length > 0) {
                toastCustom.warning(
                  "Atenção",
                  "Existem avisos. Você pode confirmar mesmo assim."
                );
              }

              toastCustom.message(
                "Importação iniciada",
                "Processando... aguarde a finalização."
              );

              await unlockAudio();
              onConfirm();
            }}
          >
            {loading ? (
              <>
                <Loader className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
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