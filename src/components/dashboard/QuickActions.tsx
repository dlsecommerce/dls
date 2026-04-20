"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Zap, DollarSign, Store, Package, ArrowRight } from "lucide-react";

const actions = [
  {
    title: "Nova Automação",
    url: "/automacao-modelo",
    icon: Zap,
    color: "#2699fe",
    gradient: "from-[#2699fe] to-[#1a7dd9]",
  },
  {
    title: "Precificação",
    url: "/dashboard/precificacao/precificacao-individual",
    icon: DollarSign,
    color: "#10b981",
    gradient: "from-[#10b981] to-[#059669]",
  },
  {
    title: "Marketplaces",
    url: "/dashboard/marketplaces/tray",
    icon: Store,
    color: "#f59e0b",
    gradient: "from-[#f59e0b] to-[#d97706]",
  },
  {
    title: "Gerenciar Anúncios",
    url: "/dashboard/anuncios",
    icon: Package,
    color: "#8b5cf6",
    gradient: "from-[#8b5cf6] to-[#7c3aed]",
  },
];

export default function QuickActions() {
  return (
    <GlassmorphicCard className="p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-base sm:text-xl font-bold text-white mb-4 sm:mb-6">
          Ações Rápidas
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {actions.map((action, idx) => (
            <Link key={idx} href={action.url} className="block">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * idx }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="group relative h-full min-h-[148px] sm:min-h-0 overflow-hidden rounded-2xl p-4 sm:p-6 cursor-pointer transition-all"
                style={{
                  background: `linear-gradient(135deg, ${action.color}1A 0%, ${action.color}0D 100%)`,
                }}
              >
                {/* Hover effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${action.color}33 0%, ${action.color}1A 100%)`,
                  }}
                />

                {/* Glowing orb */}
                <motion.div
                  className="absolute -top-8 -right-8 w-20 h-20 sm:w-24 sm:h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                  style={{ backgroundColor: action.color }}
                />

                <div className="relative z-10 flex h-full flex-col">
                  <motion.div
                    className={`mb-3 sm:mb-4 flex h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br ${action.gradient} items-center justify-center flex-shrink-0`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <action.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-semibold leading-snug text-white mb-2 group-hover:text-[#2699fe] transition-colors">
                      {action.title}
                    </h4>
                  </div>

                  <div className="mt-auto flex items-center gap-2 text-neutral-400 group-hover:text-white transition-colors">
                    <span className="text-xs sm:text-sm">Acessar</span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                      }}
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </motion.div>
                  </div>
                </div>

                {/* Border Gradient */}
                <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-white/20 transition-colors" />
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}