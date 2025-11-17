"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Save, Loader } from "lucide-react";
import { useRouter } from "next/navigation";

const AcoesCalculo = ({ saving, handleClearLocal, handleSave }: any) => {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {/* Voltar */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push("/dashboard/marketplaces/tray")}
        title="Voltar"
        className="p-2 hover:bg-white/10 rounded-full transition-all"
      >
        <ArrowLeft className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
      </motion.button>

      {/* Limpar */}
      <motion.button
        whileTap={{ scale: 0.9, rotate: -15 }}
        onClick={handleClearLocal}
        title="Limpar todos os dados"
        className="p-2 rounded-full transition-all hover:bg-red-500/10 text-red-400 hover:text-red-500"
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>

      {/* Salvar */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSave}
        disabled={saving}
        title="Salvar alterações"
        className={`p-2 rounded-full transition-all ${
          saving ? "bg-white/10 cursor-wait" : "hover:bg-white/10"
        }`}
      >
        {saving ? (
          <Loader className="w-4 h-4 text-white animate-spin" />
        ) : (
          <Save className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
        )}
      </motion.button>
    </div>
  );
};

export default AcoesCalculo;
