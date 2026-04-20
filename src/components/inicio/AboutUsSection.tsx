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
      id="sobre-nos"
      className="relative overflow-hidden bg-gradient-background py-14 sm:py-28 lg:py-36"
    >
      {/* Card principal animado */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-10 shadow-xl ring-1 ring-white/40 transition-all duration-500 sm:px-6 sm:py-20 md:px-12 md:py-28"
      >
        <div className="mx-auto max-w-5xl text-center">
          {/* Header */}
          <div className="mb-10 space-y-4 sm:mb-16 sm:space-y-6 md:mb-20">
            <h2 className="text-2xl font-bold leading-tight text-neutral-800 sm:text-4xl md:text-5xl">
              Sobre <span className="text-neutral-800">nós</span>
            </h2>

            <p className="mx-auto max-w-3xl text-sm font-normal leading-7 text-neutral-800 sm:text-lg md:text-xl">
              Somos a <strong className="font-semibold">DLS Ecommerce</strong>,
              uma plataforma de gestão pensada para quem vende em marketplaces.
              Centralizamos tudo em um só lugar: automações inteligentes,
              precificação estratégica de produtos, integração com múltiplos
              canais e relatórios em tempo real.
            </p>
          </div>

          {/* Cards secundários */}
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 shadow-sm transition-all duration-300 hover:border-[#04cb00] hover:bg-gray-100 hover:shadow-lg sm:px-6 sm:py-5"
              >
                <span className="text-left text-sm font-medium leading-6 text-neutral-800 sm:text-base md:text-lg">
                  {value}
                </span>
                <Check
                  size={20}
                  className="ml-1 mt-0.5 flex-shrink-0 text-[#04cb00]"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutUsSection;