"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Zap,
  DollarSign,
  Store,
  Package,
  ChevronDown,
  ChevronRight,
  Settings,
  ShoppingCart,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Dispatch, SetStateAction, RefObject } from "react";
import { LoadingBarRef } from "@/components/ui/loading-bar";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

// 🔹 Itens do menu
const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
      { title: "Decomposição", href: "/dashboard/precificacao/decomposicao" },
      { title: "Custos", href: "/dashboard/precificacao/custos" },
    ],
  },
  { title: "Anúncios", href: "/dashboard/anuncios", icon: Package },
  {
    title: "Marketplaces",
    icon: Store,
    children: [
      { title: "Bling", href: "/dashboard/marketplaces/bling" },
      { title: "Tray", href: "/dashboard/marketplaces/tray" },
      { title: "Shopee", href: "/dashboard/marketplaces/shopee" },
    ],
  },
];

type AppSidebarProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  setPageTitle: Dispatch<SetStateAction<string>>;
  loadingRef: RefObject<LoadingBarRef | null>;
};

export default function AppSidebar({
  collapsed,
  setCollapsed,
  setPageTitle,
  loadingRef,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenus, setOpenMenus] = React.useState<string[]>([
    "Automações",
    "Precificação",
    "Marketplaces",
  ]);

  const [isHoveringSidebar, setIsHoveringSidebar] = React.useState(false);

  const isPinnedOpen = !collapsed;
  const isExpanded = isPinnedOpen || isHoveringSidebar;

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const triggerLoading = () => {
    loadingRef.current?.start();
    setTimeout(() => loadingRef.current?.finish(), 800);
  };

  const handleExpandSidebar = () => {
    setCollapsed(false);
    setIsHoveringSidebar(false);
  };

  const handleMinimizeSidebar = () => {
    setIsHoveringSidebar(false);
    setCollapsed(true);
  };

  return (
    <GlassmorphicCard
      as={motion.aside}
      initial={false}
      animate={{ width: isExpanded ? 260 : 80 }}
      transition={{
        width: { duration: 0.35, ease: [0.45, 0, 0.1, 1] },
      }}
      onMouseEnter={() => {
        if (collapsed) {
          setIsHoveringSidebar(true);
        }
      }}
      onMouseLeave={() => {
        if (collapsed) {
          setIsHoveringSidebar(false);
        }
      }}
      className="
        relative h-screen flex flex-col
        border-r border-white/10
        overflow-hidden
        fixed left-0 top-0 z-40
        rounded-none shadow-none
      "
    >
      {/* Fundo fixo animado */}
      <motion.div
        key="sidebar-bg"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.9 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="
          absolute inset-0
          bg-gradient-to-br from-[#0a0a0a]/95 to-[#1a1a1a]/80
          backdrop-blur-xl
          pointer-events-none
        "
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <SidebarHeader className="border-b border-white/10 px-4 py-6 relative shrink-0 bg-transparent">
          <motion.div
            className="flex items-center gap-3 whitespace-nowrap"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ scale: isExpanded ? 1 : 0.9 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 bg-gradient-to-br from-[#1a8ceb] to-[#166bbf] rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer shrink-0"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingCart className="w-5 h-5 text-white relative z-10" />
            </motion.div>

            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  key="sidebar-title"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                    delay: 0.15,
                  }}
                  className="overflow-hidden"
                >
                  <motion.span
                    className="font-bold text-white text-lg inline-block"
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -6, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    DLS Ecommerce
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </SidebarHeader>

        {/* Menu */}
        <SidebarContent className="flex-1 p-3 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isExpanded ? "expanded" : "collapsed"}
              initial={{
                opacity: 0,
                x: isExpanded ? 10 : -10,
                filter: "blur(3px)",
              }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                x: isExpanded ? -10 : 10,
                filter: "blur(3px)",
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="h-full"
            >
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item, idx) => {
                      const isActive = item.href ? pathname === item.href : false;

                      return (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                        >
                          <SidebarMenuItem>
                            {item.children ? (
                              !isExpanded ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <SidebarMenuButton className="flex items-center justify-center w-full h-10 hover:bg-white/5 rounded-xl">
                                      {item.icon && (
                                        <item.icon className="w-5 h-5 text-neutral-300 group-hover:text-[#1a8ceb]" />
                                      )}
                                    </SidebarMenuButton>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    side="right"
                                    className="bg-[#111111]/70 backdrop-blur-md text-white border border-white/10 rounded-xl p-2 w-56 shadow-lg"
                                  >
                                    {item.children.map((child) => (
                                      <Link
                                        key={child.title}
                                        href={child.href}
                                        onClick={() => {
                                          setPageTitle(child.title);
                                          triggerLoading();
                                        }}
                                        className={`px-3 py-2 text-sm flex items-center gap-2 rounded-lg hover:bg-white/5 hover:text-[#1a8ceb] transition-all ${
                                          pathname === child.href
                                            ? "bg-[#1a8ceb]/10 text-[#1a8ceb]"
                                            : ""
                                        }`}
                                      >
                                        {child.title}
                                      </Link>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Collapsible
                                  open={openMenus.includes(item.title)}
                                  onOpenChange={() => toggleMenu(item.title)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuButton className="w-full flex items-center gap-3 py-2.5 px-3 hover:bg-white/5 text-neutral-300 hover:text-white rounded-xl group relative">
                                      {item.icon && (
                                        <item.icon className="w-5 h-5 group-hover:text-[#1a8ceb]" />
                                      )}

                                      <motion.span
                                        className="font-medium flex items-center"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.25 }}
                                      >
                                        {item.title}
                                      </motion.span>

                                      {openMenus.includes(item.title) ? (
                                        <ChevronDown className="w-4 h-4 ml-auto" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                      )}
                                    </SidebarMenuButton>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent asChild>
                                    <motion.div
                                      initial={{ opacity: 0, y: -8, height: 0 }}
                                      animate={{
                                        opacity: 1,
                                        y: 0,
                                        height: "auto",
                                      }}
                                      exit={{ opacity: 0, y: -8, height: 0 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: "easeInOut",
                                      }}
                                      className="ml-6 mt-1 overflow-hidden"
                                    >
                                      {item.children.map((child) => {
                                        const childActive = pathname === child.href;

                                        return (
                                          <SidebarMenuButton
                                            key={child.title}
                                            asChild
                                            className={`flex items-center gap-3 py-2 px-3 text-sm hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl ${
                                              childActive
                                                ? "bg-[#1a8ceb]/10 text-[#1a8ceb]"
                                                : ""
                                            }`}
                                            onClick={() => {
                                              setPageTitle(child.title);
                                              triggerLoading();
                                            }}
                                          >
                                            <Link href={child.href}>
                                              {child.title}
                                            </Link>
                                          </SidebarMenuButton>
                                        );
                                      })}
                                    </motion.div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SidebarMenuButton
                                      asChild
                                      className={`hover:bg-white/5 text-neutral-300 hover:text-white rounded-xl group ${
                                        isActive
                                          ? "bg-[#1a8ceb]/10 text-[#1a8ceb]"
                                          : ""
                                      } ${
                                        !isExpanded
                                          ? "flex justify-center items-center h-10"
                                          : ""
                                      }`}
                                    >
                                      <Link
                                        href={item.href ?? "#"}
                                        onClick={() => {
                                          setPageTitle(item.title);
                                          triggerLoading();
                                        }}
                                        className={`flex items-center ${
                                          !isExpanded
                                            ? "justify-center w-full"
                                            : "gap-3 px-3 py-2.5"
                                        }`}
                                      >
                                        {item.icon && (
                                          <item.icon className="w-5 h-5 group-hover:text-[#1a8ceb]" />
                                        )}

                                        {isExpanded && (
                                          <motion.span
                                            className="font-medium flex items-center"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.25 }}
                                          >
                                            {item.title}
                                          </motion.span>
                                        )}
                                      </Link>
                                    </SidebarMenuButton>
                                  </TooltipTrigger>

                                  {!isExpanded && (
                                    <TooltipContent
                                      side="right"
                                      className="bg-[#111111] text-white border border-white/10"
                                    >
                                      {item.title}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </SidebarMenuItem>
                        </motion.div>
                      );
                    })}

                    {/* Botão + */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-center"
                    >
                      <SidebarMenuItem>
                        <motion.button
                          whileHover={{ rotate: 45, scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setPageTitle("Hub");
                            triggerLoading();
                            router.push("/dashboard/hub");
                          }}
                          className={`${
                            !isExpanded
                              ? "w-10 h-10 flex items-center justify-center mx-auto mt-3"
                              : "w-10 h-10 mx-auto mt-3 flex items-center justify-center"
                          } text-lg font-bold text-neutral-400 hover:text-[#1a8ceb] hover:bg-white/5 rounded-xl transition-all duration-300`}
                        >
                          +
                        </motion.button>
                      </SidebarMenuItem>
                    </motion.div>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </motion.div>
          </AnimatePresence>
        </SidebarContent>

        {/* Rodapé */}
        <div className="border-t border-white/10 p-3 shrink-0">
          <SidebarMenuButton
            asChild
            className={`hover:bg-white/5 text-neutral-300 hover:text-white rounded-xl ${
              pathname === "/dashboard/configuracao"
                ? "bg-[#1a8ceb]/10 text-[#1a8ceb]"
                : ""
            } ${!isExpanded ? "flex justify-center items-center h-10" : ""}`}
          >
            <Link
              href="/dashboard/configuracao"
              className={`flex items-center ${
                !isExpanded ? "justify-center" : "gap-3 px-3 py-2.5"
              }`}
            >
              <Settings className="w-5 h-5 group-hover:text-[#1a8ceb]" />
              {isExpanded && <span className="font-medium">Configurações</span>}
            </Link>
          </SidebarMenuButton>

          <SidebarMenuButton
            onClick={collapsed ? handleExpandSidebar : handleMinimizeSidebar}
            className={`mt-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/5 text-neutral-300 hover:text-white ${
              !isExpanded
                ? "flex justify-center items-center h-10"
                : "flex items-center gap-3 px-3 py-2.5"
            }`}
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5" />
            ) : (
              <ChevronsLeft className="w-5 h-5" />
            )}

            {isExpanded && (
              <span className="font-medium">
                {collapsed ? "Expandir menu" : "Minimizar menu"}
              </span>
            )}
          </SidebarMenuButton>
        </div>
      </div>
    </GlassmorphicCard>
  );
}