"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader } from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: File | null;
  onConfirm: (file: File) => void;
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

  useEffect(() => {
    if (file) {
      setLoading(true);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result;
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          setData(json.filter((r: any[]) => r.length > 0).slice(0, 6));
          setSheetName(firstSheet);
        } catch (err) {
          console.error("Erro ao ler planilha:", err);
          setData([]);
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    }
  }, [file]);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Pré-visualização da Planilha
          </DialogTitle>
        </DialogHeader>

        {file && (
          <div className="text-sm text-neutral-400 mb-3">
            <span className="font-medium text-white">{file.name}</span> —{" "}
            {(file.size / 1024).toFixed(1)} KB
            {sheetName && (
              <span className="ml-2 text-emerald-400">({sheetName})</span>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="animate-spin w-6 h-6 text-neutral-400" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-neutral-400 py-6">
            Nenhum dado encontrado nesta planilha.
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto max-h-[400px] rounded-lg border border-neutral-700"
          >
            <table className="min-w-full border-collapse">
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      i === 0
                        ? "bg-emerald-500/10 text-emerald-300 font-semibold"
                        : "text-neutral-300"
                    } border-b border-neutral-700`}
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-sm whitespace-nowrap">
                        {cell ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          {file && (
            <Button
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 text-white flex items-center gap-2 cursor-pointer"
              onClick={() => onConfirm(file)}
              disabled={loading}
            >
              Confirmar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
