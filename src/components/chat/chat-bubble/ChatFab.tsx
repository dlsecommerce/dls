import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface ChatFabProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasAnyUnread: boolean;
}

type Position = {
  x: number;
  y: number;
};

const STORAGE_KEY = "chat-fab-position";
const FAB_SIZE = 64;
const BASE_RIGHT = 24;
const BASE_BOTTOM = 24;
const SAFE_MARGIN = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function ChatFab({
  isOpen,
  setIsOpen,
  hasAnyUnread,
}: ChatFabProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    active: false,
    moved: false,
    startPointerX: 0,
    startPointerY: 0,
    startX: 0,
    startY: 0,
  });

  const getBounds = () => {
    if (typeof window === "undefined") {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    return {
      minX: -(window.innerWidth - FAB_SIZE - SAFE_MARGIN),
      maxX: -(BASE_RIGHT - SAFE_MARGIN),
      minY: -(window.innerHeight - FAB_SIZE - SAFE_MARGIN),
      maxY: -(BASE_BOTTOM - SAFE_MARGIN),
    };
  };

  const clampPosition = (next: Position): Position => {
    const { minX, maxX, minY, maxY } = getBounds();

    return {
      x: clamp(next.x, minX, maxX),
      y: clamp(next.y, minY, maxY),
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(
          clampPosition({
            x: Number.isFinite(parsed?.x) ? parsed.x : 0,
            y: Number.isFinite(parsed?.y) ? parsed.y : 0,
          })
        );
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const handleResize = () => {
      setPosition((prev) => clampPosition(prev));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;

      const deltaX = e.clientX - dragRef.current.startPointerX;
      const deltaY = e.clientY - dragRef.current.startPointerY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragRef.current.moved = true;
      }

      const next = clampPosition({
        x: dragRef.current.startX + deltaX,
        y: dragRef.current.startY + deltaY,
      });

      setPosition(next);
    };

    const handleMouseUp = () => {
      if (!dragRef.current.active) return;

      dragRef.current.active = false;
      setIsDragging(false);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));

      setTimeout(() => {
        dragRef.current.moved = false;
      }, 120);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.active) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - dragRef.current.startPointerX;
      const deltaY = touch.clientY - dragRef.current.startPointerY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragRef.current.moved = true;
      }

      const next = clampPosition({
        x: dragRef.current.startX + deltaX,
        y: dragRef.current.startY + deltaY,
      });

      setPosition(next);
    };

    const handleTouchEnd = () => {
      if (!dragRef.current.active) return;

      dragRef.current.active = false;
      setIsDragging(false);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));

      setTimeout(() => {
        dragRef.current.moved = false;
      }, 120);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [position]);

  const startMouseDrag = (e: React.MouseEvent<HTMLButtonElement>) => {
    dragRef.current.active = true;
    dragRef.current.moved = false;
    dragRef.current.startPointerX = e.clientX;
    dragRef.current.startPointerY = e.clientY;
    dragRef.current.startX = position.x;
    dragRef.current.startY = position.y;
    setIsDragging(true);
  };

  const startTouchDrag = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    if (!touch) return;

    dragRef.current.active = true;
    dragRef.current.moved = false;
    dragRef.current.startPointerX = touch.clientX;
    dragRef.current.startPointerY = touch.clientY;
    dragRef.current.startX = position.x;
    dragRef.current.startY = position.y;
    setIsDragging(true);
  };

  const handleOpen = () => {
    if (dragRef.current.moved) return;
    setIsOpen(true);
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            x: position.x,
            y: position.y,
          }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onMouseDown={startMouseDrag}
          onTouchStart={startTouchDrag}
          onClick={handleOpen}
          className="chat-fab-draggable fixed bottom-6 right-6 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] shadow-2xl group"
          style={{
            boxShadow: "0 8px 32px rgba(38, 153, 254, 0.4)",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          <MessageCircle className="h-7 w-7 text-white" />

          {hasAnyUnread && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-red-500"
            />
          )}

          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-[#2699fe]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}