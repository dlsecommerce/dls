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
        bg-gradient-to-br from-[#0a0a0a]/90 to-[#1a1a1a]/70
        backdrop-blur-xl
        border border-white/10
        rounded-2xl
        shadow-[0_4px_30px_rgba(0,0,0,0.3)]
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
