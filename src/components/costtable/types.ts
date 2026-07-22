export type CostFilters = {
  situacao: string;
  ncm: string;
  marca: string;
};

export const DEFAULT_COST_FILTERS: CostFilters = {
  situacao: "Todos",
  ncm: "",
  marca: "",
};

export type Custo = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Produto"]: string;
  ["Custo Atual"]: string | number;
  ["Custo Antigo"]: string | number;
  ["NCM"]: string;
  [key: string]: any;
};
