"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const FeaturesSection = () => {
  const features = [
    {
      title: "Precificação",
      description: "Gerencie preços e estratégias com um painel dedicado.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-14v2m0 12v2"
          />
        </svg>
      ),
      image: "/images/precificacao.png",
    },
    {
      title: "Anúncios",
      description: "Gerencie anúncios otimizados.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5h2m-1-1v2m-7 8h14M5 12h14M7 16h10M9 20h6"
          />
        </svg>
      ),
      image: "/images/anuncios.png",
    },
    {
      title: "Tabela de Custos",
      description: "Controle os custos e margens de cada anúncio.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
      image: "/images/custos.png",
    },
  ];

  return (
    <section
      id="precificacao"
      className="relative overflow-hidden py-28 px-4 sm:px-6 md:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto"
      >
        {/* Cabeçalho */}
        <div className="max-w-3xl text-center md:text-left mb-12">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight text-white">
            Recursos e Ferramentas
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white">
            Tenha acesso a ferramentas profissionais para gestão completa da sua
            operação.
          </p>
        </div>

        {/* Tabs de recursos */}
        <Tabs defaultValue={features[0].title} className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
            {/* Lista de cards */}
            <div className="md:col-span-5 space-y-3">
              <TabsList className="flex flex-col w-full items-stretch bg-transparent h-auto p-0 space-y-3">
                {features.map((feature) => (
                  <TabsTrigger
                    key={feature.title}
                    value={feature.title}
                    className="group flex items-start justify-start w-full gap-3 text-left rounded-lg p-4
                               border border-gray-200 bg-white shadow-sm transition-all duration-300
                               data-[state=active]:border-[#2699fe] data-[state=active]:shadow-lg
                               hover:border-[#2699fe] hover:shadow-md"
                  >
                    {/* ícone */}
                    <div className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 
                                    transition-colors duration-300 
                                    group-data-[state=active]:text-[#2699fe] group-hover:text-[#2699fe]">
                      {feature.icon}
                    </div>

                    {/* texto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-neutral-800 truncate transition-colors duration-300 group-data-[state=active]:text-[#2699fe]">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-neutral-600 mt-1 break-words leading-snug">
                        {feature.description}
                      </p>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Imagem da feature */}
            <div className="md:col-span-7 flex items-center justify-center">
              {features.map((feature) => (
                <TabsContent
                  key={feature.title}
                  value={feature.title}
                  className="mt-0 h-full flex justify-center"
                >
                  <motion.img
                    key={feature.image}
                    src={feature.image}
                    alt={feature.title}
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -60 }}
                    transition={{ duration: 0.6 }}
                    className="rounded-xl shadow-lg border border-gray-200 w-full max-w-2xl object-contain"
                  />
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      </motion.div>
    </section>
  );
};

export default FeaturesSection;
