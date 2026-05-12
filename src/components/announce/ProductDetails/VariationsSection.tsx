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
  DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { VariationModal } from "./VariationModal";

type Variation = {
  id?: string | number;
  ID?: string | number;

  sku?: string;
  nome?: string;
  Nome?: string;

  valor?: string;
  estoque?: string | number;

  loja?: string;
  Loja?: string;

  tipo_anuncio?: string;

  referencia?: string;
  Referencia?: string;
  "Referência"?: string;

  id_var?: string;
  "ID Var"?: string;

  id_bling?: string;
  "ID Bling"?: string;

  id_tray?: string;
  "ID Tray"?: string;

  od?: string;
  OD?: string;

  categoria?: string;
  Categoria?: string;

  marca?: string;
  Marca?: string;

  peso?: string | number;
  Peso?: string | number;

  altura?: string | number;
  Altura?: string | number;

  largura?: string | number;
  Largura?: string | number;

  comprimento?: string | number;
  Comprimento?: string | number;

  composicao?: any[];

  custoTotal?: number | string;
  custo_total?: number | string;
  custo?: number | string;
  Custo?: number | string;

  [key: string]: any;
};

type VariationsSectionProps = {
  produto: any;
  setProduto: any;
  AnimatedNumber: React.ComponentType<{ value: number }>;
};

const removerAcentos = (value: string) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
};

const parseNumero = (value: any) => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let str = String(value).trim();

  str = str.replace(/[^\d.,-]/g, "");

  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");

  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }

  const n = Number(str);

  return Number.isFinite(n) ? n : 0;
};

const formatCurrencyBR = (value: any) => {
  const numero = parseNumero(value);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const normalizarCodigoBaseNovoPadrao = (
  referencia?: string | null
): string => {
  let ref = removerAcentos(String(referencia || ""))
    .trim()
    .toUpperCase();

  if (!ref) return "";

  while (/^\s*(PAI|VAR)\s*[-_\s]*/i.test(ref)) {
    ref = ref.replace(/^\s*(PAI|VAR)\s*[-_\s]*/i, "").trim();
  }

  ref = ref
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
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

  if (partes.length === 2) {
    return `${marca}-${partes[1]}`;
  }

  if (partes.length >= 3) {
    return `${marca}-${partes.slice(1).join("_")}`;
  }

  return ref.replace(/\s+/g, "");
};

const getReferenciaPai = (produto: any) => {
  return (
    produto?.referencia ??
    produto?.Referencia ??
    produto?.["Referência"] ??
    produto?.sku ??
    ""
  );
};

const criarReferenciaPaiNovoPadrao = (referencia?: string | null) => {
  const codigoBase = normalizarCodigoBaseNovoPadrao(referencia);
  return codigoBase ? `PAI-${codigoBase}` : "PAI-";
};

const criarReferenciaVariacaoNovoPadrao = (referencia?: string | null) => {
  const codigoBase = normalizarCodigoBaseNovoPadrao(referencia);
  return codigoBase ? `VAR-${codigoBase}` : "VAR-";
};

const normalizarComposicao = (composicao: any[]) => {
  return (Array.isArray(composicao) ? composicao : []).map((item: any) => ({
    ...item,
    codigo: item?.codigo ?? "",
    produto: item?.produto ?? item?.Produto ?? item?.descricao ?? "",
    descricao: item?.descricao ?? item?.produto ?? item?.Produto ?? "",
    quantidade: parseNumero(item?.quantidade),
    custo: parseNumero(item?.custo),
  }));
};

const calcCustoTotal = (composicao: any[]) => {
  return normalizarComposicao(composicao).reduce((total, item) => {
    const quantidade = parseNumero(item?.quantidade);
    const custo = parseNumero(item?.custo);

    return total + quantidade * custo;
  }, 0);
};

const getCustoVariation = (variation: Variation) => {
  return parseNumero(
    variation?.custoTotal ??
      variation?.custo_total ??
      variation?.custo ??
      variation?.Custo ??
      0
  );
};

const normalizarVariationParaSalvar = (
  variation: Variation,
  produtoPai?: any
): Variation => {
  const referenciaFonte =
    variation.referencia ||
    variation.sku ||
    variation.Referencia ||
    variation["Referência"] ||
    "";

  const referenciaNormalizada =
    criarReferenciaVariacaoNovoPadrao(referenciaFonte);

  const lojaPai = produtoPai?.loja ?? produtoPai?.Loja ?? variation.loja ?? "";
  const lojaPaiDisplay =
    produtoPai?.Loja ?? produtoPai?.loja ?? variation.Loja ?? lojaPai;

  const composicaoNormalizada = normalizarComposicao(
    Array.isArray(variation.composicao) ? variation.composicao : []
  );

  const custoTotalNormalizado =
    variation.custoTotal !== undefined && variation.custoTotal !== null
      ? parseNumero(variation.custoTotal)
      : variation.custo_total !== undefined && variation.custo_total !== null
        ? parseNumero(variation.custo_total)
        : variation.custo !== undefined && variation.custo !== null
          ? parseNumero(variation.custo)
          : variation.Custo !== undefined && variation.Custo !== null
            ? parseNumero(variation.Custo)
            : calcCustoTotal(composicaoNormalizada);

  return {
    ...variation,

    loja: lojaPai,
    Loja: lojaPaiDisplay,

    tipo_anuncio: "variacoes",

    referencia: referenciaNormalizada,
    sku: referenciaNormalizada,
    Referencia: referenciaNormalizada,
    "Referência": referenciaNormalizada,

    composicao: composicaoNormalizada,

    custoTotal: custoTotalNormalizado,
    custo_total: custoTotalNormalizado,
    custo: custoTotalNormalizado,
    Custo: custoTotalNormalizado,
  };
};

const createEmptyVariation = (produto: any): Variation => {
  const referenciaPai = getReferenciaPai(produto);
  const codigoBasePai = normalizarCodigoBaseNovoPadrao(referenciaPai);

  let referenciaVariacao = "VAR-";

  if (codigoBasePai) {
    const partes = codigoBasePai.split("-");
    const marca = partes[0] || "";
    const codigos = (partes[1] || "").split("_").filter(Boolean);
    const primeiroCodigo = codigos[0] || "";

    referenciaVariacao =
      marca && primeiroCodigo ? `VAR-${marca}-${primeiroCodigo}` : "VAR-";
  }

  const loja = produto?.loja ?? produto?.Loja ?? "";
  const nome = produto?.nome ?? produto?.Nome ?? "";
  const marca = produto?.marca ?? produto?.Marca ?? "";
  const categoria = produto?.categoria ?? produto?.Categoria ?? "";

  const peso = produto?.peso ?? produto?.Peso ?? "";
  const altura = produto?.altura ?? produto?.Altura ?? "";
  const largura = produto?.largura ?? produto?.Largura ?? "";
  const comprimento = produto?.comprimento ?? produto?.Comprimento ?? "";

  return {
    loja,
    Loja: loja,

    tipo_anuncio: "variacoes",

    nome,
    Nome: nome,

    referencia: referenciaVariacao,
    sku: referenciaVariacao,
    Referencia: referenciaVariacao,
    "Referência": referenciaVariacao,

    id_var: "",
    "ID Var": "",

    id_bling: "",
    "ID Bling": "",

    id_tray: "",
    "ID Tray": "",

    od: "",
    OD: "",

    categoria,
    Categoria: categoria,

    marca,
    Marca: marca,

    peso,
    Peso: peso,

    altura,
    Altura: altura,

    largura,
    Largura: largura,

    comprimento,
    Comprimento: comprimento,

    estoque: "",

    composicao: [],

    custoTotal: 0,
    custo_total: 0,
    custo: 0,
    Custo: 0,
  };
};

export const VariationsSection = ({
  produto,
  setProduto,
  AnimatedNumber,
}: VariationsSectionProps) => {
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
    const referenciaPaiNormalizada = criarReferenciaPaiNovoPadrao(
      getReferenciaPai(produto)
    );

    setProduto((p: any) => ({
      ...p,
      tipo_anuncio: "variacoes",

      referencia: referenciaPaiNormalizada,
      Referencia: referenciaPaiNormalizada,
      "Referência": referenciaPaiNormalizada,
      sku: referenciaPaiNormalizada,

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
    const composicaoNormalizada = normalizarComposicao(
      Array.isArray(variation.composicao) ? variation.composicao : []
    );

    const custoCalculado = calcCustoTotal(composicaoNormalizada);

    const custoExistente = parseNumero(
      variation.custoTotal ??
        variation.custo_total ??
        variation.custo ??
        variation.Custo ??
        custoCalculado
    );

    const normalizedVariation = normalizarVariationParaSalvar(
      {
        ...variation,
        sku:
          variation.sku ??
          variation.referencia ??
          variation.Referencia ??
          variation["Referência"] ??
          "",
        referencia:
          variation.referencia ??
          variation.sku ??
          variation.Referencia ??
          variation["Referência"] ??
          "",
        composicao: composicaoNormalizada,
        custoTotal: custoExistente,
        custo_total: custoExistente,
        custo: custoExistente,
        Custo: custoExistente,
      },
      produto
    );

    setSelectedVariationIndex(index);
    setVariationDraft(normalizedVariation);

    setVariationComposicao(
      Array.isArray(normalizedVariation.composicao)
        ? normalizedVariation.composicao
        : []
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

  const saveVariation = (variationAtualizada?: Variation) => {
    const baseVariation = variationAtualizada ?? variationDraft;

    if (!baseVariation) return;

    const composicaoNormalizada = normalizarComposicao(
      Array.isArray(baseVariation.composicao)
        ? baseVariation.composicao
        : variationComposicao
    );

    const custoTotalNormalizado =
      baseVariation.custoTotal !== undefined && baseVariation.custoTotal !== null
        ? parseNumero(baseVariation.custoTotal)
        : baseVariation.custo_total !== undefined &&
            baseVariation.custo_total !== null
          ? parseNumero(baseVariation.custo_total)
          : baseVariation.custo !== undefined && baseVariation.custo !== null
            ? parseNumero(baseVariation.custo)
            : baseVariation.Custo !== undefined && baseVariation.Custo !== null
              ? parseNumero(baseVariation.Custo)
              : calcCustoTotal(composicaoNormalizada);

    const variationToSave: Variation = normalizarVariationParaSalvar(
      {
        ...baseVariation,

        sku:
          baseVariation.sku ||
          baseVariation.referencia ||
          baseVariation.Referencia ||
          baseVariation["Referência"] ||
          "",

        referencia:
          baseVariation.referencia ||
          baseVariation.sku ||
          baseVariation.Referencia ||
          baseVariation["Referência"] ||
          "",

        composicao: composicaoNormalizada,

        custoTotal: custoTotalNormalizado,
        custo_total: custoTotalNormalizado,
        custo: custoTotalNormalizado,
        Custo: custoTotalNormalizado,
      },
      produto
    );

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
                5.
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
                        variation["Referência"] ||
                        variation.sku ||
                        `Variação ${index + 1}`;

                      const idVar =
                        variation.id_var ||
                        variation["ID Var"] ||
                        variation.valor ||
                        variation.id ||
                        "Não informado";

                      const custoDaVariacao = getCustoVariation(variation);

                      return (
                        <div
                          key={
                            variation.id ??
                            variation.ID ??
                            `${referencia}-${index}`
                          }
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
                                </div>

                                <p className="mt-1 truncate text-xs text-white/45">
                                  {variation.nome ||
                                    variation.Nome ||
                                    "Sem título definido"}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                    <Hash className="h-3 w-3 text-[#1a8ceb]/70" />
                                    ID variação: {idVar}
                                  </span>

                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/45">
                                    <DollarSign className="h-3 w-3 text-[#1a8ceb]/70" />
                                    Custo: {formatCurrencyBR(custoDaVariacao)}
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

      <VariationModal
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