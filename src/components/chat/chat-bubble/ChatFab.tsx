import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface ChatFabProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasAnyUnread: boolean;
}

export default function ChatFab({ isOpen, setIsOpen, hasAnyUnread }: ChatFabProps) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] rounded-full shadow-2xl flex items-center justify-center z-50 group"
          style={{ boxShadow: "0 8px 32px rgba(38, 153, 254, 0.4)" }}
        >
          <MessageCircle className="w-7 h-7 text-white" />

          {/* ✅ PONTINHO VERMELHO (fora do chat) */}
          {hasAnyUnread && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a]"
            />
          )}

          <motion.div
            className="absolute inset-0 rounded-full bg-[#2699fe]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
