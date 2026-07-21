"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/utils/sound";

export type RenameCodePreviewItem = {
  linha?: number;
  codigo_antigo: string;
  codigo_novo: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  preview: RenameCodePreviewItem[];

  warnings?: string[];
  errors?: string[];

  loading: boolean;
  onConfirm: () => void | Promise<void>;

  fileName?: string;
};

type RowStatus =
  | "valid"
  | "unchanged"
  | "invalid";

function normalizeCode(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function getRowStatus(
  item: RenameCodePreviewItem
): RowStatus {
  const oldCode = normalizeCode(
    item.codigo_antigo
  );

  const newCode = normalizeCode(
    item.codigo_novo
  );

  if (
    !oldCode ||
    !newCode
  ) {
    return "invalid";
  }

  if (oldCode === newCode) {
    return "unchanged";
  }

  return "valid";
}

function StatusBadge({
  status,
}: {
  status: RowStatus;
}) {
  if (status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
        <XCircle className="h-3.5 w-3.5" />
        Inválido
      </span>
    );
  }

  if (status === "unchanged") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Sem alteração
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-300">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Será atualizado
    </span>
  );
}

export default function ConfirmRenameCodesModal({
  open,
  onOpenChange,
  preview,
  warnings = [],
  errors = [],
  loading,
  onConfirm,
  fileName,
}: Props) {
  const summary = useMemo(() => {
    let valid = 0;
    let unchanged = 0;
    let invalid = 0;

    preview.forEach((item) => {
      const status =
        getRowStatus(item);

      if (status === "valid") {
        valid += 1;
      }

      if (status === "unchanged") {
        unchanged += 1;
      }

      if (status === "invalid") {
        invalid += 1;
      }
    });

    return {
      total: preview.length,
      valid,
      unchanged,
      invalid,
    };
  }, [preview]);

  const hasBlockingErrors =
    errors.length > 0 ||
    summary.invalid > 0 ||
    summary.valid === 0;

  async function handleConfirm() {
    if (hasBlockingErrors) {
      toast.error(
        "Renomeação bloqueada",
        {
          description:
            "Corrija os erros encontrados antes de confirmar.",
          className:
            "bg-red-600 border border-red-500 text-white shadow-lg",
          duration: 4500,
        }
      );

      return;
    }

    if (warnings.length > 0) {
      toast.warning(
        "Atenção",
        {
          description:
            "Existem avisos na importação, mas a operação poderá continuar.",
          className:
            "bg-orange-500 border border-orange-400 text-white shadow-lg",
          duration: 4000,
          position:
            "top-center",
        }
      );
    }

    toast.message(
      "Renomeação iniciada",
      {
        description:
          `${summary.valid} código(s) serão atualizados.`,
        className:
          "bg-neutral-900 border border-neutral-700 text-white shadow-lg",
        duration: 3000,
      }
    );

    await unlockAudio();
    await onConfirm();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent
        onClick={(event) =>
          event.stopPropagation()
        }
        className="
          flex
          max-h-[calc(100dvh-16px)]
          w-[calc(100vw-16px)]
          max-w-[calc(100vw-16px)]
          min-w-0
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-neutral-700
          bg-[#0f0f0f]/95
          p-4
          pb-[calc(1rem+env(safe-area-inset-bottom))]
          text-white
          shadow-2xl
          backdrop-blur-xl

          sm:max-h-[88vh]
          sm:max-w-5xl
          sm:p-6
        "
      >
        <DialogHeader className="min-w-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <FileSpreadsheet className="h-5 w-5 text-blue-400" />

            Confirmar Renomeação de Códigos
          </DialogTitle>

          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            Confira os códigos atuais e os novos códigos antes de confirmar a atualização.
          </p>

          {fileName && (
            <p
              className="mt-1 truncate text-xs text-neutral-500"
              title={fileName}
            >
              Arquivo: {fileName}
            </p>
          )}
        </DialogHeader>

        <div className="mt-4 min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 p-3">
              <p className="text-xs text-neutral-500">
                Linhas lidas
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {summary.total}
              </p>
            </div>

            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
              <p className="text-xs text-green-300">
                Serão atualizados
              </p>

              <p className="mt-1 text-xl font-semibold text-green-300">
                {summary.valid}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-xs text-yellow-300">
                Sem alteração
              </p>

              <p className="mt-1 text-xl font-semibold text-yellow-300">
                {summary.unchanged}
              </p>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs text-red-300">
                Inválidos
              </p>

              <p className="mt-1 text-xl font-semibold text-red-300">
                {summary.invalid}
              </p>
            </div>
          </div>

          {errors.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="
                flex
                min-w-0
                items-start
                gap-2
                rounded-xl
                border
                border-red-600/40
                bg-red-500/10
                p-3
                text-sm
                text-red-300
              "
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

              <div className="min-w-0">
                <strong className="text-red-400">
                  Erros encontrados:
                </strong>

                <ul className="mt-1 list-inside list-disc space-y-1">
                  {errors.map(
                    (message, index) => (
                      <li key={index}>
                        {message}
                      </li>
                    )
                  )}
                </ul>

                <p className="mt-2 font-medium text-red-400">
                  A renomeação está bloqueada até que os erros sejam corrigidos.
                </p>
              </div>
            </motion.div>
          )}

          {warnings.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="
                flex
                min-w-0
                items-start
                gap-2
                rounded-xl
                border
                border-yellow-500/30
                bg-yellow-500/10
                p-3
                text-sm
                text-yellow-300
              "
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />

              <div className="min-w-0">
                <strong className="text-yellow-400">
                  Avisos:
                </strong>

                <ul className="mt-1 list-inside list-disc space-y-1">
                  {warnings.map(
                    (message, index) => (
                      <li key={index}>
                        {message}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </motion.div>
          )}

          {preview.length > 0 ? (
            <div className="min-w-0 overflow-hidden rounded-xl border border-neutral-700">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-700 bg-neutral-900 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    Pré-visualização
                  </p>

                  <p className="text-xs text-neutral-500">
                    O código da esquerda será substituído pelo código da direita.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                  {summary.total} item(ns)
                </span>
              </div>

              <div className="h-72 w-full overflow-auto sm:h-80">
                <table className="w-full min-w-[760px] text-xs text-neutral-300 sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-neutral-800">
                    <tr>
                      <th className="w-20 p-3 text-left font-semibold">
                        Linha
                      </th>

                      <th className="p-3 text-left font-semibold">
                        Código atual
                      </th>

                      <th className="w-16 p-3 text-center font-semibold">
                        Alteração
                      </th>

                      <th className="p-3 text-left font-semibold">
                        Novo código
                      </th>

                      <th className="w-40 p-3 text-left font-semibold">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {preview.map(
                      (item, index) => {
                        const oldCode =
                          normalizeCode(
                            item.codigo_antigo
                          );

                        const newCode =
                          normalizeCode(
                            item.codigo_novo
                          );

                        const status =
                          getRowStatus(
                            item
                          );

                        const line =
                          Number.isFinite(
                            Number(
                              item.linha
                            )
                          )
                            ? Number(
                                item.linha
                              )
                            : index + 2;

                        return (
                          <tr
                            key={`${oldCode}-${newCode}-${index}`}
                            className="
                              border-b
                              border-neutral-800
                              odd:bg-neutral-950
                              even:bg-neutral-900/70
                              last:border-b-0
                            "
                          >
                            <td className="p-3 text-neutral-500">
                              {line}
                            </td>

                            <td
                              className="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap p-3 font-medium text-white"
                              title={
                                oldCode || "-"
                              }
                            >
                              {oldCode || "-"}
                            </td>

                            <td className="p-3 text-center">
                              <ArrowRight className="inline-block h-4 w-4 text-blue-400" />
                            </td>

                            <td
                              className="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap p-3 font-semibold text-blue-300"
                              title={
                                newCode || "-"
                              }
                            >
                              {newCode || "-"}
                            </td>

                            <td className="p-3">
                              <StatusBadge
                                status={
                                  status
                                }
                              />
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center">
              <FileSpreadsheet className="mb-3 h-8 w-8 text-neutral-600" />

              <p className="text-sm font-medium text-neutral-300">
                Nenhuma renomeação encontrada
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Verifique se a planilha contém as colunas código e novo código.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-xs leading-relaxed text-neutral-400 sm:text-sm">
              Exemplo:{" "}
              <span className="font-semibold text-white">
                TN 5AM
              </span>{" "}
              será substituído por{" "}
              <span className="font-semibold text-blue-300">
                TN5AM
              </span>
              . Nenhuma alteração é feita durante a pré-visualização.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-5 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            className="
              h-11
              w-full
              cursor-pointer
              border-neutral-700
              text-white
              hover:scale-100

              sm:h-auto
              sm:w-auto
              sm:hover:scale-105
            "
            disabled={loading}
            onClick={(event) => {
              event.stopPropagation();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>

          <Button
            className="
              h-11
              w-full
              cursor-pointer
              bg-blue-600
              text-white
              hover:scale-100
              hover:bg-blue-700

              disabled:cursor-not-allowed
              disabled:opacity-40

              sm:h-auto
              sm:w-auto
              sm:hover:scale-105
            "
            disabled={
              loading ||
              hasBlockingErrors
            }
            onClick={async (
              event
            ) => {
              event.stopPropagation();
              await handleConfirm();
            }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Renomeação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}