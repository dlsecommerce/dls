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
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-white/5 to-white/[0.02]
        backdrop-blur-xl
        border border-white/10
        rounded-2xl
        shadow-2xl
        hover:shadow-[0_8px_30px_rgb(38,153,254,0.12)]
        transition-all duration-300
        group
        ${className}
      `}
      {...props}
    >
      {/* Overlay animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2699fe]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {children}
    </motion.div>
  );
}
