"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Layers,
  Plus,
  Trash2,
  Pencil,
  Hash,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { VariationMarketplaceModal } from "./VariationMarketplaceModal";

type Variation = {
  id?: string | number;
  sku?: string;
  nome?: string;
  valor?: string;
  estoque?: string | number;

  loja?: string;
  tipo_anuncio?: string;
  referencia?: string;
  id_var?: string;
  id_bling?: string;
  id_tray?: string;
  od?: string;
  categoria?: string;
  marca?: string;

  peso?: string | number;
  altura?: string | number;
  largura?: string | number;
  comprimento?: string | number;

  marketplace?: string;
  id_anuncio?: string;
  id_marketplace?: string;
  link?: string;
  preco?: string | number;
  status?: string;
  titulo?: string;
  descricao?: string;

  composicao?: any[];
  custoTotal?: number | string;

  [key: string]: any;
};

type VariationMarketplaceSectionProps = {
  produto: any;
  setProduto: any;
  AnimatedNumber: React.ComponentType<{ value: number }>;
};

const getCodigoBaseReferencia = (referencia?: string | null) => {
  if (!referencia) return "";

  return String(referencia)
    .replace(/^PAI\s*-\s*/i, "")
    .replace(/^VAR\s*-\s*/i, "")
    .trim();
};

const createEmptyVariation = (produto: any): Variation => {
  const codigoBase = getCodigoBaseReferencia(produto?.referencia);

  return {
    loja: produto?.loja ?? "",
    tipo_anuncio: "variacoes",

    nome: produto?.nome ?? "",
    titulo: produto?.nome ?? "",

    referencia: codigoBase ? `VAR - ${codigoBase}` : "VAR - ",
    sku: codigoBase ? `VAR - ${codigoBase}` : "VAR - ",
    id_var: "",

    id_bling: "",
    id_tray: "",
    od: "",

    marketplace: produto?.marketplace ?? "",
    id_anuncio: "",
    id_marketplace: "",
    link: "",
    preco: "",
    status: "ativo",
    descricao: "",

    categoria: produto?.categoria ?? "",
    marca: produto?.marca ?? "",

    peso: produto?.peso ?? "",
    altura: produto?.altura ?? "",
    largura: produto?.largura ?? "",
    comprimento: produto?.comprimento ?? "",

    estoque: "",
    composicao: [],
    custoTotal: 0,
  };
};

const calcCustoTotal = (composicao: any[]) => {
  return (composicao ?? []).reduce((total, item) => {
    const quantidade = Number(item?.quantidade || 0);
    const custo = Number(item?.custo || 0);

    return total + quantidade * custo;
  }, 0);
};

export const VariationMarketplaceSection = ({
  produto,
  setProduto,
  AnimatedNumber,
}: VariationMarketplaceSectionProps) => {
  const [open, setOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<
    number | null
  >(null);

  const [variationDraft, setVariationDraft] = useState<Variation | null>(null);
  const [variationComposicao, setVariationComposicao] = useState<any[]>([]);

  const variacoes: Variation[] = useMemo(() => {
    if (Array.isArray(produto?.variacoes)) return produto.variacoes;
    return [];
  }, [produto?.variacoes]);

  const variationCustoTotal = useMemo(() => {
    return calcCustoTotal(variationComposicao);
  }, [variationComposicao]);

  const updateVariations = (next: Variation[]) => {
    setProduto((p: any) => ({
      ...p,
      tipo_anuncio: "variacoes",
      variacoes: next,
    }));
  };

  const openNewVariation = () => {
    const newVariation = createEmptyVariation(produto);

    setSelectedVariationIndex(null);
    setVariationDraft(newVariation);
    setVariationComposicao(newVariation.composicao ?? []);
    setModalOpen(true);
    setOpen(true);
  };

  const openEditVariation = (variation: Variation, index: number) => {
    setSelectedVariationIndex(index);

    setVariationDraft({
      ...variation,
      sku: variation.sku ?? variation.referencia ?? "",
      referencia: variation.referencia ?? variation.sku ?? "",
      titulo: variation.titulo ?? variation.nome ?? produto?.nome ?? "",
      nome: variation.nome ?? variation.titulo ?? produto?.nome ?? "",
      id_anuncio: variation.id_anuncio ?? variation.id_marketplace ?? "",
      id_marketplace: variation.id_marketplace ?? variation.id_anuncio ?? "",
      status: variation.status ?? "ativo",
      composicao: Array.isArray(variation.composicao)
        ? variation.composicao
        : [],
    });

    setVariationComposicao(
      Array.isArray(variation.composicao) ? variation.composicao : []
    );

    setModalOpen(true);
    setOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedVariationIndex(null);
    setVariationDraft(null);
    setVariationComposicao([]);
  };

  const saveVariation = () => {
    if (!variationDraft) return;

    const variationToSave: Variation = {
      ...variationDraft,
      sku: variationDraft.sku || variationDraft.referencia || "",
      referencia: variationDraft.referencia || variationDraft.sku || "",
      titulo: variationDraft.titulo || variationDraft.nome || produto?.nome || "",
      nome: variationDraft.nome || variationDraft.titulo || produto?.nome || "",
      id_anuncio: variationDraft.id_anuncio || variationDraft.id_marketplace || "",
      id_marketplace:
        variationDraft.id_marketplace || variationDraft.id_anuncio || "",
      composicao: variationComposicao,
      custoTotal: variationCustoTotal,
    };

    const next =
      selectedVariationIndex === null
        ? [...variacoes, variationToSave]
        : variacoes.map((item, index) =>
            index === selectedVariationIndex ? variationToSave : item
          );

    updateVariations(next);
    closeModal();
  };

  const removeVariation = (index: number) => {
    updateVariations(variacoes.filter((_, i) => i !== index));
  };

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-start justify-between gap-4 text-left transition-colors duration-300 hover:text-white"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
                6.
              </span>

              <h2 className="text-base font-semibold text-white">Variações</h2>

              {variacoes.length > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/50">
                  {variacoes.length}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Gerencie as variações do produto.
            </p>
          </div>

          <motion.div
            animate={{ rotate: open ? 0 : 180 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-1 shrink-0"
          >
            <ChevronUp className="h-4 w-4 text-white/45" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="variations-content"
              initial={{
                height: 0,
                opacity: 0,
                y: -6,
              }}
              animate={{
                height: "auto",
                opacity: 1,
                y: 0,
              }}
              exit={{
                height: 0,
                opacity: 0,
                y: -6,
              }}
              transition={{
                height: {
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.45,
                  ease: "easeOut",
                },
                y: {
                  duration: 0.45,
                  ease: "easeOut",
                },
              }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                {variacoes.length > 0 ? (
                  <div className="space-y-3">
                    {variacoes.map((variation, index) => {
                      const referencia =
                        variation.referencia ||
                        variation.sku ||
                        `Variação ${index + 1}`;

                      const idVar =
                        variation.id_var ||
                        variation.valor ||
                        variation.id ||
                        "Não informado";

                      return (
                        <div
                          key={variation.id ?? `${referencia}-${index}`}
                          className="
                            group rounded-xl border border-white/10 bg-[#0f0f0f] p-3
                            transition-all duration-200
                            hover:border-[#1a8ceb]/35 hover:bg-[#121212]
                          "
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => openEditVariation(variation, index)}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1a8ceb]/20 bg-[#1a8ceb]/10">
                                <Layers className="h-4 w-4 text-[#1a8ceb]" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {referencia}
                                  </p>

                                  <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/40 sm:inline-flex">
                                    Editar
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs text-white/45">
                                  {variation.nome ||
                                    variation.titulo ||
                                    "Sem título definido"}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                    <Hash className="h-3 w-3 text-[#1a8ceb]/70" />
                                    ID variação: {idVar}
                                  </span>

                                  {variation.estoque !== undefined &&
                                    variation.estoque !== "" && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                        <Package className="h-3 w-3 text-[#1a8ceb]/70" />
                                        Estoque: {variation.estoque}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                type="button"
                                onClick={() =>
                                  openEditVariation(variation, index)
                                }
                                variant="ghost"
                                size="sm"
                                className="
                                  h-8 w-8 cursor-pointer rounded-lg border border-white/10
                                  bg-white/[0.03] p-0 text-white/50
                                  hover:bg-white/[0.06] hover:text-white
                                "
                                title="Editar variação"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVariation(index);
                                }}
                                variant="ghost"
                                size="sm"
                                className="
                                  h-8 w-8 cursor-pointer rounded-lg border border-red-500/20
                                  bg-red-500/10 p-0 text-red-400
                                  hover:bg-red-500/20 hover:text-red-300
                                "
                                title="Remover variação"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#181818] px-4 py-5 text-center">
                    <p className="text-sm font-medium text-white/75">
                      Nenhuma variação adicionada
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Adicione variações como voltagem, tamanho, cor ou modelo.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={openNewVariation}
                  variant="outline"
                  className="
                    mt-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-xl
                    border border-white/10 bg-transparent
                    px-4 text-xs font-semibold text-white/85
                    shadow-none transition-all duration-200
                    hover:border-white/20 hover:bg-white/[0.03] hover:text-white
                    active:scale-[0.99]
                    focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/50
                    focus-visible:ring-offset-0
                  "
                >
                  <Plus className="mr-2 h-3.5 w-3.5 text-white/70" />
                  Adicionar variação
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <VariationMarketplaceModal
        open={modalOpen}
        variation={variationDraft}
        setVariation={setVariationDraft}
        composicao={variationComposicao}
        setComposicao={setVariationComposicao}
        custoTotal={variationCustoTotal}
        AnimatedNumber={AnimatedNumber}
        isEditing={selectedVariationIndex !== null}
        onClose={closeModal}
        onSave={saveVariation}
      />
    </>
  );
};