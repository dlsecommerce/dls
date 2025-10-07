"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileDown, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx-js-style";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExportModeloAlteracao: () => Promise<void> | void;
};

export default function MassEditionModal({
  open,
  onOpenChange,
  onExportModeloAlteracao,
}: Props) {
  const baixarModeloInclusao = () => {
    const headers = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inclusao");

    // 🕒 Gera data e hora formatadas
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const seg = String(now.getSeconds()).padStart(2, "0");

    const nomeArquivo = `INCLUSÃO - ${dia}-${mes}-${ano} ${hora}-${min}-${seg}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
  };

  const previewData = [
    { Código: "12345", Marca: "Liverpool", "Custo Atual": "250.00", "Custo Antigo": "240.00", NCM: "851821" },
    { Código: "67890", Marca: "SKP", "Custo Atual": "310.00", "Custo Antigo": "299.00", NCM: "852729" },
    { Código: "11223", Marca: "IZZO", "Custo Atual": "199.00", "Custo Antigo": "189.00", NCM: "853690" },
    { Código: "44556", Marca: "Fischer", "Custo Atual": "430.00", "Custo Antigo": "415.00", NCM: "854370" },
    { Código: "77889", Marca: "Trapp", "Custo Atual": "285.00", "Custo Antigo": "270.00", NCM: "851890" },
  ];

  const columns = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl 
                   shadow-2xl text-white max-w-2xl p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-white" />
            Edição em Massa
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Instruções */}
          <div className="rounded-xl p-4 bg-white/5 border border-neutral-700">
            <p className="text-neutral-300 text-sm leading-relaxed">
              Baixe um modelo, preencha os dados e depois use{" "}
              <strong className="text-white">Importar</strong> na tela principal
              para atualizar ou incluir custos.
            </p>
          </div>

          {/* Botões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Roxo - Inclusão */}
            <Button
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white 
                         rounded-xl shadow-md hover:scale-[1.03] hover:shadow-lg 
                         transition-all flex items-center justify-center gap-2 border border-neutral-700"
              onClick={baixarModeloInclusao}
            >
              <FileDown className="w-4 h-4 text-white" />
              Baixar Modelo de Inclusão
            </Button>

            {/* Laranja - Alteração */}
            <Button
              className="w-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white 
                         rounded-xl shadow-md hover:scale-[1.03] hover:shadow-lg 
                         transition-all flex items-center justify-center gap-2 border border-neutral-700"
              onClick={onExportModeloAlteracao}
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              Baixar Modelo de Alteração
            </Button>
          </div>

          {/* Preview da planilha */}
          <div className="border border-neutral-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-neutral-300 border-collapse">
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
                {previewData.map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-800/40"
                    } hover:bg-white/10 transition-colors`}
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

          <p className="text-sm text-neutral-400 italic">
          Mantenha os cabeçalhos exatamente como no modelo para evitar erros na importação.
          </p>
        </motion.div>

        <DialogFooter className="mt-6 flex justify-end">
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:bg-white/10 transition-all rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
