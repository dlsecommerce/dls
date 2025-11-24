import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
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
};

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
}) => {
  return (
    <motion.div
      className="lg:col-span-6 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg flex flex-col justify-between h-full"
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

        {/* 4 BLOCOS EM LINHA (responsivo: 1, 2 ou 4 colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
          {/* Preço Loja */}
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
          />

          {/* Preço Shopee */}
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
          />

          {/* Preço Mercado Livre Clássico */}
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
          />

          {/* Preço Mercado Livre Premium */}
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
          />
        </div>

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
