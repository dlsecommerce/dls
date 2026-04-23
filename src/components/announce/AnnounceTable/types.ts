export type AnuncioFilters = {
  situacao: string;
  categoria: string;
  tipo: string;
  lojasVirtuais: string;
  marca: string;
};

export const DEFAULT_ANUNCIO_FILTERS: AnuncioFilters = {
  situacao: "",
  categoria: "",
  tipo: "",
  lojasVirtuais: "",
  marca: "",
};