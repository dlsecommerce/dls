import React from 'react';
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { motion } from 'framer-motion';
import { ShoppingBag, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

// SVGs dos Marketplaces
const MarketplaceLogo = ({ marketplace }) => {
  if (marketplace === "mercado_livre") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#FFE600"/>
        <path d="M8 16C8 17.1046 8.89543 18 10 18C11.1046 18 12 17.1046 12 16C12 14.8954 11.1046 14 10 14C8.89543 14 8 14.8954 8 16Z" fill="#2D3277"/>
        <path d="M14 16C14 17.1046 14.8954 18 16 18C17.1046 18 18 17.1046 18 16C18 14.8954 17.1046 14 16 14C14.8954 14 14 14.8954 14 16Z" fill="#2D3277"/>
        <path d="M6 6H7L9 12H17L19 6H20" stroke="#2D3277" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  
  if (marketplace === "shopee") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#EE4D2D"/>
        <path d="M12 6L14.5 11H9.5L12 6Z" fill="white"/>
        <path d="M8 12L10 16H14L16 12H8Z" fill="white"/>
        <circle cx="12" cy="17" r="1" fill="white"/>
      </svg>
    );
  }
  
  // Loja Virtual
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#8b5cf6"/>
      <path d="M5 10H19V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V10Z" fill="white"/>
      <path d="M3 6C3 5.44772 3.44772 5 4 5H20C20.5523 5 21 5.44772 21 6V10H3V6Z" fill="white"/>
      <circle cx="12" cy="14" r="1.5" fill="#8b5cf6"/>
    </svg>
  );
};

export default function UltimosPedidosWidget({ pedidos }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'entregue': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'enviado': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'processando': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'pendente': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      case 'cancelado': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'entregue': 'Entregue',
      'enviado': 'Enviado',
      'processando': 'Processando',
      'pendente': 'Pendente',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

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
              <ShoppingBag className="w-5 h-5 text-[#2699fe]" />
              Últimos Pedidos
            </h3>
            <p className="text-sm text-neutral-400 mt-1">Pedidos mais recentes</p>
          </div>
          <Clock className="w-5 h-5 text-neutral-500" />
        </div>

        <div className="space-y-3">
          {pedidos.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm">Nenhum pedido ainda</p>
            </div>
          ) : (
            pedidos.slice(0, 5).map((pedido, idx) => (
              <motion.div
                key={pedido.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="group"
              >
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-300">
                  <div className="flex-shrink-0">
                    <MarketplaceLogo marketplace={pedido.marketplace} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">
                      #{pedido.numero_pedido}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {pedido.produto_nome || 'Produto'}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#2699fe] text-sm mb-1">
                      R$ {(pedido.valor || 0).toFixed(2)}
                    </p>
                    <Badge className={`text-xs ${getStatusColor(pedido.status)}`}>
                      {getStatusLabel(pedido.status)}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </GlassmorphicCard>
  );
}