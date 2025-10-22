"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type RowShape = {
  ID: string | number;
  Loja?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  selectedRows: RowShape[];
  onAfterDelete: () => void;
};

export default function ConfirmDeleteModal({
  open,
  onOpenChange,
  count,
  selectedRows,
  onAfterDelete,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirmDelete = async () => {
    console.log("🧩 selectedRows recebidos:", selectedRows);

    if (!selectedRows || selectedRows.length === 0) {
      alert("Nenhum item selecionado para exclusão.");
      return;
    }

    setLoading(true);

    try {
      // Agrupar IDs por tabela
      const grouped = selectedRows.reduce<Record<string, string[]>>((acc, row) => {
        const loja = (row.Loja || "").toLowerCase().trim();
        let tabela = "";

        if (loja.includes("pikot") || loja === "pk") tabela = "anuncios_pk";
        else if (loja.includes("sobaquetas") || loja.includes("sóbaquetas") || loja === "sb")
          tabela = "anuncios_sb";

        if (!tabela) return acc;

        const id = String(row.ID || "").trim();
        if (!id) return acc;

        acc[tabela] = acc[tabela] || [];
        acc[tabela].push(id);
        return acc;
      }, {});

      if (Object.keys(grouped).length === 0) {
        alert("Erro: Nenhum ID válido para exclusão.");
        return;
      }

      // Executa exclusões em paralelo
      await Promise.all(
        Object.entries(grouped).map(async ([tabela, ids]) => {
          const { error } = await supabase.from(tabela).delete().in("ID", ids);
          if (error) throw error;
        })
      );

      console.log("✅ Exclusão concluída com sucesso!");
      onAfterDelete();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir anúncios: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-neutral-700 rounded-2xl text-white max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Excluir Anúncio(s)
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-3"
        >
          <p className="text-neutral-300">
            Deseja realmente excluir{" "}
            <span className="text-white font-semibold">{count}</span>{" "}
            {count === 1 ? "anúncio selecionado" : "anúncios selecionados"}?
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-red-400">Atenção:</strong> Esta ação é permanente e não
              poderá ser desfeita.
            </div>
          </div>
        </motion.div>

        <DialogFooter className="mt-5 flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-neutral-700 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:scale-105 text-white flex items-center gap-2 cursor-pointer"
            onClick={handleConfirmDelete}
            disabled={loading}
          >
            {loading ? <Loader className="animate-spin w-5 h-5" /> : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
