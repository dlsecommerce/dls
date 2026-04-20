import React from "react";
import { motion } from "framer-motion";
import { Download, Trash2, Settings2 } from "lucide-react";

type ClearAndDownloadActionsProps = {
  handleDownload: () => void;
  handleClearAll: () => void;
  isClearing: boolean;
  clicks: number;
  onToggleLayout: () => void;
};

export const ClearAndDownloadActions: React.FC<ClearAndDownloadActionsProps> = ({
  handleDownload,
  handleClearAll,
  isClearing,
  clicks,
  onToggleLayout,
}) => (
  <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
    {/* CONFIGURAR LAYOUT */}
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onToggleLayout}
      title="Configurar layout dos blocos"
      className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all hover:bg-white/10"
      type="button"
    >
      <Settings2 className="h-4 w-4 text-white opacity-80 transition-opacity hover:opacity-100" />
    </motion.button>

    {/* DOWNLOAD */}
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={handleDownload}
      title="Baixar planilha Excel"
      className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all hover:bg-white/10"
      type="button"
    >
      <Download className="h-4 w-4 text-white opacity-80 transition-opacity hover:opacity-100" />
    </motion.button>

    {/* LIMPAR */}
    <motion.button
      whileTap={{ scale: 0.92, rotate: -12 }}
      onClick={handleClearAll}
      disabled={isClearing && clicks >= 5}
      title={
        clicks >= 5
          ? "Botão bloqueado temporariamente após muitos cliques"
          : "Limpar todos os dados"
      }
      type="button"
      className={`flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all ${
        isClearing
          ? "cursor-not-allowed bg-red-500/20 text-red-300"
          : "text-red-400 hover:bg-red-500/10 hover:text-red-500"
      }`}
    >
      <Trash2
        className={`h-4 w-4 transition-transform ${
          isClearing ? "animate-pulse" : ""
        }`}
      />
    </motion.button>
  </div>
);