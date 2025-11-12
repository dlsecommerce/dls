import React, { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassmorphicCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function GlassmorphicCard({
  children,
  className = "",
  ...props  
}: GlassmorphicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-white/5 to-white/[0.03]
        backdrop-blur-xl
        border border-neutral-700
        rounded-2xl
        shadow-md
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
