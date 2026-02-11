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

  userEditedShopeeComissao: boolean;
  setUserEditedShopeeComissao: (v: boolean) => void;
  userEditedShopeeFrete: boolean;
  setUserEditedShopeeFrete: (v: boolean) => void;

  // ✅ NOVOS: flags para permitir editar também imposto/margem/marketing/embalagem na Shopee
  userEditedShopeeImposto: boolean;
  setUserEditedShopeeImposto: (v: boolean) => void;
  userEditedShopeeMargem: boolean;
  setUserEditedShopeeMargem: (v: boolean) => void;
  userEditedShopeeMarketing: boolean;
  setUserEditedShopeeMarketing: (v: boolean) => void;
  userEditedShopeeEmbalagem: boolean;
  setUserEditedShopeeEmbalagem: (v: boolean) => void;
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
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
                setCalculoLoja({ ...calculoLoja, [key]: internalValue });
              }
            }}
            onFieldBlur={(key, internalValue) => {
              if (key === "desconto") {
                syncDescontoFromLoja(internalValue);
              } else {
                setCalculoLoja({ ...calculoLoja, [key]: internalValue });
              }
            }}
          />

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
              // ✅ trava automático só para os campos que o usuário mexeu
              if (key === "comissao") setUserEditedShopeeComissao(true);
              if (key === "frete") setUserEditedShopeeFrete(true);
              if (key === "imposto") setUserEditedShopeeImposto(true);
              if (key === "margem") setUserEditedShopeeMargem(true);
              if (key === "marketing") setUserEditedShopeeMarketing(true);
              // embalagem é controlada fora do grid (no PriceBlock, abaixo de "desconto")
              // mas mantemos o prop aqui para consistência do pai
              if (key === "embalagem") setUserEditedShopeeEmbalagem(true);

              setCalculoShopee({ ...calculoShopee, [key]: internalValue });
            }}
            onFieldBlur={(key, internalValue) => {
              // ✅ se o usuário apagar/zerar, volta pro automático daquele campo
              if (key === "comissao" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeComissao(false);
              }
              if (key === "frete" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeFrete(false);
              }
              if (key === "imposto" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeImposto(false);
              }
              if (key === "margem" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeMargem(false);
              }
              if (key === "marketing" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeMarketing(false);
              }
              if (key === "embalagem" && isEmptyOrZero(internalValue)) {
                setUserEditedShopeeEmbalagem(false);
              }

              setCalculoShopee({ ...calculoShopee, [key]: internalValue });
            }}
          />

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
