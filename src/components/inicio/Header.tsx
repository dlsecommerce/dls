"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogIn, ArrowUpRight } from "lucide-react";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isTop, setIsTop] = useState(true);

  const loadingBarRef = useRef<LoadingBarRef>(null);
  const router = useRouter();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (window.scrollY <= 20) {
          setIsTop(true);
          setShow(true);
        } else {
          setIsTop(false);
          if (window.scrollY > lastScrollY) {
            setShow(false);
          } else {
            setShow(true);
          }
        }
        setLastScrollY(window.scrollY);
      }, 150);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

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

  // Menu items configurados
  const menuItems = [
    { label: "Início", type: "route", href: "/" },
    { label: "Precificação", type: "scroll", href: "#precificacao" },
    { label: "Dashboard", type: "route", href: "/dashboard" },
    { label: "Sobre nós", type: "scroll", href: "#sobre-nos" },
  ];

  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <header
        className={`flex justify-center w-full z-50 fixed top-0 transition-all duration-500 ease-in-out ${
          show
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-6 pointer-events-none"
        }`}
      >
        <nav
          className={`grid grid-cols-3 items-center gap-x-6 w-full max-w-7xl mx-auto mt-4 sm:mt-6 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 
            rounded-xl shadow-sm transition-all duration-500
            ${
              isTop
                ? "border border-neutral-800 bg-transparent"
                : "border border-neutral-800 bg-neutral-900/40 backdrop-blur-md"
            }`}
        >
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
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
                className="cursor-pointer hover:opacity-90 transition w-32 sm:w-40 md:w-48"
              />
            </Link>
          </div>

          {/* Menu Desktop */}
          <ul className="hidden md:flex justify-center items-center gap-6 lg:gap-10 text-xs sm:text-sm md:text-base font-medium text-[#d4d4d4] whitespace-nowrap">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.type === "scroll") {
                      handleScrollTo(item.href);
                    } else {
                      handleRoute(item.href);
                    }
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Ações Desktop */}
          <div className="hidden md:flex items-center justify-end gap-3 lg:gap-4">
            <button
              onClick={() => handleRoute("/login")}
              className="flex items-center px-3 sm:px-4 py-2 rounded-lg text-[#d4d4d4] hover:text-white transition text-xs sm:text-sm md:text-base font-medium cursor-pointer"
            >
              Entrar
              <LogIn size={16} className="ml-2" />
            </button>

            <button
              onClick={() => handleRoute("/cadastro")}
              className="px-4 sm:px-5 py-2 bg-sky-600 text-white rounded-lg text-xs sm:text-sm md:text-base font-medium flex items-center hover:bg-sky-700 transition cursor-pointer"
            >
              Criar conta
              <ArrowUpRight size={16} className="ml-2" />
            </button>
          </div>

          {/* Botão Mobile */}
          <button
            className="md:hidden text-[#d4d4d4] hover:text-white transition absolute right-6 cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Menu Mobile */}
          {open && (
            <div className="absolute top-20 left-0 w-full bg-neutral-900/95 border-t border-neutral-700 md:hidden px-6 py-6 space-y-6 rounded-b-2xl">
              <div className="flex flex-col space-y-4 text-[#d4d4d4] font-medium text-sm sm:text-base">
                {menuItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      if (item.type === "scroll") {
                        handleScrollTo(item.href);
                      } else {
                        handleRoute(item.href);
                      }
                    }}
                    className="hover:text-white transition cursor-pointer"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setOpen(false);
                    handleRoute("/login");
                  }}
                  className="flex items-center justify-center px-4 py-2 border border-neutral-700 rounded-lg text-[#d4d4d4] hover:text-white transition cursor-pointer text-sm"
                >
                  Entrar
                  <LogIn size={16} className="ml-2" />
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    handleRoute("/cadastro");
                  }}
                  className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center justify-center cursor-pointer text-sm"  
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
