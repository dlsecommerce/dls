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

const BATCH_SIZE = 1000;

// 🔊 Toquezinho de confirmação (sem mp3)
const playDing = (freq = 880, durationMs = 90, volume = 0.04) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);

    osc.onended = () => ctx.close();
  } catch {
    // falhou? ignora, não quebra a UI
  }
};

// ✅ Toasts custom (verde/vermelho/laranja + warning top-center)
const toastCustom = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      className: "bg-green-600 border border-green-500 text-white shadow-lg",
      duration: 3500,
    }),

  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      className: "bg-red-600 border border-red-500 text-white shadow-lg",
      duration: 4500,
    }),

  warning: (title: string, description?: string) =>
    toast.warning(title, {
      description,
      className: "bg-orange-500 border border-orange-400 text-white shadow-lg",
      duration: 4000,
      position: "top-center",
    }),

  message: (title: string, description?: string) =>
    toast.message(title, {
      description,
      className: "bg-neutral-900 border border-neutral-700 text-white shadow-lg",
      duration: 3500,
    }),
};

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
  // ✅ Normalização de texto (headers/loja)
  // =============================================================
  const normalizeText = (v: any) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ");

  const normalizeHeader = (h: any) =>
    normalizeText(h).replace(/[^a-z0-9]+/g, " ").trim();

  const headerKeyMap = useMemo(() => {
    const map: Record<string, string> = {
      id: "ID",
      "id produto": "ID",
      loja: "Loja",
      "id bling": "ID Bling",
      bling: "ID Bling",
      referencia: "Referência",
      "id tray": "ID Tray",
      tray: "ID Tray",
      "id var": "ID Var",
      od: "OD",
      nome: "Nome",
      marca: "Marca",
      categoria: "Categoria",
      desconto: "Desconto",
      embalagem: "Embalagem",
      frete: "Frete",
      comissao: "Comissão",
      imposto: "Imposto",
      "margem de lucro": "Margem de Lucro",
      marketing: "Marketing",
      custo: "Custo",
      "preco de venda": "Preço de Venda",
      "preco venda": "Preço de Venda",
      preco: "Preço de Venda",
    };

    for (const c of targetCols) map[normalizeHeader(c)] = c;
    return map;
  }, [targetCols]);

  const normalizeRowsByHeaders = (rows: ImportRow[]) => {
    return rows.map((row) => {
      const normalizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const nk = normalizeHeader(key);
        const match = headerKeyMap[nk] ?? null;
        normalizedRow[match || key] = row[key];
      }
      return normalizedRow;
    });
  };

  // =============================================================
  // ✅ parse numérico BR/US + {v,w}
  // =============================================================
  const toNumberBR = (v: any) => {
    if (v === null || v === undefined) return null;

    if (typeof v === "object") {
      if (typeof (v as any).v === "number") return (v as any).v;
      if (typeof (v as any).v === "string") v = (v as any).v;
      else if (typeof (v as any).w === "string") v = (v as any).w;
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

    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  // =============================================================
  // ✅ Loja -> PK/SB
  // =============================================================
  const mapLoja = (v: any) => {
    const raw = String(v ?? "").trim();
    if (!raw) return "";

    const norm = raw
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (norm === "PK" || norm.includes("PIKOT")) return "PK";
    if (norm === "SB" || norm.includes("SOBAQUETAS") || norm.includes("SO BAQUETAS"))
      return "SB";

    const short = norm.replace(/\s+/g, "");
    if (short === "PK") return "PK";
    if (short === "SB") return "SB";

    return norm;
  };

  // =============================================================
  // ✅ Progress throttle
  // =============================================================
  const startProgressPump = () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => setProgress(progressRef.current), 200);
  };

  const stopProgressPump = () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    setProgress(progressRef.current);
  };

  // =============================================================
  // ✅ CSV parse
  // =============================================================
  const parseCsvFast = (file: File) => {
    return new Promise<ImportRow[]>((resolve, reject) => {
      const all: ImportRow[] = [];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: true,
        dynamicTyping: false,
        chunkSize: 1024 * 1024 * 2,
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
  // ✅ XLSX parse
  // =============================================================
  const parseXlsx = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    const a1 = ws["A1"]?.v;
    const hasMergedHeaders =
      typeof a1 === "string" && String(a1).toUpperCase().includes("IDENTIFICA");

    if (hasMergedHeaders && ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      range.s.r = Math.max(range.s.r, 1);
      ws["!ref"] = XLSX.utils.encode_range(range);
    }

    const jsonData: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return jsonData;
  };

  // =============================================================
  // 📌 IMPORTAÇÃO DO ARQUIVO (CSV/XLSX)
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

      if (ext === "csv") {
        const rows = await parseCsvFast(file);
        const normalized = normalizeRowsByHeaders(rows);
        progressRef.current = 100;
        setPreviewData(normalized);

        toastCustom.success("CSV carregado!", `Encontrados ${normalized.length} itens.`);
        playDing(); // 🔔 som de importação OK
        return;
      }

      if (ext === "xlsx" || ext === "xls") {
        const rows = await parseXlsx(file);
        const normalized = normalizeRowsByHeaders(rows);
        progressRef.current = 100;
        setPreviewData(normalized);

        toastCustom.success("Planilha carregada!", `Encontrados ${normalized.length} itens.`);
        playDing(); // 🔔 som de importação OK
        return;
      }

      toastCustom.warning("Formato não suportado", "Use CSV, XLSX ou XLS.");
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      toastCustom.error("Erro ao processar a planilha", "Verifique o arquivo e tente novamente.");
    } finally {
      stopProgressPump();
      setLoading(false);
      e.target.value = "";
    }
  };

  // =============================================================
  // ✅ payload para RPC (chave por "ID" do arquivo)
  // =============================================================
  const buildRpcRow = (row: ImportRow) => {
    const id = String(row["ID"] ?? "").trim(); // vai virar ::bigint na RPC
    const loja = mapLoja(row["Loja"]);
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
  // ✅ Atualiza por RPC em batches (PK e SB)
  // =============================================================
  const updateByRpcBatches = async (rows: ImportRow[]) => {
    const rpcRows = rows.map(buildRpcRow).filter(Boolean) as any[];

    const pk = rpcRows.filter((r) => r.loja === "PK");
    const sb = rpcRows.filter((r) => r.loja === "SB");

    toastCustom.warning("Pré-validação", `Válidas: ${rpcRows.length} | PK: ${pk.length} | SB: ${sb.length}`);

    if (rpcRows.length === 0) {
      progressRef.current = 100;
      return { updatedCount: 0, totalToUpdate: 0, pkCount: 0, sbCount: 0 };
    }

    let updatedCount = 0;

    const totalBatches = Math.ceil(pk.length / BATCH_SIZE) + Math.ceil(sb.length / BATCH_SIZE);
    let batchesDone = 0;

    const runBatches = async (
      arr: any[],
      rpcName: "update_tray_pricing_batch_pk" | "update_tray_pricing_batch_sb"
    ) => {
      for (let i = 0; i < arr.length; i += BATCH_SIZE) {
        const batch = arr.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase.rpc(rpcName, { payload: batch });

        if (error) throw error;
        if (typeof data === "number") updatedCount += data;

        batchesDone++;
        progressRef.current = Math.min(
          99,
          Math.round((batchesDone / Math.max(1, totalBatches)) * 100)
        );
      }
    };

    await runBatches(pk, "update_tray_pricing_batch_pk");
    await runBatches(sb, "update_tray_pricing_batch_sb");

    progressRef.current = 100;
    return { updatedCount, totalToUpdate: rpcRows.length, pkCount: pk.length, sbCount: sb.length };
  };

  // =============================================================
  // ✅ CONFIRMAR UPDATE (RPC)
  // =============================================================
  const handleUpdateConfirm = async () => {
    if (previewData.length === 0) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      toastCustom.error("Você não está logado", "Faça login e tente novamente.");
      return;
    }

    setUpdating(true);
    setProgress(0);
    progressRef.current = 0;
    startProgressPump();

    try {
      const { updatedCount, totalToUpdate, pkCount, sbCount } = await updateByRpcBatches(previewData);

      if (totalToUpdate === 0) {
        toastCustom.warning("Nenhuma linha válida para atualizar", 'Confira se o arquivo tem "ID", "Loja" e valores numéricos.');
        return;
      }

      if (pkCount === 0 && sbCount === 0) {
        toastCustom.error("Coluna Loja inválida", 'A coluna "Loja" precisa virar PK ou SB (ex.: Pikot => PK, Sobaquetas => SB).');
        return;
      }

      if (updatedCount > 0) {
        toastCustom.success("Atualizado com sucesso", `${updatedCount} item(ns) foram atualizados.`);
        playDing(1046, 120); // 🔔 som de atualização OK (mais "vitorioso")
      } else {
        toastCustom.warning("Nenhum item foi atualizado", "IDs/Loja não bateram OU RLS bloqueou OU RPC não atualizou.");
      }

      onImportComplete(previewData);
      onOpenChange(false);
      setConfirmOpen(false);
    } catch (err: any) {
      console.error("Erro ao atualizar via RPC:", err);
      toastCustom.error("Erro ao atualizar preços", err?.message || "Falha na comunicação com o servidor.");
    } finally {
      stopProgressPump();
      setUpdating(false);
    }
  };

  const columns = previewData.length > 0 ? Object.keys(previewData[0]) : targetCols.slice(0, 12);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-5xl shadow-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-white" />
              Importação de Preços (Tray)
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
                    <div className="h-2 bg-green-500 transition-all" style={{ width: `${progress}%` }} />
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
                          className={`${i % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-800/40"} hover:bg-white/10`}
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
              <div className="h-2 bg-green-500 transition-all" style={{ width: `${progress}%` }} />
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
            itens? (lote via RPC)
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
