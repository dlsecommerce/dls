export type CostFilters = {
  situacao: string;
  ncm: string;
  marca: string;
};

export const DEFAULT_COST_FILTERS: CostFilters = {
  situacao: "Todos",
  ncm: "Todos",
  marca: "",
};

export const SITUACAO_OPTIONS = ["Todos", "Últimos Incluídos"];
export const NCM_OPTIONS = ["Todos", "Com NCM", "Sem NCM"];

export type Custo = {
  ["Código"]: string;
  ["Marca"]: string;
  ["Produto"]: string;
  ["Custo Atual"]: string | number;
  ["Custo Antigo"]: string | number;
  ["NCM"]: string;
  [key: string]: any;
};
