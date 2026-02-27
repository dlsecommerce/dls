import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, ArrowUpCircle } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
import { ClearAndDownloadActions } from "./ClearAndDownloadActions";
import { PriceBlock } from "./PriceBlock";
import { AcrescimosSection } from "./AcrescimosSection";
import type { Calculo } from "../PricingCalculatorModern";

type PriceCalculationSectionProps = {
  calculoLoja: Calculo;
  setCalculoLoja: (c: Calculo) => void;
  calculoShopee: Calculo;
  setCalculoShopee: (c: Calculo) => void;
  calculoMLClassico: Calculo;
  setCalculoMLClassico: (c: Calculo) => void;
  calculoMLPremium: Calculo;
  setCalculoMLPremium: (c: Calculo) => void;

  precoLoja: number;
  precoShopee: number;
  precoMLClassico: number;
  precoMLPremium: number;

  acrescimos: any;
  setAcrescimos: (value: any) => void;

  isEditing: (key: string) => boolean;
  setEditing: (key: string, editing: boolean) => void;
  toDisplay: (v: string) => string;
  toInternal: (v: string) => string;

  handleLinearNav: (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.MutableRefObject<HTMLInputElement[]>,
    total: number
  ) => void;

  calcLojaRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcShopeeRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcMLClassicoRefs: React.MutableRefObject<HTMLInputElement[]>;
  calcMLPremiumRefs: React.MutableRefObject<HTMLInputElement[]>;
  acrescimosRefs: React.MutableRefObject<HTMLInputElement[]>;

  handleEmbalagemBlurShared: (raw: string) => void;
  handleEmbalagemChangeShared: (raw: string) => void;
  handleEmbalagemBlurShopee: (raw: string) => void;
  handleEmbalagemChangeShopee: (raw: string) => void;

  handleDownload: () => void;
  handleClearAll: () => void;
  isClearing: boolean;
  clicks: number;

  statusAcrescimo: any;

  syncDescontoFromLoja: (descontoInternal: string) => void;

  userEditedShopeeComissao: boolean;
  setUserEditedShopeeComissao: (v: boolean) => void;
  userEditedShopeeFrete: boolean;
  setUserEditedShopeeFrete: (v: boolean) => void;

  userEditedShopeeImposto: boolean;
  setUserEditedShopeeImposto: (v: boolean) => void;
  userEditedShopeeMargem: boolean;
  setUserEditedShopeeMargem: (v: boolean) => void;
  userEditedShopeeMarketing: boolean;
  setUserEditedShopeeMarketing: (v: boolean) => void;
  userEditedShopeeEmbalagem: boolean;
  setUserEditedShopeeEmbalagem: (v: boolean) => void;
};

type BlockKey = "loja" | "shopee" | "mlClassico" | "mlPremium";

const BLOCKS: Array<{ key: BlockKey; nome: string; blocoIndex: number }> = [
  { key: "loja", nome: "Preço Loja", blocoIndex: 0 },
  { key: "shopee", nome: "Preço Shopee", blocoIndex: 1 },
  { key: "mlClassico", nome: "Preço ML Clássico", blocoIndex: 2 },
  { key: "mlPremium", nome: "Preço ML Premium", blocoIndex: 3 },
];

export const PriceCalculationSection: React.FC<PriceCalculationSectionProps> = ({
  calculoLoja,
  setCalculoLoja,
  calculoShopee,
  setCalculoShopee,
  calculoMLClassico,
  setCalculoMLClassico,
  calculoMLPremium,
  setCalculoMLPremium,
  precoLoja,
  precoShopee,
  precoMLClassico,
  precoMLPremium,
  acrescimos,
  setAcrescimos,
  isEditing,
  setEditing,
  toDisplay,
  toInternal,
  handleLinearNav,
  calcLojaRefs,
  calcShopeeRefs,
  calcMLClassicoRefs,
  calcMLPremiumRefs,
  acrescimosRefs,
  handleEmbalagemBlurShared,
  handleEmbalagemChangeShared,
  handleEmbalagemBlurShopee,
  handleEmbalagemChangeShopee,
  handleDownload,
  handleClearAll,
  isClearing,
  clicks,
  statusAcrescimo,
  syncDescontoFromLoja,
  userEditedShopeeComissao,
  setUserEditedShopeeComissao,
  userEditedShopeeFrete,
  setUserEditedShopeeFrete,
  userEditedShopeeImposto,
  setUserEditedShopeeImposto,
  userEditedShopeeMargem,
  setUserEditedShopeeMargem,
  userEditedShopeeMarketing,
  setUserEditedShopeeMarketing,
  userEditedShopeeEmbalagem,
  setUserEditedShopeeEmbalagem,
}) => {
  const isEmptyOrZero = (v: string) => {
    const s = (v || "").trim();
    if (!s) return true;
    const n = Number(s);
    return !isFinite(n) || n === 0;
  };

  // ✅ Blocos visíveis
  const [visible, setVisible] = React.useState<Record<BlockKey, boolean>>({
    loja: true,
    shopee: true,
    mlClassico: true,
    mlPremium: true,
  });

  // 🔒 mantém pelo menos 1 visível
  const ensureAtLeastOneVisible = React.useCallback(
    (next: Record<BlockKey, boolean>) => {
      const count = Object.values(next).filter(Boolean).length;
      if (count === 0) return { ...next, loja: true };
      return next;
    },
    []
  );

  const minimize = React.useCallback(
    (key: BlockKey) => {
      setVisible((prev) => ensureAtLeastOneVisible({ ...prev, [key]: false }));
    },
    [ensureAtLeastOneVisible]
  );

  const restore = React.useCallback((key: BlockKey) => {
    setVisible((prev) => ({ ...prev, [key]: true }));
  }, []);

  const visibleCount = React.useMemo(
    () => Object.values(visible).filter(Boolean).length,
    [visible]
  );

  const hiddenBlocks = BLOCKS.filter((b) => !visible[b.key]);

  // ✅ Grid dinâmico para ocupar tudo e não deixar buraco
  const gridClass = React.useMemo(() => {
    // base (mobile/tablet) continua responsivo
    // no XL a gente ajusta pra não sobrar espaços
    if (visibleCount <= 1) {
      return "grid grid-cols-1 gap-2 mb-2";
    }
    if (visibleCount === 2) {
      return "grid grid-cols-1 md:grid-cols-2 gap-2 mb-2";
    }
    if (visibleCount === 3) {
      return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mb-2";
    }
    return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-2";
  }, [visibleCount]);

  return (
    <motion.div
      className="lg:col-span-6 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1a8ceb]" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Cálculo de Preço
              <HelpTooltip text="Preços de Venda." />
            </h3>
          </div>

          <ClearAndDownloadActions
            handleDownload={handleDownload}
            handleClearAll={handleClearAll}
            isClearing={isClearing}
            clicks={clicks}
          />
        </div>

        {/* ✅ GRID DINÂMICO (sem espaço vazio) */}
        <div className={gridClass}>
          <AnimatePresence initial={false}>
            {visible.loja && (
              <motion.div
                key="loja"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <PriceBlock
                  nome="Preço Loja"
                  blocoIndex={0}
                  state={calculoLoja}
                  setState={setCalculoLoja}
                  preco={precoLoja}
                  refs={calcLojaRefs}
                  isEditing={isEditing}
                  setEditing={setEditing}
                  toDisplay={toDisplay}
                  toInternal={toInternal}
                  handleLinearNav={handleLinearNav}
                  handleEmbalagemBlur={handleEmbalagemBlurShared}
                  handleEmbalagemChange={handleEmbalagemChangeShared}
                  onFieldChange={(key, internalValue) => {
                    if (key === "desconto") syncDescontoFromLoja(internalValue);
                    else setCalculoLoja({ ...calculoLoja, [key]: internalValue });
                  }}
                  onFieldBlur={(key, internalValue) => {
                    if (key === "desconto") syncDescontoFromLoja(internalValue);
                    else setCalculoLoja({ ...calculoLoja, [key]: internalValue });
                  }}
                  onMinimize={() => minimize("loja")}
                />
              </motion.div>
            )}

            {visible.shopee && (
              <motion.div
                key="shopee"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <PriceBlock
                  nome="Preço Shopee"
                  blocoIndex={1}
                  state={calculoShopee}
                  setState={setCalculoShopee}
                  preco={precoShopee}
                  refs={calcShopeeRefs}
                  isEditing={isEditing}
                  setEditing={setEditing}
                  toDisplay={toDisplay}
                  toInternal={toInternal}
                  handleLinearNav={handleLinearNav}
                  handleEmbalagemBlur={handleEmbalagemBlurShopee}
                  handleEmbalagemChange={handleEmbalagemChangeShopee}
                  onFieldChange={(key, internalValue) => {
                    if (key === "comissao") setUserEditedShopeeComissao(true);
                    if (key === "frete") setUserEditedShopeeFrete(true);
                    if (key === "imposto") setUserEditedShopeeImposto(true);
                    if (key === "margem") setUserEditedShopeeMargem(true);
                    if (key === "marketing") setUserEditedShopeeMarketing(true);
                    if (key === "embalagem") setUserEditedShopeeEmbalagem(true);

                    setCalculoShopee({ ...calculoShopee, [key]: internalValue });
                  }}
                  onFieldBlur={(key, internalValue) => {
                    if (key === "comissao" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeComissao(false);
                    if (key === "frete" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeFrete(false);
                    if (key === "imposto" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeImposto(false);
                    if (key === "margem" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeMargem(false);
                    if (key === "marketing" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeMarketing(false);
                    if (key === "embalagem" && isEmptyOrZero(internalValue))
                      setUserEditedShopeeEmbalagem(false);

                    setCalculoShopee({ ...calculoShopee, [key]: internalValue });
                  }}
                  onMinimize={() => minimize("shopee")}
                />
              </motion.div>
            )}

            {visible.mlClassico && (
              <motion.div
                key="mlClassico"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <PriceBlock
                  nome="Preço ML Clássico"
                  blocoIndex={2}
                  state={calculoMLClassico}
                  setState={setCalculoMLClassico}
                  preco={precoMLClassico}
                  refs={calcMLClassicoRefs}
                  isEditing={isEditing}
                  setEditing={setEditing}
                  toDisplay={toDisplay}
                  toInternal={toInternal}
                  handleLinearNav={handleLinearNav}
                  handleEmbalagemBlur={handleEmbalagemBlurShared}
                  handleEmbalagemChange={handleEmbalagemChangeShared}
                  onMinimize={() => minimize("mlClassico")}
                />
              </motion.div>
            )}

            {visible.mlPremium && (
              <motion.div
                key="mlPremium"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                <PriceBlock
                  nome="Preço ML Premium"
                  blocoIndex={3}
                  state={calculoMLPremium}
                  setState={setCalculoMLPremium}
                  preco={precoMLPremium}
                  refs={calcMLPremiumRefs}
                  isEditing={isEditing}
                  setEditing={setEditing}
                  toDisplay={toDisplay}
                  toInternal={toInternal}
                  handleLinearNav={handleLinearNav}
                  handleEmbalagemBlur={handleEmbalagemBlurShared}
                  handleEmbalagemChange={handleEmbalagemChangeShared}
                  onMinimize={() => minimize("mlPremium")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RESTAURAR */}
        <AnimatePresence>
          {hiddenBlocks.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="mb-2 p-2 rounded-xl border border-white/10 bg-white/5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-white/70">Blocos minimizados:</div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hiddenBlocks.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => restore(b.key)}
                      className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition flex items-center gap-2"
                      title={`Restaurar ${b.nome}`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span className="text-xs">{b.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AcrescimosSection
          acrescimos={acrescimos}
          setAcrescimos={setAcrescimos}
          isEditing={isEditing}
          setEditing={setEditing}
          toDisplay={toDisplay}
          toInternal={toInternal}
          handleLinearNav={handleLinearNav}
          acrescimosRefs={acrescimosRefs}
          statusAcrescimo={statusAcrescimo}
        />
      </div>
    </motion.div>
  );
};