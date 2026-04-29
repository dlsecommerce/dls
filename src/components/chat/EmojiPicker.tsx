import React from "react";
import { motion } from "framer-motion";

export default function EmojiPicker({ onSelect, onClose }) {
  const emojis = [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
    "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛",
    "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
    "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩",
    "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵",
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
    "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
    "🔥", "✨", "💫", "⭐", "🌟", "💥", "💯", "✅", "❌", "⚠️"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      className="
        absolute
        bottom-14
        left-1/2
        -translate-x-1/2
        w-[calc(100vw-24px)]
        max-w-sm
        sm:left-0
        sm:right-auto
        sm:translate-x-0
        sm:w-80
        bg-[#1a1a1a]
        border
        border-white/10
        rounded-xl
        p-3
        sm:p-4
        shadow-2xl
        max-h-[45vh]
        sm:max-h-64
        overflow-y-auto
      "
      style={{ zIndex: 100 }}
    >
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 sm:gap-2">
        {emojis.map((emoji, idx) => (
          <motion.button
            key={`${emoji}-${idx}`}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(emoji)}
            className="
              text-xl
              sm:text-2xl
              hover:bg-white/10
              active:bg-white/10
              rounded-lg
              p-1.5
              transition-colors
              touch-manipulation
            "
            type="button"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}