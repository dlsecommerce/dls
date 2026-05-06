"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Trash2, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { createNotification } from "@/lib/createNotification";
import { Item } from "@/components/decomposition/CompositionCosts";
import { ResultadoView } from "@/components/decomposition/Results";

type Props = {
  precoVenda: string;
  setPrecoVenda: (v: string) => void;
  onBlurPrecoVenda: () => void;
  composicao: Item[];
  setComposicao: (v: Item[]) => void;
  resultados: ResultadoView[];
  setResultados: (v: ResultadoView[]) => void;
};

const parseBRNumber = (value: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value || "").trim();

  if (!raw) return 0;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const onlyNumber = normalized.replace(/[^\d.-]/g, "");
  const parsed = Number(onlyNumber);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBR = (value: number) => {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  const precosRapidos = [9.99, 19.99, 29.99, 99.99];

  const aplicarPrecoRapido = (valor: number) => {
    setPrecoVenda(formatBR(valor));
  };

  const ajustarPreco = (delta: number) => {
    const atual = parseBRNumber(precoVenda);
    const novoValor = Math.max(0, atual + delta);

    setPrecoVenda(formatBR(novoValor));
  };

  const handlePrecoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onBlurPrecoVenda();
    }
  };

  const getDescricaoItem = (item?: Item) => {
    if (!item) return "";

    return item.produto || item.descricao || "";
  };

  /* === DOWNLOAD XLSX COM ESTILO === */
  const handleDownload = async () => {
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
      ["Código", "Descrição", "Quantidade", "Custo (R$)"],
      ...composicao.map((i) => [
        i.codigo || "",
        getDescricaoItem(i),
        i.quantidade || "",
        i.custo || "",
      ]),
    ];

    const composicaoSheet = XLSX.utils.aoa_to_sheet(composicaoRows);

    const resultadosRows: (string | number)[][] = [
      ["Resultados Calculados"],
      ["Gerado em", now.toLocaleString("pt-BR")],
      [],
      ["Código", "Descrição", "Unitário (R$)", "Total (R$)"],
      ...resultados.map((r) => {
        const item = composicao.find((i) => i.codigo === r.codigo);

        return [
          r.codigo || "",
          getDescricaoItem(item),
          r.unitFmt || "",
          r.totalFmt || "",
        ];
      }),
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

    const titleStyle = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 12,
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
      },
    };

    const applyHeaderStyle = (
      sheet: any,
      headerRow: number,
      columns: string[]
    ) => {
      columns.forEach((col) => {
        const cellRef = `${col}${headerRow}`;

        if (sheet[cellRef]) {
          sheet[cellRef].s = headerStyle;
        }
      });
    };

    if (composicaoSheet["A1"]) composicaoSheet["A1"].s = titleStyle;
    if (resultadosSheet["A1"]) resultadosSheet["A1"].s = titleStyle;

    applyHeaderStyle(composicaoSheet, 3, ["A", "B", "C", "D"]);
    applyHeaderStyle(resultadosSheet, 4, ["A", "B", "C", "D"]);

    composicaoSheet["!cols"] = [
      { wch: 18 },
      { wch: 44 },
      { wch: 15 },
      { wch: 15 },
    ];

    resultadosSheet["!cols"] = [
      { wch: 18 },
      { wch: 44 },
      { wch: 18 },
      { wch: 18 },
    ];

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

    await createNotification({
      title: "Decomposição exportada",
      message: `A planilha "${fileName}" foi exportada com ${resultados.length} resultado(s).`,
      action: "status",
      entityType: "decomposition_export",
      link: "/dashboard/precificacao/decomposicao",
    });
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

  return (
    <section className="flex h-full min-h-[216px] flex-col rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
            3.
          </span>

          <h2 className="truncate text-base font-semibold text-white">
            Preço de Venda
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              void handleDownload();
            }}
            title="Baixar planilha Excel"
            className="
              flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg
              text-white/55 transition
              hover:bg-white/10 hover:text-white
              active:scale-[0.96]
            "
          >
            <Download className="h-4 w-4" />
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
            className={`
              flex h-8 w-8 items-center justify-center rounded-lg transition
              active:scale-[0.96]
              ${
                isClearing
                  ? "cursor-not-allowed bg-red-500/20 text-red-300"
                  : "cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300"
              }
            `}
          >
            <Trash2
              className={`h-4 w-4 transition-transform ${
                isClearing ? "animate-pulse" : ""
              }`}
            />
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1.5">
        <div className="flex h-[56px] overflow-hidden rounded-xl border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <div className="flex h-full items-center border-r border-white/10 px-4 text-sm font-black text-white/45">
            R$
          </div>

          <Input
            value={precoVenda}
            placeholder="0,00"
            inputMode="decimal"
            onChange={(e) => setPrecoVenda(e.target.value)}
            onBlur={onBlurPrecoVenda}
            onKeyDown={handlePrecoKeyDown}
            className="
              h-full flex-1 rounded-none border-0 bg-transparent px-4
              text-3xl font-black text-white shadow-none outline-none
              placeholder:text-white/20
              focus-visible:ring-0 focus-visible:ring-offset-0
            "
          />
        </div>

        <div>
          <div className="mb-1 text-[9px] font-bold uppercase leading-none tracking-wide text-white/35">
            Valores rápidos
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {precosRapidos.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => aplicarPrecoRapido(valor)}
                className="
                  h-7 cursor-pointer rounded-lg border border-white/10 bg-white/[0.03]
                  text-[11px] font-bold text-white/60 transition
                  hover:border-[#1a8ceb]/50 hover:bg-[#1a8ceb]/10 hover:text-[#1a8ceb]
                  active:scale-[0.97]
                "
              >
                R$ {formatBR(valor)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[9px] font-bold uppercase leading-none tracking-wide text-white/35">
            Ajustes rápidos
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => ajustarPreco(-1)}
              className="
                flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg
                border border-white/10 bg-white/[0.03]
                text-[11px] font-semibold text-white/55 transition
                hover:bg-white/[0.07] hover:text-white
                active:scale-[0.97]
              "
            >
              <Minus className="h-3 w-3" />
              R$ 1
            </button>

            <button
              type="button"
              onClick={() => ajustarPreco(1)}
              className="
                flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg
                border border-white/10 bg-white/[0.03]
                text-[11px] font-semibold text-white/55 transition
                hover:bg-white/[0.07] hover:text-white
                active:scale-[0.97]
              "
            >
              <Plus className="h-3 w-3" />
              R$ 1
            </button>

            <button
              type="button"
              onClick={() => ajustarPreco(5)}
              className="
                flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg
                border border-white/10 bg-white/[0.03]
                text-[11px] font-semibold text-white/55 transition
                hover:bg-white/[0.07] hover:text-white
                active:scale-[0.97]
              "
            >
              <Plus className="h-3 w-3" />
              R$ 5
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}