"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { DollarSign, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Custo = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Produto"]: string;
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

type SugestaoMarca = { marca: string };

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type BrandDropdownProps = {
  isActive: boolean;
  sugestoes: SugestaoMarca[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (marca: string) => void;
  emptyText?: string;
};

const BrandDropdown: React.FC<BrandDropdownProps> = ({
  isActive,
  sugestoes,
  listaRef,
  indiceSelecionado,
  onSelect,
  emptyText = "Nenhuma marca encontrada",
}) => {
  if (!isActive) return null;

  return (
    <div
      ref={listaRef}
      className="absolute z-50 mt-1 bg-[#0f0f0f] border border-white/10 rounded-md shadow-lg w-full max-h-40 overflow-y-auto"
    >
      {!sugestoes.length ? (
        <div className="px-2 py-2 text-xs text-neutral-300">{emptyText}</div>
      ) : (
        sugestoes.map((s, i) => (
          <div
            key={`${s.marca}-${i}`}
            className={`px-2 py-2 text-xs text-white cursor-pointer flex justify-between items-center ${
              i === indiceSelecionado
                ? "bg-[#22c55e]/30"
                : "hover:bg-[#22c55e]/20"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s.marca);
            }}
          >
            <span className="truncate">{s.marca}</span>
            {i < 9 && (
              <span className="text-[#22c55e] ml-3 shrink-0">{i + 1}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
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

  const toNumber = (value: any): string => {
    if (value === null || value === undefined) return "0,00";

    let raw = String(value).trim();
    if (!raw) return "0,00";

    raw = raw.replace(/[^\d.,-]/g, "");

    if (raw.includes(".") && !raw.includes(",")) {
      const parts = raw.split(".");
      const last = parts[parts.length - 1];

      if (/^\d{3}$/.test(last)) {
        const n = parseFloat(raw.replace(/\./g, ""));
        return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
      }

      const n = parseFloat(raw);
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    if (raw.includes(",") && !raw.includes(".")) {
      const n = parseFloat(raw.replace(",", "."));
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    if (raw.includes(".") && raw.includes(",")) {
      const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
    }

    const n = parseFloat(raw);
    return isNaN(n) ? "0,00" : n.toFixed(2).replace(".", ",");
  };

  useEffect(() => {
    if (open && mode === "edit") {
      setOldCodigo(form["Código"]);
    }
  }, [open, mode, form]);

  const marcaWrapRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const [marcas, setMarcas] = useState<string[]>([]);
  const [marcaFocus, setMarcaFocus] = useState(false);
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.from("custos").select("Marca");
        if (error) throw error;

        const uniq = Array.from(
          new Set(
            (data ?? [])
              .map((r: any) => String(r?.Marca ?? "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));

        if (!cancelled) setMarcas(uniq);
      } catch (e) {
        console.error("Erro ao carregar marcas:", e);
        if (!cancelled) setMarcas([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sugestoesMarca: SugestaoMarca[] = useMemo(() => {
    const q = normalize(form["Marca"]);

    if (!q) return marcas.slice(0, 9).map((m) => ({ marca: m }));

    return marcas
      .filter((m) => normalize(m).includes(q))
      .slice(0, 9)
      .map((m) => ({ marca: m }));
  }, [form, marcas]);

  const isDropdownActive = marcaFocus;

  useEffect(() => {
    if (!isDropdownActive) return;
    setIndiceSelecionado((prev) => {
      if (prev < 0) return 0;
      if (prev > sugestoesMarca.length - 1) return 0;
      return prev;
    });
  }, [isDropdownActive, sugestoesMarca.length]);

  const selectMarca = useCallback(
    (marca: string) => {
      setForm({ ...form, ["Marca"]: marca });
      setMarcaFocus(false);
      setIndiceSelecionado(0);
    },
    [form, setForm]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!marcaWrapRef.current) return;
      if (!marcaWrapRef.current.contains(e.target as Node)) {
        setMarcaFocus(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onMarcaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setMarcaFocus(false);
      return;
    }

    if (!sugestoesMarca.length) {
      if (e.key === "Enter") {
        e.preventDefault();
        setMarcaFocus(false);
        return;
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((i) => Math.min(i + 1, sugestoesMarca.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = sugestoesMarca[indiceSelecionado] || sugestoesMarca[0];
      if (item) selectMarca(item.marca);
      return;
    }

    if (e.key === "Tab") {
      const item = sugestoesMarca[0];
      if (item) selectMarca(item.marca);
      return;
    }

    if (
      e.key >= "1" &&
      e.key <= "9" &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      const idx = Number(e.key) - 1;
      const item = sugestoesMarca[idx];
      if (item) {
        e.preventDefault();
        selectMarca(item.marca);
      }
      return;
    }
  };

  const handleSave = async () => {
    const codigoLimpo = String(form["Código"] || "")
      .trim()
      .replace(/\s+/g, " ");

    const marcaLimpa = String(form["Marca"] || "").trim();
    const produtoLimpo = String(form["Produto"] || "").trim();
    const ncmLimpo = String(form["NCM"] || "").trim();

    if (!codigoLimpo) {
      setToast({
        message: "Preencha um Código válido antes de salvar.",
        type: "error",
      });
      return;
    }

    if (codigoLimpo.length < 2) {
      setToast({
        message: "Código muito curto.",
        type: "error",
      });
      return;
    }

    // Agora aceita letras, números, hífen, underline, ponto e espaço
    if (!/^[a-zA-Z0-9\-_. ]+$/.test(codigoLimpo)) {
      setToast({
        message: "Código contém caracteres inválidos.",
        type: "error",
      });
      return;
    }

    if (!marcaLimpa) {
      setToast({
        message: "Preencha uma Marca válida antes de salvar.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ["Código"]: codigoLimpo,
        ["Marca"]: marcaLimpa,
        ["Produto"]: produtoLimpo || null,
        ["Custo Atual"]: Number(toNumber(form["Custo Atual"]).replace(",", ".")),
        ["Custo Antigo"]: Number(
          toNumber(form["Custo Antigo"]).replace(",", ".")
        ),
        ["NCM"]: ncmLimpo || null,
      };

      let error = null;

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("custos")
          .insert([payload]);
        error = insertError;
      } else {
        const codigoParaBuscar = String(oldCodigo || form["Código"] || "")
          .trim()
          .replace(/\s+/g, " ");

        if (!codigoParaBuscar) {
          throw new Error("Código original inválido para atualização.");
        }

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
      console.error("Erro ao salvar custo:", err?.message || err);
      setToast({
        message: err?.message || "Erro ao salvar custo.",
        type: "error",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ message: "", type: null }), 3000);
    }
  };

  return (
    <>
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
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <Label className="text-neutral-300">Código</Label>
              <Input
                value={form["Código"]}
                onChange={(e) =>
                  setForm({ ...form, ["Código"]: e.target.value })
                }
                disabled={mode === "edit"}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: 5535 ou TN 5AM"
              />
            </div>

            <div ref={marcaWrapRef} className="relative">
              <Label className="text-neutral-300">Marca</Label>
              <Input
                value={form["Marca"]}
                onChange={(e) => {
                  setForm({ ...form, ["Marca"]: e.target.value });
                  setIndiceSelecionado(0);
                  setMarcaFocus(true);
                }}
                onFocus={() => setMarcaFocus(true)}
                onKeyDown={onMarcaKeyDown}
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: Liverpool"
                autoComplete="off"
              />

              <BrandDropdown
                isActive={isDropdownActive}
                sugestoes={sugestoesMarca}
                listaRef={listaRef}
                indiceSelecionado={indiceSelecionado}
                onSelect={(marca) => selectMarca(marca)}
                emptyText="Nenhuma marca cadastrada ainda"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-neutral-300">Produto</Label>
              <Input
                value={form["Produto"] || ""}
                onChange={(e) =>
                  setForm({ ...form, ["Produto"]: e.target.value })
                }
                className="bg-white/5 border-neutral-700 text-white rounded-xl"
                placeholder="Ex: Baqueta 7A Liverpool Luminous Series"
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