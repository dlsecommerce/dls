"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutProps {
  saving: boolean;
  handleSave: () => void;
  campoAtivo: string | null;
  sugestoesLength: number;
  numColunas?: number;
}

export const useKeyboardShortcuts = ({
  saving,
  handleSave,
  campoAtivo,
  sugestoesLength,
  numColunas = 1,
}: KeyboardShortcutProps) => {
  const router = useRouter();
  const [showExitModal, setShowExitModal] = useState(false);
  const ignoreKeysRef = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName.toLowerCase();

      // Evitar capturar ESC em campos de texto enquanto digitando IME
      if (
        tag === "input" ||
        tag === "textarea" ||
        active?.getAttribute("role") === "combobox"
      ) {
        if (e.key !== "Escape" && e.key !== "Enter") return;
      }

      // CTRL+S → salvar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) handleSave();
        return;
      }

      // ESC → alternar modal
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        // se o modal já estiver aberto, fecha
        if (showExitModal) {
          setShowExitModal(false);
          return;
        }

        // se não estiver aberto, abre
        setShowExitModal(true);
        return;
      }

      // Foco geral (para navegação tipo planilha)
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]), [role="combobox"], button, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      );

      if (!focusables.length) return;
      const idx = active ? focusables.indexOf(active) : -1;

      const move = (delta: number) => {
        const next = Math.max(
          0,
          Math.min(focusables.length - 1, idx + delta)
        );
        focusables[next]?.focus();
      };

      // Navegação vertical por colunas
      if (numColunas > 1 && idx !== -1) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = idx + numColunas;
          if (next < focusables.length) focusables[next].focus();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = idx - numColunas;
          if (prev >= 0) focusables[prev].focus();
          return;
        }
      }

      // Linear fallback
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
        return;
      }

      if (e.key === "Enter") {
        if (
          active &&
          active.tagName !== "BUTTON" &&
          (active.tagName === "INPUT" ||
            active.getAttribute("role") === "combobox" ||
            active.tagName === "TEXTAREA")
        ) {
          e.preventDefault();
          move(1);
        }
      }
    };

    // captura global de teclado com prioridade
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, {
        capture: true,
      } as any);
  }, [saving, campoAtivo, sugestoesLength, handleSave, numColunas, showExitModal]);

  // Controladores do modal
  const confirmExit = () => {
    setShowExitModal(false);
    router.back();
  };
  const cancelExit = () => setShowExitModal(false);

  return { showExitModal, confirmExit, cancelExit, setShowExitModal };
};
