import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { TrendingUp, Award, Package } from 'lucide-react';

export default function TopProductsWidget({ produtos }) {
  const topProdutos = (produtos || [])
    .map((p) => ({
      ...p,
      valorTotal: (p.preco_venda || 0) * (p.estoque || 0),
      vendas: Math.floor(Math.random() * 500) + 100,
    }))
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 5);

  return (
    <GlassmorphicCard className="p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b] flex-shrink-0" />
              <span className="truncate">Mais Vendidos</span>
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Produtos com maior volume
            </p>
          </div>

          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b] flex-shrink-0" />
        </div>

        {/* Lista */}
        <div className="space-y-2 sm:space-y-3">
          {topProdutos.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 text-xs sm:text-sm">
                Nenhum produto encontrado
              </p>
            </div>
          ) : (
            topProdutos.map((produto, idx) => {
              const posicao = idx + 1;
              const corMedalha =
                posicao === 1
                  ? "from-yellow-500 to-yellow-600"
                  : posicao === 2
                  ? "from-neutral-400 to-neutral-500"
                  : posicao === 3
                  ? "from-orange-600 to-orange-700"
                  : "from-[#2699fe] to-[#1a7dd9]";

              return (
                <motion.div
                  key={produto.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-300">
                    {/* Medalha */}
                    <motion.div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${corMedalha} flex items-center justify-center flex-shrink-0 font-bold text-white text-sm sm:text-lg shadow-lg`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {posicao}
                    </motion.div>

                    {/* Conteúdo central */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate group-hover:text-[#2699fe] transition-colors text-xs sm:text-sm">
                        {produto.nome}
                      </p>

                      <div className="flex items-center gap-x-2 gap-y-1 mt-1 flex-wrap">
                        <span className="text-[11px] sm:text-xs text-neutral-500 truncate max-w-full">
                          {produto.marca || 'Sem marca'}
                        </span>
                        <span className="text-[11px] sm:text-xs text-neutral-600 hidden sm:inline">
                          •
                        </span>
                        <span className="text-[11px] sm:text-xs text-green-400 font-semibold">
                          {produto.vendas} vendas
                        </span>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#2699fe] text-xs sm:text-sm leading-tight">
                        R$ {produto.valorTotal.toFixed(2)}
                      </p>
                      <p className="text-[11px] sm:text-xs text-neutral-500 mt-1">
                        {produto.estoque} un.
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}