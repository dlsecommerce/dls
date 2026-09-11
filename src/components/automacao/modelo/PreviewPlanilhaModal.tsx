"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader,
} from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: File | null;
  onConfirm: (file: File) => void;
};

const formatFileSize = (size: number) => {
  if (!size) return "0 KB";

  const kb = size / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
};

export default function PreviewPlanilhaModal({
  open,
  onOpenChange,
  file,
  onConfirm,
}: Props) {
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetName, setSheetName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const totalColumns = useMemo(() => {
    if (!data.length) return 0;

    return Math.max(...data.map((row) => row.length));
  }, [data]);

  useEffect(() => {
    if (!file) {
      setData([]);
      setSheetName("");
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setData([]);
    setSheetName("");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.SheetNames[0];

        if (!firstSheet) {
          setData([]);
          setError("Nenhuma aba foi encontrada nesta planilha.");
          return;
        }

        const sheet = workbook.Sheets[firstSheet];

        const json = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as any[][];

        const rows = json
          .filter((row) =>
            row.some((cell) => String(cell ?? "").trim() !== "")
          )
          .slice(0, 8);

        setData(rows);
        setSheetName(firstSheet);

        if (!rows.length) {
          setError("Nenhum dado foi encontrado nesta planilha.");
        }
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        setData([]);
        setError("Não foi possível ler esta planilha. Verifique o arquivo.");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError("Erro ao carregar o arquivo selecionado.");
      setData([]);
    };

    reader.readAsArrayBuffer(file);
  }, [file]);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        className="
          flex max-h-[calc(100dvh-32px)] w-[calc(100vw-24px)] max-w-4xl
          flex-col overflow-hidden rounded-2xl border border-white/10
          bg-[#0f0f0f]/95 p-0 text-white shadow-2xl backdrop-blur-xl
        "
      >
        <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-4 py-4 pr-12 md:px-6 md:pr-14">
          <DialogHeader>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white md:text-lg">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>

                <span className="min-w-0 truncate">
                  Pré-visualização da Planilha
                </span>
              </DialogTitle>

              <p className="mt-2 text-xs leading-relaxed text-white/40">
                Confira uma amostra dos dados antes de confirmar o envio.
              </p>
            </div>
          </DialogHeader>

          {file && (
            <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {file.name}
                </p>

                <p className="mt-0.5 text-xs text-white/35">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {sheetName && (
                <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Aba: {sheetName}
                </span>
              )}

              {data.length > 0 && (
                <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/45">
                  Prévia: {data.length} linhas
                  {totalColumns ? ` • ${totalColumns} colunas` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {loading ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02]">
              <Loader className="h-7 w-7 animate-spin text-emerald-400" />

              <p className="mt-3 text-sm font-semibold text-white/70">
                Lendo planilha...
              </p>

              <p className="mt-1 text-xs text-white/35">
                Aguarde enquanto carregamos a pré-visualização.
              </p>
            </div>
          ) : error ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-center">
              <AlertCircle className="h-7 w-7 text-red-400" />

              <p className="mt-3 text-sm font-semibold text-red-300">
                Não foi possível pré-visualizar
              </p>

              <p className="mt-1 max-w-md text-xs leading-relaxed text-white/45">
                {error}
              </p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 text-center">
              <FileSpreadsheet className="h-7 w-7 text-white/35" />

              <p className="mt-3 text-sm font-semibold text-white/65">
                Nenhum dado encontrado
              </p>

              <p className="mt-1 text-xs text-white/35">
                A planilha parece estar vazia ou sem linhas válidas.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
            >
              <div className="max-h-[320px] overflow-auto md:max-h-[360px]">
                <table className="min-w-full border-collapse">
                  <tbody>
                    {data.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-white/10 last:border-b-0 ${
                          i === 0
                            ? "sticky top-0 z-10 bg-emerald-500/15 text-emerald-300"
                            : "bg-[#111111] text-neutral-300 even:bg-white/[0.02]"
                        }`}
                      >
                        {Array.from({ length: totalColumns }).map((_, j) => (
                          <td
                            key={j}
                            className={`
                              max-w-[240px] whitespace-nowrap border-r border-white/10 px-3 py-2
                              text-xs last:border-r-0 md:text-sm
                              ${
                                i === 0
                                  ? "font-bold"
                                  : "font-medium text-white/70"
                              }
                            `}
                            title={String(row[j] ?? "")}
                          >
                            <span className="block truncate">
                              {row[j] ?? ""}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {!loading && data.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-xs leading-relaxed text-white/40">
                Esta é apenas uma prévia das primeiras linhas da primeira aba da
                planilha. Confirme somente se o arquivo selecionado estiver
                correto.
              </p>
            </div>
          )}
        </div>

        <DialogFooter
          className="
            shrink-0 border-t border-white/10 bg-[#121212] px-4 py-4
            pb-[calc(16px+env(safe-area-inset-bottom))]
            md:flex-row md:justify-end md:px-6 md:pb-4
          "
        >
          <div className="flex w-full flex-col-reverse gap-3 md:w-auto md:flex-row md:justify-end">
            <Button
              variant="outline"
              className="
                h-12 w-full cursor-pointer border-white/10 bg-transparent text-white
                transition-all hover:bg-white/[0.08]
                disabled:cursor-not-allowed disabled:opacity-50
                md:h-10 md:w-auto
              "
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>

            {file && (
              <Button
                className="
                  flex h-12 w-full cursor-pointer items-center gap-2 bg-gradient-to-r
                  from-emerald-500 to-emerald-600 text-white transition-all
                  hover:from-emerald-500 hover:to-emerald-500
                  disabled:cursor-not-allowed disabled:opacity-50
                  md:h-10 md:w-auto
                "
                onClick={() => onConfirm(file)}
                disabled={loading || !!error || data.length === 0}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar arquivo
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}