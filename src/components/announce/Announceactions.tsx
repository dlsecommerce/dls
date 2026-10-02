"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileDownIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { unlockAudio } from "@/utils/sound";
import TableInfoCard from "@/components/ui/Tableinfocard";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  exporting: boolean;
  handleExport: () => void | Promise<void>;
  onOpenCreate: () => void | Promise<void>;
  onExportModelo: () => void | Promise<void>;
  onImportInclusao: (file: File) => void | Promise<void>;
  onImportAlteracao: (file: File) => void | Promise<void>;
  onValidarComposicao: () => void | Promise<void>;
  // Novos handlers - fluxo de Composição
  onExportModeloComposicao: () => void | Promise<void>;
  onExportComposicao: () => void | Promise<void>;
  onImportComposicao: (file: File) => void | Promise<void>;
  totalCount: number;
  loja?: "sobaquetas" | "pikot"; // padrão: sobaquetas
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

const STORAGE_KEY = "announce-actions-show-more-options";

export default function AnnounceActions({
  exporting,
  handleExport,
  onOpenCreate,
  onExportModelo,
  onImportInclusao,
  onImportAlteracao,
  onValidarComposicao,
  onExportModeloComposicao,
  onExportComposicao,
  onImportComposicao,
  totalCount,
  loja = "sobaquetas",
}: Props) {
  const inputInclusaoRef = useRef<HTMLInputElement | null>(null);
  const inputAlteracaoRef = useRef<HTMLInputElement | null>(null);
  const inputComposicaoRef = useRef<HTMLInputElement | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(true);
  const [exportingBling, setExportingBling] = useState(false);
  const [blingProgress, setBlingProgress] = useState(0);

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

  const handleExportBling = async () => {
    setExportingBling(true);
    setBlingProgress(0);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Entre novamente.");

      const r = await fetch(
        `/api/announce/export?source=bling&loja=${loja}&format=xlsx`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        throw new Error(j?.error || "Erro ao exportar");
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let buffer = "";
      let fileName = "bling-anuncios.xlsx";
      let mimeType = "application/octet-stream";
      let finished = false;

      const handleLine = (line: string) => {
        if (!line.trim()) return; // ignora o preâmbulo de espaços
        const msg = JSON.parse(line);
        if (msg.type === "progress") setBlingProgress(msg.percent);
        else if (msg.type === "chunk") chunks[msg.index] = msg.data;
        else if (msg.type === "error") throw new Error(msg.error);
        else if (msg.type === "done") {
          fileName = msg.fileName;
          mimeType = msg.mimeType;
          finished = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      if (buffer.trim()) handleLine(buffer);
      if (!finished) throw new Error("Exportação interrompida.");

      const bin = atob(chunks.join(""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setExportingBling(false);
      setBlingProgress(0);
    }
  };

  if (!hydrated) return null;

  return (
    <div className="w-full bg-transparent px-3 py-2 sm:px-4">
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
      <input
        type="file"
        ref={inputComposicaoRef}
        className="hidden"
        accept=".xlsx,.csv"
        aria-label="Importar composição"
        onChange={handleFileChange(onImportComposicao)}
      />

      <div className="space-y-1.5">
        <ActionTextButton
          icon={<Plus className="h-4 w-4" />}
          label="Novo Anúncio"
          onClick={onOpenCreate}
          primary
        />
        <ActionTextButton
          icon={<Download className="h-4 w-4" />}
          label="Exportar dados para planilha"
          onClick={handleExport}
          disabled={exporting}
        />
        <ActionTextButton
          icon={<FileSpreadsheet className="h-4 w-4" />}
          label={
            exportingBling
              ? `Exportando... ${blingProgress}%`
              : "Exportar dados para planilha Bling"
          }
          onClick={handleExportBling}
          disabled={exportingBling}
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
                icon={<FileDownIcon className="h-4 w-4" />}
                label="Baixar planilha modelo"
                onClick={onExportModelo}
              />

              <div className="my-1 border-t border-neutral-900" />

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

              <div className="my-1 border-t border-neutral-900" />

              <div className="mb-1 px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Gerar
              </div>

              <ActionTextButton
                icon={<FileDownIcon className="h-4 w-4" />}
                label="Baixar modelo de composição"
                onClick={onExportModeloComposicao}
              />
              <ActionTextButton
                icon={<Download className="h-4 w-4" />}
                label="Exportar composições"
                onClick={onExportComposicao}
              />
              <ActionTextButton
                icon={<Upload className="h-4 w-4" />}
                label="Importar composição"
                onClick={() => triggerFileInput(inputComposicaoRef)}
              />
              <ActionTextButton
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Validar Composição"
                onClick={onValidarComposicao}
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
