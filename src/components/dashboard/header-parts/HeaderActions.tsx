"use client";

import { NotificationDropdown } from "./NotificationDropdown";
import { SearchBar } from "./SearchBar";

export default function HeaderActions() {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      {/* Espaço à esquerda para equilibrar */}
      <div className="flex-1" />

      {/* Search centralizado e sempre aberto */}
      <div className="flex flex-1 justify-center">
        <SearchBar expanded={true} onToggle={() => {}} />
      </div>

      {/* Ações à direita */}
      <div className="flex flex-1 justify-end items-center gap-2">
        <NotificationDropdown />
      </div>
    </div>
  );
}