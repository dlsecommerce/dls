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
      <div className="relative container mx-auto flex flex-col items-center px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex w-full flex-col items-center justify-center gap-6 sm:gap-8 md:flex-row md:justify-between md:gap-10">
          
          {/* Logo */}
          <button
            onClick={() => handleRoute("/")}
            className="block flex-shrink-0 cursor-pointer"
            aria-label="Ir para a página inicial"
          >
            <Image
              src="/dls.svg"
              alt="Logo DLS"
              width={128}
              height={128}
              className="h-20 w-20 transition-opacity hover:opacity-90 sm:h-32 sm:w-32"
              priority
            />
          </button>

          {/* Links */}
          <ul className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-10">
            <li className="w-full sm:w-auto">
              <button
                onClick={() => handleRoute("/dashboard")}
                className="min-h-[44px] px-2 text-base text-neutral-400 transition-colors hover:text-white cursor-pointer sm:text-lg"
              >
                Dashboard
              </button>
            </li>

            <li className="w-full sm:w-auto">
              <button
                onClick={() => handleScrollTo("#precificacao")}
                className="min-h-[44px] px-2 text-base text-neutral-400 transition-colors hover:text-white cursor-pointer sm:text-lg"
              >
                Precificação
              </button>
            </li>

            <li className="w-full sm:w-auto">
              <button
                onClick={() => handleScrollTo("#sobre-nos")}
                className="min-h-[44px] px-2 text-base text-neutral-400 transition-colors hover:text-white cursor-pointer sm:text-lg"
              >
                Sobre nós
              </button>
            </li>
          </ul>
        </div>

        {/* Copyright */}
        <div className="mt-8 px-4 text-center text-[11px] leading-5 text-neutral-500 sm:mt-10 sm:text-sm">
          © 2025 DLS Multimarcas. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;