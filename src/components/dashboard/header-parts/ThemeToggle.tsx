"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer rounded-md p-2 transition-all 
                     text-dashboard-text-muted hover:text-dashboard-text-primary 
                     hover:bg-white/5"
        >
          {theme === "light" ? (
            <Sun className="w-5 h-5" />
          ) : theme === "dark" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg"
      >
        <DropdownMenuItem
          onClick={() => setTheme("Claro")}
          className="cursor-pointer hover:bg-white/5"
        >
          <Sun className="w-4 h-4 mr-2" /> {t("Light")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("Escuro")}
          className="cursor-pointer hover:bg-white/5"
        >
          <Moon className="w-4 h-4 mr-2" /> {t("Dark")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("Sistema")}
          className="cursor-pointer hover:bg-white/5"
        >
          <Monitor className="w-4 h-4 mr-2" /> {t("System")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
