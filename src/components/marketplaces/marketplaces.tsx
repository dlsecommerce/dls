"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles, BarChart3, Activity } from "lucide-react";

// Lista dos Marketplaces
const marketplaces = [
  {
    name: "Bling",
    color: "from-blue-500 via-blue-600 to-blue-700",
    glowColor: "shadow-blue-500/20",
    hoverGlow: "group-hover:shadow-blue-500/40",
    cardBg: "from-blue-950/40 to-blue-900/20",
    logo: (
      <svg viewBox="0 0 200 80" className="w-36 h-16">
        <defs>
          <linearGradient id="blingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#1d4ed8", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <text
          x="10"
          y="50"
          fontSize="48"
          fontWeight="800"
          fill="url(#blingGrad)"
          fontFamily="system-ui"
          letterSpacing="-1"
        >
          Bling
        </text>
        <circle cx="170" cy="35" r="8" fill="#3b82f6">
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    ),
  },
  {
    name: "Mercado Livre",
    color: "from-yellow-400 via-yellow-500 to-amber-500",
    glowColor: "shadow-yellow-500/20",
    hoverGlow: "group-hover:shadow-yellow-500/40",
    cardBg: "from-yellow-950/40 to-amber-900/20",
    logo: (
      <svg viewBox="0 0 200 80" className="w-36 h-16">
        <defs>
          <linearGradient id="mlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#FFE600", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#FFC600", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="40" height="40" rx="10" fill="url(#mlGrad)" />
        <path
          d="M 35 25 L 45 35 L 35 45 L 30 40 L 35 35 L 30 30 Z"
          fill="#2D3277"
        />
        <text
          x="70"
          y="52"
          fontSize="34"
          fontWeight="800"
          fill="#FFE600"
          fontFamily="system-ui"
        >
          ML
        </text>
      </svg>
    ),
  },
  {
    name: "Shopee",
    color: "from-orange-500 via-orange-600 to-red-600",
    glowColor: "shadow-orange-500/20",
    hoverGlow: "group-hover:shadow-orange-500/40",
    cardBg: "from-orange-950/40 to-red-900/20",
    logo: (
      <svg viewBox="0 0 200 80" className="w-36 h-16">
        <defs>
          <linearGradient id="shopeeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#EE4D2D", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#FF6B4D", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <text
          x="10"
          y="50"
          fontSize="38"
          fontWeight="800"
          fill="url(#shopeeGrad)"
          fontFamily="system-ui"
        >
          Shopee
        </text>
        <path
          d="M 175 28 L 185 38 L 175 48 L 165 38 Z"
          fill="#EE4D2D"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 175 38"
            to="360 175 38"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    ),
  },
  {
    name: "Magalu",
    color: "from-blue-600 via-blue-700 to-indigo-700",
    glowColor: "shadow-blue-600/20",
    hoverGlow: "group-hover:shadow-blue-600/40",
    cardBg: "from-indigo-950/40 to-blue-900/20",
    logo: (
      <svg viewBox="0 0 200 80" className="w-36 h-16">
        <defs>
          <linearGradient id="magaluGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#0086FF", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#0066CC", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect x="20" y="25" width="35" height="35" rx="8" fill="url(#magaluGrad)" />
        <text
          x="65"
          y="52"
          fontSize="34"
          fontWeight="800"
          fill="#0086FF"
          fontFamily="system-ui"
        >
          Magalu
        </text>
      </svg>
    ),
  },
  {
    name: "Tray",
    color: "from-slate-600 via-slate-700 to-slate-800",
    glowColor: "shadow-slate-500/20",
    hoverGlow: "group-hover:shadow-slate-500/40",
    cardBg: "from-slate-950/40 to-slate-900/20",
    logo: (
      <svg viewBox="0 0 200 80" className="w-36 h-16">
        <defs>
          <linearGradient id="trayGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#64748b", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#475569", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect x="15" y="20" width="50" height="40" rx="10" fill="url(#trayGradMain)" />
        <rect x="20" y="26" width="40" height="6" rx="3" fill="#ffffff" opacity="0.95" />
        <rect x="20" y="36" width="30" height="5" rx="2.5" fill="#ffffff" opacity="0.75" />
        <rect x="20" y="44" width="35" height="5" rx="2.5" fill="#ffffff" opacity="0.75" />
        <rect x="20" y="52" width="25" height="5" rx="2.5" fill="#ffffff" opacity="0.75" />
        <text
          x="75"
          y="52"
          fontSize="42"
          fontWeight="800"
          fill="#94a3b8"
          fontFamily="system-ui"
        >
          Tray
        </text>
      </svg>
    ),
  },
];

export default function Marketplaces() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Fundo animado */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000,transparent)]" />

      {/* Bolhas de cor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-[1400px] mx-auto px-8 py-12 relative z-10">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 backdrop-blur-xl mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300 font-medium">
              Plataforma de Gestão Enterprise
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Marketplaces
          </h1>

          <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            Centralize e gerencie suas operações em todas as plataformas de vendas
          </p>
        </motion.div>

        {/* Cards dos Marketplaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {marketplaces.map((marketplace, index) => (
            <motion.div
              key={marketplace.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.3 + index * 0.1,
              }}
            >
              <Link href={`/marketplace/${marketplace.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div
                  className={`group relative border border-white/5 ${marketplace.glowColor} ${marketplace.hoverGlow} transition-all duration-700 overflow-hidden cursor-pointer bg-gradient-to-br ${marketplace.cardBg} backdrop-blur-xl h-full hover:border-white/20 hover:-translate-y-2 rounded-2xl`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${marketplace.color} opacity-0 group-hover:opacity-20 transition-opacity duration-700`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                  <div className="relative p-8 flex flex-col items-center justify-center min-h-[340px]">
                    <motion.div
                      className="relative mb-8 group-hover:scale-110 transition-transform duration-700 ease-out"
                      whileHover={{ rotate: [0, -3, 3, 0] }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                        {marketplace.logo}
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white mb-3 text-center">
                      {marketplace.name}
                    </h3>

                    <p className="text-sm text-gray-400 text-center mb-6 font-light leading-relaxed">
                      Gestão completa de pedidos<br />e análise de desempenho
                    </p>

                    <motion.div
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${marketplace.color} bg-opacity-10 border border-white/10 group-hover:border-white/30 transition-all duration-500`}
                      whileHover={{ x: 5 }}
                    >
                      <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                        Acessar
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </motion.div>
                  </div>

                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${marketplace.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left`}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Rodapé */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-white/5 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-400">
              Todas as plataformas operacionais
            </span>
          </div>
          <p className="text-sm text-gray-500 font-light">
            Clique em qualquer marketplace para acessar o painel de gestão completo
          </p>
        </motion.div>
      </div>
    </div>
  );
}
