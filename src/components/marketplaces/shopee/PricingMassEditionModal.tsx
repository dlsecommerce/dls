"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UploadCloud, Layers, Loader, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImportComplete: (data: any[]) => void;
};

type ImportRow = Record<string, any>;

const BATCH_SIZE = 1000; // ✅ ajuste: 500~2000 costuma ficar ótimo

export default function PricingMassEditionModal({
  open,
  onOpenChange,
  onImportComplete,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const progressTimerRef = useRef<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const targetCols = useMemo(
    () => [
      "ID",
      "Loja",
      "ID Bling",
      "Referência",
      "ID Tray",
      "ID Var",
      "OD",
      "Nome",
      "Marca",
      "Categoria",
      "Desconto",
      "Embalagem",
      "Frete",
      "Comissão",
      "Imposto",
      "Margem de Lucro",
      "Marketing",
      "Custo",
      "Preço de Venda",
    ],
    []
  );

  // =============================================================
  // ✅ parse numérico BR/US + {v,w} do XLSX
  // =============================================================
  const toNumberBR = (v: any) => {
    if (v === null || v === undefined) return null;

    if (typeof v === "object") {
      if (typeof v.v === "number") return v.v;
      if (typeof v.v === "string") v = v.v;
      else if (typeof v.w === "string") v = v.w;
      else return null;
    }

    if (typeof v === "number") return v;

    let s = String(v).replace(/\u00A0/g, " ").trim();
    if (!s) return null;

    s = s
      .replace(/\s+/g, " ")
      .replace(/R\$\s?/gi, "")
      .replace(/%/g, "")
      .trim();

    // 1.234,56 -> 1234.56
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  // =============================================================
  // ✅ Normaliza headers do arquivo para bater com targetCols
  // =============================================================
  const normalizeRowsByHeaders = (rows: ImportRow[]) => {
    return rows.map((row) => {
      const normalizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        const match = targetCols.find((c) => c.trim().toLowerCase() === cleanKey);
        normalizedRow[match || key] = row[key];
      }
      return normalizedRow;
    });
  };

  // =============================================================
  // ✅ Progress "throttle" (não re-render a cada linha)
  // =============================================================
  const startProgressPump = () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      setProgress(progressRef.current);
    }, 200);
  };

  const stopProgressPump = () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    setProgress(progressRef.current);
  };

  // =============================================================
  // ✅ IMPORTAÇÃO TURBO DE CSV (worker + progress real por bytes)
  // =============================================================
  const parseCsvFast = (file: File) => {
    return new Promise<ImportRow[]>((resolve, reject) => {
      const all: ImportRow[] = [];

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: true, // ✅ fora da UI
        dynamicTyping: false,
        chunkSize: 1024 * 1024 * 2, // 2MB
        chunk: (result) => {
          all.push(...(result.data as ImportRow[]));

          const cursor = (result.meta as any)?.cursor as number | undefined;
          if (cursor && file.size) {
            progressRef.current = Math.min(99, Math.round((cursor / file.size) * 100));
          }
        },
        complete: () => resolve(all),
        error: (err) => reject(err),
      });
    });
  };

  // =============================================================
  // 📌 IMPORTAÇÃO DO ARQUIVO
  // =============================================================
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setLoading(true);
    setPreviewData([]);
    setProgress(0);
    progressRef.current = 0;
    startProgressPump();

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      // ✅ CSV ultra rápido
      if (ext === "csv") {
        const rows = await parseCsvFast(file);
        const normalized = normalizeRowsByHeaders(rows);

        progressRef.current = 100;
        toast.success("CSV carregado!", { description: `Encontrados ${normalized.length} itens.` });
        setPreviewData(normalized);
        return;
      }

      // XLSX fallback (mais pesado)
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // ✅ evita 2 parses: detecta header mesclado pelo A1
      const a1 = ws["A1"]?.v;
      const hasMergedHeaders =
        typeof a1 === "string" && a1.toUpperCase().includes("IDENTIFICA");

      if (hasMergedHeaders && ws["!ref"]) {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        range.s.r = Math.max(range.s.r, 1);
        ws["!ref"] = XLSX.utils.encode_range(range);
      }

      const jsonData: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const normalized = normalizeRowsByHeaders(jsonData);

      progressRef.current = 100;
      toast.success("Planilha carregada!", { description: `Encontrados ${normalized.length} itens.` });
      setPreviewData(normalized);
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      toast.error("Erro ao processar a planilha", {
        description: "Verifique o arquivo e tente novamente.",
      });
    } finally {
      stopProgressPump();
      setLoading(false);
      e.target.value = "";
    }
  };

  // =============================================================
  // ✅ Monta payload para RPC (somente colunas relevantes)
  // - percentuais aceitam 10 ou 0.10
  // - money idem
  // - null => não altera no banco (COALESCE no SQL)
  // =============================================================
  const buildRpcRow = (row: ImportRow) => {
    const id = String(row["ID"] ?? "").trim();
    const loja = String(row["Loja"] ?? "").trim().toUpperCase(); // PK/SB
    if (!id || !loja) return null;

    const percentCols = ["Desconto", "Comissão", "Imposto", "Margem de Lucro", "Marketing"];
    const moneyCols = ["Embalagem", "Frete", "Custo", "Preço de Venda"];

    const out: any = {
      id,
      loja,
      desconto: null,
      embalagem: null,
      frete: null,
      comissao: null,
      imposto: null,
      margem_de_lucro: null,
      marketing: null,
      custo: null,
      preco_de_venda: null,
    };

    for (const col of percentCols) {
      const num = toNumberBR(row[col]);
      if (num !== null) {
        const fixed = num > 0 && num <= 1 ? num * 100 : num;
        if (col === "Desconto") out.desconto = fixed;
        if (col === "Comissão") out.comissao = fixed;
        if (col === "Imposto") out.imposto = fixed;
        if (col === "Margem de Lucro") out.margem_de_lucro = fixed;
        if (col === "Marketing") out.marketing = fixed;
      }
    }

    for (const col of moneyCols) {
      const num = toNumberBR(row[col]);
      if (num !== null) {
        const fixedMoney = col === "Preço de Venda" ? Number(num.toFixed(2)) : num;
        if (col === "Embalagem") out.embalagem = fixedMoney;
        if (col === "Frete") out.frete = fixedMoney;
        if (col === "Custo") out.custo = fixedMoney;
        if (col === "Preço de Venda") out.preco_de_venda = fixedMoney;
      }
    }

    // Se não tiver nada pra atualizar além de id/loja, ignora:
    const hasAny =
      out.desconto !== null ||
      out.embalagem !== null ||
      out.frete !== null ||
      out.comissao !== null ||
      out.imposto !== null ||
      out.margem_de_lucro !== null ||
      out.marketing !== null ||
      out.custo !== null ||
      out.preco_de_venda !== null;

    return hasAny ? out : null;
  };

  // =============================================================
  // ✅ Atualiza por RPC em batches (PK e SB separados)
  // RPCs esperadas:
  // - update_pricing_batch_pk(payload jsonb) returns int
  // - update_pricing_batch_sb(payload jsonb) returns int
  // =============================================================
  const updateByRpcBatches = async (rows: ImportRow[]) => {
    const rpcRows = rows.map(buildRpcRow).filter(Boolean) as any[];

    const pk = rpcRows.filter((r) => r.loja === "PK");
    const sb = rpcRows.filter((r) => r.loja === "SB");

    let updatedCount = 0;

    const totalBatches =
      Math.ceil(pk.length / BATCH_SIZE) + Math.ceil(sb.length / BATCH_SIZE);

    let batchesDone = 0;

    const runBatches = async (arr: any[], rpcName: "update_pricing_batch_pk" | "update_pricing_batch_sb") => {
      for (let i = 0; i < arr.length; i += BATCH_SIZE) {
        const batch = arr.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase.rpc(rpcName, {
          payload: batch, // jsonb
        });

        if (error) {
          // Se a RPC não existir / permissão / RLS bloqueou, você vai ver aqui.
          throw error;
        }

        // data é um int (rows updated) se a função retornar int
        if (typeof data === "number") updatedCount += data;

        batchesDone++;
        progressRef.current = Math.min(99, Math.round((batchesDone / totalBatches) * 100));
      }
    };

    await runBatches(pk, "update_pricing_batch_pk");
    await runBatches(sb, "update_pricing_batch_sb");

    progressRef.current = 100;
    return { updatedCount, totalToUpdate: rpcRows.length };
  };

  // =============================================================
  // ✅ CONFIRMAR UPDATE (RPC)
  // =============================================================
  const handleUpdateConfirm = async () => {
    if (previewData.length === 0) return;

    setUpdating(true);
    setProgress(0);
    progressRef.current = 0;
    startProgressPump();

    try {
      const { updatedCount, totalToUpdate } = await updateByRpcBatches(previewData);

      if (updatedCount > 0) {
        toast.success("Atualização concluída!", {
          description: `${updatedCount} item(ns) atualizado(s).`,
        });
      } else {
        toast.warning("Nenhum item foi atualizado", {
          description:
            totalToUpdate > 0
              ? "Possível bloqueio de RLS ou IDs/Lojas não bateram."
              : "Nenhuma linha tinha campos válidos para atualizar.",
        });
      }

      onImportComplete(previewData);
      onOpenChange(false);
      setConfirmOpen(false);
    } catch (err: any) {
      console.error("Erro ao atualizar via RPC:", err);

      toast.error("Erro ao atualizar no Supabase (RPC)", {
        description:
          err?.message ||
          "Verifique se as RPCs existem e se você deu EXECUTE para authenticated.",
      });
    } finally {
      stopProgressPump();
      setUpdating(false);
    }
  };

  const columns =
    previewData.length > 0 ? Object.keys(previewData[0]) : targetCols.slice(0, 12);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-5xl shadow-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-white" />
              Importação de Preços
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pb-6"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileImport}
              />

              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#2699fe20" }}
                  >
                    {loading ? (
                      <Loader className="w-6 h-6 animate-spin text-[#2699fe]" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-[#2699fe]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">
                      {loading ? `Lendo arquivo... (${progress}%)` : "Importar Planilha"}
                    </h4>
                    <p className="text-sm text-neutral-400">
                      Para 50k+ linhas, use CSV (mais rápido). XLSX funciona, mas é mais pesado.
                    </p>
                  </div>
                </div>

                {loading && (
                  <div className="w-full h-2 bg-neutral-800 rounded-full mt-4">
                    <div
                      className="h-2 bg-green-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader className="w-6 h-6 animate-spin text-neutral-400" />
                </div>
              ) : previewData.length > 0 ? (
                <div className="border border-neutral-700 rounded-xl overflow-auto max-h-[350px]">
                  <table className="w-full text-sm text-neutral-300 min-w-[900px]">
                    <thead className="bg-neutral-800/80 text-white sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="p-2 border-b border-neutral-700 text-left font-semibold"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 50).map((row, i) => (
                        <tr
                          key={i}
                          className={`${
                            i % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-800/40"
                          } hover:bg-white/10`}
                        >
                          {columns.map((col) => (
                            <td key={col} className="p-2 border-b border-neutral-800">
                              {row[col] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-neutral-400 italic">Nenhum arquivo importado.</p>
              )}
            </motion.div>
          </div>

          {updating && (
            <div className="w-full h-2 bg-neutral-800 rounded-full mt-2">
              <div
                className="h-2 bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <DialogFooter className="mt-6 flex justify-end border-t border-neutral-800 pt-4">
            <Button
              variant="outline"
              className="border-neutral-700 text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Fechar
            </Button>

            <Button
              className="bg-green-600 hover:scale-105 text-white rounded-xl flex items-center gap-2"
              disabled={previewData.length === 0 || updating}
              onClick={() => setConfirmOpen(true)}
            >
              {updating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Atualizando {progress}%
                </>
              ) : (
                "Atualizar Preços"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#0f0f0f]/95 border border-neutral-700 rounded-2xl text-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Confirmar Atualização
            </DialogTitle>
          </DialogHeader>

          <p className="mt-3 text-neutral-300">
            Deseja realmente atualizar
            <span className="text-white font-semibold"> {previewData.length} </span>
            itens? (será feito em lote via RPC)
          </p>

          <DialogFooter className="mt-5 flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-neutral-700 text-white"
              onClick={() => setConfirmOpen(false)}
              disabled={updating}
            >
              Cancelar
            </Button>

            <Button
              className="bg-green-600 hover:scale-105 text-white"
              onClick={handleUpdateConfirm}
              disabled={updating}
            >
              {updating ? <Loader className="animate-spin w-5 h-5" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
