"use client";
import { useEffect } from "react";

export const useKeyboardShortcuts = ({
  saving,
  handleSave,
  router,
  campoAtivo,
  sugestoesLength,
}: any) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) handleSave();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/dashboard/anuncios");
        return;
      }

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]), [role="combobox"], button, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (!focusables.length) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? focusables.indexOf(active) : -1;

      const move = (delta: number) => {
        const next = Math.max(0, Math.min(focusables.length - 1, idx + delta));
        focusables[next]?.focus();
      };

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowDown") {
        if (campoAtivo === null || !sugestoesLength) {
          e.preventDefault();
          move(1);
        }
      } else if (e.key === "ArrowUp") {
        if (campoAtivo === null || !sugestoesLength) {
          e.preventDefault();
          move(-1);
        }
      } else if (e.key === "Enter") {
        if (
          active &&
          active.tagName !== "BUTTON" &&
          (active.tagName === "INPUT" || active.getAttribute("role") === "combobox")
        ) {
          e.preventDefault();
          move(1);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, saving, campoAtivo, sugestoesLength, handleSave]);
};
