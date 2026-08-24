import { supabase } from "@/integrations/supabase/client";

const SCHEMA = "newsystem";

export type RuleScope = "global" | "store" | "channel" | "product" | "brand";

export interface PriceTierPayload {
  min: number;
  max: number;
  rate: number;
  fixedFee: number;
}

export interface BrandRulePayload {
  brand: string;
  commission_rate: number;
  fixed_fee: number;
}

export interface ListingTypeRulePayload {
  commission_rate: number;
  fixed_fee: number;
}

export interface MarketplaceChannelRule {
  channel: string;
  pricing_mode: "flat" | "tiered" | "brand";
  comissao: number;
  frete: number;
  frete_mode: "fixed" | "percent";
  commission_tiers?: PriceTierPayload[] | null;
  default_rule?: { commission_rate: number; fixed_fee: number } | null;
  brand_rules?: BrandRulePayload[] | null;
  listing_type_rules?: {
    classico: ListingTypeRulePayload;
    premium: ListingTypeRulePayload;
  } | null;
}

const norm = (v: string) => v.trim().toLocaleLowerCase("pt-BR");

// --- Mapeamento rule_type: front (PT) <-> banco (EN, check constraint) ---
const RULE_TYPE_TO_DB: Record<string, string> = {
  imposto: "tax",
  marketing: "marketing_rate",
  margem_minima: "minimum_margin",
  desconto: "discount_rate",
  embalagem: "packaging_cost",
  frete_extra: "freight_extra",
};

const RULE_TYPE_FROM_DB: Record<string, string> = {
  tax: "imposto",
  marketing_rate: "marketing",
  minimum_margin: "margem_minima",
  discount_rate: "desconto",
  packaging_cost: "embalagem",
  freight_extra: "frete_extra",
};

const toDbRuleType = (rule_type: string) =>
  RULE_TYPE_TO_DB[rule_type] ?? rule_type;

const fromDbRuleType = (rule_type: string) =>
  RULE_TYPE_FROM_DB[rule_type] ?? rule_type;

export async function resolveRule({
  rule_type,
  code,
  store,
  channel,
  brand,
}: {
  rule_type: string;
  code?: string;
  store?: string;
  channel?: string;
  brand?: string;
}) {
  const dbRuleType = toDbRuleType(rule_type);

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .eq("rule_type", dbRuleType)
    .or(
      [
        code ? `and(scope.eq.product,scope_value.eq.${code})` : null,
        channel ? `and(scope.eq.channel,scope_value.eq.${channel})` : null,
        store ? `and(scope.eq.store,scope_value.eq.${store})` : null,
        brand ? `and(scope.eq.brand,scope_value.eq.${brand})` : null,
        `scope.eq.global`,
      ]
        .filter(Boolean)
        .join(",")
    );

  if (error) throw error;
  if (!data?.length) return null;

  // Prioridade: product > brand > channel > store > global
  const priority: Record<RuleScope, number> = {
    product: 1,
    brand: 2,
    channel: 3,
    store: 4,
    global: 5,
  };

  const sorted = data.sort(
    (a, b) => priority[a.scope as RuleScope] - priority[b.scope as RuleScope]
  )[0];

  return { ...sorted, rule_type: fromDbRuleType(sorted.rule_type) };
}

export function applyRule(baseValue: number, rule: any) {
  if (!rule) return baseValue;
  // Todas as regras hoje operam como percentual sobre o valor base
  return baseValue * (1 + Number(rule.rate) / 100);
}

/**
 * Cria/atualiza uma regra de precificação respeitando os índices únicos
 * parciais por escopo (uq_pricing_rules_global_rule, _store_rule,
 * _channel_rule, _brand_rule, _product_rule), todos filtrados por
 * `active = true`.
 *
 * Estratégia: desativa a regra ativa existente do mesmo rule_type/scope
 * (e scope_value quando aplicável) antes de inserir a nova — evita o
 * erro "duplicate key value violates unique constraint" ao reenviar
 * um valor para uma regra que já existe.
 *
 * Para escopo "product", o índice único usa (cost_id, rule_type), então
 * scope_value é opcional e cost_id deve ser informado.
 */
export async function createRule(payload: {
  rule_type: string;
  scope: RuleScope;
  scope_value: string | null;
  rate: number;
  cost_id?: string | null;
}) {
  const dbRuleType = toDbRuleType(payload.rule_type);

  // 1. Desativa a regra ativa existente no mesmo escopo/tipo
  let deactivateQuery = supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("rule_type", dbRuleType)
    .eq("scope", payload.scope)
    .eq("active", true);

  if (payload.scope === "product") {
    deactivateQuery = deactivateQuery.eq("cost_id", payload.cost_id ?? "");
  } else if (payload.scope !== "global") {
    deactivateQuery = deactivateQuery.eq("scope_value", payload.scope_value ?? "");
  }

  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) throw deactivateError;

  // 2. Insere a nova regra ativa
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .insert({
      rule_type: dbRuleType,
      scope: payload.scope,
      scope_value: payload.scope_value,
      rate: payload.rate,
      cost_id: payload.cost_id ?? null,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return { ...data, rule_type: fromDbRuleType(data.rule_type) };
}

export async function deactivateRule(id: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Lista as lojas distintas cadastradas em `announce.store`,
 * usada para popular o seletor de escopo "Loja" no modal de ajustes.
 */
export async function loadDistinctStores(): Promise<string[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .rpc("get_distinct_stores");

  if (error) throw error;

  return (data || [])
    .map((r: any) => String(r.store ?? "").trim())
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Lista os canais distintos cadastrados (ex: Mercado Livre, Shopee, etc.),
 * usada para popular o seletor de escopo "Canal" no modal de ajustes
 * e o dropdown de canais no ChannelPricingRulesModal.
 */
export async function loadDistinctChannels(): Promise<string[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .rpc("get_distinct_channels");

  if (error) throw error;

  return (data || [])
    .map((r: any) => String(r.channel ?? "").trim())
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Lista as marcas distintas cadastradas em `newsystem.costs` (coluna "Mark"),
 * usada para popular o seletor de "Restringir por marca" no campo Desconto
 * do modal de ajustes em massa.
 */
export async function loadDistinctBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .rpc("get_distinct_brands");

  if (error) throw error;

  return (data || [])
    .map((r: any) => String(r.brand ?? "").trim())
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
}

/**
 * Retorna a regra de precificação vigente (imposto, marketing, desconto,
 * margem mínima) configurada especificamente para um canal — scope "channel".
 * Usada apenas como referência de leitura no ChannelPricingRulesModal.
 */
export async function loadChannelPricingRule(channel: string) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .eq("scope", "channel")
    .eq("scope_value", channel);

  if (error) throw error;

  const row = data?.[0] ?? null;
  return row ? { ...row, rule_type: fromDbRuleType(row.rule_type) } : null;
}

/**
 * Carrega as taxas exclusivas do marketplace (comissão + frete) de um canal,
 * incluindo o modo de precificação (fixo, por faixa de preço ou por marca)
 * e, quando aplicável, as regras de Condição (Clássico/Premium) do Mercado Livre.
 * Persistidas em newsystem.marketplace_channel_rules — NÃO alteram
 * current_cost, apenas compõem o preço exibido/enviado ao canal.
 */
export async function loadMarketplaceChannelRule(
  channel: string
): Promise<MarketplaceChannelRule | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("marketplace_channel_rules")
    .select("*")
    .eq("channel", channel)
    .maybeSingle();

  if (error) throw error;
  return data as MarketplaceChannelRule | null;
}

/**
 * Cria ou atualiza (upsert) as taxas exclusivas do marketplace de um canal.
 * Suporta 3 modos de comissão (pricing_mode):
 *  - "flat": comissão fixa (%) sobre o preço de venda
 *  - "tiered": faixas de preço (commission_tiers), cada uma com % + taxa fixa
 *  - "brand": comissão por marca (brand_rules) + regra padrão (default_rule)
 * Além disso, canais do tipo Mercado Livre podem informar listing_type_rules
 * (Clássico/Premium), que tem prioridade sobre o pricing_mode selecionado.
 */
export async function saveMarketplaceChannelRule(payload: {
  channel: string;
  pricing_mode: "flat" | "tiered" | "brand";
  comissao: number;
  frete: number;
  freteMode: "fixed" | "percent";
  commission_tiers?: PriceTierPayload[];
  default_rule?: { commission_rate: number; fixed_fee: number };
  brand_rules?: BrandRulePayload[];
  listing_type_rules?: {
    classico: ListingTypeRulePayload;
    premium: ListingTypeRulePayload;
  } | null;
}) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("marketplace_channel_rules")
    .upsert(
      {
        channel: payload.channel,
        pricing_mode: payload.pricing_mode,
        comissao: payload.comissao,
        frete: payload.frete,
        frete_mode: payload.freteMode,
        commission_tiers: payload.commission_tiers ?? null,
        default_rule: payload.default_rule ?? null,
        brand_rules: payload.brand_rules ?? null,
        listing_type_rules: payload.listing_type_rules ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "channel" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calcula a comissão de um produto para um canal, respeitando a
 * precedência: Condição (ML) > modo selecionado (fixo/faixa de preço/marca).
 * Retorna o valor em R$ da comissão sobre o preço informado.
 */
export function calcularComissaoCanal(
  rule: MarketplaceChannelRule | null,
  precoVenda: number,
  produto: { brand?: string; listingType?: "classico" | "premium" }
): number {
  if (!rule) return 0;

  // 1º: Condição (Mercado Livre)
  if (rule.listing_type_rules && produto.listingType) {
    const lt = rule.listing_type_rules[produto.listingType];
    if (lt) return precoVenda * lt.commission_rate + lt.fixed_fee;
  }

  // 2º: modo selecionado
  if (rule.pricing_mode === "tiered" && rule.commission_tiers?.length) {
    const tier = rule.commission_tiers.find(
      (t) => precoVenda >= t.min && precoVenda <= t.max
    );
    if (tier) return precoVenda * tier.rate + tier.fixedFee;
  }

  if (rule.pricing_mode === "brand") {
    const brandRule = rule.brand_rules?.find(
      (b) => norm(b.brand) === norm(produto.brand ?? "")
    );
    if (brandRule) {
      return precoVenda * brandRule.commission_rate + brandRule.fixed_fee;
    }
    if (rule.default_rule) {
      return (
        precoVenda * rule.default_rule.commission_rate +
        rule.default_rule.fixed_fee
      );
    }
  }

  // 3º: fallback flat
  return precoVenda * (rule.comissao / 100);
}

/**
 * Calcula o valor do frete (fixo em R$ ou percentual) sobre o preço de venda.
 */
export function calcularFreteCanal(
  rule: MarketplaceChannelRule | null,
  precoVenda: number
): number {
  if (!rule) return 0;
  return rule.frete_mode === "percent"
    ? precoVenda * (rule.frete / 100)
    : rule.frete;
}
