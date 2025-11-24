"use client";
import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

type AnimatedNumberProps = {
  value: number;
};

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value }) => {
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, (latest) =>
    latest.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.0,
      ease: "easeInOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span>{formatted}</motion.span>;
};
