import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { TrendingUp, Package, Award } from 'lucide-react';

export default function TopProductsWidget({ produtos }) {
  // Calcular produtos mais vendidos (baseado em valor total em estoque)
  const topProdutos = produtos
    .map(p => ({
      ...p,
      valorTotal: (p.preco_venda || 0) * (p.estoque || 0),
      vendas: Math.floor(Math.random() * 500) + 100 // Simulação de vendas
    }))
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 5);

  return (
    <GlassmorphicCard className="p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#f59e0b]" />
              Mais Vendidos
            </h3>
            <p className="text-sm text-gray-400 mt-1">Produtos com maior volume</p>
          </div>
          <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
        </div>

        <div className="space-y-3">
          {topProdutos.map((produto, idx) => {
            const posicao = idx + 1;
            const corMedalha = 
              posicao === 1 ? "from-yellow-500 to-yellow-600" :
              posicao === 2 ? "from-gray-400 to-gray-500" :
              posicao === 3 ? "from-orange-600 to-orange-700" : "from-[#2699fe] to-[#1a7dd9]";

            return (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="group"
              >
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-300">
                  <motion.div 
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${corMedalha} flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {posicao}
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate group-hover:text-[#2699fe] transition-colors text-sm">
                      {produto.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{produto.marca || 'Sem marca'}</span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-green-400 font-semibold">{produto.vendas} vendas</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#2699fe] text-sm">
                      R$ {produto.valorTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{produto.estoque} un.</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}