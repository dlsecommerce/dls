"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { ProductInfoSection } from "./ProductInfoSection";
import { DimensionsSection } from "./DimensionsSection";
import { CompositionSection } from "./CompositionSection";

type VariationModalProps = {
  open: boolean;
  variation: any;
  setVariation: any;
  composicao: any[];
  setComposicao: any;
  custoTotal: number | string;
  AnimatedNumber: React.ComponentType<{ value: number }>;
  isEditing: boolean;
  onClose: () => void;

  /**
   * IMPORTANTE:
   * Agora o onSave recebe a variação já atualizada.
   * Assim o componente pai não precisa depender do state antigo.
   */
  onSave: (variationAtualizada: any) => void;
};

const removerAcentos = (value: string) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
};

const normalizarReferenciaAnuncio = (
  referencia: string | null | undefined,
  tipo: "PAI" | "VAR"
) => {
  let ref = removerAcentos(String(referencia || ""))
    .trim()
    .toUpperCase();

  if (!ref) return "";

  ref = ref
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // Remove prefixo PAI/VAR em qualquer formato:
  // PAI-VDR...
  // VAR-VDR...
  // PAI - VDR...
  // VAR VDR...
  while (/^\s*(PAI|VAR)\s*[-_\s]*/i.test(ref)) {
    ref = ref.replace(/^\s*(PAI|VAR)\s*[-_\s]*/i, "").trim();
  }

  ref = ref
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*_\s*/g, "_")
    .trim();

  const partes = ref
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length === 0) return "";

  const marca = partes[0];

  /**
   * Caso com marca + 1 código:
   * VDR 6001800010
   * VDR-6001800010
   *
   * Resultado:
   * VAR-VDR-6001800010
   */
  if (partes.length === 2) {
    return `${tipo}-${marca}-${partes[1]}`;
  }

  /**
   * Caso com marca + vários códigos:
   * VDR 6001800020 6001800010
   * VDR-6001800020_6001800010
   *
   * Resultado:
   * PAI-VDR-6001800020_6001800010
   */
  if (partes.length >= 3) {
    return `${tipo}-${marca}-${partes.slice(1).join("_")}`;
  }

  return `${tipo}-${ref.replace(/\s+/g, "")}`;
};

const normalizarReferenciaVariacao = (
  referencia: string | null | undefined
) => {
  return normalizarReferenciaAnuncio(referencia, "VAR");
};

const getReferenciaVariation = (variation: any) => {
  return (
    variation?.referencia ??
    variation?.Referencia ??
    variation?.["Referência"] ??
    variation?.sku ??
    ""
  );
};

const toNumberSafe = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const VariationModal = ({
  open,
  variation,
  setVariation,
  composicao,
  setComposicao,
  custoTotal,
  AnimatedNumber,
  isEditing,
  onClose,
  onSave,
}: VariationModalProps) => {
  const referenciaPreview = normalizarReferenciaVariacao(
    getReferenciaVariation(variation)
  );

  const handleSaveVariation = () => {
    const referenciaNormalizada = normalizarReferenciaVariacao(
      getReferenciaVariation(variation)
    );

    const custoNumerico = toNumberSafe(custoTotal);

    const composicaoAtualizada = Array.isArray(composicao) ? composicao : [];

    const variationAtualizada = {
      ...variation,

      tipo_anuncio: "variacoes",

      referencia: referenciaNormalizada,
      Referencia: referenciaNormalizada,
      "Referência": referenciaNormalizada,
      sku: referenciaNormalizada,

      /**
       * IMPORTANTE:
       * Mantém a composição e o custo dentro desta variação.
       * Também salva em várias chaves para evitar custo zerado
       * caso outro arquivo leia um nome diferente.
       */
      composicao: composicaoAtualizada,

      custoTotal: custoNumerico,
      custo_total: custoNumerico,
      custo: custoNumerico,
      Custo: custoNumerico,
    };

    flushSync(() => {
      setVariation(variationAtualizada);
    });

    /**
     * IMPORTANTE:
     * Envia a variação pronta diretamente para o componente pai.
     * Assim o pai não usa a variation antiga com custo zerado.
     */
    onSave(variationAtualizada);
  };

  return (
    <AnimatePresence>
      {open && variation && (
        <motion.div
          key="variation-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.25,
            ease: "easeOut",
          }}
          className="
            fixed inset-0 z-[100] flex items-start justify-center
            overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md
            sm:px-6 lg:px-8
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 18,
              scale: 0.98,
            }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              relative w-full max-w-7xl rounded-2xl border border-white/10
              bg-[#070707] shadow-[0_30px_90px_rgba(0,0,0,0.65)]
            "
          >
            <header
              className="
                sticky top-0 z-10 rounded-t-2xl border-b border-white/10
                bg-[#070707]/95 px-4 py-4 backdrop-blur-xl
                sm:px-5
              "
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
                      5.
                    </span>

                    <h3 className="truncate text-base font-semibold text-white">
                      {isEditing ? "Editar variação" : "Adicionar variação"}
                    </h3>
                  </div>

                  <p className="mt-2 truncate text-xs text-white/45">
                    {referenciaPreview || "Nova variação"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    className="
                      h-10 cursor-pointer rounded-xl border-white/10
                      bg-transparent px-4 text-xs font-semibold text-white/75
                      shadow-none hover:bg-white/[0.03] hover:text-white
                    "
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveVariation}
                    className="
                      h-10 cursor-pointer rounded-xl bg-[#1a8ceb]
                      px-4 text-xs font-semibold text-white
                      shadow-none hover:bg-[#157bd0]
                    "
                  >
                    Salvar
                  </Button>

                  <Button
                    type="button"
                    onClick={onClose}
                    variant="ghost"
                    className="
                      h-10 w-10 cursor-pointer rounded-xl border border-white/10
                      bg-white/[0.03] p-0 text-white/55
                      hover:bg-white/[0.06] hover:text-white
                    "
                    title="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-4">
                  <ProductInfoSection
                    produto={variation}
                    setProduto={setVariation}
                  />

                  <DimensionsSection
                    produto={variation}
                    setProduto={setVariation}
                  />
                </div>

                <CompositionSection
                  composicao={composicao}
                  setComposicao={setComposicao}
                  custoTotal={custoNumerico}
                  AnimatedNumber={AnimatedNumber}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};