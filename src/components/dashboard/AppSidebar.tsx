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
  LogOut,
  ShoppingCart,
  ChevronLeft,
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
import { supabase } from "@/integrations/supabase/client";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

// 🔹 Itens do menu
const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Automações",
    icon: Zap,
    children: [
      { title: "Automação de Planilhas", href: "/dashboard/automacoes/automacao-planilhas" },
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
      { title: "Tray", href: "/dashboard/marketplaces/tray" },
      { title: "Bling", href: "/dashboard/marketplaces/bling" },
      { title: "Mercado Livre", href: "/dashboard/marketplaces/mercado-livre" },
      { title: "Shopee", href: "/dashboard/marketplaces/shopee" },
      { title: "Magalu", href: "/dashboard/marketplaces/magalu" },
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

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const triggerLoading = () => {
    loadingRef.current?.start();
    setTimeout(() => loadingRef.current?.finish(), 800);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (err) {
      console.error("Erro ao sair:", err);
      router.replace("/dashboard");
    }
  };

  return (
    <GlassmorphicCard
      as={motion.aside}
      initial={{ width: collapsed ? 80 : 260 }}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{
        width: { duration: 0.45, ease: [0.45, 0, 0.1, 1] },
      }}
      className="
        relative h-screen flex flex-col 
        border-r border-white/10
        overflow-hidden
        fixed left-0 top-0 z-40
        rounded-none shadow-none
      "
    >
      {/* ✅ Fundo fixo animado — sem flicker preto */}
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

      {/* Conteúdo real */}
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
              animate={{ scale: collapsed ? 0.9 : 1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 bg-gradient-to-br from-[#1a8ceb] to-[#166bbf] rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer shrink-0"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingCart className="w-5 h-5 text-white relative z-10" />
            </motion.div>

            <AnimatePresence mode="wait">
              {!collapsed && (
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

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="group absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#111111]/80 border border-white/10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow"
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="w-3 h-3 text-white group-hover:text-[#1a8ceb]" />
            </motion.div>
          </button>
        </SidebarHeader>

        {/* Menu com fade + blur */}
        <SidebarContent className="flex-1 p-3 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={collapsed ? "collapsed" : "expanded"}
              initial={{ opacity: 0, x: collapsed ? -10 : 10, filter: "blur(3px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: collapsed ? 10 : -10, filter: "blur(3px)" }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
                delay: collapsed ? 0 : 0.15,
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
                            {/* Mesma lógica dos menus originais */}
                            {item.children ? (
                              collapsed ? (
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
                                      {!collapsed && (
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
                                        const childActive =
                                          pathname === child.href;
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
                                        collapsed
                                          ? "flex justify-center items-center h-10"
                                          : ""
                                      }`}
                                    >
                                      <Link
                                        href={item.href ?? "#"}
                                        className={`flex items-center ${
                                          collapsed
                                            ? "justify-center w-full"
                                            : "gap-3 px-3 py-2.5"
                                        }`}
                                      >
                                        {item.icon && (
                                          <item.icon className="w-5 h-5 group-hover:text-[#1a8ceb]" />
                                        )}
                                        {!collapsed && (
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
                                  {collapsed && (
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
            } ${collapsed ? "flex justify-center items-center h-10" : ""}`}
          >
            <Link
              href="/dashboard/configuracao"
              className={`flex items-center ${
                collapsed ? "justify-center" : "gap-3 px-3 py-2.5"
              }`}
            >
              <Settings className="w-5 h-5 group-hover:text-[#1a8ceb]" />
              {!collapsed && (
                <span className="font-medium">Configurações</span>
              )}
            </Link>
          </SidebarMenuButton>

          <SidebarMenuButton
            onClick={handleLogout}
            className={`hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-xl mt-2 cursor-pointer ${
              collapsed
                ? "flex justify-center items-center h-10"
                : "flex items-center gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut className="w-5 h-5 group-hover:text-red-400" />
            {!collapsed && <span className="font-medium">Sair</span>}
          </SidebarMenuButton>
        </div>
      </div>
    </GlassmorphicCard>
  );
}
