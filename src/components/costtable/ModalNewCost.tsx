"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HelpCircle, DollarSign, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Custo = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Custo Atual"]: number | string;
  ["Custo Antigo"]: number | string;
  ["NCM"]: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  form: Custo;
  setForm: (v: Custo) => void;
  onSave: () => void;
};

export default function ModalNewCost({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [oldCodigo, setOldCodigo] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({
    message: "",
    type: null,
  });

  // Quando abrir no modo de edição → salvar o código antigo
  useEffect(() => {
    if (open && mode === "edit") {
      setOldCodigo(form["Código"]);
    }
  }, [open, mode]);

  const handleSave = async () => {
    if (!form["Código"] || !form["Marca"]) {
      setToast({
        message: "Preencha Código e Marca antes de salvar.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ["Código"]: form["Código"],
        ["Marca"]: form["Marca"],
        ["Custo Atual"]: form["Custo Atual"] || null,
        ["Custo Antigo"]: form["Custo Antigo"] || null,
        ["NCM"]: form["NCM"] || null,
      };

      let error = null;

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("custos")
          .insert([payload]);
        error = insertError;
      } else {
        // Aqui está o ajuste crucial → usar o código antigo para o WHERE
        const codigoParaBuscar = oldCodigo || form["Código"];

        const { error: updateError } = await supabase
          .from("custos")
          .update(payload)
          .eq("Código", codigoParaBuscar);

        error = updateError;
      }

      if (error) throw error;

      setToast({
        message:
          mode === "create"
            ? "Custo incluído com sucesso."
            : "Custo atualizado com sucesso.",
        type: "success",
      });

      onOpenChange(false);
      onSave();
    } catch (err: any) {
      console.error("Erro ao salvar custo:", err.message || err);
      setToast({ message: "Erro ao salvar custo.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ message: "", type: null }), 3000);
    }
  };

  return (
    <>
      {/* Toast */}
      {toast.type && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white text-sm transition-all duration-300 ${
            toast.type === "success" ? "bg-[#22c55e]" : "bg-[#ef4444]"
          }`}
        >
          {toast.message}
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 
                     bg-[#0f0f0f] border border-neutral-700 rounded-2xl shadow-2xl p-6 
                     max-w-lg w-[90%] transition-all duration-300 ease-in-out"
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-white" />
              <DialogTitle className="text-white text-lg">
                {mode === "create" ? "Novo Custo" : "Editar Custo"}
              </DialogTitle>

              <div className="relative group cursor-default">
                <HelpCircle className="w-4 h-4 text-neutral-400 ml-1" />
                <div
                  className="absolute left-6 top-0 w-56 bg-transparent text-neutral-400 
                             text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  {mode === "create"
                    ? "Preencha os campos e clique em Incluir."
                    : "Edite os campos e clique em Salvar."}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <Label className="text-neutral-300">Código</Label>
              <Input
                value={form["Código"]}
                onChange={(e) =>
                  setForm({ ...form, ["Código"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 5535"
              />
            </div>

            <div>
              <Label className="text-neutral-300">Marca</Label>
              <Input
                value={form["Marca"]}
                onChange={(e) =>
                  setForm({ ...form, ["Marca"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: Liverpool"
              />
            </div>

            <div>
              <Label className="text-neutral-300">Custo Atual</Label>
              <Input
                type="text"
                value={String(form["Custo Atual"] || "")}
                onChange={(e) =>
                  setForm({ ...form, ["Custo Atual"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 89.90"
              />
            </div>

            <div>
              <Label className="text-neutral-300">Custo Antigo</Label>
              <Input
                type="text"
                value={String(form["Custo Antigo"] || "")}
                onChange={(e) =>
                  setForm({ ...form, ["Custo Antigo"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 79.90"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-neutral-300">NCM</Label>
              <Input
                value={form["NCM"]}
                onChange={(e) =>
                  setForm({ ...form, ["NCM"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 85182100"
              />
            </div>
          </div>

          {/* Botões */}
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              className="border-neutral-700 text-white hover:scale-105 cursor-pointer"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : mode === "create" ? (
                "Incluir"
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
