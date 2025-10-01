"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn, HandMetal } from "lucide-react";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";
import { motion } from "framer-motion";

const HeroSection = () => {
  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);

  const handleNavigate = (href: string) => {
    loadingBarRef.current?.start();
    router.push(href);
    setTimeout(() => {
      loadingBarRef.current?.finish();
    }, 1500);
  };

  return (
    <section className="min-h-screen bg-gradient-background relative overflow-hidden flex flex-col items-center justify-start">
      {/* Barra de carregamento */}
      <LoadingBar ref={loadingBarRef} />

      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>

      {/* Container principal */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative text-center pt-40 sm:pt-48 md:pt-40">
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-foreground leading-tight mb-6 animate-fade-in">
          Tudo que você precisa
          <br />
          <span className="text-sky-500">para alavancar suas vendas.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10 animate-fade-in px-2">
          Deixe de lado aquela lista enorme de ferramentas e passe a simplificar
          o processo dos seus anúncios.
        </p>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-20 animate-slide-up">
          <motion.button
            whileHover={{
              y: -4,
              scale: 1.03,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            onClick={() => handleNavigate("/login")}
            className="flex items-center justify-center px-5 py-2 border border-neutral-700 rounded-lg text-[#d4d4d4] hover:text-white transition text-sm sm:text-base font-medium cursor-pointer"
          >
            Entrar
            <LogIn
              size={16}
              className="ml-2 motion-safe:hover:animate-fade-out-in-x"
            />
          </motion.button>

          <motion.button
            whileHover={{
              y: -4,
              scale: 1.03,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            onClick={() => handleNavigate("/cadastro")}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg text-sm sm:text-base font-medium flex items-center justify-center hover:bg-sky-700 transition cursor-pointer"
          >
            Criar conta
            <HandMetal
              size={16}
              className="ml-2 motion-safe:hover:animate-fade-out-in-y"
            />
          </motion.button>
        </div>

        {/* Dashboard Preview */}
        <div className="flex justify-center animate-slide-up mb-12 sm:mb-16 px-2">
          <Image
            src="/images/dashboard.PNG" // 👈 coloque em /public/images/dashboard.png
            alt="Preview do Dashboard"
            width={1920}
            height={1080}
            className="rounded-2xl border-2 border-neutral-800 shadow-xl w-full max-w-6xl h-auto"
            priority
          />
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
    </section>
  );
};

export default HeroSection;
