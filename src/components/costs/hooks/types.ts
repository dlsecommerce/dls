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

// ✅ FIX: incluído "brand" — alinhado com o RuleScope usado em
// usepricingrules.ts e com o suporte real do backend (pricing_rules.scope),
// que já trata "brand" como escopo válido (resolve_pricing_rule,
// fn_pricing_rules_recalc, upsert_pricing_rule).
export type RuleScope = "global" | "store" | "channel" | "product" | "brand";

export type ApplyPayload = CostAdjustments & {
  embalagemMode: EmbalagemMode;
  scope: RuleScope;
  store?: string;
  channel?: string;
  brand?: string;
};

export type ApplyResult = {
  success: boolean;
  error?: string;
  counts?: {
    costsUpdated: number;
    rulesCreated: number;
  };
};
