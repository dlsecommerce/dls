import { Custo as CustoType } from "@/components/costtable/ModalNewCost";

export type Custo = CustoType & { ["Produto"]?: string };

export type CostFilters = {
  situacao: string;
  ncm: string;
  marca: string;
};

export const DEFAULT_COST_FILTERS: CostFilters = {
  situacao: "",
  ncm: "",
  marca: "",
};