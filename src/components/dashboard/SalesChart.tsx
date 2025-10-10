import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const data = [
  { mes: 'Jan', vendas: 4500 },
  { mes: 'Fev', vendas: 5200 },
  { mes: 'Mar', vendas: 4800 },
  { mes: 'Abr', vendas: 6100 },
  { mes: 'Mai', vendas: 7200 },
  { mes: 'Jun', vendas: 6800 },
  { mes: 'Jul', vendas: 8500 }
];

export default function SalesChart() {
  const totalVendas = data.reduce((sum, item) => sum + item.vendas, 0);
  const mediaVendas = totalVendas / data.length;
  const crescimento = ((data[data.length - 1].vendas - data[0].vendas) / data[0].vendas * 100).toFixed(1);

  return (
    <GlassmorphicCard className="p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#2699fe]" />
              <h3 className="text-xl font-bold text-white">Vendas</h3>
            </div>
            <p className="text-sm text-gray-400">Últimos 7 meses</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">R$ {totalVendas.toLocaleString()}</p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <span className="text-sm text-green-400 font-semibold">↑ {crescimento}%</span>
              <span className="text-xs text-gray-500">vs período anterior</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2699fe" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2699fe" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="mes" 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(17, 17, 17, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                color: '#fff'
              }}
              formatter={(value) => [`R$ ${value}`, 'Vendas']}
            />
            <Area 
              type="monotone" 
              dataKey="vendas" 
              stroke="#2699fe" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorVendas)"
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-white">R$ {totalVendas.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Média Mensal</p>
            <p className="text-lg font-bold text-white">R$ {mediaVendas.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Crescimento</p>
            <p className="text-lg font-bold text-green-400">+{crescimento}%</p>
          </div>
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}