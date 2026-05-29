"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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
  onSave: (variationAtualizada?: any) => void;
};

const removerAcentos = (value: string) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
};

const getCleanField = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

/**
 * ✅ PADRÃO NOVO OFICIAL:
 *
 * PAI-MARCA-CODIGO
 * VAR-MARCA-CODIGO
 *
 * Exemplos corretos:
 * PAI-J-1294323-J_1294333-J
 * VAR-J-1294323-J
 * VAR-J-1294333-J
 *
 * IMPORTANTE:
 * - Não converte hífen "-" para underline "_".
 * - Preserva códigos com hífen interno, como 1294323-J.
 * - Preserva underline somente quando ele já existe separando códigos do PAI.
 */
const normalizarReferenciaAnuncio = (
  referencia: string | null | undefined,
  tipo: "PAI" | "VAR"
) => {
  let ref = removerAcentos(String(referencia || ""))
    .trim()
    .toUpperCase();

  if (!ref) return "";

  ref = ref
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .trim();

  /**
   * Remove prefixo se já veio como PAI- ou VAR-.
   * Ex:
   * VAR-J-1294323-J -> J-1294323-J
   */
  ref = ref.replace(/^\s*(PAI|VAR)\s*-\s*/i, "").trim();

  /**
   * Normaliza espaços ao redor de separadores,
   * mas NÃO troca "-" por "_".
   */
  ref = ref
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*_\s*/g, "_")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .trim();

  if (!ref) return "";

  const partes = ref.split("-").filter(Boolean);

  if (partes.length < 2) {
    return `${tipo}-${ref}`;
  }

  const marca = partes[0];
  const codigo = partes.slice(1).join("-");

  if (!marca || !codigo) {
    return `${tipo}-${ref}`;
  }

  return `${tipo}-${marca}-${codigo}`;
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

    const idBling = getCleanField(
      variation,
      "id_bling",
      "ID Bling",
      "idBling",
      "ID_Bling"
    );

    const idTray = getCleanField(
      variation,
      "id_tray",
      "ID Tray",
      "idTray",
      "ID_Tray"
    );

    const idVar = getCleanField(
      variation,
      "id_var",
      "ID Var",
      "idVar",
      "ID_Var",
      "valor"
    );

    const variationAtualizada = {
      ...variation,

      tipo_anuncio: "variacoes",

      referencia: referenciaNormalizada,
      Referencia: referenciaNormalizada,
      "Referência": referenciaNormalizada,
      sku: referenciaNormalizada,

      id_bling: idBling,
      "ID Bling": idBling,

      id_tray: idTray,
      "ID Tray": idTray,

      id_var: idVar,
      "ID Var": idVar,

      composicao: Array.isArray(composicao) ? composicao : [],
      custoTotal,
      custo_total: custoTotal,
    };

    setVariation(variationAtualizada);
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
                  custoTotal={custoTotal}
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