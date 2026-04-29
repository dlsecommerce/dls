"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Upload,
  SquareMinus,
  SquarePlus,
  Loader,
} from "lucide-react";

type Props = {
  exporting?: boolean;
  onExport: () => void | Promise<void>;
  onImportOpen: () => void | Promise<void>;
};

type ActionTextButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
};

function ActionTextButton({
  icon,
  label,
  onClick,
  disabled = false,
}: ActionTextButtonProps) {
  const handleClick = () => {
    void onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="
        flex w-full cursor-pointer items-start gap-3
        rounded-lg
        px-2 py-3 md:py-2
        text-left text-sm text-neutral-200
        transition hover:bg-white/5
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-50
      "
    >
      <span className="mt-0.5 shrink-0 text-neutral-400">{icon}</span>
      <span className="leading-5">{label}</span>
    </button>
  );
}

const STORAGE_KEY = "pricing-sidebar-more-options";

export default function MarketplaceActionsSidebar({
  exporting = false,
  onExport,
  onImportOpen,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setShowMoreOptions(saved !== null ? saved === "true" : true);
    } catch {
      setShowMoreOptions(true);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        String(showMoreOptions)
      );
    } catch {}
  }, [showMoreOptions, hydrated]);

  if (!hydrated) return null;

  return (
    <div className="bg-transparent p-3 md:p-4 w-full">
      <div className="space-y-2">
        {/* EXPORT */}
        <ActionTextButton
          icon={
            exporting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )
          }
          label={exporting ? "Exportando..." : "Exportar dados para planilha"}
          onClick={onExport}
          disabled={exporting}
        />

        {/* MAIS OPÇÕES */}
        <div className="pt-2 md:pt-1">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="
              mb-2 flex cursor-pointer items-center gap-2 px-2
              text-sm font-semibold text-green-400
              transition hover:underline
              active:scale-[0.98]
            "
          >
            {showMoreOptions ? (
              <SquareMinus className="h-4 w-4" />
            ) : (
              <SquarePlus className="h-4 w-4" />
            )}
            Mais opções
          </button>

          {showMoreOptions && (
            <div className="space-y-1">
              <div className="mb-2 px-2 text-sm font-semibold text-neutral-200">
                Planilhas
              </div>

              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar preços"
                onClick={onImportOpen}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}