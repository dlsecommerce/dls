export type AnuncioFilters = {
  situacao: string;
  categoria: string;
  tipo: string;
  lojasVirtuais: string;
  marca: string;
};

export const DEFAULT_ANUNCIO_FILTERS: AnuncioFilters = {
  situacao: "Todos",
  categoria: "Todos",
  tipo: "Todos",
  lojasVirtuais: "Todos",
  marca: "",
};
