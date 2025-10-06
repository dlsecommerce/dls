"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

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

export default function ModalNovoCusto({
  open, onOpenChange, mode, form, setForm, onSave
}: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0f0f0f] border border-neutral-700 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-white">
                {mode === "create" ? "Novo Custo" : "Editar Custo"}
              </DialogTitle>
              {/* Help DENTRO do modal */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Ajuda"
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 border border-neutral-700 text-gray-200"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#0f0f0f] border border-neutral-700 text-gray-200">
                  Preencha o <strong>Código</strong>, <strong>Marca</strong>, <strong>Custos</strong> e <strong>NCM</strong>.<br />
                  Exemplo: <em>Código 12345</em>, <em>Marca JBL</em>, <em>Custo Atual 89.90</em>, <em>Custo Antigo 79.90</em>, <em>NCM 85182100</em>.
                </TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Código</Label>
              <Input
                value={form["Código"]}
                onChange={(e) => setForm({ ...form, ["Código"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 12345"
                disabled={mode === "edit"}
              />
            </div>
            <div>
              <Label className="text-gray-300">Marca</Label>
              <Input
                value={form["Marca"]}
                onChange={(e) => setForm({ ...form, ["Marca"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: JBL"
              />
            </div>
            <div>
              <Label className="text-gray-300">Custo Atual</Label>
              <Input
                type="number"
                value={String(form["Custo Atual"])}
                onChange={(e) => setForm({ ...form, ["Custo Atual"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 89.90"
              />
            </div>
            <div>
              <Label className="text-gray-300">Custo Antigo</Label>
              <Input
                type="number"
                value={String(form["Custo Antigo"])}
                onChange={(e) => setForm({ ...form, ["Custo Antigo"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 79.90"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-300">NCM</Label>
              <Input
                value={form["NCM"]}
                onChange={(e) => setForm({ ...form, ["NCM"]: e.target.value })}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 85182100"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="border-neutral-700 text-white hover:scale-105"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:scale-105"
              onClick={onSave}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
