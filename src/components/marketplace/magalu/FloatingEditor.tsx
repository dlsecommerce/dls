"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export function FloatingEditor({
  anchorRect,
  children,
  onClose,
}: {
  anchorRect: DOMRect | null;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const padding = 4;
  const estimatedHeight = 70;
  const maxWidth = 220;

  // Evita erro durante SSR
  if (typeof window === "undefined" || !anchorRect) return null;

  // Calcula posição exata antes de renderizar
  useLayoutEffect(() => {
    const calcPosition = () => {
      const canShowBelow =
        anchorRect.bottom + estimatedHeight + padding <= window.innerHeight;

      const top = canShowBelow
        ? window.scrollY + anchorRect.bottom + padding
        : window.scrollY + anchorRect.top - estimatedHeight - padding;

      const left = Math.min(
        window.scrollX + anchorRect.left,
        window.scrollX + window.innerWidth - maxWidth - padding,
      );

      setCoords({ top, left });
    };

    calcPosition();

    window.addEventListener("resize", calcPosition);
    return () => window.removeEventListener("resize", calcPosition);
  }, [anchorRect]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleDown = (e: MouseEvent | PointerEvent) => {
      if (!containerRef.current) return;

      const target = e.target as Node;

      if (!containerRef.current.contains(target)) {
        onClose?.();
      }
    };

    document.addEventListener("pointerdown", handleDown);
    return () => document.removeEventListener("pointerdown", handleDown);
  }, [onClose]);

  // Fecha com ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        zIndex: 9999,
        width: maxWidth,
      }}
    >
      <div className="bg-[#0f0f0f] border border-neutral-700 rounded-lg p-2 shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}