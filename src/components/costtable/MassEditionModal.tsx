"use client";
import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileDown, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx-js-style";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExportModeloAlteracao: () => Promise<void> | void;
  onImportInclusao: (file: File) => void;
  onImportAlteracao: (file: File) => void;
};

export default function MassEditionModal({
  open,
  onOpenChange,
  onExportModeloAlteracao,
  onImportInclusao,
  onImportAlteracao,
}: Props) {
  const inputInclusaoRef = useRef<HTMLInputElement | null>(null);
  const inputAlteracaoRef = useRef<HTMLInputElement | null>(null);

  /* === MODELO DE INCLUSÃO === */
  const baixarModeloInclusao = () => {
    const headers = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    const style = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1A8CEB" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    headers.forEach((_, idx) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: idx });
      ws[cell] = ws[cell] || {};
      ws[cell].s = style;
    });

    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.sheet_add_aoa(ws, [
      ["12345", "Liverpool", "250.00", "240.00", "851821"],
    ], { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inclusão");

    const now = new Date();
    const nomeArquivo = `INCLUSÃO - ${now.toLocaleDateString()} ${now
      .toLocaleTimeString()
      .replace(/:/g, "-")}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  };

  /* === INPUTS HANDLE === */
  const handleImportInclusaoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportInclusao(file);
    e.target.value = "";
  };

  const handleImportAlteracaoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportAlteracao(file);
    e.target.value = "";
  };

  /* === PREVIEW EXEMPLO === */
  const previewData = [
    {
      Código: "12345",
      Marca: "Liverpool",
      "Custo Atual": "250.00",
      "Custo Antigo": "240.00",
      NCM: "851821",
    },
    {
      Código: "67890",
      Marca: "SKP",
      "Custo Atual": "310.00",
      "Custo Antigo": "299.00",
      NCM: "852729",
    },
  ];

  const columns = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}  // 🔥 Impede click bubbling
        className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl shadow-2xl text-white max-w-2xl p-6"
      >
        
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            Edição em Massa
          </DialogTitle>
        </DialogHeader>

        {/* Inputs ocultos */}
        <input
          type="file"
          ref={inputInclusaoRef}
          className="hidden"
          accept=".xlsx,.csv"
          onChange={handleImportInclusaoFile}
        />
        <input
          type="file"
          ref={inputAlteracaoRef}
          className="hidden"
          accept=".xlsx,.csv"
          onChange={handleImportAlteracaoFile}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* === CARD INCLUSÃO === */}
            <div>
              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();   // 🔥 impede disparo acidental
                  baixarModeloInclusao();
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#10b98120" }}
                  >
                    <FileDown className="w-6 h-6" style={{ color: "#10b981" }} />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Modelo de Inclusão</h4>
                    <p className="text-sm text-neutral-400">
                      Baixe o modelo base para novos custos
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão IMPORTAR FORA DO CARD */}
              <Button
                className="mt-3 w-full bg-green-600 hover:bg-green-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // 🔥 evitar abrir input indevidamente
                  inputInclusaoRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Importar Inclusão
              </Button>
            </div>

            {/* === CARD ALTERAÇÃO === */}
            <div>
              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportModeloAlteracao();
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#f59e0b20" }}
                  >
                    <FileSpreadsheet className="w-6 h-6" style={{ color: "#f59e0b" }} />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Modelo de Alteração</h4>
                    <p className="text-sm text-neutral-400">
                      Baixe o modelo para atualizar custos existentes
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  inputAlteracaoRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Importar Alteração
              </Button>
            </div>

          </div>

          {/* PREVIEW TABELA */}
          <div className="border border-neutral-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-neutral-300 border-collapse">
              <thead className="bg-neutral-800 text-white">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-2 border-b border-neutral-700 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-800/40"
                    } hover:bg-white/10 transition`}
                  >
                    {columns.map((col) => (
                      <td key={col} className="p-2 border-b border-neutral-800">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </motion.div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            className="border-neutral-700 text-white"
            onClick={(e) => {
              e.stopPropagation(); 
              onOpenChange(false);
            }}
          >
            Fechar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
