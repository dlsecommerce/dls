"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  totalSteps: number;
  completedSteps: number;
  loading?: boolean; // indica se está processando
}

export const ProgressIndicator = ({
  totalSteps,
  completedSteps,
  loading = false,
}: ProgressIndicatorProps) => {
  const [progress, setProgress] = useState(0);

  // 🔹 Simulação da barra animada de carregamento
  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 12;
          return next >= 100 ? 100 : next;
        });
      }, 300);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [loading]);

  const allCompleted = completedSteps >= totalSteps;

  return (
    <>
      {/* Desktop - original preservado */}
      <div className="hidden md:flex relative w-3/4 mx-auto h-4 mt-2 items-center justify-center">
        <AnimatePresence mode="wait">
          {!loading ? (
            <motion.div
              key="steps"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="flex justify-between gap-1 w-full"
            >
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 h-1.5 rounded-full transition-all duration-500",
                    allCompleted
                      ? "bg-green-500"
                      : index < completedSteps
                      ? "bg-blue-500"
                      : "bg-neutral-300"
                  )}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="w-full h-2 rounded-full bg-neutral-800/40 overflow-hidden"
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile - camada separada */}
      <div className="md:hidden relative w-full mx-auto h-auto mt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Progresso
          </span>

          <span
            className={cn(
              "text-xs font-semibold",
              allCompleted ? "text-green-500" : "text-blue-500"
            )}
          >
            {completedSteps}/{totalSteps}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!loading ? (
            <motion.div
              key="steps-mobile"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="grid gap-1.5 w-full"
              style={{
                gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    allCompleted
                      ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.45)]"
                      : index < completedSteps
                      ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.35)]"
                      : "bg-neutral-700/60"
                  )}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="loading-mobile"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="w-full h-2.5 rounded-full bg-neutral-800/70 overflow-hidden"
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="h-full bg-blue-500 rounded-full shadow-[0_0_14px_#3b82f6]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};