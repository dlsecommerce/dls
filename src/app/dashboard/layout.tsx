"use client";

import { useRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useTranslation } from "react-i18next";
import ChatBubble from "@/components/chat/ChatBubble"; // ✅ import do chat

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [pageTitle, setPageTitle] = useState(t("dashboard"));
  const loadingRef = useRef<LoadingBarRef | null>(null);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0a0a0a] relative">
        {/* Sidebar lateral */}
        <AppSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          setPageTitle={setPageTitle}
          loadingRef={loadingRef}
        />

        {/* Área principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header mobile */}
          <header className="bg-[#111111]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 md:hidden sticky top-0 z-50 flex items-center justify-between">
            <SidebarTrigger className="hover:bg-white/5 p-2 rounded-xl transition-all duration-300" />
            <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
          </header>

          {/* Header desktop */}
          <div className="hidden md:block">
            <DashboardHeader
              sidebarCollapsed={collapsed}
              onSidebarToggle={() => setCollapsed((prev) => !prev)}
            />
          </div>

          {/* Conteúdo da página */}
          <div className="flex-1 overflow-auto relative">{children}</div>

          {/* 🔹 Chat flutuante no canto inferior direito */}
          <ChatBubble />
        </main>

        {/* Barra de carregamento global */}
        <LoadingBar ref={loadingRef} />
      </div>
    </SidebarProvider>
  );
}
