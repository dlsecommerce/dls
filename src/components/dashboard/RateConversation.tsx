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
    <GlassmorphicCard className="p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-[#10b981]" />
          <div>
            <h3 className="text-xl font-bold text-white">Taxa de Conversão</h3>
            <p className="text-sm text-gray-400">Performance por canal de venda</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {taxas.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
              className="relative p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, ${item.cor}15 0%, ${item.cor}05 100%)`
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
                   style={{ background: item.cor }}
              />
              
              <div className="relative z-10">
                <p className="text-sm text-gray-400 mb-2">{item.marketplace}</p>
                <p className="text-4xl font-bold text-white mb-2">{item.taxa}%</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-400 font-semibold">
                    ↑ {item.crescimento}
                  </span>
                  <span className="text-xs text-gray-500">vs. mês anterior</span>
                </div>

                <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
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