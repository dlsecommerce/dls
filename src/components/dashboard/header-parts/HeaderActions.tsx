"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function HeaderActions() {
  const { i18n } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      {/* Sempre renderiza os ícones */}
      <div className="flex items-center gap-2">
        {/* Idiomas */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer rounded-md p-2 transition-all 
                           text-dashboard-text-muted hover:text-dashboard-text-primary 
                           hover:bg-white/5"
              >
                <Globe className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg"
            >
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage("en")}
                className="cursor-pointer text-dashboard-text-primary 
                           hover:bg-white/5 hover:text-white transition"
              >
                Inglês
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage("pt")}
                className="cursor-pointer text-dashboard-text-primary 
                           hover:bg-white/5 hover:text-white transition"
              >
                Português
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Theme */}
        <ThemeToggle />

        {/* Notificações */}
        <NotificationDropdown />
      </div>

      {/* Search sempre renderizado, mas se expandido ocupa espaço à direita */}
      <SearchBar expanded={searchOpen} onToggle={setSearchOpen} />
    </div>
  );
}
