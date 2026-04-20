"use client";

import { NotificationDropdown } from "./NotificationDropdown";
import { SearchBar } from "./SearchBar";

export default function HeaderActions() {
  return (
    <div className="flex w-full items-center gap-3 md:justify-between md:gap-4">
      
      {/* Espaço à esquerda (somente desktop) */}
      <div className="hidden md:flex flex-1" />

      {/* Search */}
      <div className="flex flex-1 md:flex-1 md:justify-center">
        <SearchBar expanded={true} onToggle={() => {}} />
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 md:flex-1">
        <NotificationDropdown />
      </div>

    </div>
  );
}