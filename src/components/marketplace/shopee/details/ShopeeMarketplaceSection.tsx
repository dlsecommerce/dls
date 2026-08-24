"use client";

import React from "react";
import { X, Store, Hash, LinkIcon, Tag, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ShopeeMarketplaceItem = {
  marketplace?: string;
  id_anuncio?: string;
  sku?: string;
  link?: string;
};

type ShopeeMarketplaceSectionProps = {
  marketplaces: ShopeeMarketplaceItem[];
  setMarketplaces: any;
  loading?: boolean;
  bloquearEdicao?: boolean;
};

// ================================
// Helpers
// ================================
const getRowTitle = (item: ShopeeMarketplaceItem) => {
  const marketplace = String(item?.marketplace || "").trim();

  if (marketplace) return marketplace;

  return "Shopee";
};

const getRowDescription = (item: ShopeeMarketplaceItem) => {
  const id = String(item?.id_anuncio || "").trim();
  const sku = String(item?.sku || "").trim();

  if (id && sku) return `ID Shopee ${id} · SKU ${sku}`;
  if (id) return `ID Shopee ${id}`;
  if (sku) return `SKU ${sku}`;

  return "Sem identificação Shopee";
};

const cleanInputClass = `
  !h-10 !rounded-lg !border !border-white/10 !bg-[#070707] !px-3
  !text-sm !font-semibold !text-white !shadow-none !outline-none
  placeholder:!text-white/30
  focus:!border-[#1a8ceb]/70 focus:!ring-1 focus:!ring-[#1a8ceb]/30
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
  disabled:!cursor-not-allowed disabled:!border-white/5 disabled:!bg-[#0b0b0b] disabled:!text-white/35 disabled:!opacity-100
`;

const cleanInnerInputClass = `
  !h-full !border-0 !bg-transparent !p-0
  !text-sm !font-semibold !text-white
  !shadow-none !outline-none
  placeholder:!text-white/25
  focus:!ring-0 focus:!outline-none
  focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none
  disabled:!cursor-not-allowed disabled:!text-white/35 disabled:!opacity-100
`;

// ================================
// Linha Shopee
// ================================
type ShopeeMarketplaceItemRowProps = {
  item: ShopeeMarketplaceItem;
  idx: number;
  marketplaces: ShopeeMarketplaceItem[];
  setMarketplaces: any;
  removerItem: (idx: number) => void;
  disabled?: boolean;
};

const ShopeeMarketplaceItemRow: React.FC<ShopeeMarketplaceItemRowProps> = ({
  item,
  idx,
  marketplaces,
  setMarketplaces,
  removerItem,
  disabled,
}) => {
  const title = getRowTitle(item);
  const description = getRowDescription(item);

  const updateField = (key: keyof ShopeeMarketplaceItem, value: string) => {
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
          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-[#1a8ceb]/80" />
            <span className="truncate">{title}</span>
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
              placeholder="Shopee"
              value={item.marketplace || "Shopee"}
              disabled={disabled}
              title={disabled ? "Campo bloqueado para edição" : undefined}
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
              placeholder="Link do anúncio Shopee"
              value={item.link || ""}
              disabled={disabled}
              title={disabled ? "Campo bloqueado para edição" : undefined}
              onChange={(e) => updateField("link", e.target.value)}
              className={`${cleanInputClass} !pl-9`}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          ID Shopee
        </label>

        <div
          className={`
            flex h-10 items-center rounded-lg border px-3
            ${
              disabled
                ? "border-white/5 bg-[#0b0b0b]"
                : "border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30"
            }
          `}
        >
          <Hash className="mr-2 h-3.5 w-3.5 shrink-0 text-white/35" />

          <Input
            type="text"
            inputMode="text"
            placeholder="000000"
            value={item.id_anuncio || ""}
            disabled={disabled}
            title={disabled ? "Campo bloqueado para edição" : undefined}
            onChange={(e) => updateField("id_anuncio", e.target.value)}
            className={`${cleanInnerInputClass} !text-center`}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-center text-xs font-medium text-white/50">
          SKU Shopee
        </label>

        <div
          className={`
            flex h-10 items-center rounded-lg border px-3
            ${
              disabled
                ? "border-white/5 bg-[#0b0b0b]"
                : "border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30"
            }
          `}
        >
          <Tag className="mr-2 h-3.5 w-3.5 shrink-0 text-white/35" />

          <Input
            type="text"
            inputMode="text"
            placeholder="SKU Shopee"
            value={item.sku || ""}
            disabled={disabled}
            title={disabled ? "Campo bloqueado para edição" : undefined}
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
          disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-white/25 disabled:opacity-100
          sm:h-10 sm:w-10
        "
        title={disabled ? "Remoção bloqueada" : "Remover Shopee"}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ================================
// Componente principal
// ================================
const ShopeeMarketplaceSection: React.FC<ShopeeMarketplaceSectionProps> = ({
  marketplaces = [],
  setMarketplaces,
  loading,
  bloquearEdicao = false,
}) => {
  const disabled = Boolean(loading || bloquearEdicao);

  const marketplacesSeguros = Array.isArray(marketplaces) ? marketplaces : [];

  const removerItem = (idx: number) => {
    if (disabled) return;

    setMarketplaces((prev: ShopeeMarketplaceItem[]) =>
      Array.isArray(prev) ? prev.filter((_: any, i: number) => i !== idx) : [],
    );
  };

  if (marketplacesSeguros.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 overflow-visible">
      {bloquearEdicao && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs font-medium text-amber-100/80">
          Marketplace Shopee bloqueado para edição. Edite apenas os percentuais
          no cálculo de preço.
        </div>
      )}

      {marketplacesSeguros.map((item: ShopeeMarketplaceItem, idx: number) => (
        <ShopeeMarketplaceItemRow
          key={`${item.marketplace || "shopee"}-${idx}`}
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

export default ShopeeMarketplaceSection;