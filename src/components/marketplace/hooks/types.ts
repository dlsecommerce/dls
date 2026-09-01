// marketplace/hooks/types.ts

export interface Marketplace {
  id: string;
  store: string;
  channel: string;
  announce_id: string;
  id_bling: string;
  reference: string;
  product: string;
  mark: string | null;
  commission_rate: number;
  profit_margin: number;
  freight: number;
  current_cost: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MarketplaceFilters {
  situacao: string;
  loja: string;
  codigo?: string;
  produto?: string;
  canal: string; // valor dinâmico, vem de allChannels (fetchDistinctChannels)
  tipo: string;
  /**
   * Condição do anúncio no Mercado Livre (Clássico/Premium).
   * Só é aplicável quando `canal` for "Mercado Livre" — nos demais canais
   * deve permanecer "Todos" e ser ignorado na query.
   */
  condicao: string;
  /**
   * Marcas selecionadas (multi-seleção). Usado apenas em contextos que
   * precisam do filtro completo (ex: export/import via RPC). Não é
   * persistido dentro de `filters`/`appliedFilters` da tela — é passado
   * separadamente (`selectedBrands`/`appliedBrands`) e mesclado aqui
   * apenas na hora de repassar para hooks que aceitam o filtro completo.
   */
  brands?: string[];
}

export const SITUACAO_OPTIONS = ["Todos", "Ativos", "Inativos"] as const;

export const STORE_OPTIONS = ["Todos", "Pikot Shop", "Sóbaquetas"] as const;

export const TIPO_OPTIONS = ["Todos", "Produtos", "Variações"] as const;

/** Opções do filtro "Condição", exclusivo do canal Mercado Livre */
export const CONDICAO_OPTIONS = ["Todos", "Clássico", "Premium"] as const;

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  situacao: "Ativos",
  loja: "Todos",
  codigo: "",
  produto: "",
  canal: "Todos",
  tipo: "Todos",
  condicao: "Todos",
  brands: [],
};

/* ---------------------------------------------------------------------- */
/* Regras de precificação por canal (ChannelPricingRulesModal)            */
/* ---------------------------------------------------------------------- */

/** Modo de aplicação do frete: valor fixo em R$ ou percentual sobre o custo */
export type FreteMode = "fixed" | "percent";

/**
 * Taxas exclusivas de cada marketplace (comissão + frete).
 * Persistidas em newsystem.marketplace_channel_rules.
 * NÃO alteram current_cost — são somadas apenas na composição do preço
 * exibido/enviado para o canal específico.
 */
export interface MarketplaceChannelRule {
  id?: string;
  channel: string;
  comissao: number; // %
  frete: number; // R$ ou %, depende de freteMode
  freteMode: FreteMode;
  created_at?: string;
  updated_at?: string;
}

/** Versão em string dos campos, usada nos inputs do formulário */
export interface MarketplaceChannelRuleForm {
  channel: string;
  comissao: string;
  frete: string;
  freteMode: FreteMode;
}

export const DEFAULT_MARKETPLACE_CHANNEL_RULE_FORM: MarketplaceChannelRuleForm = {
  channel: "",
  comissao: "",
  frete: "",
  freteMode: "fixed",
};

/**
 * Escopo de aplicação das regras de precificação gerais
 * (imposto, marketing, desconto, margem mínima) — tabela pricing_rules.
 * Reexportado aqui para uso nas telas de marketplace que precisam
 * referenciar/exibir a regra vigente de um canal.
 */
export type RuleScope = "global" | "store" | "channel" | "product";

/** Regra de precificação vigente para um canal (somente leitura nesta tela) */
export interface ChannelPricingRule {
  id?: string;
  scope: RuleScope;
  channel: string;
  imposto?: number;
  marketing?: number;
  desconto?: number;
  margemMinima?: number;
  created_at?: string;
  updated_at?: string;
}

/** Payload de retorno usado pelo ActionsMenu para abrir o modal do canal certo */
export interface ChannelActionTarget {
  channel: string;
}
