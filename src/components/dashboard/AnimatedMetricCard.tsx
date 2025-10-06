import React from 'react';
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

export default function AnimatedMetricCard({ title, value, subtitle, icon: Icon, trend, color = "#2699fe", delay = 0 }) {
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
      <GlassmorphicCard className="p-6 relative overflow-hidden">
        {/* Animated Background Gradient */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 70%)`
          }}
        />
        
        {/* Floating Orb */}
        <motion.div 
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: color }}
          animate={{
            scale: isHovered ? 1.5 : 1,
            rotate: isHovered ? 180 : 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <motion.p 
                className="text-sm font-medium text-gray-400 mb-2"
                animate={{ x: isHovered ? 4 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.p>
              <motion.h3 
                className="text-4xl font-bold text-white"
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
              className="p-4 rounded-2xl relative overflow-hidden"
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
              <Icon className="w-6 h-6 relative z-10" style={{ color }} />
            </motion.div>
          </div>
          
          {subtitle && (
            <motion.p 
              className="text-sm text-gray-500 mb-3"
              animate={{ opacity: isHovered ? 1 : 0.7 }}
            >
              {subtitle}
            </motion.p>
          )}
          
          {trend && (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                  trend.positive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {trend.positive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">{trend.value}</span>
              </motion.div>
              <span className="text-xs text-gray-500">vs. mês anterior</span>
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