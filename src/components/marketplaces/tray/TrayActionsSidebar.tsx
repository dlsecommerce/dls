"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Upload,
  SquareMinus,
  SquarePlus,
  Loader,
  Layers,
} from "lucide-react";

type Props = {
  exporting?: boolean;
  onExport: () => void | Promise<void>;

  onImportOpen: () => void | Promise<void>;

  onMassEditOpen: () => void | Promise<void>;

  selectedCount?: number;
  onDeleteSelected?: () => void | Promise<void>;
  onClearSelection?: () => void | Promise<void>;
};

type ActionTextButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
};

function ActionTextButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: ActionTextButtonProps) {
  const handleClick = () => {
    void onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "text-red-400" : "text-neutral-200"
      }`}
    >
      <span className="mt-0.5 shrink-0 text-neutral-400">{icon}</span>
      <span className="leading-5">{label}</span>
    </button>
  );
}

const STORAGE_KEY = "tray-actions-sidebar-more-options";

export default function TrayActionsSidebar({
  exporting = false,
  onExport,
  onImportOpen,
  onMassEditOpen,
  selectedCount = 0,
  onDeleteSelected,
  onClearSelection,
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
      window.localStorage.setItem(STORAGE_KEY, String(showMoreOptions));
    } catch {}
  }, [showMoreOptions, hydrated]);

  if (!hydrated) return null;

  return (
    <div className="bg-transparent p-4">
      <div className="space-y-2">
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

        <ActionTextButton
          icon={<Layers className="h-4 w-4" />}
          label="Edição em Massa"
          onClick={onMassEditOpen}
        />

        {selectedCount > 0 && (
          <div className="mx-2 rounded-lg border border-neutral-700 bg-white/5 p-3 text-sm text-neutral-300">
            <div className="mb-2">
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </div>

            <div className="flex items-center gap-3">
              {onClearSelection && (
                <button
                  type="button"
                  onClick={() => void onClearSelection()}
                  className="cursor-pointer text-blue-400 transition hover:text-blue-300"
                >
                  Limpar
                </button>
              )}

              {onDeleteSelected && (
                <button
                  type="button"
                  onClick={() => void onDeleteSelected()}
                  className="cursor-pointer text-red-400 transition hover:text-red-300"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="mb-2 flex cursor-pointer items-center gap-2 px-2 text-sm font-semibold text-green-400 transition hover:underline"
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