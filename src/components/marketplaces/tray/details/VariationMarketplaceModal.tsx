"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import InfoGeraisBox from "./InfoGeraisBox";
import MedidasBox from "./MedidasBox";
import MarketplaceSection from "./MarketplaceSection";
import CalculoPrecoBox from "./CalculoPrecoBox";
import { CompositionSection } from "@/components/announce/ProductDetails/CompositionSection";

type VariationMarketplaceModalProps = {
  open: boolean;
  variation: any;
  setVariation: any;
  composicao: any[];
  setComposicao: any;
  custoTotal: number | string;
  AnimatedNumber: React.ComponentType<{ value: number }>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
};

export const VariationMarketplaceModal = ({
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
}: VariationMarketplaceModalProps) => {
  const [calculoLoja, setCalculoLoja] = useState({
    desconto: "",
    embalagem: "",
    frete: "",
    imposto: "",
    margem: "",
    comissao: "",
    marketing: "",
  });

  const composicaoTela = Array.isArray(composicao) ? composicao : [];

  const setMarketplaces = (value: any) => {
    if (typeof value === "function") {
      setVariation((p: any) => ({
        ...p,
        marketplaces: value(p?.marketplaces || []),
      }));

      return;
    }

    setVariation((p: any) => ({
      ...p,
      marketplaces: value,
    }));
  };

  const precoLoja = useMemo(() => {
    const custo = Number(
      variation?.custoTotal || variation?.custo || custoTotal || 0
    );

    if (!custo) return 0;

    const parse = (v: any) => parseFloat(String(v).replace(",", ".")) || 0;

    const d = parse(calculoLoja?.desconto) / 100;
    const i = parse(calculoLoja?.imposto) / 100;
    const m = parse(calculoLoja?.margem) / 100;
    const c = parse(calculoLoja?.comissao) / 100;
    const mk = parse(calculoLoja?.marketing) / 100;
    const f = parse(calculoLoja?.frete);

    const divisor = 1 - (i + m + c + mk);
    const preco = divisor > 0 ? (custo * (1 - d) + f + 2.5) / divisor : 0;

    return isFinite(preco) ? preco : 0;
  }, [variation?.custoTotal, variation?.custo, custoTotal, calculoLoja]);

  const handleClearLocal = () => {
    setVariation((p: any) => ({
      ...p,
      referencia: "",
      nome: "",
      marca: "",
      categoria: "",
      peso: "",
      altura: "",
      largura: "",
      comprimento: "",
    }));

    setComposicao([{ codigo: "", quantidade: "", custo: "" }]);
  };

  return (
    <AnimatePresence>
      {open && variation && (
        <motion.div
          key="variation-marketplace-modal"
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
                      {isEditing ? "Editar variação" : "Adicionar variação"}
                    </h3>
                  </div>

                  <p className="mt-2 truncate text-xs text-white/45">
                    {variation?.referencia || variation?.sku || "Nova variação"}
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
                    onClick={onSave}
                    className="
                      h-10 cursor-pointer rounded-xl bg-[#1a8ceb]
                      px-4 text-xs font-semibold text-white
                      shadow-none hover:bg-[#157bd0]
                    "
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Salvar variação
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
              <div
                className="
                  grid grid-cols-1 items-start gap-5
                  xl:grid-cols-[430px_minmax(700px,1fr)_430px]
                "
              >
                <aside className="min-w-0">
                  <CompositionSection
                    composicao={composicaoTela}
                    setComposicao={setComposicao}
                    custoTotal={custoTotal}
                    AnimatedNumber={AnimatedNumber}
                  />
                </aside>

                <main className="min-w-0 space-y-4">
                  <InfoGeraisBox
                    produto={variation}
                    setProduto={setVariation}
                    loading={false}
                  />

                  <MarketplaceSection
                    marketplaces={variation?.marketplaces || []}
                    setMarketplaces={setMarketplaces}
                    loading={false}
                  />
                </main>

                <aside className="min-w-0 space-y-4">
                  <CalculoPrecoBox
                    calculoLoja={calculoLoja}
                    setCalculoLoja={setCalculoLoja}
                    precoLoja={precoLoja}
                    produto={variation}
                    saving={false}
                    handleClearLocal={handleClearLocal}
                  />

                  <MedidasBox
                    produto={variation}
                    setProduto={setVariation}
                    loading={false}
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