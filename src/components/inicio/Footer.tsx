"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

const Footer = () => {
  const router = useRouter();
  const loadingBarRef = useRef<LoadingBarRef>(null);

  // Scroll interno
  const handleScrollTo = (id: string) => {
    const section = document.querySelector(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Navegação normal de rotas
  const handleRoute = (href: string) => {
    loadingBarRef.current?.start();
    router.push(href);
    setTimeout(() => {
      loadingBarRef.current?.finish();
    }, 1500);
  };

  return (
    <footer className="relative bg-background text-white">
      {/* Barra de carregamento */}
      <LoadingBar ref={loadingBarRef} />

      {/* Grid pontilhado no fundo */}
      <div className="absolute inset-0 bg-[url('/dots.png')] opacity-10 pointer-events-none"></div>

      {/* Logo + Links */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between w-full gap-8 md:gap-10">
          {/* Logo */}
          <button
            onClick={() => handleRoute("/")}
            className="block cursor-pointer flex-shrink-0"
          >
            <Image
              src="/dls.svg"
              alt="Logo DLS"
              width={128}
              height={128}
              className="w-24 h-24 sm:w-32 sm:h-32 hover:opacity-90 transition-opacity"
              priority
            />
          </button>

          {/* Links */}
          <ul className="flex flex-col sm:flex-row gap-6 sm:gap-10 text-center">
            <li>
              <button
                onClick={() => handleRoute("/dashboard")}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-base sm:text-lg"
              >
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => handleScrollTo("#precificacao")}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-base sm:text-lg"
              >
                Precificação
              </button>
            </li>
            <li>
              <button
                onClick={() => handleScrollTo("#sobre-nos")}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-base sm:text-lg"
              >
                Sobre nós
              </button>
            </li>
          </ul>
        </div>

        {/* Copyright */}
        <div className="mt-10 text-center text-gray-500 text-xs sm:text-sm">
          © 2025 DLS Multimarcas. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
