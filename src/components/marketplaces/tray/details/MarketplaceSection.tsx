"use client";

import React from "react";
import { X, Store, Hash, LinkIcon, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MarketplaceItem = {
  marketplace?: string;
  id_anuncio?: string;
  sku?: string;
  link?: string;
};

type MarketplaceSectionProps = {
  marketplaces: MarketplaceItem[];
  setMarketplaces: any;
  loading?: boolean;
};

// ================================
// Helpers
// ================================
const getRowTitle = (item: MarketplaceItem) => {
  const marketplace = String(item?.marketplace || "").trim();

  if (marketplace) return marketplace;

  return "Novo marketplace";
};

const getRowDescription = (item: MarketplaceItem) => {
  const id = String(item?.id_anuncio || "").trim();
  const sku = String(item?.sku || "").trim();

  if (id && sku) return `ID ${id} · SKU ${sku}`;
  if (id) return `ID ${id}`;
  if (sku) return `SKU ${sku}`;

  return "Sem identificação";
};

const cleanInputClass = `
  !h-10 !rounded-lg !border !border-white/10 !bg-[#070707] !px-3
  !text-sm !font-semibold !text-white !shadow-none !outline-none
  placeholder:!text-white/30
  focus:!border-[#1a8ceb]/70 focus:!ring-1 focus:!ring-[#1a8ceb]/30
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
  disabled:!cursor-not-allowed disabled:!opacity-60
`;

const cleanInnerInputClass = `
  !h-full !border-0 !bg-transparent !p-0
  !text-sm !font-semibold !text-white
  !shadow-none !outline-none
  placeholder:!text-white/25
  focus:!ring-0 focus:!outline-none
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
  disabled:!cursor-not-allowed disabled:!opacity-60
`;

// ================================
// Linha de Marketplace
// ================================
type MarketplaceItemRowProps = {
  item: MarketplaceItem;
  idx: number;
  marketplaces: MarketplaceItem[];
  setMarketplaces: any;
  removerItem: (idx: number) => void;
  disabled?: boolean;
};

const MarketplaceItemRow: React.FC<MarketplaceItemRowProps> = ({
  item,
  idx,
  marketplaces,
  setMarketplaces,
  removerItem,
  disabled,
}) => {
  const title = getRowTitle(item);
  const description = getRowDescription(item);

  const updateField = (key: keyof MarketplaceItem, value: string) => {
    if (disabled) return;

    const novo = [...marketplaces];

    novo[idx] = {
      ...novo[idx],
      [key]: value,
    };

    setMarketplaces(novo);
  };

  return (
    <div className="group grid grid-cols-1 items-end gap-2 border-b border-white/10 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_130px_130px_auto] sm:gap-2.5">
      <div className="relative min-w-0 self-center">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {title}
          </span>

          <span className="mt-0.5 block min-h-[16px] truncate text-xs font-medium text-white/45">
            {description}
          </span>
        </div>

        <div className="mt-2">
          <div className="relative">
            <Store className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#1a8ceb]/75" />

            <Input
              type="text"
              inputMode="text"
              placeholder="Marketplace"
              value={item.marketplace || ""}
              disabled={disabled}
              onChange={(e) => updateField("marketplace", e.target.value)}
              className={`${cleanInputClass} !pl-9`}
            />
          </div>
        </div>

        <div className="mt-2">
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#1a8ceb]/75" />

            <Input
              type="text"
              inputMode="url"
              placeholder="Link do anúncio"
              value={item.link || ""}
              disabled={disabled}
              onChange={(e) => updateField("link", e.target.value)}
              className={`${cleanInputClass} !pl-9`}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          ID anúncio
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <Hash className="mr-2 h-3.5 w-3.5 shrink-0 text-white/35" />

          <Input
            type="text"
            inputMode="text"
            placeholder="000000"
            value={item.id_anuncio || ""}
            disabled={disabled}
            onChange={(e) => updateField("id_anuncio", e.target.value)}
            className={`${cleanInnerInputClass} !text-center`}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          SKU
        </label>

        <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#070707] px-3 focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
          <Tag className="mr-2 h-3.5 w-3.5 shrink-0 text-white/35" />

          <Input
            type="text"
            inputMode="text"
            placeholder="SKU"
            value={item.sku || ""}
            disabled={disabled}
            onChange={(e) => updateField("sku", e.target.value)}
            className={`${cleanInnerInputClass} !text-center`}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={() => removerItem(idx)}
        disabled={disabled}
        size="sm"
        variant="ghost"
        className="
          h-9 w-full cursor-pointer rounded-lg border border-red-500/20
          bg-red-500/10 p-0 text-red-400 transition-all
          hover:bg-red-500/20 hover:text-red-300
          active:scale-[0.96]
          disabled:cursor-not-allowed disabled:opacity-50
          sm:h-10 sm:w-10
        "
        title="Remover marketplace"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ================================
// Componente principal
// ================================
const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({
  marketplaces = [],
  setMarketplaces,
  loading,
}) => {
  const disabled = loading;

  const marketplacesSeguros = Array.isArray(marketplaces) ? marketplaces : [];

  const removerItem = (idx: number) => {
    if (disabled) return;

    setMarketplaces((prev: MarketplaceItem[]) =>
      Array.isArray(prev) ? prev.filter((_: any, i: number) => i !== idx) : []
    );
  };

  if (marketplacesSeguros.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 overflow-visible">
      {marketplacesSeguros.map((item: MarketplaceItem, idx: number) => (
        <MarketplaceItemRow
          key={`${item.marketplace || "marketplace"}-${idx}`}
          item={item}
          idx={idx}
          marketplaces={marketplacesSeguros}
          setMarketplaces={setMarketplaces}
          removerItem={removerItem}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default MarketplaceSection;