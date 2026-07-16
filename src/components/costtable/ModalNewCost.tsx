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
import { Button } from "@/components/ui/button";
import { DollarSign, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

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

type SugestaoMarca = {
  marca: string;
};

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
      className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-white/10 bg-[#0f0f0f] shadow-lg"
    >
      {!sugestoes.length ? (
        <div className="px-2 py-2 text-xs text-neutral-300">
          {emptyText}
        </div>
      ) : (
        sugestoes.map((s, i) => (
          <div
            key={`${s.marca}-${i}`}
            className={`flex cursor-pointer items-center justify-between px-2 py-2 text-xs text-white ${
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
              <span className="ml-3 shrink-0 text-[#22c55e]">
                {i + 1}
              </span>
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

  const [oldCodigo, setOldCodigo] = useState<string | null>(
    null
  );

  const [novoCodigo, setNovoCodigo] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({
    message: "",
    type: null,
  });

  const toNumber = (value: any): string => {
    if (value === null || value === undefined) {
      return "0,00";
    }

    let raw = String(value).trim();

    if (!raw) {
      return "0,00";
    }

    raw = raw.replace(/[^\d.,-]/g, "");

    if (raw.includes(".") && !raw.includes(",")) {
      const parts = raw.split(".");
      const last = parts[parts.length - 1];

      if (/^\d{3}$/.test(last)) {
        const numberValue = parseFloat(
          raw.replace(/\./g, "")
        );

        return isNaN(numberValue)
          ? "0,00"
          : numberValue.toFixed(2).replace(".", ",");
      }

      const numberValue = parseFloat(raw);

      return isNaN(numberValue)
        ? "0,00"
        : numberValue.toFixed(2).replace(".", ",");
    }

    if (raw.includes(",") && !raw.includes(".")) {
      const numberValue = parseFloat(
        raw.replace(",", ".")
      );

      return isNaN(numberValue)
        ? "0,00"
        : numberValue.toFixed(2).replace(".", ",");
    }

    if (raw.includes(".") && raw.includes(",")) {
      const numberValue = parseFloat(
        raw.replace(/\./g, "").replace(",", ".")
      );

      return isNaN(numberValue)
        ? "0,00"
        : numberValue.toFixed(2).replace(".", ",");
    }

    const numberValue = parseFloat(raw);

    return isNaN(numberValue)
      ? "0,00"
      : numberValue.toFixed(2).replace(".", ",");
  };

  /*
   * Guarda o Código Atual original.
   *
   * Ele será usado para encontrar o registro no banco,
   * mesmo que o usuário informe um Código Novo.
   */
  useEffect(() => {
    if (!open) return;

    if (mode === "edit") {
      setOldCodigo(form["Código"]);
    } else {
      setOldCodigo(null);
    }

    setNovoCodigo("");
  }, [open, mode, form["Código"]]);

  const marcaWrapRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const [marcas, setMarcas] = useState<string[]>([]);
  const [marcaFocus, setMarcaFocus] = useState(false);

  const [indiceSelecionado, setIndiceSelecionado] =
    useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const carregarMarcas = async () => {
      try {
        const { data, error } = await supabase
          .from("custos")
          .select("Marca");

        if (error) {
          throw error;
        }

        const marcasUnicas = Array.from(
          new Set(
            (data ?? [])
              .map((registro: any) =>
                String(registro?.Marca ?? "").trim()
              )
              .filter(Boolean)
          )
        ).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );

        if (!cancelled) {
          setMarcas(marcasUnicas);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar marcas:",
          error
        );

        if (!cancelled) {
          setMarcas([]);
        }
      }
    };

    void carregarMarcas();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sugestoesMarca: SugestaoMarca[] = useMemo(() => {
    const busca = normalize(form["Marca"]);

    if (!busca) {
      return marcas
        .slice(0, 9)
        .map((marca) => ({
          marca,
        }));
    }

    return marcas
      .filter((marca) =>
        normalize(marca).includes(busca)
      )
      .slice(0, 9)
      .map((marca) => ({
        marca,
      }));
  }, [form, marcas]);

  const isDropdownActive = marcaFocus;

  useEffect(() => {
    if (!isDropdownActive) return;

    setIndiceSelecionado((prev) => {
      if (prev < 0) return 0;

      if (prev > sugestoesMarca.length - 1) {
        return 0;
      }

      return prev;
    });
  }, [
    isDropdownActive,
    sugestoesMarca.length,
  ]);

  const selectMarca = useCallback(
    (marca: string) => {
      setForm({
        ...form,
        ["Marca"]: marca,
      });

      setMarcaFocus(false);
      setIndiceSelecionado(0);
    },
    [form, setForm]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!marcaWrapRef.current) return;

      if (
        !marcaWrapRef.current.contains(
          e.target as Node
        )
      ) {
        setMarcaFocus(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return () =>
      document.removeEventListener(
        "mousedown",
        onDown
      );
  }, []);

  const onMarcaKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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

      setIndiceSelecionado((indice) =>
        Math.min(
          indice + 1,
          sugestoesMarca.length - 1
        )
      );

      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      setIndiceSelecionado((indice) =>
        Math.max(indice - 1, 0)
      );

      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const item =
        sugestoesMarca[indiceSelecionado] ||
        sugestoesMarca[0];

      if (item) {
        selectMarca(item.marca);
      }

      return;
    }

    if (e.key === "Tab") {
      const item = sugestoesMarca[0];

      if (item) {
        selectMarca(item.marca);
      }

      return;
    }

    if (
      e.key >= "1" &&
      e.key <= "9" &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      const index = Number(e.key) - 1;
      const item = sugestoesMarca[index];

      if (item) {
        e.preventDefault();
        selectMarca(item.marca);
      }
    }
  };

  const handleSave = async () => {
    const codigoAtualLimpo = String(
      form["Código"] || ""
    )
      .trim()
      .replace(/\s+/g, " ");

    const codigoNovoLimpo = String(
      novoCodigo || ""
    )
      .trim()
      .replace(/\s+/g, " ");

    /*
     * No modo de edição:
     * - se Código Novo estiver preenchido, ele será o código final;
     * - se estiver vazio, o Código Atual será mantido.
     *
     * No modo de criação, o fluxo atual permanece igual.
     */
    const codigoFinal =
      mode === "edit" && codigoNovoLimpo
        ? codigoNovoLimpo
        : codigoAtualLimpo;

    const marcaLimpa = String(
      form["Marca"] || ""
    ).trim();

    const produtoLimpo = String(
      form["Produto"] || ""
    ).trim();

    const ncmLimpo = String(
      form["NCM"] || ""
    ).trim();

    if (!codigoFinal) {
      setToast({
        message:
          "Preencha um Código válido antes de salvar.",
        type: "error",
      });

      return;
    }

    if (codigoFinal.length < 2) {
      setToast({
        message: "Código muito curto.",
        type: "error",
      });

      return;
    }

    if (
      !/^[a-zA-Z0-9\-_. ]+$/.test(codigoFinal)
    ) {
      setToast({
        message:
          "Código contém caracteres inválidos.",
        type: "error",
      });

      return;
    }

    if (!marcaLimpa) {
      setToast({
        message:
          "Preencha uma Marca válida antes de salvar.",
        type: "error",
      });

      return;
    }

    try {
      setSaving(true);

      const codigoParaBuscar = String(
        oldCodigo || codigoAtualLimpo || ""
      )
        .trim()
        .replace(/\s+/g, " ");

      const houveRenomeacao =
        mode === "edit" &&
        Boolean(codigoNovoLimpo) &&
        codigoFinal !== codigoParaBuscar;

      if (mode === "edit" && !codigoParaBuscar) {
        throw new Error(
          "Código original inválido para atualização."
        );
      }

      /*
       * Antes de renomear, verifica se o Código Novo
       * já existe na tabela custos.
       */
      if (houveRenomeacao) {
        const {
          data: codigoExistente,
          error: duplicateError,
        } = await supabase
          .from("custos")
          .select("Código")
          .eq("Código", codigoFinal)
          .limit(1);

        if (duplicateError) {
          throw duplicateError;
        }

        if (
          codigoExistente &&
          codigoExistente.length > 0
        ) {
          throw new Error(
            `O Código Novo "${codigoFinal}" já existe. Informe outro código.`
          );
        }
      }

      const payload = {
        ["Código"]: codigoFinal,
        ["Marca"]: marcaLimpa,
        ["Produto"]: produtoLimpo || null,

        ["Custo Atual"]: Number(
          toNumber(
            form["Custo Atual"]
          ).replace(",", ".")
        ),

        ["Custo Antigo"]: Number(
          toNumber(
            form["Custo Antigo"]
          ).replace(",", ".")
        ),

        ["NCM"]: ncmLimpo || null,
      };

      let error = null;

      if (mode === "create") {
        /*
         * Mantém o processo atual de inclusão.
         */
        const { error: insertError } =
          await supabase
            .from("custos")
            .insert([payload]);

        error = insertError;
      } else {
        /*
         * Atualiza o mesmo registro.
         *
         * O registro é localizado pelo Código Atual
         * e recebe o Código Novo.
         *
         * Portanto, o código anterior deixa de existir
         * sem precisar excluir e recriar o registro.
         */
        const { error: updateError } =
          await supabase
            .from("custos")
            .update(payload)
            .eq("Código", codigoParaBuscar);

        error = updateError;
      }

      if (error) {
        throw error;
      }

      setForm({
        ...form,
        ["Código"]: codigoFinal,
      });

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

        action:
          mode === "create"
            ? "create"
            : "update",

        entityType: "cost",
        entityId: codigoFinal,
        link: "/dashboard/custos",
      });

      setToast({
        message:
          mode === "create"
            ? "Custo incluído com sucesso."
            : houveRenomeacao
              ? "Código alterado com sucesso."
              : "Custo atualizado com sucesso.",

        type: "success",
      });

      setNovoCodigo("");
      onOpenChange(false);
      onSave();
    } catch (err: any) {
      console.error(
        "Erro ao salvar custo:",
        err?.message || err
      );

      setToast({
        message:
          err?.message || "Erro ao salvar custo.",
        type: "error",
      });
    } finally {
      setSaving(false);

      setTimeout(
        () =>
          setToast({
            message: "",
            type: null,
          }),
        3000
      );
    }
  };

  return (
    <>
      {toast.type && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] rounded-xl px-4 py-3 text-sm text-white shadow-lg transition-all duration-300 ${
            toast.type === "success"
              ? "bg-[#22c55e]"
              : "bg-[#ef4444]"
          }`}
        >
          {toast.message}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-50
            -translate-x-1/2 -translate-y-1/2

            bg-[#0f0f0f]
            border border-neutral-700
            rounded-2xl
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

            transition-all duration-300 ease-in-out
          "
        >
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-white" />

              <DialogTitle className="text-lg text-white">
                {mode === "create"
                  ? "Novo Custo"
                  : "Editar Custo"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Primeira linha: Código Atual | Código Novo */}
              <div>
                <Label className="text-neutral-300">
                  Código Atual
                </Label>

                <Input
                  value={form["Código"]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ["Código"]: e.target.value,
                    })
                  }
                  disabled={mode === "edit"}
                  className="
                    rounded-xl
                    border-neutral-700
                    bg-white/5
                    text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-70
                  "
                  placeholder="Ex: 5535 ou TN 5AM"
                />
              </div>

              <div>
                <Label className="text-neutral-300">
                  Código Novo
                </Label>

                <Input
                  value={novoCodigo}
                  onChange={(e) =>
                    setNovoCodigo(e.target.value)
                  }
                  disabled={mode === "create"}
                  className="
                    rounded-xl
                    border-neutral-700
                    bg-white/5
                    text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  placeholder={
                    mode === "edit"
                      ? "Digite somente para renomear"
                      : "Disponível ao editar um custo"
                  }
                  autoComplete="off"
                />

                {mode === "edit" && (
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                    Ao salvar, o Código Novo substituirá
                    o Código Atual.
                  </p>
                )}
              </div>

              {/* Segunda linha: Marca em largura total */}
              <div
                ref={marcaWrapRef}
                className="relative md:col-span-2"
              >
                <Label className="text-neutral-300">
                  Marca
                </Label>

                <Input
                  value={form["Marca"]}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      ["Marca"]: e.target.value,
                    });

                    setIndiceSelecionado(0);
                    setMarcaFocus(true);
                  }}
                  onFocus={() =>
                    setMarcaFocus(true)
                  }
                  onKeyDown={onMarcaKeyDown}
                  className="rounded-xl border-neutral-700 bg-white/5 text-white"
                  placeholder="Ex: Liverpool"
                  autoComplete="off"
                />

                <BrandDropdown
                  isActive={isDropdownActive}
                  sugestoes={sugestoesMarca}
                  listaRef={listaRef}
                  indiceSelecionado={
                    indiceSelecionado
                  }
                  onSelect={(marca) =>
                    selectMarca(marca)
                  }
                  emptyText="Nenhuma marca cadastrada ainda"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-neutral-300">
                  Produto
                </Label>

                <Input
                  value={form["Produto"] || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ["Produto"]: e.target.value,
                    })
                  }
                  className="rounded-xl border-neutral-700 bg-white/5 text-white"
                  placeholder="Ex: Baqueta 7A Liverpool Luminous Series"
                />
              </div>

              <div>
                <Label className="text-neutral-300">
                  Custo Atual
                </Label>

                <Input
                  type="text"
                  value={form["Custo Atual"] || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ["Custo Atual"]: e.target.value,
                    })
                  }
                  className="rounded-xl border-neutral-700 bg-white/5 text-white"
                  placeholder="Ex: 89,90"
                />
              </div>

              <div>
                <Label className="text-neutral-300">
                  Custo Antigo
                </Label>

                <Input
                  type="text"
                  value={form["Custo Antigo"] || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ["Custo Antigo"]: e.target.value,
                    })
                  }
                  className="rounded-xl border-neutral-700 bg-white/5 text-white"
                  placeholder="Ex: 79,90"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-neutral-300">
                  NCM
                </Label>

                <Input
                  value={form["NCM"]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ["NCM"]: e.target.value,
                    })
                  }
                  className="rounded-xl border-neutral-700 bg-white/5 text-white"
                  placeholder="Ex: 85182100"
                />
              </div>
            </div>
          </div>

          <DialogFooter
            className="
              mt-5
              shrink-0
              flex flex-col-reverse gap-2
              sm:flex-row sm:justify-end
            "
          >
            <Button
              variant="outline"
              className="
                w-full sm:w-auto
                h-11 sm:h-auto
                border-neutral-700
                text-white
                cursor-pointer
                active:scale-[0.98]
                sm:hover:scale-105
              "
              onClick={() =>
                onOpenChange(false)
              }
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              className="
                w-full sm:w-auto
                h-11 sm:h-auto
                bg-gradient-to-r from-green-500 to-green-600
                text-white
                cursor-pointer
                flex items-center justify-center gap-2
                active:scale-[0.98]
                sm:hover:scale-105
              "
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