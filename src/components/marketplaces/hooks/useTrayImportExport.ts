"use client";
import { useState, useRef } from "react";

export function useTrayImportExport(rows: any[]) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openConfirmImport, setOpenConfirmImport] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Exporta os dados da tabela de precificação
  const handleExport = () => {
    const headers = [
      "ID",
      "ID Tray",
      "Marca",
      "Referência",
      "Desconto",
      "Frete",
      "Comissão",
      "Imposto",
      "Marketing",
      "Custo",
      "Preço de Venda",
    ];
    const csvContent =
      headers.join(";") +
      "\n" +
      rows
        .map((r) =>
          [
            r.marca,
            r.id,
            r.id_tray,
            r.referencia,
            r.desconto || 0,
            r.frete || 0,
            r.comissao || 0,
            r.imposto || 0,
            r.marketing || 0,
            r.custo_total || 0,
            r.preco_venda || 0,
          ].join(";")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "precificacao_tray.csv";
    link.click();
  };

  // Importação (exemplo simples)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpenConfirmImport(true);
    setImportCount(5); // apenas para demo
    setPreviewRows([{ id: 1, preco_venda: 100 }]);
  };

  const confirmImport = async () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setOpenConfirmImport(false);
    }, 1000);
  };

  return {
    fileInputRef,
    handleFileSelect,
    handleExport,
    openConfirmImport,
    setOpenConfirmImport,
    importCount,
    confirmImport,
    importing,
    previewRows,
    warnings,
  };
}
