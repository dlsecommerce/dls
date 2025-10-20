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
import { Download, FileDown, Layers, Plus } from "lucide-react";
import * as XLSX from "xlsx-js-style";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExportModeloAlteracao: () => Promise<void> | void;
  onImportInclusao: (file: File) => void;
  onImportAlteracao: (file: File) => void;
};

// Gera modelo de inclusão (xlsx)
const baixarModeloInclusao = () => {
  const headers = [
    "ID", "Loja", "ID Bling", "ID Tray", "ID Var", "OD",
    "Referência", "Nome", "Marca", "Categoria",
    "Peso", "Altura", "Largura", "Comprimento",
    "Código 1", "Quantidade 1", "Código 2", "Quantidade 2",
    "Código 3", "Quantidade 3", "Código 4", "Quantidade 4",
    "Código 5", "Quantidade 5", "Código 6", "Quantidade 6",
    "Código 7", "Quantidade 7", "Código 8", "Quantidade 8",
    "Código 9", "Quantidade 9", "Código 10", "Quantidade 10",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1A8CEB" } },
    alignment: { horizontal: "center", vertical: "center" },
  } as any;

  headers.forEach((_, idx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (!(ws as any)[cellAddress]) (ws as any)[cellAddress] = {};
    (ws as any)[cellAddress].s = headerStyle;
  });

  (ws as any)["!cols"] = headers.map((h) => {
    const wide = ["Nome", "Categoria", "Marca"].includes(h);
    return { wch: wide ? 22 : 14 };
  });

  const sampleRows = [
    ["1", "PK", "BL-1001", "TR-5001", "V1", "OD01", "PROD-001", "Caixa Ativa 12'' Pro Bass", "Pro Bass", "Áudio", "12.3", "55", "35", "30", "34493", "1"],
    ["2", "SB", "BL-1002", "TR-5002", "V2", "OD02", "PROD-002", "Caixa Ativa 15'' SKP Q15 MK2", "SKP", "Áudio", "16.5", "65", "40", "36", "5595", "1"],
  ];
  XLSX.utils.sheet_add_aoa(ws, sampleRows, { origin: -1 });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inclusão");

  const now = new Date();
  const nomeArquivo = `INCLUSAO-ANUNCIOS-${now
    .toLocaleString("pt-BR")
    .replace(/[/: ]/g, "-")}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
};

export default function MassEditionModal({
  open,
  onOpenChange,
  onExportModeloAlteracao,
  onImportInclusao,
  onImportAlteracao,
}: Props) {
  const inclusaoInputRef = React.useRef<HTMLInputElement>(null);
  const alteracaoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: "inclusao" | "alteracao"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (tipo === "inclusao") onImportInclusao(file);
    else onImportAlteracao(file);
    e.target.value = "";
  };

  const columns = [
    "ID", "Loja", "ID Bling", "ID Tray", "ID Var", "OD",
    "Referência", "Nome", "Marca", "Categoria", "Peso",
    "Altura", "Largura", "Comprimento", "Código 1",
    "Quantidade 1", "Código 2", "Quantidade 2", "Código 3",
    "Quantidade 3", "Código 4", "Quantidade 4", "Código 5",
    "Quantidade 5", "Código 6", "Quantidade 6", "Código 7",
    "Quantidade 7", "Código 8", "Quantidade 8", "Código 9",
    "Quantidade 9", "Código 10", "Quantidade 10",
  ];

  const previewData = [
    {
      ID: "1", Loja: "Pikot Shop", "ID Bling": "1234567891011", "ID Tray": "1234567", "ID Var": "1234",
      OD: "3", "Referência": "Q12 MK2", Nome: "Caixa Ativa 12 Polegadas Q12 MK2 SKP", Marca: "SKP",
      Categoria: "Áudio & Som", Peso: "12300", Altura: "55", Largura: "35", Comprimento: "30",
      "Código 1": "Q12 MK2", "Quantidade 1": "1",
    },
    {
      ID: "2", Loja: "Sóbaquetas", "ID Bling": "1234567891011", "ID Tray": "1234567", "ID Var": "1234",
      OD: "1", "Referência": "PAI - TN 5AM", Nome: "Baqueta Liverpool Tennessee Marfim Ponta de Madeira", Marca: "Liverpool",
      Categoria: "Baquetas", Peso: "300", Altura: "13", Largura: "7", Comprimento: "47",
      "Código 1": "TN 5AM", "Quantidade 1": "1",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-6xl shadow-2xl max-h-[90vh] overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-white" />
            Edição em Massa
          </DialogTitle>
        </DialogHeader>

        {/* CONTAINER COM SCROLL NATIVO */}
        <div className="overflow-y-auto overflow-x-hidden max-h-[75vh] pr-2 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-6"
          >
            {/* === FILE INPUTS === */}
            <input
              ref={inclusaoInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, "inclusao")}
            />
            <input
              ref={alteracaoInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, "alteracao")}
            />

            {/* === CARDS === */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Alteração em Massa */}
              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                onClick={() => alteracaoInputRef.current?.click()}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#2699fe20" }}
                  >
                    <Download className="w-6 h-6" style={{ color: "#2699fe" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Alteração em Massa</h4>
                    <p className="text-sm text-neutral-400">
                      Importe planilha (.xlsx ou .csv) para alterar anúncios
                    </p>
                  </div>
                </div>
              </div>

              {/* Inclusão em Massa */}
              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                onClick={() => inclusaoInputRef.current?.click()}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#10b98120" }}
                  >
                    <Plus className="w-6 h-6" style={{ color: "#10b981" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Inclusão em Massa</h4>
                    <p className="text-sm text-neutral-400">
                      Importe planilha (.xlsx ou .csv) para incluir novos anúncios
                    </p>
                  </div>
                </div>
              </div>

              {/* Modelo */}
              <div
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                onClick={onExportModeloAlteracao}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#f59e0b20" }}
                  >
                    <FileDown className="w-6 h-6" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">Modelo de Alteração</h4>
                    <p className="text-sm text-neutral-400">
                      Baixe o modelo base para edição
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* === INSTRUÇÕES === */}
            <div className="rounded-xl p-4 bg-white/5 border border-neutral-700">
              <p className="text-neutral-300 text-sm leading-relaxed">
                Você pode importar arquivos em formato{" "}
                <strong className="text-white">.xlsx</strong> ou{" "}
                <strong className="text-white">.csv</strong> com as colunas do
                modelo. Após o upload, o sistema mostrará uma pré-visualização
                antes de confirmar a importação.
              </p>
            </div>

            {/* === PREVIEW COM SCROLL NATIVO === */}
            <div className="border border-neutral-700 rounded-xl overflow-auto max-h-[350px] scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
              <table className="w-full text-sm text-neutral-300 border-collapse min-w-[1000px]">
                <thead className="bg-neutral-800/80 text-white sticky top-0">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="p-2 border-b border-neutral-700 text-left font-semibold whitespace-nowrap"
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
                        i % 2 === 0
                          ? "bg-neutral-900/40"
                          : "bg-neutral-800/40"
                      } hover:bg-white/10 transition-colors`}
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="p-2 border-b border-neutral-800 whitespace-nowrap"
                        >
                          {row[col as keyof typeof row] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-neutral-400 italic">
              Mantenha os cabeçalhos exatamente como no modelo (.xlsx ou .csv)
              para evitar erros.
            </p>
          </motion.div>
        </div>

        <DialogFooter className="mt-6 flex justify-end border-t border-neutral-800 pt-4">
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
