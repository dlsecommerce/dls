"use client";

import { useRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useTranslation } from "react-i18next";
import ChatBubble from "@/components/chat/ChatBubble";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [pageTitle, setPageTitle] = useState(t("dashboard"));
  const loadingRef = useRef<LoadingBarRef | null>(null);

  const sidebarWidth = collapsed ? 80 : 260;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] relative">
        {/* 🔹 Sidebar fixa e integrada visualmente com o header */}
        <div
          className="fixed top-0 left-0 bottom-0 z-50 border-r border-white/10 transition-all duration-300 
                     bg-gradient-to-b from-[#0a0a0a]/90 via-[#0a0a0a]/85 to-[#111111]/80
                     backdrop-blur-xl"
          style={{ width: sidebarWidth }}
        >
          {/* 🔹 Sidebar */}
          <AppSidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            setPageTitle={setPageTitle}
            loadingRef={loadingRef}
          />

          {/* 🔹 Borda luminosa sutil */}
          <div className="absolute right-0 top-0 h-full w-px bg-white/5" />
        </div>

        {/* 🔹 Conteúdo principal */}
        <div
          className="flex flex-col flex-1 min-h-screen transition-all duration-300 relative"
          style={{
            marginLeft: sidebarWidth,
            backgroundColor: "#0a0a0a",
          }}
        >
          {/* Header fixo, unido visualmente ao sidebar */}
          <header
            className="sticky top-0 z-40 border-b border-white/10 
                       bg-gradient-to-br from-[#0a0a0a]/90 via-[#1a1a1a]/80 to-[#1a1a1a]/70
                       backdrop-blur-xl"
          >
            {/* Header mobile */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
              <SidebarTrigger className="hover:bg-white/5 p-2 rounded-xl transition-all duration-300" />
              <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
            </div>

            {/* Header desktop */}
            <div className="hidden md:block">
              <DashboardHeader
                sidebarCollapsed={collapsed}
                onSidebarToggle={() => setCollapsed((prev) => !prev)}
              />
            </div>
          </header>

          {/* 🔹 Conteúdo rolável */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>

          <ChatBubble />
        </div>

        <LoadingBar ref={loadingRef} />
      </div>
    </SidebarProvider>
  );
}
