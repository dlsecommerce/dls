import React from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "#2699fe"
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className="relative h-full overflow-hidden bg-[#111111] border-white/10 p-4 sm:p-6 hover:border-[#2699fe]/50 transition-all duration-300">
        <div
          className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 translate-x-6 sm:translate-x-8 -translate-y-6 sm:-translate-y-8 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-400 mb-1 truncate">
                {title}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight break-words">
                {value}
              </h3>
            </div>

            <div
              className="flex-shrink-0 p-2.5 sm:p-3 rounded-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
            </div>
          </div>

          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs sm:text-sm font-medium ${
                  trend.positive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-500">
                vs. mês anterior
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}