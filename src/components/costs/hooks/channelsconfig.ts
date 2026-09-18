import type { Calculo } from "@/components/pricing/PricingCalculatorModern";

export type ChannelKey =
  | "loja"
  | "shopee"
  | "magalu"
  | "mlClassico"
  | "mlPremium"
  | "tiktok";

export type PriceTierLike = {
  min: number;
  max: number;
  frete: string;
  comissao: string;
};

export type ChannelDef = {
  key: ChannelKey;
  title: string;
  subtitle: string;
  /** Nome usado na tabela marketplace_channel_rules. Omitir se o canal não tiver regra salva no banco. */
  dbRuleName?: string;
  defaults: Calculo;
  /** Fallback hardcoded de faixas de comissão/frete por preço (Shopee, TikTok, etc.) */
  tiers?: PriceTierLike[];
  /** Só para canais com listing_type_rules (ex: Mercado Livre Clássico/Premium) */
  mlListingType?: "classico" | "premium";
  /** Se o canal aceita override de imposto/margem/marketing por marca do produto */
  hasBrandOverrides: boolean;
  /** Se comissão/frete podem ser travados manualmente (edição do usuário sobrepõe regra automática) */
  allowManualComissaoFrete: boolean;
  /** Se o canal compartilha o valor global de embalagem (editado na Loja) ou tem embalagem própria */
  sharesEmbalagem: boolean;
};

/** Valor fixo padrão de embalagem, usado quando o usuário não define
 *  um valor manual para o canal. Embalagem é custo de PACOTE/ANÚNCIO,
 *  não por item da composição — por isso não existe mais modo "banco"
 *  (packaging_cost por item somado à composição foi removido: inflava
 *  o custo em anúncios com múltiplos itens).
 *  Exportado para ser consumido também por usechannelpricing.ts e
 *  PricingCalculatorModern.tsx — fonte única, sem duplicação. */
export const EMBALAGEM_PADRAO = "5";

export const CHANNELS: ChannelDef[] = [
  {
    key: "loja",
    title: "Loja Própria",
    subtitle: "Site / E-commerce",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "0,00",
      comissao: "6",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
  {
    key: "shopee",
    title: "Shopee",
    subtitle: "Marketplace",
    dbRuleName: "Shopee",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "4",
      comissao: "20",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    tiers: [
      { min: 0, max: 79.99, frete: "4", comissao: "20" },
      { min: 80, max: 99.99, frete: "16", comissao: "14" },
      { min: 100, max: 199.99, frete: "20", comissao: "14" },
      { min: 200, max: Infinity, frete: "26", comissao: "14" },
    ],
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
  {
    key: "magalu",
    title: "Magalu",
    subtitle: "Marketplace",
    dbRuleName: "Magalu",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "10",
      frete: "",
      comissao: "20",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
  {
    key: "mlClassico",
    title: "Mercado Livre",
    subtitle: "Clássico",
    dbRuleName: "Mercado Livre",
    mlListingType: "classico",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "",
      comissao: "11",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
  {
    key: "mlPremium",
    title: "Mercado Livre",
    subtitle: "Premium",
    dbRuleName: "Mercado Livre",
    mlListingType: "premium",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "",
      comissao: "16",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
  {
    key: "tiktok",
    title: "TikTok Shop",
    subtitle: "Marketplace",
    dbRuleName: "TikTok Shop",
    defaults: {
      desconto: "",
      imposto: "14",
      margem: "15",
      frete: "4",
      comissao: "10",
      marketing: "3",
      embalagem: EMBALAGEM_PADRAO,
    },
    tiers: [
      { min: 0, max: 49.99, frete: "4", comissao: "10" },
      { min: 50, max: Infinity, frete: "6", comissao: "6" },
    ],
    hasBrandOverrides: true,
    allowManualComissaoFrete: true,
    sharesEmbalagem: true,
  },
];

export const CHANNEL_KEYS = CHANNELS.map((c) => c.key) as ChannelKey[];

export function getChannelDef(key: ChannelKey): ChannelDef {
  const def = CHANNELS.find((c) => c.key === key);
  if (!def) throw new Error(`Canal desconhecido: ${key}`);
  return def;
}
