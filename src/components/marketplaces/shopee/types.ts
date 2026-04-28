export type MarketplaceFilters = {
  situacao: string;
  tipo: string;
  lojasVirtuais: string;
  marca: string;
};

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  situacao: "",
  tipo: "",
  lojasVirtuais: "",
  marca: "",
};