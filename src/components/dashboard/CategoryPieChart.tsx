"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { PieChartIcon } from 'lucide-react';

export default function CategoryPieChart({ produtos }) {
  // Agrupar produtos por categoria
  const categorias = produtos.reduce((acc, produto) => {
    const cat = produto.categoria || 'Sem Categoria';
    if (!acc[cat]) {
      acc[cat] = { name: cat, value: 0, count: 0 };
    }
    acc[cat].value += (produto.preco_venda || 0) * (produto.estoque || 0);
    acc[cat].count += 1;
    return acc;
  }, {});

  const data = Object.values(categorias)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#2699fe', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <GlassmorphicCard className="p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 md:mb-6">
          <PieChartIcon className="w-5 h-5 md:w-6 md:h-6 text-[#2699fe]" />
          <h3 className="text-lg md:text-xl font-bold text-white">
            Produtos por Categoria
          </h3>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 17, 17, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value) => `R$ ${value.toFixed(2)}`}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Lista */}
        <div className="mt-5 md:mt-6 space-y-2">
          {data.map((cat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + idx * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[idx] }}
                />
                <span className="text-sm text-neutral-300 truncate">
                  {cat.name}
                </span>
              </div>

              <div className="text-right ml-3">
                <p className="text-sm font-bold text-white">
                  R$ {cat.value.toFixed(2)}
                </p>
                <p className="text-[11px] md:text-xs text-neutral-500">
                  {cat.count} produtos
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}