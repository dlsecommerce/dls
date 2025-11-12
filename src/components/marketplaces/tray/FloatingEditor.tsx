"use client";

import React, { useRef, useEffect } from "react";
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
  if (typeof window === "undefined" || !anchorRect) return null;

  const padding = 4;
  const estAltura = 60;
  const cabeAbaixo =
    anchorRect.bottom + estAltura + padding <= window.innerHeight;

  const top = cabeAbaixo
    ? window.scrollY + anchorRect.bottom + padding
    : window.scrollY + anchorRect.top - estAltura - padding;

  const maxWidth = 220;
  const left = Math.min(
    window.scrollX + anchorRect.left,
    window.scrollX + window.innerWidth - maxWidth - padding
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top,
        left,
        zIndex: 9999,
        width: maxWidth,
      }}
    >
      <div className="bg-[#0f0f0f] border border-neutral-700 rounded-lg p-2 shadow-xl">
        {children}
      </div>
    </div>,
    document.body
  );
}
