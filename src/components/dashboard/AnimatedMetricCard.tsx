"use client";

import React from 'react';
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

export default function AnimatedMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "#2699fe",
  delay = 0
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        type: "spring",
        stiffness: 100
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <GlassmorphicCard className="relative overflow-hidden p-4 md:p-6">
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 70%)`
          }}
        />

        {/* Floating Orb */}
        <motion.div
          className="absolute -top-12 -right-12 h-28 w-28 rounded-full blur-3xl opacity-20 md:h-32 md:w-32"
          style={{ backgroundColor: color }}
          animate={{
            scale: isHovered ? 1.5 : 1,
            rotate: isHovered ? 180 : 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        <div className="relative z-10">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <motion.p
                className="mb-2 text-xs font-medium text-neutral-400 md:text-sm"
                animate={{ x: isHovered ? 4 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.p>

              <motion.h3
                className="text-3xl font-bold text-white md:text-4xl"
                animate={{
                  scale: isHovered ? 1.05 : 1,
                  x: isHovered ? 4 : 0
                }}
                transition={{ duration: 0.3 }}
              >
                {value}
              </motion.h3>
            </div>

            <motion.div
              className="relative overflow-hidden rounded-2xl p-3 md:p-4"
              style={{ backgroundColor: `${color}20` }}
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ backgroundColor: color }}
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 2, opacity: 0.2 }}
                transition={{ duration: 0.4 }}
              />
              <Icon className="relative z-10 h-5 w-5 md:h-6 md:w-6" style={{ color }} />
            </motion.div>
          </div>

          {subtitle && (
            <motion.p
              className="mb-3 text-xs text-neutral-500 md:text-sm"
              animate={{ opacity: isHovered ? 1 : 0.7 }}
            >
              {subtitle}
            </motion.p>
          )}

          {trend && (
            <motion.div
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 md:px-3 ${
                  trend.positive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {trend.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold md:text-sm">{trend.value}</span>
              </motion.div>

              <span className="text-[11px] text-neutral-500 md:text-xs">
                vs. mês anterior
              </span>
            </motion.div>
          )}
        </div>

        {/* Shimmer Effect */}
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}15, transparent)`
          }}
          animate={{
            translateX: isHovered ? ['100%', '100%'] : ['-100%', '200%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        />
      </GlassmorphicCard>
    </motion.div>
  );
}