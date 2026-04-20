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
    <section className="relative overflow-hidden bg-gray-50 py-14 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative w-full px-4 sm:px-6 md:px-12"
      >
        <div className="container mx-auto">
          {/* Título */}
          <div className="mb-10 text-center md:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-neutral-800 sm:text-3xl md:mb-6 md:text-4xl">
              Como funciona o{" "}
              <span className="text-neutral-800">DLS Ecommerce?</span>
            </h2>

            <p className="mx-auto max-w-2xl text-sm text-neutral-800 sm:text-lg">
              Em apenas 3 passos simples, você se conecta ao dashboard
            </p>
          </div>

          {/* Cards */}
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 px-5 py-6 shadow-sm transition-all duration-300 hover:border-[#2699fe] hover:bg-gray-100 hover:shadow-lg lg:items-start"
              >
                {/* número do passo */}
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-base font-bold text-gray-800 transition-colors duration-300 group-hover:bg-[#2699fe] group-hover:text-white sm:h-12 sm:w-12 sm:text-lg">
                  {step.step}
                </div>

                {/* ícone */}
                <step.icon
                  size={28}
                  className="mb-5 text-gray-600 transition-colors duration-300 group-hover:text-[#2699fe] sm:size-9"
                />

                {/* texto */}
                <div className="space-y-3 text-center lg:text-left">
                  <h3 className="text-lg font-semibold text-neutral-800 transition-colors duration-300 group-hover:text-[#2699fe] sm:text-xl">
                    {step.title}
                  </h3>

                  <p className="text-sm leading-6 text-neutral-600 sm:text-base">
                    {step.description}
                  </p>

                  <ul className="space-y-2 text-sm text-neutral-600 sm:text-base">
                    {step.details.map((detail, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-center justify-center space-x-2 lg:justify-start"
                      >
                        <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400 transition-colors duration-300 group-hover:bg-[#2699fe]"></div>
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