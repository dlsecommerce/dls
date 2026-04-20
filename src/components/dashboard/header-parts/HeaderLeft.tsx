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
    <div className="flex items-center gap-3 sm:gap-4">
      {/* Botão mobile */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSidebarToggle}
        className="lg:hidden cursor-pointer rounded-md p-2 
                   text-dashboard-text-muted hover:text-dashboard-text-primary 
                   hover:bg-white/10 transition-all min-h-[40px] min-w-[40px]"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Título */}
      <h1 className="text-base font-semibold text-dashboard-text-primary truncate sm:text-xl">
        {t(title)}
      </h1>
    </div>
  );
}