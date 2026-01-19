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
  ["Custo Atual"]: string;
  ["Custo Antigo"]: string;
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

  /* ============================================================
     🔥 SUPER CONVERSOR FINAL — EXCEL (126.97) + PT-BR (126,97)
     + MILHAR PT-BR (25.000 / 125.000 / 1.250.000)
     ============================================================ */
  const toNumber = (value: any): string => {
    if (value === null || value === undefined) return "0,00";

    let raw = String(value).trim();
    if (!raw) return "0,00";

    // Remove moeda e tudo que não seja dígito, ponto, vírgula, sinal
    raw = raw.replace(/[^\d.,-]/g, "");

    // CASO 1: tem ponto e NÃO tem vírgula -> pode ser decimal (126.97) OU milhar (25.000 / 1.250.000)
    if (raw.includes(".") && !raw.includes(",")) {
      const parts = raw.split(".");
      const last = parts[parts.length - 1];

      // Se termina com 3 dígitos, trata como milhar: 25.000 -> 25000
      if (/^\d{3}$/.test(last)) {
        const n = parseFloat(raw.replace(/\./g, ""));
        return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
      }

      // Senão, trata como decimal: 126.97 -> 126,97
      const n = parseFloat(raw);
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    // CASO 2: Formato brasileiro simples: 126,97
    if (raw.includes(",") && !raw.includes(".")) {
      const n = parseFloat(raw.replace(",", "."));
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    // CASO 3: milhar + decimal pt-BR: 1.234,56
    if (raw.includes(".") && raw.includes(",")) {
      const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    // CASO 4: número inteiro simples: "3100"
    const n = parseFloat(raw);
    return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
  };

  // Captura código antigo ao abrir modal
  useEffect(() => {
    if (open && mode === "edit") {
      setOldCodigo(form["Código"]);
    }
  }, [open, mode, form]);

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

      /* ================================
            PAYLOAD COM CONVERSÃO
         ================================ */
      const payload = {
        ["Código"]: form["Código"],
        ["Marca"]: form["Marca"],
        ["Custo Atual"]: Number(toNumber(form["Custo Atual"]).replace(",", ".")),
        ["Custo Antigo"]: Number(
          toNumber(form["Custo Antigo"]).replace(",", ".")
        ),
        ["NCM"]: form["NCM"] || null,
      };

      let error = null;

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("custos")
          .insert([payload]);
        error = insertError;
      } else {
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
                disabled={mode === "edit"} // ✅ ÚNICA ALTERAÇÃO
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
                value={form["Custo Atual"] || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ["Custo Atual"]: e.target.value,
                  })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 89,90"
              />
            </div>

            <div>
              <Label className="text-neutral-300">Custo Antigo</Label>
              <Input
                type="text"
                value={form["Custo Antigo"] || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ["Custo Antigo"]: e.target.value,
                  })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 79,90"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-neutral-300">NCM</Label>
              <Input
                value={form["NCM"]}
                onChange={(e) => setForm({ ...form, ["NCM"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 85182100"
              />
            </div>
          </div>

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
