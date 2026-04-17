"use client";

import Image from "next/image";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ChevronDown, LayoutDashboard, Zap, DollarSign, Package, Store } from "lucide-react";

import { useProfile } from "@/context/ProfileContext";
import { NotificationDropdown } from "./header-parts/NotificationDropdown";
import { SearchBar } from "./header-parts/SearchBar";
import { UserProfileDropdown } from "./header-parts/UserProfileDropdown";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface LoadingBarRef {
  start: () => void;
  finish: () => void;
}

export const LoadingBar = forwardRef<LoadingBarRef>((_, ref) => {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  useImperativeHandle(ref, () => ({
    start: () => {
      setActive(true);
      setProgress(10);
    },
    finish: () => {
      setProgress(100);
      setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 500);
    },
  }));

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (active && progress < 90) {
      timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 200);
    }

    return () => clearTimeout(timer);
  }, [active, progress]);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed left-0 top-0 z-[9999] h-[3px] w-full bg-transparent">
      <div
        className="h-[3px] bg-[#2799fe] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
});

LoadingBar.displayName = "LoadingBar";

interface DashboardHeaderProps {
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Automações",
    icon: Zap,
    children: [
      {
        title: "Automação de Planilhas",
        href: "/dashboard/automacoes/automacao-planilhas",
      },
    ],
  },
  {
    title: "Precificação",
    icon: DollarSign,
    children: [
      {
        title: "Precificação Individual",
        href: "/dashboard/precificacao/precificacao-individual",
      },
      {
        title: "Decomposição",
        href: "/dashboard/precificacao/decomposicao",
      },
      {
        title: "Custos",
        href: "/dashboard/precificacao/custos",
      },
    ],
  },
  {
    title: "Anúncios",
    href: "/dashboard/anuncios",
    icon: Package,
  },
  {
    title: "Marketplaces",
    icon: Store,
    children: [
      {
        title: "Bling",
        href: "/dashboard/marketplaces/bling",
      },
      {
        title: "Tray",
        href: "/dashboard/marketplaces/tray",
      },
      {
        title: "Shopee",
        href: "/dashboard/marketplaces/shopee",
      },
    ],
  },
];

function isMenuActive(pathname: string, item: (typeof navigationItems)[number]) {
  if ("href" in item && item.href) {
    return pathname === item.href;
  }

  if (item.children) {
    return item.children.some((child) => pathname === child.href);
  }

  return false;
}

export default function DashboardHeader({}: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();
  const loadingRef = useRef<LoadingBarRef>(null);

  const handleNavigate = (href: string) => {
    if (pathname === href) return;

    loadingRef.current?.start();
    router.push(href);

    setTimeout(() => {
      loadingRef.current?.finish();
    }, 600);
  };

  return (
    <>
      <LoadingBar ref={loadingRef} />

      <div className="sticky top-0 z-30 w-full h-[82px] border-b border-neutral-800 bg-[#0f0f0f]">
        <div className="relative mx-auto flex h-[82px] items-center justify-between gap-6 px-6">
          <div className="flex h-full min-w-[280px] items-center">
            <div className="pointer-events-none flex shrink-0 items-center select-none">
              <div className="relative h-[64px] w-[220px]">
                <Image
                  src="/header/dls-header.png"
                  alt="DLS Ecommerce"
                  fill
                  priority
                  sizes="220px"
                  draggable={false}
                  className="object-contain object-left scale-110 select-none"
                />
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <nav className="hidden xl:flex items-center gap-2">
              {navigationItems.map((item) => {
                const active = isMenuActive(pathname, item);

                if (item.children) {
                  return (
                    <DropdownMenu key={item.title}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={`
                            flex items-center gap-2 rounded-md px-4 py-2
                            text-sm font-medium transition-all
                            ${
                              active
                                ? "text-[#58b7ff]"
                                : "cursor-pointer text-white/85 hover:bg-white/5 hover:text-white"
                            }
                          `}
                        >
                          {item.title}
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="center"
                        className="min-w-[210px] border-0 bg-transparent p-0 shadow-none"
                      >
                        <GlassmorphicCard className="rounded-md border border-neutral-800 bg-[#111111] p-1.5 text-white shadow-lg">
                          {item.children.map((child) => {
                            const childActive = pathname === child.href;

                            return (
                              <DropdownMenuItem key={child.href} asChild>
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(child.href)}
                                  className={`
                                    flex w-full items-center rounded-md px-3 py-2 text-sm
                                    ${
                                      childActive
                                        ? "text-[#58b7ff]"
                                        : "cursor-pointer text-white/85 hover:bg-white/5 hover:text-white"
                                    }
                                  `}
                                >
                                  {child.title}
                                </button>
                              </DropdownMenuItem>
                            );
                          })}
                        </GlassmorphicCard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleNavigate(item.href!)}
                    className={`
                      rounded-md px-4 py-2 text-sm font-medium
                      ${
                        active
                          ? "text-[#58b7ff]"
                          : "cursor-pointer text-white/85 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex h-full min-w-[340px] items-center justify-end gap-3">
            <div className="w-[260px]">
              <SearchBar expanded={true} onToggle={() => {}} />
            </div>

            <NotificationDropdown />

            <div className="h-6 w-px bg-white/10" />

            {!loading && profile ? (
              <UserProfileDropdown />
            ) : (
              <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-800" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}