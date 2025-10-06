"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx-js-style";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExportModeloAlteracao: () => Promise<void> | void;
};

export default function ModalEdicaoMassa({
  open, onOpenChange, onExportModeloAlteracao
}: Props) {
  const baixarModeloInclusao = () => {
    const headers = ["Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inclusao");
    XLSX.writeFile(wb, "modelo_inclusao.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border border-neutral-700 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Edição em Massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl p-4 bg-white/5 border border-neutral-700">
            <p className="text-gray-300">
              Baixe um modelo, preencha os dados e depois use <strong>Importar</strong> na tela principal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#1a8ceb] text-white hover:scale-105"
              onClick={baixarModeloInclusao}
            >
              Baixar Modelo de Inclusão (.xlsx)
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white hover:scale-105"
              onClick={onExportModeloAlteracao}
            >
              Baixar Modelo de Alteração (.xlsx)
            </Button>
          </div>

          <div className="text-sm text-gray-400">
            Dica: mantenha os cabeçalhos exatamente como no modelo para evitar erros.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:scale-105"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
