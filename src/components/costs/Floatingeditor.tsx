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
  const [isMobile, setIsMobile] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [visible, setVisible] = useState(false);

  const padding = 6;
  const estimatedHeight = 90;
  const maxWidth = 300;

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !anchorRect) return;

    const calcPosition = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setCoords({
          top: window.scrollY + window.innerHeight - estimatedHeight - 16,
          left: window.scrollX + 12,
        });
        setPlacement("bottom");
        return;
      }

      const canShowBelow =
        anchorRect.bottom + estimatedHeight + padding <= window.innerHeight;

      setPlacement(canShowBelow ? "bottom" : "top");

      const top = canShowBelow
        ? window.scrollY + anchorRect.bottom + padding
        : window.scrollY + anchorRect.top - estimatedHeight - padding;

      const left = Math.min(
        Math.max(window.scrollX + anchorRect.left, window.scrollX + padding),
        window.scrollX + window.innerWidth - maxWidth - padding
      );

      setCoords({ top, left });
    };

    calcPosition();
    requestAnimationFrame(() => setVisible(true));

    window.addEventListener("resize", calcPosition);
    window.addEventListener("scroll", calcPosition, true);

    return () => {
      window.removeEventListener("resize", calcPosition);
      window.removeEventListener("scroll", calcPosition, true);
    };
  }, [anchorRect]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 120);
  };

  useEffect(() => {
    const handleDown = (e: MouseEvent | PointerEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (!containerRef.current.contains(target)) handleClose();
    };

    document.addEventListener("pointerdown", handleDown);
    return () => document.removeEventListener("pointerdown", handleDown);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (typeof window === "undefined" || !anchorRect) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        zIndex: 9999,
        width: isMobile ? "calc(100vw - 24px)" : maxWidth,
        maxWidth: isMobile ? "calc(100vw - 24px)" : maxWidth,
      }}
    >
      {!isMobile && (
        <div
          className={`absolute h-2 w-2 rotate-45 border border-[#1a8ceb]/30 bg-[#0a0a0a] transition-opacity duration-150 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: 12,
            ...(placement === "bottom"
              ? { top: -5, borderBottom: "none", borderRight: "none" }
              : { bottom: -5, borderTop: "none", borderLeft: "none" }),
          }}
        />
      )}

      <div
        className={`
          border border-[#1a8ceb]/30 bg-[#0a0a0a]
          shadow-[0_8px_30px_rgba(0,0,0,0.6)]
          overflow-hidden
          transition-all duration-150 ease-out origin-top
          ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-[-4px]"}
        `}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
