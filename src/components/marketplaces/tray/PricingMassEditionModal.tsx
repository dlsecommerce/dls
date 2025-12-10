"use client";

import React, { useRef, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImportComplete: (data: any[]) => void;
};

export default function PricingMassEditionModal({
  open,
  onOpenChange,
  onImportComplete,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targetCols = [
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
  ];

  // =============================================================
  // 📌 IMPORTAÇÃO DA PLANILHA
  // =============================================================
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setLoading(true);
    setPreviewData([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const range = XLSX.utils.decode_range(worksheet["!ref"]!);
      const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

      const hasMergedHeaders =
        firstRow?.some(
          (v: any) =>
            typeof v === "string" && v.toUpperCase().includes("IDENTIFICAÇÃO")
        ) || false;

      if (hasMergedHeaders) {
        range.s.r = 1;
        worksheet["!ref"] = XLSX.utils.encode_range(range);
      }

      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      const normalized = jsonData.map((row) => {
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim().toLowerCase();
          const match = targetCols.find(
            (c) => c.trim().toLowerCase() === cleanKey
          );
          normalizedRow[match || key] = row[key];
        });
        return normalizedRow;
      });

      setPreviewData(normalized);
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      alert("Erro ao processar a planilha.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // =============================================================
  // 📌 ATUALIZAÇÃO NO SUPABASE (PK/SB) + ARREDONDAMENTO
  // =============================================================
  const handleUpdateConfirm = async () => {
    if (previewData.length === 0) return;

    setUpdating(true);
    setProgress(0);

    const total = previewData.length;
    let processed = 0;

    try {
      for (const row of previewData) {
        const id = row["ID"];
        const loja = row["Loja"]?.toString().toUpperCase();

        if (!id || !loja) continue;

        // 🔥 Seleciona tabela correta
        const tabela =
          loja === "SB" ? "marketplace_tray_sb" : "marketplace_tray_pk";

        // Campos a serem atualizados
        const updateFields: Record<string, any> = {};

        [
          "Desconto",
          "Embalagem",
          "Frete",
          "Comissão",
          "Imposto",
          "Margem de Lucro",
          "Marketing",
          "Preço de Venda",
        ].forEach((col) => {
          let value = row[col];

          if (value !== undefined && value !== "") {
            // 🔥 Valor numérico seguro
            let num = Number(value);

            if (isNaN(num)) num = 0;

            // 🔥 Arredonda apenas Preço de Venda
            if (col === "Preço de Venda") {
              num = Number(num.toFixed(2));
            }

            updateFields[col] = num;
          }
        });

        if (Object.keys(updateFields).length > 0) {
          const { error } = await supabase
            .from(tabela)
            .update(updateFields)
            .eq("ID", id);

          if (error) {
            console.warn(`Erro ao atualizar ID ${id}:`, error.message);
          }
        }

        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      alert("✅ Atualização concluída com sucesso!");
      onImportComplete(previewData);
      onOpenChange(false);
      setConfirmOpen(false);
    } catch (err) {
      console.error("Erro ao atualizar preços:", err);
      alert("Erro ao atualizar no Supabase.");
    } finally {
      setUpdating(false);
    }
  };

  // =============================================================
  // 📌 UI DO MODAL
  // =============================================================
  const columns =
    previewData.length > 0
      ? Object.keys(previewData[0])
      : targetCols.slice(0, 12);

  return (
    <>
      {/* MODAL PRINCIPAL */}
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
              {/* INPUT */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
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
                      {loading ? "Lendo Planilha..." : "Importar Planilha"}
                    </h4>
                    <p className="text-sm text-neutral-400">
                      Selecione um arquivo XLSX contendo os preços.
                    </p>
                  </div>
                </div>
              </div>

              {/* PREVIEW */}
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
                            i % 2 === 0
                              ? "bg-neutral-900/40"
                              : "bg-neutral-800/40"
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
                <p className="text-center text-neutral-400 italic">
                  Nenhum arquivo importado.
                </p>
              )}
            </motion.div>
          </div>

          {/* PROGRESS BAR */}
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

      {/* CONFIRMAÇÃO */}
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
            itens?
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
              {updating ? (
                <Loader className="animate-spin w-5 h-5" />
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
