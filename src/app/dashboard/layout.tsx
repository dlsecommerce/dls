"use client";

// ⛔ Impede prerenderização, corrige useSearchParams no subtree
export const dynamic = "force-dynamic";

import { useRef } from "react";
import { LoadingBar, LoadingBarRef } from "@/components/ui/loading-bar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ChatBubble from "@/components/chat/ChatBubble";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadingRef = useRef<LoadingBarRef | null>(null);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      <div className="relative flex min-h-screen w-full flex-1 flex-col">
        <header
          className="
            sticky top-0 z-40 border-b border-white/10
            bg-gradient-to-br from-[#0a0a0a]/90 via-[#1a1a1a]/80 to-[#1a1a1a]/70
            backdrop-blur-xl
          "
        >
          <DashboardHeader />
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:p-6">
          {children}
        </main>

        <ChatBubble />
      </div>

      <LoadingBar ref={loadingRef} />
    </div>
  );
}