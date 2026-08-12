// components/costs/hooks/types.ts

export type CostFilters = {
  situacao: string;
  ncm: string;
  marca: string;
  codigo: string;
  produto: string;
};

export const DEFAULT_COST_FILTERS: CostFilters = {
  situacao: "Todos",
  ncm: "Todos",
  marca: "",
  codigo: "",
  produto: "",
};

export const SITUACAO_OPTIONS = ["Todos", "Últimos Incluídos"];
export const NCM_OPTIONS = ["Todos", "Com NCM", "Sem NCM"];

/**
 * Representa uma linha da tabela de custos.
 * Mantém as chaves em português (usadas na exibição/tabela)
 * + campos tipados explicitamente (usados na lógica de negócio/hooks).
 */
export type Custo = {
  // Identificadores reais (vêm do banco, usados em queries)
  id: string;
  code: string;
  current_cost: number | null;
  previous_cost?: number | null;
  packaging_cost?: number | null;

  // Chaves de exibição (usadas na tabela/UI)
  ["Código"]: string;
  ["Marca"]: string;
  ["Produto"]: string;
  ["Custo Atual"]: string | number;
  ["Custo Antigo"]: string | number;
  ["NCM"]: string;

  [key: string]: any;
};

export type CostAdjustments = {
  embalagem: string;
  imposto: string;
  marketing: string;
  desconto: string;
  margemMinima: string;
};

export const DEFAULT_COST_ADJUSTMENTS: CostAdjustments = {
  embalagem: "",
  imposto: "",
  marketing: "",
  desconto: "",
  margemMinima: "",
};

// =============================
// Tipos do fluxo de "Ajustes em massa"
// =============================

export type EmbalagemMode = "fixed" | "percent";

export type RuleScope = "global" | "store" | "product";

export type ApplyPayload = CostAdjustments & {
  embalagemMode: EmbalagemMode;
  scope: RuleScope;
  store?: string;
};

export type ApplyResult = {
  success: boolean;
  error?: string;
  counts?: {
    costsUpdated: number;
    rulesCreated: number;
  };
};
