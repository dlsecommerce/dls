"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileDownIcon,
  FileSpreadsheet,
  Plus,
  SquareMinus,
  SquarePlus,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";
import { unlockAudio } from "@/utils/sound";

type Props = {
  exporting?: boolean;
  onOpenCreate: () => void | Promise<void>;
  onExport: () => void | Promise<void>;
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

const STORAGE_KEY = "announce-actions-show-more-options";

async function baixarModeloPlanilha(filename?: string) {
  const identificacao = [
    "ID",
    "Loja",
    "ID Bling",
    "ID Tray",
    "Referência",
    "ID Var",
    "OD",
  ];

  const descricao = [
    "Nome",
    "Marca",
    "Categoria",
    "Peso",
    "Altura",
    "Largura",
    "Comprimento",
  ];

  const composicao: string[] = [];
  for (let i = 1; i <= 10; i++) {
    composicao.push(`Código ${i}`, `Quantidade ${i}`);
  }

  const header = [...identificacao, ...descricao, ...composicao];

  const groupHeader = Array(header.length).fill("");
  groupHeader[0] = "IDENTIFICAÇÃO";
  groupHeader[identificacao.length] = "DESCRIÇÃO";
  groupHeader[identificacao.length + descricao.length] =
    "COMPOSIÇÃO DE CUSTOS";

  const data = [groupHeader, header];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: identificacao.length - 1 } },
    {
      s: { r: 0, c: identificacao.length },
      e: { r: 0, c: identificacao.length + descricao.length - 1 },
    },
    {
      s: { r: 0, c: identificacao.length + descricao.length },
      e: { r: 0, c: header.length - 1 },
    },
  ];

  const azulPrincipal = "1A8CEB";

  const groupStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: azulPrincipal },
    },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 13 },
    alignment: { horizontal: "center", vertical: "center" as const },
  };

  const headerStyle = {
    fill: {
      type: "pattern",
      patternType: "solid",
      fgColor: { rgb: azulPrincipal },
    },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: {
      horizontal: "center",
      vertical: "center" as const,
      wrapText: true,
    },
  };

  [0, identificacao.length, identificacao.length + descricao.length].forEach(
    (c) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if ((ws as any)[ref]) (ws as any)[ref].s = groupStyle;
    }
  );

  header.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 1, c: col });
    if ((ws as any)[ref]) (ws as any)[ref].s = headerStyle;
  });

  ws["!cols"] = header.map((h) => {
    const wide = ["Nome", "Categoria", "Marca"].includes(h);
    return { wch: wide ? 22 : 14 };
  });

  const agora = new Date();
  const dataHora = agora
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/[/:]/g, "-")
    .replace(", ", "_");

  const safeFilename =
    filename && filename.trim().length > 0
      ? filename.endsWith(".xlsx")
        ? filename
        : `${filename}.xlsx`
      : `MODELO - PLANILHA - ${dataHora}.xlsx`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, safeFilename);

  await createNotification({
    title: "Modelo de planilha baixado",
    message: `O modelo "${safeFilename}" foi baixado para edição em massa de anúncios.`,
    action: "comment",
    entityType: "announcement",
  });

  return safeFilename;
}

export default function AnunciosActionsSidebar({
  exporting = false,
  onOpenCreate,
  onExport,
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
        accept=".xlsx,.xls,.csv"
        aria-label="Importar dados de inclusão"
        onChange={handleFileChange(onImportInclusao)}
      />

      <input
        type="file"
        ref={inputAlteracaoRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        aria-label="Importar dados de alteração"
        onChange={handleFileChange(onImportAlteracao)}
      />

      <div className="space-y-2">
        <ActionTextButton
          icon={<Plus className="h-4 w-4" />}
          label="Novo Cadastro"
          onClick={onOpenCreate}
          primary
        />

        <ActionTextButton
          icon={<Download className="h-4 w-4" />}
          label="Exportar dados para planilha"
          onClick={onExport}
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
                label="Baixar planilha modelo"
                onClick={() => baixarModeloPlanilha()}
              />

              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar dados de inclusão"
                onClick={() => triggerFileInput(inputInclusaoRef)}
              />

              <ActionTextButton
                icon={<FileSpreadsheet className="h-4 w-4" />}
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