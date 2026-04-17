"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, HelpCircle, Download, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { Item } from "@/components/decomposition/CompositionCosts";
import { ResultadoView } from "@/components/decomposition/Results";

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group flex items-center">
    <HelpCircle className="w-4 h-4 text-neutral-400 cursor-pointer" />
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400/70 text-xs whitespace-nowrap font-normal opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
      {text}
    </div>
  </div>
);

type Props = {
  precoVenda: string;
  setPrecoVenda: (v: string) => void;
  onBlurPrecoVenda: () => void;
  composicao: Item[];
  setComposicao: (v: Item[]) => void;
  resultados: ResultadoView[];
  setResultados: (v: ResultadoView[]) => void;
};

export default function PrecoVenda({
  precoVenda,
  setPrecoVenda,
  onBlurPrecoVenda,
  composicao,
  setComposicao,
  resultados,
  setResultados,
}: Props) {
  const [isClearing, setIsClearing] = useState(false);
  const [clicks, setClicks] = useState(0);

  /* === DOWNLOAD XLSX COM ESTILO === */
  const handleDownload = () => {
    const now = new Date();
    const dataFormatada = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const horaFormatada = `${now
      .getHours()
      .toString()
      .padStart(2, "0")}h${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}m`;
    const fileName = `DECOMPOSIÇÃO_${dataFormatada}_${horaFormatada}.xlsx`;

    const composicaoRows: (string | number)[][] = [
      ["Preço de Venda (R$)", precoVenda || "0,00"],
      [],
      ["Código", "Quantidade", "Custo (R$)"],
      ...composicao.map((i) => [
        i.codigo || "",
        i.quantidade || "",
        i.custo || "",
      ]),
    ];

    const composicaoSheet = XLSX.utils.aoa_to_sheet(composicaoRows);

    const resultadosRows: (string | number)[][] = [
      ["Resultados Calculados"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Código", "Unitário (R$)", "Total (R$)"],
      ...resultados.map((r) => [r.codigo, r.unitFmt, r.totalFmt]),
    ];

    const resultadosSheet = XLSX.utils.aoa_to_sheet(resultadosRows);

    const headerStyle = {
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: { rgb: "1A8CEB" },
      },
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 11,
      },
      border: {
        top: { style: "thin", color: { rgb: "FFFFFF" } },
        bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const applyHeaderStyle = (sheet: any, headerRow: number) => {
      const headers = ["A", "B", "C"];
      headers.forEach((col) => {
        const cellRef = `${col}${headerRow}`;
        if (sheet[cellRef]) sheet[cellRef].s = headerStyle;
      });
    };

    applyHeaderStyle(composicaoSheet, 3);
    applyHeaderStyle(resultadosSheet, 4);

    composicaoSheet["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 15 }];
    resultadosSheet["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, composicaoSheet, "Composição");
    XLSX.utils.book_append_sheet(wb, resultadosSheet, "Resultados");

    const wbout = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const handleClearAll = () => {
    setClicks((prev) => {
      const newCount = prev + 1;

      if (newCount < 5) {
        setIsClearing(true);
        setPrecoVenda("");
        setComposicao([]);
        setResultados([]);
        setTimeout(() => setIsClearing(false), 300);
      } else {
        setIsClearing(true);
        console.warn("Botão de limpar bloqueado após 5 cliques.");
      }

      return newCount;
    });
  };

  useEffect(() => {
    if (clicks === 0) return;
    const timer = setTimeout(() => setClicks(0), 5000);
    return () => clearTimeout(timer);
  }, [clicks]);

  /* === JSX === */
  return (
    <div className="mb-3 relative">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#1a8ceb]" />
          <h3 className="text-white text-sm font-semibold flex items-center gap-2">
            Preço de Venda
            <HelpTooltip text="Preço de Venda Total." />
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            title="Baixar planilha Excel"
            className="p-2 hover:bg-white/10 rounded-full transition-all"
          >
            <Download className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9, rotate: -15 }}
            onClick={handleClearAll}
            disabled={isClearing && clicks >= 5}
            title={
              clicks >= 5
                ? "Botão bloqueado temporariamente após muitos cliques"
                : "Limpar todos os dados"
            }
            className={`p-2 rounded-full transition-all ${
              isClearing
                ? "bg-red-500/20 text-red-300 cursor-not-allowed"
                : "hover:bg-red-500/10 text-red-400 hover:text-red-500"
            }`}
          >
            <Trash2
              className={`w-4 h-4 transition-transform ${
                isClearing ? "animate-pulse" : ""
              }`}
            />
          </motion.button>
        </div>
      </div>

      <Input
        value={precoVenda}
        placeholder="0,00"
        onChange={(e) => setPrecoVenda(e.target.value)}
        onBlur={onBlurPrecoVenda}
        className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
      />
      <Label className="text-neutral-400 text-[10px] mt-1 block">
        Digite o preço final da venda
      </Label>
    </div>
  );
}
