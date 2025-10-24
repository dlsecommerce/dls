"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { ShoppingCart } from "lucide-react";
import BuscarMLBModal from "@/components/hub/mercado-livre/BuscarMLBModal";

export default function HubPage() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-8">
      <BuscarMLBModal open={openModal} onOpenChange={setOpenModal} />

      <GlassmorphicCard className="w-[95%] max-w-[1600px] p-6 border border-white/10 rounded-xl">
        <div className="border-b border-white/10 mb-6"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mini-card MLB */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              onClick={() => setOpenModal(true)}
              className="
                relative flex items-start gap-4 
                bg-[#111111]/80 border border-white/10 rounded-lg 
                p-4 hover:bg-[#1a1a1a]/90 
                transition-all duration-300 cursor-pointer group
              "
            >
              <div
                className="
                  w-11 h-11 flex items-center justify-center
                  rounded-lg bg-[#1a1a1a]/70 border border-white/10
                  group-hover:bg-[#1a8ceb]/10 transition-all duration-300 shrink-0
                "
              >
                <ShoppingCart className="w-5 h-5 text-[#1a8ceb] group-hover:text-[#45a8ff] transition-colors" />
              </div>

              <div className="flex-1">
                <div className="absolute right-3 top-3">
                  <span
                    className="
                      text-[10px] uppercase font-semibold 
                      bg-red-600 text-white 
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
                  Consulte códigos MLB e variações.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Outros placeholders */}
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
          <div className="bg-[#111111]/40 border border-white/10 rounded-lg p-4 opacity-40"></div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
