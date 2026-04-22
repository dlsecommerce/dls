import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, ArrowUpCircle, Check, X } from "lucide-react";
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

const STORAGE_KEY = "pricing.visibleBlocks.v1";

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

  const defaultVisible: Record<BlockKey, boolean> = React.useMemo(
    () => ({
      loja: true,
      shopee: true,
      mlClassico: true,
      mlPremium: true,
    }),
    []
  );

  const [visible, setVisible] = React.useState<Record<BlockKey, boolean>>(
    defaultVisible
  );

  const [isLayoutOpen, setIsLayoutOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<BlockKey, boolean>>;
      const next: Record<BlockKey, boolean> = {
        ...defaultVisible,
        ...parsed,
      };

      const count = Object.values(next).filter(Boolean).length;
      setVisible(count === 0 ? { ...next, loja: true } : next);
    } catch {
      // ignore
    }
  }, [defaultVisible]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // ignore
    }
  }, [visible]);

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

  const toggleBlock = (key: BlockKey) => {
    setVisible((prev) =>
      ensureAtLeastOneVisible({ ...prev, [key]: !prev[key] })
    );
  };

  const visibleCount = React.useMemo(
    () => Object.values(visible).filter(Boolean).length,
    [visible]
  );

  const hiddenBlocks = React.useMemo(
    () => BLOCKS.filter((b) => !visible[b.key]),
    [visible]
  );

  const gridClass = React.useMemo(() => {
    if (visibleCount <= 1) return "grid grid-cols-1 gap-3 sm:gap-2 mb-2";
    if (visibleCount === 2)
      return "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-2 mb-2";
    if (visibleCount === 3)
      return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-2 mb-2";
    return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-2 mb-2";
  }, [visibleCount]);

  const shortLabel = (key: BlockKey) => {
    if (key === "loja") return "Loja";
    if (key === "shopee") return "Shopee";
    if (key === "mlClassico") return "Clássico";
    return "Premium";
  };

  const closeLayoutOnOutside = React.useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest?.("[data-layout-dropdown]")) return;
    setIsLayoutOpen(false);
  }, []);

  React.useEffect(() => {
    if (!isLayoutOpen) return;
    window.addEventListener("mousedown", closeLayoutOnOutside);
    return () =>
      window.removeEventListener("mousedown", closeLayoutOnOutside);
  }, [isLayoutOpen, closeLayoutOnOutside]);

  return (
    <motion.div
      className="relative z-0 lg:col-span-6 min-w-0 p-3 sm:p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div data-layout-dropdown className="relative z-0 min-w-0">
        <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-2 gap-3 sm:gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-5 h-5 text-[#1a8ceb] flex-shrink-0" />
            <h3 className="text-base font-bold text-white flex items-center gap-2 min-w-0">
              <span className="truncate">Cálculo de Preço</span>
              <HelpTooltip text="Preços de Venda." />
            </h3>
          </div>

          <ClearAndDownloadActions
            handleDownload={handleDownload}
            handleClearAll={handleClearAll}
            isClearing={isClearing}
            clicks={clicks}
            onToggleLayout={() => setIsLayoutOpen((v) => !v)}
          />
        </div>

        <AnimatePresence>
          {isLayoutOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 mt-2 w-full max-w-[260px] sm:w-[260px] rounded-xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-xl p-2 z-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-white/80 font-semibold">
                  Configurar blocos
                </div>
                <button
                  type="button"
                  onClick={() => setIsLayoutOpen(false)}
                  className="p-1 rounded-md hover:bg-white/10 transition"
                  title="Fechar"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {BLOCKS.map((b) => {
                  const checked = visible[b.key];
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => toggleBlock(b.key)}
                      className={[
                        "h-10 sm:h-9 px-2 rounded-lg",
                        "border border-white/10",
                        checked ? "bg-white/10" : "bg-white/5",
                        "hover:bg-white/10 transition",
                        "flex items-center justify-between",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-white/85 truncate">
                          {b.nome}
                        </span>
                        <span className="text-[10px] text-white/50 shrink-0">
                          ({shortLabel(b.key)})
                        </span>
                      </div>

                      <div
                        className={[
                          "w-6 h-6 rounded-md border border-white/10",
                          "flex items-center justify-center shrink-0",
                          checked ? "bg-white/10" : "bg-white/0",
                        ].join(" ")}
                      >
                        {checked && (
                          <Check className="w-4 h-4 text-white/80" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisible(ensureAtLeastOneVisible(defaultVisible))
                  }
                  className="h-10 sm:h-9 px-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/80 transition"
                >
                  Mostrar todos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVisible(
                      ensureAtLeastOneVisible({
                        loja: true,
                        shopee: false,
                        mlClassico: false,
                        mlPremium: false,
                      })
                    )
                  }
                />
              </div>

              <div className="mt-2 text-[10px] text-white/40">
                Suas escolhas ficam salvas automaticamente.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="w-full min-w-0"
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
                    if (key === "desconto") {
                      syncDescontoFromLoja(internalValue);
                    } else {
                      setCalculoLoja({
                        ...calculoLoja,
                        [key]: internalValue,
                      });
                    }
                  }}
                  onFieldBlur={(key, internalValue) => {
                    if (key === "desconto") {
                      syncDescontoFromLoja(internalValue);
                    } else {
                      setCalculoLoja({
                        ...calculoLoja,
                        [key]: internalValue,
                      });
                    }
                  }}
                  onMinimize={() => minimize("loja")}
                />
              </motion.div>
            )}

            {visible.shopee && (
              <motion.div
                key="Preço"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.18 }}
                className="w-full min-w-0"
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

                    setCalculoShopee({
                      ...calculoShopee,
                      [key]: internalValue,
                    });
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

                    setCalculoShopee({
                      ...calculoShopee,
                      [key]: internalValue,
                    });
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
                className="w-full min-w-0"
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
                className="w-full min-w-0"
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

        <AnimatePresence>
          {hiddenBlocks.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className={[
                "mb-2",
                "rounded-xl border border-white/10",
                "bg-gradient-to-r black-70 from-black/40 to-black/40",
                "backdrop-blur-lg shadow-lg",
                "px-2 py-2",
                "flex items-center justify-between gap-2 flex-wrap",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/60">Ocultos</span>
                  <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 bg-white/5 text-white/70">
                    {hiddenBlocks.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hiddenBlocks.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => restore(b.key)}
                      className="h-9 sm:h-8 px-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs flex items-center gap-2 transition"
                      title={`Restaurar ${b.nome}`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>{shortLabel(b.key)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => hiddenBlocks.forEach((b) => restore(b.key))}
                className="h-9 sm:h-8 px-3 rounded-lg border border-white/10 bg-white/0 hover:bg-white/5 text-xs text-white/60 hover:text-white transition"
                title="Restaurar todos"
              >
                Restaurar todos
              </button>
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