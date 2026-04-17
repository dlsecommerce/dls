"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

const AboutUsSection = () => {
  const values = [
    "Simplicidade e usabilidade na plataforma.",
    "Segurança e confiabilidade em todas as operações.",
    "Tecnologia de ponta para escalar seu negócio.",
    "Resultados mensuráveis e crescimento sustentável.",
  ];

  return (
    <section
      id="sobre-nos" // 👈 id que conecta com o Header
      className="py-20 sm:py-28 lg:py-36 bg-gradient-background relative overflow-hidden"
    >
      {/* Card principal animado */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative bg-gray-50 rounded-2xl w-full px-4 sm:px-6 md:px-12 py-16 sm:py-20 md:py-28 shadow-xl border border-gray-200 ring-1 ring-white/40 transition-all duration-500"
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Header */}
          <div className="space-y-6 mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-neutral-800">
              Sobre <span className="text-neutral-800">nós</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed text-neutral-800 font-normal">
              Somos a <strong className="font-semibold">DLS Ecommerce</strong>, uma plataforma de gestão pensada para quem vende em marketplaces. 
              Centralizamos tudo em um só lugar: automações inteligentes, precificação estratégica de produtos, integração com múltiplos canais e relatórios em tempo real.
            </p>
          </div>

          {/* Cards secundários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-center justify-between rounded-2xl px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border border-gray-200 shadow-sm transition-all duration-300 hover:bg-gray-100 hover:border-[#04cb00] hover:shadow-lg"
              >
                <span className="text-sm sm:text-base md:text-lg font-medium text-neutral-800">
                  {value}
                </span>
                <Check size={20} className="text-[#04cb00] flex-shrink-0 ml-3" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutUsSection;
