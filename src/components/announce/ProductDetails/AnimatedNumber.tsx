"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export const AnimatedNumber = ({ value }: { value: number }) => {
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, (latest) =>
    latest.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.0, ease: "easeInOut" });
    return controls.stop;
  }, [value]);
  return <motion.span>{formatted}</motion.span>;
};
