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
};

// gera um XLSX de inclusão com as COLUNAS de anúncios
const baixarModeloInclusao = () => {
  const headers = [
    "ID (Supabase)",
    "ID Geral",
    "ID Bling",
    "Referência",
    "ID Tray",
    "ID Var",
    "OD",
    "Nome",
    "Marca",
    "Status",
    "Categoria",
    "Marketplace",
    "Peso",
    "Altura",
    "Largura",
    "Comprimento",
    "Código 1", "Quant. 1",
    "Código 2", "Quant. 2",
    "Código 3", "Quant. 3",
    "Código 4", "Quant. 4",
    "Código 5", "Quant. 5",
    "Código 6", "Quant. 6",
    "Código 7", "Quant. 7",
    "Código 8", "Quant. 8",
    "Código 9", "Quant. 9",
    "Código 10", "Quant. 10",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers]);

  // estilo do cabeçalho
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
    const wide = [
      "Nome",
      "Categoria",
      "Marketplace",
    ].includes(h);
    return { wch: wide ? 24 : 14 };
  });

  const sampleRows = [
    ["", "GER-001", "BL-1001", "PROD-001", "TR-5001", "V1", "OD01", "Caixa Ativa 12'' Pro Bass", "Pro Bass", "Ativo", "Áudio", "Tray", "12.3", "55", "35", "30", "34493", "1", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["", "GER-002", "BL-1002", "PROD-002", "TR-5002", "V1", "OD02", "Caixa Ativa 15'' SKP Q15 MK2", "SKP", "Inativo", "Áudio", "Mercado Livre", "16.5", "65", "40", "36", "5595", "1", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ];
  XLSX.utils.sheet_add_aoa(ws, sampleRows, { origin: -1 });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inclusão");

  const now = new Date();
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const ano = now.getFullYear();
  const hora = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const seg = String(now.getSeconds()).padStart(2, "0");

  const nomeArquivo = `INCLUSAO-ANUNCIOS-${dia}-${mes}-${ano}-${hora}-${min}-${seg}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
};

export default function MassEditionModal({
  open,
  onOpenChange,
  onExportModeloAlteracao,
}: Props) {
  // preview fake (visual)
  const columns = [
    "ID (Supabase)",
    "ID Geral",
    "ID Bling",
    "Referência",
    "ID Tray",
    "ID Var",
    "OD",
    "Nome",
    "Marca",
    "Status",
    "Categoria",
    "Marketplace",
    "Peso",
    "Altura",
    "Largura",
    "Comprimento",
    "Código 1", "Quant. 1",
    "Código 2", "Quant. 2",
    "Código 3", "Quant. 3",
    "Código 4", "Quant. 4",
    "Código 5", "Quant. 5",
    "Código 6", "Quant. 6",
    "Código 7", "Quant. 7",
    "Código 8", "Quant. 8",
    "Código 9", "Quant. 9",
    "Código 10", "Quant. 10",
  ];

  const previewData = [
    {
      "ID (Supabase)": "",
      "ID Geral": "GER-001",
      "ID Bling": "BL-1001",
      "Referência": "PROD-001",
      "ID Tray": "TR-5001",
      "ID Var": "V1",
      "OD": "OD01",
      "Nome": "Caixa Ativa 12'' Pro Bass",
      "Marca": "Pro Bass",
      "Status": "Ativo",
      "Categoria": "Áudio",
      "Marketplace": "Tray",
      "Peso": "12.3",
      "Altura": "55",
      "Largura": "35",
      "Comprimento": "30",
      "Código 1": "34493", "Quant. 1": "1",
      "Código 2": "", "Quant. 2": "",
      "Código 3": "", "Quant. 3": "",
      "Código 4": "", "Quant. 4": "",
      "Código 5": "", "Quant. 5": "",
      "Código 6": "", "Quant. 6": "",
      "Código 7": "", "Quant. 7": "",
      "Código 8": "", "Quant. 8": "",
      "Código 9": "", "Quant. 9": "",
      "Código 10": "", "Quant. 10": "",
    },
    {
      "ID (Supabase)": "",
      "ID Geral": "GER-002",
      "ID Bling": "BL-1002",
      "Referência": "PROD-002",
      "ID Tray": "TR-5002",
      "ID Var": "V1",
      "OD": "OD02",
      "Nome": "Caixa Ativa 15'' SKP Q15 MK2",
      "Marca": "SKP",
      "Status": "Inativo",
      "Categoria": "Áudio",
      "Marketplace": "Mercado Livre",
      "Peso": "16.5",
      "Altura": "65",
      "Largura": "40",
      "Comprimento": "36",
      "Código 1": "5595", "Quant. 1": "1",
      "Código 2": "", "Quant. 2": "",
      "Código 3": "", "Quant. 3": "",
      "Código 4": "", "Quant. 4": "",
      "Código 5": "", "Quant. 5": "",
      "Código 6": "", "Quant. 6": "",
      "Código 7": "", "Quant. 7": "",
      "Código 8": "", "Quant. 8": "",
      "Código 9": "", "Quant. 9": "",
      "Código 10": "", "Quant. 10": "",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-white" />
            Edição em Massa — Anúncios
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* ==== PARTE DE CIMA (3 CARDS) - manter igual imagem enviada ==== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#2699fe20" }}>
                  <Download className="w-6 h-6" style={{ color: "#2699fe" }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">Alteração em Massa</h4>
                  <p className="text-sm text-gray-400">Edite anúncios existentes via planilha</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer" onClick={baixarModeloInclusao}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#10b98120" }}>
                  <Plus className="w-6 h-6" style={{ color: "#10b981" }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">Inclusão em Massa</h4>
                  <p className="text-sm text-gray-400">Adicione novos anúncios com o modelo</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer" onClick={onExportModeloAlteracao}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f59e0b20" }}>
                  <FileDown className="w-6 h-6" style={{ color: "#f59e0b" }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">Modelo de Alteração</h4>
                  <p className="text-sm text-gray-400">Baixe o modelo baseado no filtro atual</p>
                </div>
              </div>
            </div>
          </div>

          {/* ==== PARTE DE BAIXO (REVIEW + INSTRUÇÕES + PREVIEW TABELA) ==== */}
          <div className="rounded-xl p-4 bg-white/5 border border-neutral-700">
            <p className="text-neutral-300 text-sm leading-relaxed">
              Baixe um modelo, preencha os dados e depois use{" "}
              <strong className="text-white">Importar</strong> na tela principal
              para atualizar ou incluir anúncios.
            </p>
          </div>

          <div className="border border-neutral-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-neutral-300 border-collapse">
              <thead className="bg-neutral-800/80 text-white sticky top-0">
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
                    className={`${i % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-800/40"} hover:bg-white/10 transition-colors`}
                  >
                    {columns.map((col) => (
                      <td key={col} className="p-2 border-b border-neutral-800 whitespace-nowrap">
                        {row[col] ?? ""}
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
