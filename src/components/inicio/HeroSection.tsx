"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HandMetal } from "lucide-react";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";
import { motion } from "framer-motion";

const HeroSection = () => {
  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);

  // Navegação (caso precise futuramente)
  const handleNavigate = (href: string) => {
    loadingBarRef.current?.start();
    router.push(href);
    setTimeout(() => {
      loadingBarRef.current?.finish();
    }, 1500);
  };

  // Função de download usando o link fornecido
  const handleDownload = () => {
    const link = "https://github.com/dlsecommerce/dls/releases/latest";
    window.open(link, "_blank");
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-gradient-background">
      {/* Barra de carregamento */}
      <LoadingBar ref={loadingBarRef} />

      {/* Efeitos de background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-20"></div>

      {/* Container principal */}
      <div className="relative container mx-auto px-4 pt-32 text-center sm:px-6 sm:pt-48 md:pt-40 lg:px-8">
        <h1 className="mb-5 text-3xl font-bold leading-[1.1] text-foreground animate-fade-in sm:text-5xl lg:text-7xl">
          Tudo que você precisa
          <br />
          <span className="text-sky-500">para alavancar suas vendas.</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl px-1 text-sm leading-7 text-muted-foreground animate-fade-in sm:mb-10 sm:max-w-3xl sm:px-2 sm:text-lg md:text-xl">
          Deixe de lado aquela lista enorme de ferramentas e passe a simplificar
          o processo dos seus anúncios.
        </p>

        {/* Botão de Download */}
        <div className="mb-10 flex justify-center animate-slide-up sm:mb-20">
          <motion.button
            whileHover={{
              y: -4,
              scale: 1.03,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            onClick={handleDownload}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-sky-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-sky-700 cursor-pointer sm:text-base"
          >
            Download
            <HandMetal
              size={16}
              className="ml-2 motion-safe:hover:animate-fade-out-in-y"
            />
          </motion.button>
        </div>

        {/* Preview do Dashboard */}
        <div className="mb-10 flex justify-center px-1 animate-slide-up sm:mb-16 sm:px-2">
          <Image
            src="/images/dashboard.PNG"
            alt="Preview do Dashboard"
            width={1920}
            height={1080}
            className="h-auto w-full max-w-6xl rounded-xl border border-neutral-800 shadow-xl sm:rounded-2xl sm:border-2"
            priority
          />
        </div>
      </div>

      {/* Fade na parte de baixo */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent sm:h-32"></div>
    </section>
  );
};

export default HeroSection;