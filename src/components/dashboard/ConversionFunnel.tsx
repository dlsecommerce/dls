import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function ConversionFunnel() {
  const stages = [
    { label: 'Visitas', value: 10000, percent: 100, color: '#2699fe' },
    { label: 'Visualizações', value: 5000, percent: 50, color: '#10b981' },
    { label: 'Add ao Carrinho', value: 1000, percent: 10, color: '#f59e0b' },
    { label: 'Compras', value: 320, percent: 3.2, color: '#8b5cf6' }
  ];

  return (
    <GlassmorphicCard className="p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-[#2699fe]" />
          <h3 className="text-xl font-bold text-white">Funil de Conversão</h3>
        </div>

        <div className="space-y-4">
          {stages.map((stage, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{stage.label}</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-white">{stage.value.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 ml-2">({stage.percent}%)</span>
                </div>
              </div>
              <div className="relative h-12 rounded-xl overflow-hidden" style={{ backgroundColor: `${stage.color}20` }}>
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ 
                    backgroundColor: stage.color,
                    width: `${stage.percent}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${stage.percent}%` }}
                  transition={{ duration: 1, delay: 0.7 + idx * 0.1 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white z-10">
                    {stage.percent}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#10b981]/20 to-[#059669]/10 border border-[#10b981]/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Taxa de Conversão Global</p>
              <p className="text-2xl font-bold text-[#10b981]">3.2%</p>
            </div>
            <div className="flex items-center gap-2 text-[#10b981]">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">+0.8%</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </GlassmorphicCard>
  );
}