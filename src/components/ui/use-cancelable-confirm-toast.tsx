"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

type ConfirmToastOptions = {
  /** Quantos segundos o usuário tem para cancelar */
  seconds?: number;

  /** Título do toast */
  title?: string;

  /** Texto base do toast (vai mostrar "em Xs...") */
  description?: string;

  /** Texto do botão */
  cancelText?: string;

  /** Se true, fecha/dismiss ao confirmar */
  dismissOnConfirm?: boolean;

  /** Chamado quando o tempo acaba e confirma */
  onConfirm: () => void | Promise<void>;

  /** Chamado quando o usuário clica em cancelar */
  onCancel?: () => void;
};

export function useCancelableConfirmToast() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const clearAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;

    if (toastIdRef.current !== null) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);

  const show = useCallback(
    (opts: ConfirmToastOptions) => {
      clearAll();

      const {
        seconds = 5,
        title = "Importação agendada",
        description = "Atualizando em",
        cancelText = "Cancelar",
        dismissOnConfirm = true,
        onConfirm,
        onCancel,
      } = opts;

      let remaining = Math.max(1, Math.floor(seconds));

      const render = () => {
        toastIdRef.current = toast(
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-semibold">{title}</span>
              <span className="text-sm opacity-90">
                {description} {remaining}s… (você pode cancelar)
              </span>
            </div>

            <button
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
              onClick={() => {
                clearAll();
                toast.warning("Importação cancelada", {
                  description: "Nenhuma alteração foi aplicada.",
                });
                onCancel?.();
              }}
            >
              {cancelText}
            </button>
          </div>,
          {
            id: "cancelable-confirm-toast",
            duration: remaining * 1000 + 800,
          }
        );
      };

      render();

      intervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return;
        }
        render();
      }, 1000);

      timerRef.current = setTimeout(async () => {
        // confirma
        if (dismissOnConfirm && toastIdRef.current !== null) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        }

        // feedback visual opcional
        const loadingId = toast.loading("Aplicando atualização…");

        try {
          await onConfirm();
          toast.success("Atualização concluída!", {
            description: "As alterações foram aplicadas com sucesso.",
          });
        } catch (e) {
          console.error(e);
          toast.error("Falha ao atualizar", {
            description: "Verifique o console e tente novamente.",
          });
        } finally {
          toast.dismiss(loadingId);
          clearAll();
        }
      }, seconds * 1000);
    },
    [clearAll]
  );

  return { show, clear: clearAll };
}
