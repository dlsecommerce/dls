"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";
import { unlockAudio } from "@/utils/sound";
import TableInfoCard from "@/components/ui/Tableinfocard";

type Props = {
  exporting: boolean;
  handleExport: () => void | Promise<void>;
  onOpenCreate: () => void | Promise<void>;
  onImportInclusao: (file: File) => void | Promise<void>;
  totalCount: number;
  // Regras de Canal
  exportingChannelRules?: boolean;
  onExportChannelRules?: () => void | Promise<void>;
  onImportChannelRules?: (file: File) => void | Promise<void>;
  // Regras por Produto
  exportingProductRules?: boolean;
  onExportProductRules?: () => void | Promise<void>;
  onImportProductRules?: (file: File) => void | Promise<void>;
};

function ActionTextButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  primary?: boolean;
}) {
  const handleClick = () => void onClick();

  if (primary) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={label}
        className="
          flex h-11 w-full items-center justify-start gap-2
          border border-[#1a8ceb]
          bg-[#1a8ceb]
          px-3
          text-sm font-medium text-white
          transition-colors duration-150
          hover:bg-[#1579d1] hover:border-[#1579d1]
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white
          active:scale-[0.99]
          enabled:cursor-pointer disabled:opacity-40
        "
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className="
        group flex w-full items-start gap-2.5
        border border-transparent
        px-2.5 py-2.5
        text-left text-[13px] text-neutral-300
        transition-colors duration-150
        hover:border-neutral-800 hover:bg-neutral-900/60 hover:text-white
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
        active:scale-[0.99]
        disabled:cursor-not-allowed disabled:opacity-40
      "
    >
      <span className="mt-0.5 shrink-0 text-neutral-500 group-hover:text-[#1a8ceb]">
        {icon}
      </span>
      <span className="leading-5">{label}</span>
    </button>
  );
}

const STORAGE_KEY = "marketplace-actions-show-more-options";

export default function MarketplaceActions({
  exporting,
  handleExport,
  onOpenCreate,
  onImportInclusao,
  totalCount,
  exportingChannelRules = false,
  onExportChannelRules,
  onImportChannelRules,
  exportingProductRules = false,
  onExportProductRules,
  onImportProductRules,
}: Props) {
  const inputInclusaoRef = useRef<HTMLInputElement | null>(null);
  const inputChannelRulesRef = useRef<HTMLInputElement | null>(null);
  const inputProductRulesRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileChange =
    (callback: (file: File) => void | Promise<void>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void callback(file);
      event.target.value = "";
    };

  const triggerFileInput = async (ref: React.RefObject<HTMLInputElement | null>) => {
    await unlockAudio();
    ref.current?.click();
  };

  if (!hydrated) return null;

  return (
    <div className="w-full bg-transparent px-3 py-2 sm:px-4">
      <input
        type="file"
        ref={inputInclusaoRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar preços"
        onChange={handleFileChange(onImportInclusao)}
      />
      <input
        type="file"
        ref={inputChannelRulesRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar regras de canal"
        onChange={handleFileChange((file) => onImportChannelRules?.(file))}
      />
      <input
        type="file"
        ref={inputProductRulesRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar regras por produto"
        onChange={handleFileChange((file) => onImportProductRules?.(file))}
      />

      <div className="space-y-1.5">
        <ActionTextButton
          icon={<Plus className="h-4 w-4" />}
          label="Novo Marketplace"
          onClick={onOpenCreate}
          primary
        />
        <ActionTextButton
          icon={<Download className="h-4 w-4" />}
          label="Exportar dados para planilha"
          onClick={handleExport}
          disabled={exporting}
        />

        <div className="mt-3 border-t border-neutral-900 pt-3">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            aria-expanded={showMoreOptions}
            aria-label={showMoreOptions ? "Ocultar mais opções" : "Mostrar mais opções"}
            className="
              mb-2 flex w-full cursor-pointer items-center justify-between
              px-2.5 py-1
              text-[11px] font-semibold uppercase tracking-[0.15em]
              text-neutral-500
              transition-colors
              hover:text-[#1a8ceb]
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
            "
          >
            Mais opções
            {showMoreOptions ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showMoreOptions && (
            <div className="space-y-0.5">
              <div className="mb-1 px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Planilhas
              </div>

              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar preços"
                onClick={() => triggerFileInput(inputInclusaoRef)}
              />

              <div className="my-1 border-t border-neutral-900" />

              <div className="mb-1 px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Regras de Canal
              </div>

              <ActionTextButton
                icon={<Download className="h-4 w-4" />}
                label="Exportar regras de canal"
                onClick={() => onExportChannelRules?.()}
                disabled={exportingChannelRules || !onExportChannelRules}
              />
              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar regras de canal"
                onClick={() => triggerFileInput(inputChannelRulesRef)}
                disabled={!onImportChannelRules}
              />

              <div className="my-1 border-t border-neutral-900" />

              <div className="mb-1 px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Regras por Produto
              </div>

              <ActionTextButton
                icon={<Download className="h-4 w-4" />}
                label="Exportar regras por produto"
                onClick={() => onExportProductRules?.()}
                disabled={exportingProductRules || !onExportProductRules}
              />
              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar regras por produto"
                onClick={() => triggerFileInput(inputProductRulesRef)}
                disabled={!onImportProductRules}
              />
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-neutral-900 pt-3">
          <TableInfoCard label="Quantidade de Anúncios" value={totalCount} />
        </div>
      </div>
    </div>
  );
}
