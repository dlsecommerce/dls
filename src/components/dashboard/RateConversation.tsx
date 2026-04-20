import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function TaxaConversaoWidget() {
  const taxas = [
    { marketplace: "Mercado Livre", taxa: 4.8, crescimento: "+0.5%", cor: "#FFE600", corTexto: "#2D3277" },
    { marketplace: "Shopee", taxa: 3.2, crescimento: "+0.3%", cor: "#EE4D2D", corTexto: "#fff" },
    { marketplace: "Loja Virtual", taxa: 5.1, crescimento: "+1.2%", cor: "#8b5cf6", corTexto: "#fff" }
  ];

  return (
    <GlassmorphicCard className="p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#10b981] flex-shrink-0 mt-0.5 sm:mt-0" />
          
          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-bold text-white">
              Taxa de Conversão
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Performance por canal de venda
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {taxas.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
              className="relative overflow-hidden rounded-xl border border-white/10 p-4 sm:p-6 hover:border-white/20 transition-all duration-300 group"
              style={{
                background: `linear-gradient(135deg, ${item.cor}15 0%, ${item.cor}05 100%)`
              }}
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-3xl opacity-15 sm:opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ background: item.cor }}
              />

              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-neutral-400 mb-2 truncate">
                  {item.marketplace}
                </p>

                <p className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-none">
                  {item.taxa}%
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-green-400 font-semibold">
                    ↑ {item.crescimento}
                  </span>
                  <span className="text-[11px] sm:text-xs text-neutral-500">
                    vs. mês anterior
                  </span>
                </div>

                <div className="mt-4 sm:mt-5 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.taxa * 10}%` }}
                    transition={{ duration: 1, delay: 0.8 + idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: item.cor }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}