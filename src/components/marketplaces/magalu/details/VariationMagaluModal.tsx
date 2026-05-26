"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import InfoGeraisBox from "./InfoGeraisBox";
import CalculoPrecoBox from "./CalculoPrecoBox";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";

type CalculoLoja = {
  desconto: string;
  embalagem: string;
  frete: string;
  imposto: string;
  margem: string;
  comissao: string;
  marketing: string;
};

type VariationMagaluModalProps = {
  open: boolean;
  variation: any;
  setVariation: any;
  composicao: any[];
  setComposicao: any;
  custoTotal: number | string;
  AnimatedNumber: ComponentType<{ value: number }>;
  isEditing: boolean;
  onClose: () => void;
  onSave: (variationAtualizada?: any) => void | Promise<void>;
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

const normalizarQuantidade = (value: any) => {
  if (value === null || value === undefined || value === "") return 1;

  const numero = parseNumero(value);

  return numero > 0 ? numero : 1;
};

const normalizarComposicao = (composicao: any[]) => {
  return (Array.isArray(composicao) ? composicao : []).map((item: any) => ({
    ...item,
    codigo: item?.codigo ?? item?.Codigo ?? item?.Código ?? "",
    produto: item?.produto ?? item?.Produto ?? item?.descricao ?? "",
    descricao: item?.descricao ?? item?.produto ?? item?.Produto ?? "",
    quantidade: normalizarQuantidade(item?.quantidade ?? item?.Quantidade),
    custo: parseNumero(item?.custo ?? item?.Custo),
  }));
};

const calcCustoTotal = (composicao: any[]) => {
  return normalizarComposicao(composicao).reduce((total, item) => {
    const quantidade = normalizarQuantidade(item?.quantidade);
    const custo = parseNumero(item?.custo);

    return total + quantidade * custo;
  }, 0);
};

const normalizarReferenciaMarketplace = (
  referencia: string | null | undefined,
  tipo: "PAI" | "VAR",
) => {
  let ref = removerAcentos(String(referencia || "")).trim().toUpperCase();

  if (!ref) return "";

  ref = ref
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

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

  if (partes.length === 2) {
    return `${tipo}-${marca}-${partes[1]}`;
  }

  if (partes.length >= 3) {
    return `${tipo}-${marca}-${partes.slice(1).join("_")}`;
  }

  return `${tipo}-${ref.replace(/\s+/g, "")}`;
};

const getReferenciaVariation = (variation: any) => {
  return (
    variation?.referencia ??
    variation?.Referencia ??
    variation?.["Referência"] ??
    variation?.sku ??
    variation?.dados?.referencia ??
    variation?.dados?.Referencia ??
    variation?.dados?.["Referência"] ??
    variation?.dados?.sku ??
    ""
  );
};

const getInitialCalculoLoja = (variation: any): CalculoLoja => {
  return {
    desconto: String(
      variation?.calculoLoja?.desconto ??
        variation?.desconto ??
        variation?.Desconto ??
        variation?.dados?.calculoLoja?.desconto ??
        variation?.dados?.desconto ??
        variation?.dados?.Desconto ??
        "",
    ),
    embalagem: String(
      variation?.calculoLoja?.embalagem ??
        variation?.embalagem ??
        variation?.Embalagem ??
        variation?.dados?.calculoLoja?.embalagem ??
        variation?.dados?.embalagem ??
        variation?.dados?.Embalagem ??
        "",
    ),
    frete: String(
      variation?.calculoLoja?.frete ??
        variation?.frete ??
        variation?.Frete ??
        variation?.dados?.calculoLoja?.frete ??
        variation?.dados?.frete ??
        variation?.dados?.Frete ??
        "",
    ),
    imposto: String(
      variation?.calculoLoja?.imposto ??
        variation?.imposto ??
        variation?.Imposto ??
        variation?.dados?.calculoLoja?.imposto ??
        variation?.dados?.imposto ??
        variation?.dados?.Imposto ??
        "",
    ),
    margem: String(
      variation?.calculoLoja?.margem ??
        variation?.margem ??
        variation?.margem_lucro ??
        variation?.["Margem de Lucro"] ??
        variation?.dados?.calculoLoja?.margem ??
        variation?.dados?.margem ??
        variation?.dados?.margem_lucro ??
        variation?.dados?.["Margem de Lucro"] ??
        "",
    ),
    comissao: String(
      variation?.calculoLoja?.comissao ??
        variation?.comissao ??
        variation?.Comissão ??
        variation?.Comissao ??
        variation?.dados?.calculoLoja?.comissao ??
        variation?.dados?.comissao ??
        variation?.dados?.Comissão ??
        variation?.dados?.Comissao ??
        "",
    ),
    marketing: String(
      variation?.calculoLoja?.marketing ??
        variation?.marketing ??
        variation?.Marketing ??
        variation?.dados?.calculoLoja?.marketing ??
        variation?.dados?.marketing ??
        variation?.dados?.Marketing ??
        "",
    ),
  };
};

const sanitizeCalculoLoja = (calculoLoja: CalculoLoja): CalculoLoja => {
  return {
    desconto: String(calculoLoja.desconto ?? "").replace(/[^\d.,-]/g, ""),
    embalagem: String(calculoLoja.embalagem ?? "").replace(/[^\d.,-]/g, ""),
    frete: String(calculoLoja.frete ?? "").replace(/[^\d.,-]/g, ""),
    imposto: String(calculoLoja.imposto ?? "").replace(/[^\d.,-]/g, ""),
    margem: String(calculoLoja.margem ?? "").replace(/[^\d.,-]/g, ""),
    comissao: String(calculoLoja.comissao ?? "").replace(/[^\d.,-]/g, ""),
    marketing: String(calculoLoja.marketing ?? "").replace(/[^\d.,-]/g, ""),
  };
};

const montarCamposPercentuaisParaSalvar = (calculoLoja: CalculoLoja) => {
  return {
    calculoLoja,

    desconto: calculoLoja.desconto,
    Desconto: calculoLoja.desconto,

    embalagem: calculoLoja.embalagem,
    Embalagem: calculoLoja.embalagem,

    frete: calculoLoja.frete,
    Frete: calculoLoja.frete,

    imposto: calculoLoja.imposto,
    Imposto: calculoLoja.imposto,

    margem: calculoLoja.margem,
    margem_lucro: calculoLoja.margem,
    "Margem de Lucro": calculoLoja.margem,

    comissao: calculoLoja.comissao,
    Comissao: calculoLoja.comissao,
    Comissão: calculoLoja.comissao,

    marketing: calculoLoja.marketing,
    Marketing: calculoLoja.marketing,
  };
};

export const VariationMagaluModal = ({
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
}: VariationMagaluModalProps) => {
  const [calculoLoja, setCalculoLoja] = useState<CalculoLoja>({
    desconto: "",
    embalagem: "",
    frete: "",
    imposto: "",
    margem: "",
    comissao: "",
    marketing: "",
  });

  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!variation || !open) return;

    setCalculoLoja(getInitialCalculoLoja(variation));
  }, [variation, open]);

  const composicaoTela = useMemo(() => {
    return normalizarComposicao(Array.isArray(composicao) ? composicao : []);
  }, [composicao]);

  const custoTotalCalculado = useMemo(() => {
    const custoDaComposicao = calcCustoTotal(composicaoTela);

    if (custoDaComposicao > 0) return custoDaComposicao;

    const custoInformado =
      custoTotal ??
      variation?.custoTotal ??
      variation?.custo_total ??
      variation?.custo ??
      variation?.Custo ??
      variation?.dados?.custoTotal ??
      variation?.dados?.custo_total ??
      variation?.dados?.custo ??
      variation?.dados?.Custo ??
      0;

    return parseNumero(custoInformado);
  }, [
    composicaoTela,
    custoTotal,
    variation?.custoTotal,
    variation?.custo_total,
    variation?.custo,
    variation?.Custo,
    variation?.dados?.custoTotal,
    variation?.dados?.custo_total,
    variation?.dados?.custo,
    variation?.dados?.Custo,
  ]);

  const precoLoja = useMemo(() => {
    const custo = parseNumero(
      custoTotalCalculado ||
        variation?.custoTotal ||
        variation?.custo_total ||
        variation?.custo ||
        variation?.Custo ||
        variation?.dados?.custoTotal ||
        variation?.dados?.custo_total ||
        variation?.dados?.custo ||
        variation?.dados?.Custo ||
        0,
    );

    if (!custo) return 0;

    const calculoSeguro = sanitizeCalculoLoja(calculoLoja);

    const desconto = parseNumero(calculoSeguro.desconto) / 100;
    const embalagem = parseNumero(calculoSeguro.embalagem);
    const frete = parseNumero(calculoSeguro.frete);
    const imposto = parseNumero(calculoSeguro.imposto) / 100;
    const margem = parseNumero(calculoSeguro.margem) / 100;
    const comissao = parseNumero(calculoSeguro.comissao) / 100;
    const marketing = parseNumero(calculoSeguro.marketing) / 100;

    const divisor = 1 - (imposto + margem + comissao + marketing);

    const preco =
      divisor > 0 ? (custo * (1 - desconto) + embalagem + frete) / divisor : 0;

    return Number.isFinite(preco) ? Number(preco.toFixed(2)) : 0;
  }, [
    custoTotalCalculado,
    variation?.custoTotal,
    variation?.custo_total,
    variation?.custo,
    variation?.Custo,
    variation?.dados?.custoTotal,
    variation?.dados?.custo_total,
    variation?.dados?.custo,
    variation?.dados?.Custo,
    calculoLoja,
  ]);

  const handleClearLocal = () => {
    setCalculoLoja({
      desconto: "",
      embalagem: "",
      frete: "",
      imposto: "",
      margem: "",
      comissao: "",
      marketing: "",
    });

    if (isEditing) return;

    setVariation((p: any) => ({
      ...p,
      referencia: "",
      Referencia: "",
      "Referência": "",
      sku: "",

      nome: "",
      Nome: "",
      titulo: "",

      marca: "",
      Marca: "",

      categoria: "",
      Categoria: "",

      peso: "",
      Peso: "",

      altura: "",
      Altura: "",

      largura: "",
      Largura: "",

      comprimento: "",
      Comprimento: "",

      custoTotal: 0,
      custo_total: 0,
      custo: 0,
      Custo: 0,

      preco: "",
      precoLoja: "",
      preco_loja: "",
      "Preço de Venda": "",

      marketplaces: [],

      dados: {
        ...(p?.dados || {}),
        referencia: "",
        Referencia: "",
        "Referência": "",
        sku: "",

        nome: "",
        Nome: "",
        titulo: "",

        marca: "",
        Marca: "",

        categoria: "",
        Categoria: "",

        peso: "",
        Peso: "",

        altura: "",
        Altura: "",

        largura: "",
        Largura: "",

        comprimento: "",
        Comprimento: "",

        custoTotal: 0,
        custo_total: 0,
        custo: 0,
        Custo: 0,

        preco: "",
        precoLoja: "",
        preco_loja: "",
        "Preço de Venda": "",

        marketplaces: [],
      },
    }));

    setComposicao([{ codigo: "", quantidade: "", custo: "" }]);
  };

  const handleSaveVariation = async () => {
    if (!variation || savingLocal) return;

    setSavingLocal(true);

    try {
      const referenciaNormalizada = normalizarReferenciaMarketplace(
        getReferenciaVariation(variation),
        "VAR",
      );

      const composicaoNormalizada = normalizarComposicao(composicaoTela);
      const custoDaComposicao = calcCustoTotal(composicaoNormalizada);
      const custoFinal =
        custoDaComposicao > 0 ? custoDaComposicao : custoTotalCalculado;

      const calculoSeguro = sanitizeCalculoLoja(calculoLoja);
      const camposPercentuais =
        montarCamposPercentuaisParaSalvar(calculoSeguro);

      const referenciaFinal = isEditing
        ? getReferenciaVariation(variation)
        : referenciaNormalizada;

      const composicaoFinal = isEditing
        ? normalizarComposicao(
            Array.isArray(variation?.composicao)
              ? variation.composicao
              : Array.isArray(variation?.dados?.composicao)
                ? variation.dados.composicao
                : [],
          )
        : composicaoNormalizada;

      const custoFinalSeguro = isEditing
        ? parseNumero(
            variation?.custoTotal ??
              variation?.custo_total ??
              variation?.custo ??
              variation?.Custo ??
              variation?.dados?.custoTotal ??
              variation?.dados?.custo_total ??
              variation?.dados?.custo ??
              variation?.dados?.Custo ??
              custoFinal,
          )
        : custoFinal;

      const precoFinal = precoLoja;

      const variationAtualizada = {
        ...variation,

        marketplace_id:
          variation?.marketplace_id ??
          variation?.id_marketplace ??
          variation?.id ??
          variation?.dados?.marketplace_id ??
          variation?.dados?.id_marketplace ??
          variation?.dados?.id ??
          "",

        anuncio_id:
          variation?.anuncio_id ??
          variation?.ID ??
          variation?.dados?.anuncio_id ??
          variation?.dados?.ID ??
          "",

        id_logico:
          variation?.id_logico ??
          variation?.ID ??
          variation?.dados?.id_logico ??
          variation?.dados?.ID ??
          "",

        marketplace: "Magalu",
        canal: "Magalu",
        tipo_anuncio: "variacoes",

        referencia: referenciaFinal,
        Referencia: referenciaFinal,
        "Referência": referenciaFinal,
        sku: referenciaFinal,

        composicao: composicaoFinal,

        custoTotal: custoFinalSeguro,
        custo_total: custoFinalSeguro,
        custo: custoFinalSeguro,
        Custo: custoFinalSeguro,

        ...camposPercentuais,

        preco: precoFinal,
        precoLoja: precoFinal,
        preco_loja: precoFinal,
        "Preço de Venda": precoFinal,

        marketplaces: [],

        dados: {
          ...(variation?.dados || {}),

          marketplace_id:
            variation?.marketplace_id ??
            variation?.id_marketplace ??
            variation?.id ??
            variation?.dados?.marketplace_id ??
            variation?.dados?.id_marketplace ??
            variation?.dados?.id ??
            "",

          anuncio_id:
            variation?.anuncio_id ??
            variation?.ID ??
            variation?.dados?.anuncio_id ??
            variation?.dados?.ID ??
            "",

          id_logico:
            variation?.id_logico ??
            variation?.ID ??
            variation?.dados?.id_logico ??
            variation?.dados?.ID ??
            "",

          marketplace: "Magalu",
          canal: "Magalu",
          tipo_anuncio: "variacoes",

          referencia: referenciaFinal,
          Referencia: referenciaFinal,
          "Referência": referenciaFinal,
          sku: referenciaFinal,

          composicao: composicaoFinal,

          custoTotal: custoFinalSeguro,
          custo_total: custoFinalSeguro,
          custo: custoFinalSeguro,
          Custo: custoFinalSeguro,

          ...camposPercentuais,

          preco: precoFinal,
          precoLoja: precoFinal,
          preco_loja: precoFinal,
          "Preço de Venda": precoFinal,

          marketplaces: [],
        },
      };

      setVariation(variationAtualizada);
      await onSave(variationAtualizada);
    } finally {
      setSavingLocal(false);
    }
  };

  return (
    <AnimatePresence>
      {open && variation && (
        <motion.div
          key="variation-magalu-modal"
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
              relative w-full max-w-[1880px] rounded-2xl border border-white/10
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
                      6.
                    </span>

                    <h3 className="truncate text-base font-semibold text-white">
                      {isEditing
                        ? "Editar variação Magalu"
                        : "Adicionar variação Magalu"}
                    </h3>
                  </div>

                  <p className="mt-2 truncate text-xs text-white/45">
                    {normalizarReferenciaMarketplace(
                      getReferenciaVariation(variation),
                      "VAR",
                    ) || "Nova variação Magalu"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    disabled={savingLocal}
                    className="
                      h-10 cursor-pointer rounded-xl border-white/10
                      bg-transparent px-4 text-xs font-semibold text-white/75
                      shadow-none hover:bg-white/[0.03] hover:text-white
                      disabled:cursor-wait disabled:opacity-60
                    "
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveVariation}
                    disabled={savingLocal}
                    className="
                      h-10 cursor-pointer rounded-xl bg-[#1a8ceb]
                      px-5 text-xs font-semibold text-white
                      shadow-none hover:bg-[#157bd0]
                      disabled:cursor-wait disabled:opacity-60
                    "
                  >
                    {savingLocal ? "Salvando..." : "Salvar"}
                  </Button>

                  <Button
                    type="button"
                    onClick={onClose}
                    variant="ghost"
                    disabled={savingLocal}
                    className="
                      h-10 w-10 cursor-pointer rounded-xl border border-white/10
                      bg-white/[0.03] p-0 text-white/55
                      hover:bg-white/[0.06] hover:text-white
                      disabled:cursor-wait disabled:opacity-60
                    "
                    title="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-5">
              <div
                className="
                  grid grid-cols-1 items-start gap-5
                  xl:grid-cols-[430px_minmax(700px,1fr)_430px]
                "
              >
                <aside
                  className={`
                    min-w-0
                    ${
                      isEditing
                        ? "pointer-events-none select-none opacity-45"
                        : ""
                    }
                  `}
                  aria-disabled={isEditing}
                >
                  <CompositionSection
                    composicao={composicaoTela}
                    setComposicao={setComposicao}
                    custoTotal={custoTotalCalculado}
                    AnimatedNumber={AnimatedNumber}
                  />
                </aside>

                <main
                  className={`
                    min-w-0 space-y-4
                    ${
                      isEditing
                        ? "pointer-events-none select-none opacity-45"
                        : ""
                    }
                  `}
                  aria-disabled={isEditing}
                >
                  <InfoGeraisBox
                    produto={{
                      ...variation,
                      marketplace: "Magalu",
                      canal: "Magalu",
                      custoTotal: custoTotalCalculado,
                      custo_total: custoTotalCalculado,
                      custo: custoTotalCalculado,
                      Custo: custoTotalCalculado,
                      preco: precoLoja,
                      precoLoja,
                      preco_loja: precoLoja,
                      "Preço de Venda": precoLoja,
                    }}
                    setProduto={setVariation}
                    loading={false}
                    bloquearEdicao={isEditing}
                  />
                </main>

                <aside className="min-w-0 space-y-4">
                  <CalculoPrecoBox
                    calculoLoja={calculoLoja}
                    setCalculoLoja={setCalculoLoja}
                    precoLoja={precoLoja}
                    loading={savingLocal}
                    produto={{
                      ...variation,
                      marketplace: "Magalu",
                      canal: "Magalu",
                      custoTotal: custoTotalCalculado,
                      custo_total: custoTotalCalculado,
                      custo: custoTotalCalculado,
                      Custo: custoTotalCalculado,
                      preco: precoLoja,
                      precoLoja,
                      preco_loja: precoLoja,
                      "Preço de Venda": precoLoja,
                    }}
                    saving={savingLocal}
                    handleClearLocal={handleClearLocal}
                  />
                </aside>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VariationMagaluModal;