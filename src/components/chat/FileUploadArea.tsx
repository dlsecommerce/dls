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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-12 rounded-2xl border-2 border-dashed transition-all ${
          dragActive ? 'border-[#2699fe] bg-[#2699fe]/10' : 'border-white/20 bg-white/5'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="text-center">
          <Upload className="w-16 h-16 text-[#2699fe] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Enviar Arquivo
          </h3>
          <p className="text-neutral-400 mb-6">
            Arraste e solte ou clique para selecionar
          </p>
          <input
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] rounded-xl text-white font-medium cursor-pointer hover:shadow-lg hover:shadow-[#2699fe]/50 transition-all"
          >
            Selecionar Arquivo
          </label>
        </div>
      </div>
    </motion.div>
  );
}