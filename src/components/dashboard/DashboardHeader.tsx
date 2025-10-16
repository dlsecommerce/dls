"use client";

import { usePathname } from "next/navigation";
import HeaderLeft from "./header-parts/HeaderLeft";
import HeaderActions from "./header-parts/HeaderActions";
import { UserProfileDropdown } from "./header-parts/UserProfileDropdown";
import { useProfile } from "@/context/ProfileContext";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/automacoes/automacao-planilhas": "Automação de Planilhas",
  "/dashboard/precificacao/precificacao-individual": "Precificação Individual",
  "/dashboard/precificacao/decomposicao": "Decomposição",
  "/dashboard/precificacao/custos": "Custos",
  "/dashboard/marketplaces": "Marketplaces",
  "/dashboard/anuncios": "Anúncios",
  "/dashboard/anuncios/edit": "Detalhes",
  "/dashboard/configuracao": "Configurações",
};

export default function DashboardHeader({
  onSidebarToggle,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const { profile, loading } = useProfile();

  const title =
    routeTitles[pathname] ||
    routeTitles[
      Object.keys(routeTitles).find((key) => pathname.startsWith(key)) ?? ""
    ] ||
    "Dashboard";

  return (
    <GlassmorphicCard
      className="
        sticky top-0 z-30 
        flex items-center justify-between 
        px-6 py-3
        bg-gradient-to-br from-[#0a0a0a]/90 to-[#1a1a1a]/70
        backdrop-blur-xl
        border-b border-white/10
        rounded-none shadow-none
        transition-all duration-300
      "
    >
      <HeaderLeft title={title} onSidebarToggle={onSidebarToggle} />
      <div className="flex items-center gap-3">
        <HeaderActions />
        <div className="w-px h-6 bg-white/10" />
        {!loading && profile ? (
          <UserProfileDropdown />
        ) : (
          <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
        )}
      </div>
    </GlassmorphicCard>
  );
}
