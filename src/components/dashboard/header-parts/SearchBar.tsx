"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { SuggestionDropdown } from "@/components/dashboard/header-parts/SuggestionDropdown";
import { GLOBAL_SEARCH_ITEMS } from "@/hooks/global-search-items";

interface SearchBarProps {
  expanded: boolean;
  onToggle: (value: boolean) => void;
}

export function SearchBar({ expanded }: SearchBarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Apenas controla fechamento se não estiver expandido
  useEffect(() => {
    if (!expanded) {
      setDropdownOpen(false);
    }
  }, [expanded]);

  const sugestoes = useMemo(() => {
    const termo = query.trim().toLowerCase();

    if (!termo) return [];

    return GLOBAL_SEARCH_ITEMS.filter((item) => {
      return (
        item.label.toLowerCase().includes(termo) ||
        item.category.toLowerCase().includes(termo) ||
        item.keywords.some((keyword) =>
          keyword.toLowerCase().includes(termo)
        )
      );
    }).slice(0, 8);
  }, [query]);

  const updateDropdownPosition = () => {
    if (!inputContainerRef.current) return;

    const rect = inputContainerRef.current.getBoundingClientRect();

    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    setIndiceSelecionado(0);

    const shouldOpen = query.trim().length > 0 && sugestoes.length > 0;
    setDropdownOpen(shouldOpen);

    if (shouldOpen) {
      updateDropdownPosition();
    }
  }, [query, sugestoes]);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleReposition = () => {
      updateDropdownPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideInput =
        wrapperRef.current?.contains(target) ?? false;

      const clickedInsideDropdown =
        listaRef.current?.contains(target) ?? false;

      if (!clickedInsideInput && !clickedInsideDropdown) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        return;
      }

      if (!dropdownOpen || !sugestoes.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceSelecionado((prev) =>
          prev < sugestoes.length - 1 ? prev + 1 : 0
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceSelecionado((prev) =>
          prev > 0 ? prev - 1 : sugestoes.length - 1
        );
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const item = sugestoes[indiceSelecionado];

        if (item) {
          handleSelect(item.href);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, sugestoes, indiceSelecionado]);

  const handleSelect = (href: string) => {
    setDropdownOpen(false);
    setQuery("");
    router.push(href);
  };

  if (!expanded) return null;

  return (
    <>
      <div ref={wrapperRef} className="relative w-full max-w-md">
        <div
          ref={inputContainerRef}
          className="flex items-center w-full bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-md shadow-lg px-3 py-2 transition-all"
        >
          <Search className="w-4 h-4 text-dashboard-text-muted mr-2" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length > 0 && sugestoes.length > 0) {
                updateDropdownPosition();
                setDropdownOpen(true);
              }
            }}
            placeholder={t("Pesquisar")}
            className="flex-1 bg-transparent outline-none text-sm text-dashboard-text-primary placeholder-dashboard-text-muted"
          />

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDropdownOpen(false);
              inputRef.current?.blur();
            }}
            className="p-1 text-dashboard-text-muted hover:text-red-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SuggestionDropdown
        isActive={dropdownOpen}
        sugestoes={sugestoes}
        listaRef={listaRef}
        indiceSelecionado={indiceSelecionado}
        onSelect={handleSelect}
        position={dropdownPosition}
      />
    </>
  );
}