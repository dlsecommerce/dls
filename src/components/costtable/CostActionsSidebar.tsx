"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileDownIcon,
  Plus,
  SquareMinus,
  SquarePlus,
  Upload,
} from "lucide-react";
import { unlockAudio } from "@/utils/sound";

type Props = {
  exporting: boolean;
  handleExport: () => void | Promise<void>;
  onOpenCreate: () => void | Promise<void>;
  onExportModeloInclusao: () => void | Promise<void>;
  onExportModeloAlteracao: () => void | Promise<void>;
  onImportInclusao: (file: File) => void;
  onImportAlteracao: (file: File) => void;
};

type ActionTextButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  primary?: boolean;
};

function ActionTextButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: ActionTextButtonProps) {
  const handleClick = () => {
    void onClick();
  };

  if (primary) {
    return (
      <Button
        type="button"
        className="h-11 w-full cursor-pointer justify-start rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white transition-all duration-200 hover:from-green-400 hover:to-green-500 hover:shadow-[0_0_14px_rgba(34,197,94,0.22)]"
        onClick={handleClick}
        disabled={disabled}
      >
        <span className="mr-2">{icon}</span>
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left text-sm text-neutral-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="mt-0.5 shrink-0 text-neutral-400">{icon}</span>
      <span className="leading-5">{label}</span>
    </button>
  );
}

const STORAGE_KEY = "cost-actions-show-more-options";

export default function CostActionsSidebar({
  exporting,
  handleExport,
  onOpenCreate,
  onExportModeloInclusao,
  onExportModeloAlteracao,
  onImportInclusao,
  onImportAlteracao,
}: Props) {
  const inputInclusaoRef = useRef<HTMLInputElement | null>(null);
  const inputAlteracaoRef = useRef<HTMLInputElement | null>(null);

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
    (callback: (file: File) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) callback(file);
      e.target.value = "";
    };

  const triggerFileInput = async (
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    await unlockAudio();
    ref.current?.click();
  };

  if (!hydrated) return null;

  return (
    <div className="bg-transparent p-4">
      <input
        type="file"
        ref={inputInclusaoRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar dados de inclusão"
        onChange={handleFileChange(onImportInclusao)}
      />

      <input
        type="file"
        ref={inputAlteracaoRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar dados de alteração"
        onChange={handleFileChange(onImportAlteracao)}
      />

      <div className="space-y-2">
        <ActionTextButton
          icon={<Plus className="h-4 w-4" />}
          label="Novo Custo"
          onClick={onOpenCreate}
          primary
        />

        <ActionTextButton
          icon={<Download className="h-4 w-4" />}
          label="Exportar dados para planilha"
          onClick={handleExport}
          disabled={exporting}
        />

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
                icon={<FileDownIcon className="h-4 w-4" />}
                label="Baixar planilha modelo de inclusão"
                onClick={onExportModeloInclusao}
              />

              <ActionTextButton
                icon={<FileSpreadsheet className="h-4 w-4" />}
                label="Baixar planilha modelo de alteração"
                onClick={onExportModeloAlteracao}
              />

              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar dados de inclusão"
                onClick={() => triggerFileInput(inputInclusaoRef)}
              />

              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar dados de alteração"
                onClick={() => triggerFileInput(inputAlteracaoRef)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}