import React from "react";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";

export default function FileUploadArea({ onFileSelect, onClose }) {
  const [dragActive, setDragActive] = React.useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.98 }}
        transition={{ type: "spring", damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative
          w-full
          sm:max-w-lg
          h-[85vh]
          sm:h-auto
          rounded-t-2xl sm:rounded-2xl
          p-6 sm:p-10
          border-2 border-dashed
          flex flex-col items-center justify-center text-center
          transition-all
          ${
            dragActive
              ? "border-[#2699fe] bg-[#2699fe]/10"
              : "border-white/20 bg-white/5"
          }
        `}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Conteúdo */}
        <Upload className="w-14 h-14 sm:w-16 sm:h-16 text-[#2699fe] mb-4" />

        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          Enviar Arquivo
        </h3>

        <p className="text-sm sm:text-base text-neutral-400 mb-6 px-2">
          No celular, toque para selecionar um arquivo
        </p>

        {/* Input */}
        <input
          type="file"
          id="file-input"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onFileSelect(e.target.files[0]);
            }
          }}
        />

        {/* Botão principal */}
        <label
          htmlFor="file-input"
          className="
            w-full
            max-w-xs
            py-3
            bg-gradient-to-r from-[#2699fe] to-[#1a7dd9]
            rounded-xl
            text-white
            font-medium
            text-center
            cursor-pointer
            active:scale-95
            transition-all
          "
        >
          Selecionar Arquivo
        </label>
      </motion.div>
    </motion.div>
  );
}