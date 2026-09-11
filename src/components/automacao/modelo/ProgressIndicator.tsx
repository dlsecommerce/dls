"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  totalSteps: number;
  completedSteps: number;
  loading?: boolean;
}

export const ProgressIndicator = ({
  totalSteps,
  completedSteps,
  loading = false,
}: ProgressIndicatorProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 10;
          return next >= 96 ? 96 : next;
        });
      }, 300);

      return () => clearInterval(interval);
    }

    setProgress(0);
  }, [loading]);

  const safeTotal = Math.max(totalSteps, 1);
  const safeCompleted = Math.min(Math.max(completedSteps, 0), safeTotal);
  const allCompleted = safeCompleted >= safeTotal;

  const statusLabel = loading
    ? "Processando"
    : allCompleted
    ? "Completo"
    : safeCompleted === 0
    ? "Pendente"
    : "Em andamento";

  return (
    <>
      {/* Desktop */}
      <div className="hidden w-full md:block">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#1A8CEB]" />
            ) : allCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/25" />
            )}

            <span
              className={cn(
                "truncate text-xs font-semibold",
                loading
                  ? "text-[#1A8CEB]"
                  : allCompleted
                  ? "text-green-400"
                  : "text-white/45"
              )}
            >
              {statusLabel}
            </span>
          </div>

          <span className="shrink-0 text-xs font-bold text-white/45">
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!loading ? (
            <motion.div
              key="steps"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
              className="grid w-full gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${safeTotal}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: safeTotal }).map((_, index) => {
                const completed = index < safeCompleted;

                return (
                  <div
                    key={index}
                    className={cn(
                      "h-2 rounded-full border transition-all duration-300",
                      allCompleted
                        ? "border-green-500/30 bg-green-500"
                        : completed
                        ? "border-[#1A8CEB]/35 bg-[#1A8CEB]"
                        : "border-white/10 bg-white/[0.06]"
                    )}
                  />
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
              className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.06]"
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-full rounded-full bg-[#1A8CEB]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile */}
      <div className="relative mx-auto mt-1 w-full md:hidden">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#1A8CEB]" />
            ) : allCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
            )}

            <span
              className={cn(
                "truncate text-xs font-semibold",
                loading
                  ? "text-[#1A8CEB]"
                  : allCompleted
                  ? "text-green-500"
                  : "text-muted-foreground"
              )}
            >
              {statusLabel}
            </span>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold",
              allCompleted
                ? "border-green-500/25 bg-green-500/10 text-green-500"
                : "border-white/10 bg-white/[0.04] text-muted-foreground"
            )}
          >
            {safeCompleted}/{safeTotal}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!loading ? (
            <motion.div
              key="steps-mobile"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
              className="grid w-full gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${safeTotal}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: safeTotal }).map((_, index) => {
                const completed = index < safeCompleted;

                return (
                  <div
                    key={index}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      allCompleted
                        ? "bg-green-500"
                        : completed
                        ? "bg-[#1A8CEB]"
                        : "bg-neutral-700/60"
                    )}
                  />
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="loading-mobile"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
              className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800/70"
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-full rounded-full bg-[#1A8CEB]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};