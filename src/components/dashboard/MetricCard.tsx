import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "#2699fe" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden bg-[#111111] border-white/10 p-6 hover:border-[#2699fe]/50 transition-all duration-300">
        <div 
          className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
        />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-neutral-400 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
          </div>
          
          {subtitle && (
            <p className="text-sm text-neutral-500">{subtitle}</p>
          )}
          
          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-sm font-medium ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-neutral-500">vs. mês anterior</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}