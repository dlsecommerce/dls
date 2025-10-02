"use client";

import { usePathname } from "next/navigation";
import HeaderLeft from "./header-parts/HeaderLeft";
import HeaderActions from "./header-parts/HeaderActions";
import { UserProfileDropdown } from "./header-parts/UserProfileDropdown";

interface DashboardHeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/automacao-modelo": "Automação de Planilhas",
  "/dashboard/precificacao-individual": "Precificação Individual",
  "/dashboard/precificacao/decomposicao": "Decomposição",
  "/dashboard/precificacao/tabela-custos": "Tabela de Custos",
  "/dashboard/marketplaces": "Marketplaces",
  "/dashboard/anuncios": "Anúncios",
  "/dashboard/configuracao": "Configurações",
};

export default function DashboardHeader({
  onSidebarToggle,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  // 🔹 Garante que pegamos sempre o valor do título, não a chave
  const title =
    routeTitles[pathname] ||
    routeTitles[
      Object.keys(routeTitles).find((key) => pathname.startsWith(key)) ?? ""
    ] ||
    "Dashboard";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between 
                 px-6 py-3 
                 bg-[#111111]/80 backdrop-blur-xl 
                 border-b border-white/10"
    >
      {/* Esquerda → título */}
      <HeaderLeft title={title} onSidebarToggle={onSidebarToggle} />

      {/* Direita → ícones + perfil */}
      <div className="flex items-center gap-3">
        <HeaderActions />
        <div className="w-px h-6 bg-white/10" />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
