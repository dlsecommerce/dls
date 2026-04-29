import React from "react";
import { motion } from "framer-motion";

export default function TypingIndicator({ users = [] }) {
  const getText = () => {
    if (users.length === 1) {
      return `${users[0].nome} está digitando...`;
    }
    if (users.length > 1) {
      return `${users[0].nome} e mais ${users.length - 1} digitando...`;
    }
    return "Alguém está digitando...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="
        px-3 py-2 sm:px-4
        border-t border-white/10
        bg-[#121212]/80 backdrop-blur-sm
      "
    >
      <div className="flex items-center gap-2">
        
        {/* DOTS */}
        <div className="flex gap-1">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-neutral-400 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                ease: "easeInOut",
                delay
              }}
            />
          ))}
        </div>

        {/* TEXT */}
        <span className="text-[11px] sm:text-xs text-neutral-400 truncate max-w-[70%]">
          {getText()}
        </span>
      </div>
    </motion.div>
  );
}