import React from "react";
import { motion } from "framer-motion";
import { Download, Trash2 } from "lucide-react";

type ClearAndDownloadActionsProps = {
  handleDownload: () => void;
  handleClearAll: () => void;
  isClearing: boolean;
  clicks: number;
};

export const ClearAndDownloadActions: React.FC<ClearAndDownloadActionsProps> = ({
  handleDownload,
  handleClearAll,
  isClearing,
  clicks,
}) => (
  <div className="flex items-center gap-2">
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleDownload}
      title="Baixar planilha Excel"
      className="p-2 hover:bg-white/10 rounded-full transition-all"
    >
      <Download className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
    </motion.button>
    <motion.button
      whileTap={{ scale: 0.9, rotate: -15 }}
      onClick={handleClearAll}
      disabled={isClearing && clicks >= 5}
      title={
        clicks >= 5
          ? "Botão bloqueado temporariamente após muitos cliques"
          : "Limpar todos os dados"
      }
      className={`p-2 rounded-full transition-all ${
        isClearing
          ? "bg-red-500/20 text-red-300 cursor-not-allowed"
          : "hover:bg-red-500/10 text-red-400 hover:text-red-500"
      }`}
    >
      <Trash2
        className={`w-4 h-4 transition-transform ${
          isClearing ? "animate-pulse" : ""
        }`}
      />
    </motion.button>
  </div>
);
