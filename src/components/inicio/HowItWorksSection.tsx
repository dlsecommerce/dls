"use client";

import { motion } from "framer-motion";
import { UserPlus, UserRound, Component } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      step: "1",
      icon: UserPlus,
      title: "Cadastre-se",
      description: "Crie sua conta.",
      details: [
        "Cadastro simples e rápido",
        "Verificação automática",
        "Acesso imediato à plataforma",
      ],
    },
    {
      step: "2",
      icon: UserRound,
      title: "Faça o login",
      description: "Entre na plataforma.",
      details: [
        "Temas escuros e claros",
        "Avatar personalizado",
        "Chat interno",
      ],
    },
    {
      step: "3",
      icon: Component,
      title: "Comece a gestão",
      description: "Inicie a gestão do seu negócio.",
      details: [
        "Dashboard em tempo real",
        "Automações operacionais",
        "Suporte 24/7",
      ],
    },
  ];

  return (
    <section className="py-20 md:py-36 bg-gray-50 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative w-full px-4 sm:px-6 md:px-12"
      >
        <div className="container mx-auto">
          {/* Título */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-800 mb-4 md:mb-6">
              Como funciona o{" "}
              <span className="text-neutral-800">DLS Ecommerce?</span>
            </h2>
            <p className="text-base sm:text-lg text-neutral-800 max-w-2xl mx-auto">
              Em apenas 3 passos simples, você se conecta ao dashboard
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 max-w-6xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group flex flex-col items-center lg:items-start rounded-2xl px-6 py-8 bg-gray-50 border border-gray-200 shadow-sm transition-all duration-300 hover:bg-gray-100 hover:border-[#2699fe] hover:shadow-lg"
              >
                {/* número do passo */}
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 text-gray-800 rounded-full font-bold text-base sm:text-lg mb-6 transition-colors duration-300 group-hover:bg-[#2699fe] group-hover:text-white">
                  {step.step}
                </div>

                {/* ícone */}
                <step.icon
                  size={32}
                  className="sm:size-9 mb-6 text-gray-600 transition-colors duration-300 group-hover:text-[#2699fe]"
                />

                {/* texto */}
                <div className="space-y-3 text-center lg:text-left">
                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-800 transition-colors duration-300 group-hover:text-[#2699fe]">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-2 text-sm sm:text-base text-neutral-600">
                    {step.details.map((detail, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-center justify-center lg:justify-start space-x-2"
                      >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0 transition-colors duration-300 group-hover:bg-[#2699fe]"></div>
                        <span className="transition-colors duration-300 group-hover:text-[#2699fe]">
                          {detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HowItWorksSection;
