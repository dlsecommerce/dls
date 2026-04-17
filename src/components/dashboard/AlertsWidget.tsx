import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AlertsWidget({ estoqueBaixo, reajuste }) {
  const alerts = [
    {
      type: 'warning',
      icon: AlertTriangle,
      title: `${estoqueBaixo} produtos com estoque baixo`,
      description: 'Produtos precisam de reposição urgente',
      action: 'Ver produtos',
      link: createPageUrl("Anuncios") + "?filter=estoque_baixo",
      color: '#f59e0b'
    },
    {
      type: 'danger',
      icon: TrendingDown,
      title: `${reajuste} produtos precisam de reajuste`,
      description: 'Margem de lucro abaixo do ideal',
      action: 'Ajustar preços',
      link: createPageUrl("PrecificacaoIndividual"),
      color: '#ef4444'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <GlassmorphicCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {alerts.map((alert, idx) => (
            <Link 
              key={idx} 
              to={alert.link}
              className="flex-1 group"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer"
                style={{ 
                  backgroundColor: `${alert.color}10`,
                  borderColor: `${alert.color}30`
                }}
              >
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${alert.color}20` }}
                    whileHover={{ rotate: 10 }}
                  >
                    <alert.icon className="w-6 h-6" style={{ color: alert.color }} />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white mb-1 group-hover:text-[#2699fe] transition-colors">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-neutral-400 mb-2">{alert.description}</p>
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: alert.color }}>
                      <span>{alert.action}</span>
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </GlassmorphicCard>
    </motion.div>
  );
}