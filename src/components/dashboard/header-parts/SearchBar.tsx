"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  expanded: boolean;
  onToggle: (value: boolean) => void;
}

export function SearchBar({ expanded, onToggle }: SearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focar automaticamente
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Fechar com tecla Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onToggle]);

  if (!expanded) {
    return (
      <button
        onClick={() => onToggle(true)}
        className="p-2 cursor-pointer text-dashboard-text-muted hover:text-dashboard-text-primary hover:bg-white/5 rounded-md transition"
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center flex-1 max-w-md bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-md shadow-lg px-3 py-2 ml-3 transition-all">
      <Search className="w-4 h-4 text-dashboard-text-muted mr-2" />
      <input
        ref={inputRef}
        type="text"
        placeholder={t("Pesquisar")}
        className="flex-1 bg-transparent outline-none text-sm text-dashboard-text-primary placeholder-dashboard-text-muted"
      />
      <button
        onClick={() => onToggle(false)}
        className="p-1 text-dashboard-text-muted hover:text-red-500 cursor-pointer transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
