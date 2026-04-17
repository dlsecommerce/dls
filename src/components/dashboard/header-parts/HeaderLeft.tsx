"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface HeaderLeftProps {
  title: string;
  onSidebarToggle: () => void;
}

export default function HeaderLeft({ title, onSidebarToggle }: HeaderLeftProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4">
      {/* Botão de abrir/fechar sidebar no mobile */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSidebarToggle}
        className="lg:hidden cursor-pointer rounded-md p-2 
                   text-dashboard-text-muted hover:text-dashboard-text-primary 
                   hover:bg-white/10 transition-all"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Título da página traduzido */}
      <h1 className="text-xl font-semibold text-dashboard-text-primary">
        {t(title)}
      </h1>
    </div>
  );
}
