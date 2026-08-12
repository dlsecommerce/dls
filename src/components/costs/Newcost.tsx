"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";
import { toast } from "sonner";

const SCHEMA = "newsystem";

export type Custo = {
  code: string;
  mark: string;
  product: string;
  current_cost: string;
  previous_cost: string;
  ncm: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  form: Custo;
  setForm: (v: Custo) => void;
  onSave: () => void;
};

type SugestaoMarca = {
  marca: string;
};

const ACCENT = "#1a8ceb";

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sanitizeCurrencyInput(raw: string): string {
  let value = String(raw ?? "").replace(/[^\d,]/g, "");

  const parts = value.split(",");
  if (parts.length > 2) {
    value = parts[0] + "," + parts.slice(1).join("");
  }

  const [intPart, decPart] = value.split(",");
  if (decPart && decPart.length > 2) {
    value = `${intPart},${decPart.slice(0, 2)}`;
  }

  return value;
}

function maskNCM(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

function ncmDigitsOnly(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

type BrandDropdownProps = {
  isActive: boolean;
  loading: boolean;
  sugestoes: SugestaoMarca[];
  listaRef: React.RefObject<HTMLDivElement>;
  indiceSelecionado: number;
  onSelect: (marca: string) => void;
  emptyText?: string;
};

const BrandDropdown: React.FC<BrandDropdownProps> = ({
  isActive,
  loading,
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
      className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto border border-neutral-800 bg-[#0a0a0a] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {loading ? (
        <div className="space-y-1 p-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-6 w-full animate-pulse rounded bg-neutral-800/60"
            />
          ))}
        </div>
      ) : !sugestoes.length ? (
        <div className="px-2 py-2 text-xs text-neutral-500">{emptyText}</div>
      ) : (
        sugestoes.map((s, i) => (
          <div
            key={`${s.marca}-${i}`}
            className={`flex cursor-pointer items-center justify-between px-2 py-2 text-xs text-white ${
              i === indiceSelecionado
                ? "bg-[#1a8ceb]/20"
                : "hover:bg-[#1a8ceb]/10"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s.marca);
            }}
          >
            <span className="truncate">{s.marca}</span>

            {i < 9 && (
              <span className="ml-3 shrink-0" style={{ color: ACCENT }}>
                {i + 1}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default function NewCost({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  onSave,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [oldCodigo, setOldCodigo] = useState<string | null>(null);
  const [novoCodigo, setNovoCodigo] = useState("");

  const [errors, setErrors] = useState<Partial<Record<keyof Custo, string>>>(
    {}
  );

  const [codigoCheckLoading, setCodigoCheckLoading] = useState(false);
  const [codigoDuplicado, setCodigoDuplicado] = useState(false);

  const codigoInputRef = useRef<HTMLInputElement>(null);
  const produtoInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toNumber = (value: any): string => {
    if (value === null || value === undefined) return "0,00";

    let raw = String(value).trim();
    if (!raw) return "0,00";

    raw = raw.replace(/[^\d.,-]/g, "");

    if (!raw) return "0,00";

    if (raw.includes(".") && !raw.includes(",")) {
      const parts = raw.split(".");
      const last = parts[parts.length - 1];

      if (/^\d{3}$/.test(last)) {
        const numberValue = parseFloat(raw.replace(/\./g, ""));
        return isNaN(numberValue) ? "0,00" : numberValue.toFixed(2).replace(".", ",");
      }

      const numberValue = parseFloat(raw);
      return isNaN(numberValue) ? "0,00" : numberValue.toFixed(2).replace(".", ",");
    }

    if (raw.includes(",") && !raw.includes(".")) {
      const numberValue = parseFloat(raw.replace(",", "."));
      return isNaN(numberValue) ? "0,00" : numberValue.toFixed(2).replace(".", ",");
    }

    if (raw.includes(".") && raw.includes(",")) {
      const numberValue = parseFloat(raw.replace(/\./g, "").replace(",", "."));
      return isNaN(numberValue) ? "0,00" : numberValue.toFixed(2).replace(".", ",");
    }

    const numberValue = parseFloat(raw);
    return isNaN(numberValue) ? "0,00" : numberValue.toFixed(2).replace(".", ",");
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit") {
      setOldCodigo(form.code);
    } else {
      setOldCodigo(null);
    }

    setNovoCodigo("");
    setErrors({});
    setCodigoDuplicado(false);

    const t = setTimeout(() => {
      codigoInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(t);
  }, [open, mode, form.code]);

  const marcaWrapRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const [marcas, setMarcas] = useState<string[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(false);
  const [marcaFocus, setMarcaFocus] = useState(false);

  const [indiceSelecionado, setIndiceSelecionado] = useState(0);

  // ✅ Busca TODAS as marcas cadastradas, paginando (Supabase limita 1000/linha por padrão)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const carregarMarcas = async () => {
      try {
        setMarcasLoading(true);

        const PAGE_SIZE = 1000;
        let from = 0;
        let allRows: any[] = [];

        while (true) {
          const { data, error } = await supabase
            .schema(SCHEMA)
            .from("costs")
            .select("mark")
            .range(from, from + PAGE_SIZE - 1);

          if (error) throw error;

          const page = data ?? [];
          allRows = allRows.concat(page);

          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        const marcasUnicas = Array.from(
          new Set(
            allRows
              .map((registro: any) => String(registro?.mark ?? "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));

        if (!cancelled) setMarcas(marcasUnicas);
      } catch (error) {
        console.error("Erro ao carregar marcas:", error);
        if (!cancelled) setMarcas([]);
      } finally {
        if (!cancelled) setMarcasLoading(false);
      }
    };

    void carregarMarcas();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sugestoesMarca: SugestaoMarca[] = useMemo(() => {
    const busca = normalize(form.mark);

    if (!busca) {
      return marcas.slice(0, 9).map((marca) => ({ marca }));
    }

    return marcas
      .filter((marca) => normalize(marca).includes(busca))
      .slice(0, 9)
      .map((marca) => ({ marca }));
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
      setForm({ ...form, mark: marca });
      setMarcaFocus(false);
      setIndiceSelecionado(0);

      setTimeout(() => produtoInputRef.current?.focus(), 0);
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
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((indice) => Math.min(indice + 1, sugestoesMarca.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((indice) => Math.max(indice - 1, 0));
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

    if (e.key >= "1" && e.key <= "9" && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const index = Number(e.key) - 1;
      const item = sugestoesMarca[index];

      if (item) {
        e.preventDefault();
        selectMarca(item.marca);
      }
    }
  };

  const handleCodigoChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/\s+/g, " ");
    setForm({ ...form, code: formatted });
    setErrors((prev) => ({ ...prev, code: undefined }));
  };

  const handleNovoCodigoChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/\s+/g, " ");
    setNovoCodigo(formatted);
    setErrors((prev) => ({ ...prev, code: undefined }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const codigoTrim = formatted.trim();

    if (!codigoTrim || codigoTrim.length < 2) {
      setCodigoDuplicado(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setCodigoCheckLoading(true);

        const { data, error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .select("code")
          .eq("code", codigoTrim)
          .limit(1);

        if (error) throw error;
        setCodigoDuplicado(Boolean(data && data.length > 0));
      } catch {
        setCodigoDuplicado(false);
      } finally {
        setCodigoCheckLoading(false);
      }
    }, 500);
  };

  const handleCodigoCreateChange = (value: string) => {
    handleCodigoChange(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const codigoTrim = value.trim().toUpperCase();
    if (!codigoTrim || codigoTrim.length < 2) {
      setCodigoDuplicado(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setCodigoCheckLoading(true);

        const { data, error } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .select("code")
          .eq("code", codigoTrim)
          .limit(1);

        if (error) throw error;
        setCodigoDuplicado(Boolean(data && data.length > 0));
      } catch {
        setCodigoDuplicado(false);
      } finally {
        setCodigoCheckLoading(false);
      }
    }, 500);
  };

  const handleCustoChange = (
    field: "current_cost" | "previous_cost",
    value: string
  ) => {
    setForm({ ...form, [field]: sanitizeCurrencyInput(value) });
  };

  const handleNCMChange = (value: string) => {
    setForm({ ...form, ncm: maskNCM(value) });
    setErrors((prev) => ({ ...prev, ncm: undefined }));
  };

  const ncmDigits = ncmDigitsOnly(form.ncm);
  const ncmValido = ncmDigits.length === 0 || ncmDigits.length === 8;

  const handleSave = async () => {
    if (saving) return;

    const codigoAtualLimpo = String(form.code || "").trim().replace(/\s+/g, " ");
    const codigoNovoLimpo = String(novoCodigo || "").trim().replace(/\s+/g, " ");

    const codigoFinal =
      mode === "edit" && codigoNovoLimpo ? codigoNovoLimpo : codigoAtualLimpo;

    const marcaLimpa = String(form.mark || "").trim();
    const produtoLimpo = String(form.product || "").trim();

    const novosErros: Partial<Record<keyof Custo, string>> = {};

    if (!codigoFinal) {
      novosErros.code = "Preencha um Código válido.";
    } else if (codigoFinal.length < 2) {
      novosErros.code = "Código muito curto.";
    } else if (!/^[a-zA-Z0-9\-_. ]+$/.test(codigoFinal)) {
      novosErros.code = "Código contém caracteres inválidos.";
    } else if (codigoDuplicado && (mode === "create" || (mode === "edit" && codigoNovoLimpo))) {
      novosErros.code = "Este código já existe.";
    }

    if (!marcaLimpa) {
      novosErros.mark = "Preencha uma Marca válida.";
    }

    if (!ncmValido) {
      novosErros.ncm = "NCM deve ter 8 dígitos.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      toast.error("Verifique os campos", {
        description: Object.values(novosErros)[0] || "Corrija os campos destacados.",
        className: "bg-neutral-900 border border-red-500/40 text-white shadow-xl",
        duration: 4000,
      });
      return;
    }

    try {
      setSaving(true);

      const codigoParaBuscar = String(oldCodigo || codigoAtualLimpo || "")
        .trim()
        .replace(/\s+/g, " ");

      const houveRenomeacao =
        mode === "edit" && Boolean(codigoNovoLimpo) && codigoFinal !== codigoParaBuscar;

      if (mode === "edit" && !codigoParaBuscar) {
        throw new Error("Código original inválido para atualização.");
      }

      if (houveRenomeacao) {
        const { data: codigoExistente, error: duplicateError } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .select("code")
          .eq("code", codigoFinal)
          .limit(1);

        if (duplicateError) throw duplicateError;

        if (codigoExistente && codigoExistente.length > 0) {
          throw new Error(`O código novo "${codigoFinal}" já existe. Informe outro código.`);
        }
      }

      const ncmParaSalvar = ncmDigitsOnly(form.ncm);

      const payload = {
        code: codigoFinal,
        mark: marcaLimpa,
        product: produtoLimpo || null,
        current_cost: Number(toNumber(form.current_cost).replace(",", ".")),
        previous_cost: Number(toNumber(form.previous_cost).replace(",", ".")),
        ncm: ncmParaSalvar || null,
      };

      let error = null;

      if (mode === "create") {
        const { error: insertError } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .insert([payload]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase
          .schema(SCHEMA)
          .from("costs")
          .update(payload)
          .eq("code", codigoParaBuscar);
        error = updateError;
      }

      if (error) throw error;

      setForm({ ...form, code: codigoFinal });

      await createNotification({
        title:
          mode === "create"
            ? "Custo incluído"
            : houveRenomeacao
              ? "Código do custo alterado"
              : "Custo atualizado",

        message:
          mode === "create"
            ? `O custo "${codigoFinal}" foi incluído.`
            : houveRenomeacao
              ? `O código "${codigoParaBuscar}" foi alterado para "${codigoFinal}".`
              : `O custo "${codigoFinal}" foi atualizado.`,

        action: mode === "create" ? "create" : "update",
        entityType: "cost",
        entityId: codigoFinal,
        link: "/dashboard/custos",
      });

      toast.message(
        mode === "create"
          ? "Custo incluído"
          : houveRenomeacao
            ? "Código alterado"
            : "Custo atualizado",
        {
          description:
            mode === "create"
              ? `O custo "${codigoFinal}" foi incluído com sucesso.`
              : houveRenomeacao
                ? `Código alterado com sucesso para "${codigoFinal}".`
                : `O custo "${codigoFinal}" foi atualizado com sucesso.`,
          className: "bg-neutral-900 border border-neutral-700 text-white shadow-xl",
          duration: 3000,
        }
      );

      setNovoCodigo("");
      onOpenChange(false);
      onSave();
    } catch (err: any) {
      console.error("Erro ao salvar custo:", err?.message || err);

      toast.error("Falha ao salvar custo", {
        description: err?.message || "Ocorreu um erro inesperado. Tente novamente.",
        className: "bg-neutral-900 border border-red-500/40 text-white shadow-xl",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const houveRenomeacaoPreview =
    mode === "edit" &&
    Boolean(novoCodigo.trim()) &&
    novoCodigo.trim() !== String(oldCodigo || "").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          bg-[#0a0a0a]
          border border-neutral-800
          shadow-2xl

          w-[calc(100vw-16px)]
          max-w-[calc(100vw-16px)]
          max-h-[calc(100dvh-16px)]

          sm:max-w-lg
          sm:w-[90%]

          flex flex-col
          overflow-hidden

          p-4
          sm:p-6
          pb-[calc(1rem+env(safe-area-inset-bottom))]
        "
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" style={{ color: ACCENT }} />

            <DialogTitle className="text-base font-semibold text-white sm:text-lg">
              {mode === "create" ? "Novo Custo" : "Editar Custo"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-neutral-500">
                {mode === "edit" ? "Código Atual" : "Código"}
              </Label>

              <Input
                ref={codigoInputRef}
                value={form.code}
                onChange={(e) =>
                  mode === "create"
                    ? handleCodigoCreateChange(e.target.value)
                    : handleCodigoChange(e.target.value)
                }
                disabled={mode === "edit"}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? "codigo-error" : undefined}
                className={`
                  border-neutral-800
                  bg-transparent
                  text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  ${errors.code ? "border-red-500" : ""}
                `}
                placeholder="Ex: 5535 ou TN 5AM"
              />

              {mode === "create" && codigoCheckLoading && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Verificando código...
                </p>
              )}

              {mode === "create" && !codigoCheckLoading && codigoDuplicado && (
                <p
                  id="codigo-error"
                  className="mt-1 flex items-center gap-1 text-[11px] text-red-500"
                >
                  <AlertCircle className="h-3 w-3" /> Este código já existe.
                </p>
              )}

              {errors.code && !(mode === "create" && codigoDuplicado) && (
                <p id="codigo-error" className="mt-1 text-[11px] text-red-500">
                  {errors.code}
                </p>
              )}
            </div>

            {mode === "edit" && (
              <div>
                <Label className="text-neutral-500">Código Novo</Label>

                <Input
                  value={novoCodigo}
                  onChange={(e) => handleNovoCodigoChange(e.target.value)}
                  aria-invalid={codigoDuplicado && Boolean(novoCodigo.trim())}
                  className={`
                    border-neutral-800
                    bg-transparent
                    text-white
                    ${codigoDuplicado && novoCodigo.trim() ? "border-red-500" : ""}
                  `}
                  placeholder={`Ex: ${form.code}`}
                  autoComplete="off"
                />

                {codigoCheckLoading && Boolean(novoCodigo.trim()) && (
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Verificando código...
                  </p>
                )}

                {!codigoCheckLoading && codigoDuplicado && Boolean(novoCodigo.trim()) && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
                    <AlertCircle className="h-3 w-3" /> Este código já existe.
                  </p>
                )}

                {houveRenomeacaoPreview && !codigoDuplicado && (
                  <p className="mt-1 text-[11px]" style={{ color: ACCENT }}>
                    O código "{oldCodigo}" será renomeado para "{novoCodigo.trim()}".
                  </p>
                )}
              </div>
            )}

            <div ref={marcaWrapRef} className="relative md:col-span-2">
              <Label className="text-neutral-500">Marca</Label>

              <Input
                value={form.mark}
                onChange={(e) => {
                  setForm({ ...form, mark: e.target.value });
                  setIndiceSelecionado(0);
                  setMarcaFocus(true);
                  setErrors((prev) => ({ ...prev, mark: undefined }));
                }}
                onFocus={() => setMarcaFocus(true)}
                onKeyDown={onMarcaKeyDown}
                aria-invalid={Boolean(errors.mark)}
                className={`border-neutral-800 bg-transparent text-white ${
                  errors.mark ? "border-red-500" : ""
                }`}
                placeholder="Ex: Liverpool"
                autoComplete="off"
              />

              {errors.mark && (
                <p className="mt-1 text-[11px] text-red-500">{errors.mark}</p>
              )}

              <BrandDropdown
                isActive={isDropdownActive}
                loading={marcasLoading}
                sugestoes={sugestoesMarca}
                listaRef={listaRef}
                indiceSelecionado={indiceSelecionado}
                onSelect={(marca) => selectMarca(marca)}
                emptyText="Nenhuma marca cadastrada ainda"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-neutral-500">Produto</Label>

              <Input
                ref={produtoInputRef}
                value={form.product || ""}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                className="border-neutral-800 bg-transparent text-white"
                placeholder="Ex: Baqueta 7A Liverpool Luminous Series"
              />
            </div>

            <div>
              <Label className="text-neutral-500">Custo Atual</Label>

              <Input
                type="text"
                inputMode="numeric"
                value={form.current_cost || ""}
                onChange={(e) => handleCustoChange("current_cost", e.target.value)}
                className="border-neutral-800 bg-transparent text-white"
                placeholder="Ex: 89,90"
              />
            </div>

            <div>
              <Label className="text-neutral-500">Custo Antigo</Label>

              <Input
                type="text"
                inputMode="numeric"
                value={form.previous_cost || ""}
                onChange={(e) => handleCustoChange("previous_cost", e.target.value)}
                className="border-neutral-800 bg-transparent text-white"
                placeholder="Ex: 79,90"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-neutral-500">NCM</Label>

              <Input
                value={form.ncm}
                onChange={(e) => handleNCMChange(e.target.value)}
                inputMode="numeric"
                aria-invalid={!ncmValido}
                className={`border-neutral-800 bg-transparent text-white ${
                  !ncmValido ? "border-red-500" : ""
                }`}
                placeholder="Ex: 8518.21.00"
              />

              {!ncmValido && (
                <p className="mt-1 text-[11px] text-red-500">
                  NCM deve conter 8 dígitos.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter
          className="
            mt-5
            shrink-0
            flex flex-col-reverse gap-2
            sm:flex-row sm:justify-end sm:gap-3
          "
        >
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="
              flex h-11 w-full items-center justify-center
              border border-neutral-800
              text-sm text-white
              transition-colors
              cursor-pointer
              hover:bg-neutral-900
              disabled:cursor-not-allowed disabled:opacity-50
              sm:h-10 sm:w-auto sm:px-6
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            className="
              flex h-11 w-full items-center justify-center gap-2
              text-sm font-medium text-black
              transition-colors
              cursor-pointer
              disabled:cursor-not-allowed disabled:opacity-50
              sm:h-10 sm:w-auto sm:px-6
              border
            "
            style={{
              backgroundColor: ACCENT,
              borderColor: ACCENT,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3b9df0";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b9df0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
              (e.currentTarget as HTMLButtonElement).style.borderColor = ACCENT;
            }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "create" ? (
              "Incluir"
            ) : (
              "Salvar"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
