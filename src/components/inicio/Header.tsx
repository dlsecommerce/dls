"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogIn, ArrowUpRight } from "lucide-react";
import { LoadingBar, type LoadingBarRef } from "@/components/ui/loading-bar";

const menuItems = [
  { label: "Início", type: "route", href: "/" },
  { label: "Precificação", type: "scroll", href: "#precificacao" },
  { label: "Dashboard", type: "route", href: "/dashboard" },
  { label: "Sobre nós", type: "scroll", href: "#sobre-nos" },
] as const;

const Header = () => {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(true);
  const [isTop, setIsTop] = useState(true);

  const loadingBarRef = useRef<LoadingBarRef>(null);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();

  useEffect(() => {
    const scrollContainer =
      document.querySelector<HTMLElement>("main") ||
      document.querySelector<HTMLElement>(".AppContent");

    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const currentScrollY = scrollContainer.scrollTop;

        setIsTop(currentScrollY <= 20);

        if (currentScrollY <= 20) {
          setShow(true);
        } else {
          setShow(currentScrollY < lastScrollYRef.current);
        }

        lastScrollYRef.current = currentScrollY;
      }, 120);
    };

    scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    handleScroll();

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollTo = useCallback((id: string) => {
    const section = document.querySelector(id);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleRoute = useCallback(
    (href: string) => {
      loadingBarRef.current?.start();
      router.push(href);

      setTimeout(() => {
        loadingBarRef.current?.finish();
      }, 1000);
    },
    [router]
  );

  const handleMenuItemClick = useCallback(
    (item: (typeof menuItems)[number]) => {
      setOpen(false);

      if (item.type === "scroll") {
        handleScrollTo(item.href);
        return;
      }

      handleRoute(item.href);
    },
    [handleRoute, handleScrollTo]
  );

  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <header
        className={`
          pointer-events-none
          fixed left-0 top-0 z-50
          flex w-full justify-center
          bg-transparent
          px-4
          shadow-none
          backdrop-blur-none
          transition-all duration-500 ease-in-out
          sm:px-6 lg:px-8
          ${
            show
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-6 opacity-0"
          }
        `}
      >
        <nav
          className={`
            pointer-events-auto
            relative mx-auto mt-3 sm:mt-6
            grid w-full max-w-7xl grid-cols-3 items-center gap-x-6
            rounded-xl
            border border-neutral-800
            px-4 py-3
            shadow-sm
            transition-all duration-500
            sm:px-6 sm:py-4 lg:px-8
            ${
              isTop
                ? "bg-black/35 backdrop-blur-sm"
                : "bg-neutral-900/80 backdrop-blur-md shadow-lg shadow-black/20"
            }
          `}
        >
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              aria-label="Ir para o início"
              onClick={(e) => {
                e.preventDefault();
                handleRoute("/");
              }}
            >
              <Image
                src="/dls.svg"
                alt="DLS Ecommerce"
                width={180}
                height={45}
                priority
                className="w-28 cursor-pointer transition hover:opacity-90 sm:w-40 md:w-48"
              />
            </Link>
          </div>

          {/* Menu Desktop */}
          <ul className="hidden items-center justify-center gap-6 whitespace-nowrap text-xs font-medium text-[#d4d4d4] sm:text-sm md:flex md:text-base lg:gap-10">
            {menuItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleMenuItemClick(item);
                  }}
                  className="cursor-pointer transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Ações Desktop */}
          <div className="hidden items-center justify-end gap-3 md:flex lg:gap-4">
            <button
              type="button"
              onClick={() => handleRoute("/login")}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-xs font-medium text-[#d4d4d4] transition hover:text-white sm:px-4 sm:text-sm md:text-base"
            >
              Entrar
              <LogIn size={16} className="ml-2" />
            </button>

            <button
              type="button"
              onClick={() => handleRoute("/cadastro")}
              className="flex cursor-pointer items-center rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-sky-700 sm:px-5 sm:text-sm md:text-base"
            >
              Criar conta
              <ArrowUpRight size={16} className="ml-2" />
            </button>
          </div>

          {/* Botão Mobile */}
          <button
            type="button"
            className="absolute right-4 cursor-pointer text-[#d4d4d4] transition hover:text-white sm:right-6 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Menu Mobile */}
          {open && (
            <div className="absolute left-0 top-[calc(100%+10px)] w-full rounded-2xl border border-neutral-800 bg-neutral-900/95 px-4 py-5 shadow-xl backdrop-blur-md sm:px-6 sm:py-6 md:hidden">
              <div className="flex flex-col space-y-2 text-sm font-medium text-[#d4d4d4] sm:text-base">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleMenuItemClick(item);
                    }}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 transition hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-4 flex flex-col space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleRoute("/login");
                  }}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-sm text-[#d4d4d4] transition hover:text-white"
                >
                  Entrar
                  <LogIn size={16} className="ml-2" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleRoute("/cadastro");
                  }}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-sky-600 px-5 py-2 text-sm text-white transition hover:bg-sky-700"
                >
                  Criar conta
                  <ArrowUpRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
};

export default Header;