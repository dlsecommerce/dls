"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-8">
      {/* 🔹 Card principal mais largo (95% da largura da tela) */}
      <GlassmorphicCard className="w-[95%] max-w-[1600px] p-6 border border-white/10 rounded-xl">
        {/* Linha divisória superior */}
        <div className="border-b border-white/10 mb-6"></div>

        {/* Linha de mini-cards lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mini-card MLB */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="#" className="block">
              <div
                className="
                  relative flex items-start gap-4 
                  bg-[#111111]/80 border border-white/10 rounded-lg 
                  p-4 hover:bg-[#1a1a1a]/90 
                  transition-all duration-300 cursor-not-allowed group
                "
              >
                {/* Ícone com fundo arredondado */}
                <div
                  className="
                    w-11 h-11 flex items-center justify-center
                    rounded-lg bg-[#1a1a1a]/70 border border-white/10
                    group-hover:bg-[#1a8ceb]/10 transition-all duration-300 shrink-0
                  "
                >
                  <ShoppingCart className="w-5 h-5 text-[#1a8ceb] group-hover:text-[#45a8ff] transition-colors" />
                </div>

                {/* Conteúdo textual */}
                <div className="flex-1">
                  {/* Selo “EM BREVE” */}
                  <div className="absolute right-3 top-3">
                    <span
                      className="
                        text-[10px] uppercase font-semibold 
                        bg-red-600/90 text-white 
                        px-2 py-[2px] rounded-md tracking-wider
                      "
                    >
                      EM BREVE
                    </span>
                  </div>

                  <h3 className="text-[15px] font-semibold mb-[2px] leading-tight">
                    MLB do Mercado Livre
                  </h3>
                  <p className="text-[13px] text-neutral-400 leading-snug">
                    Consulte códigos MLB do Mercado Livre.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Placeholders — futuros cards */}
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
