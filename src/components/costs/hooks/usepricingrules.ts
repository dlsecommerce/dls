// hooks/usepricingrules.ts

import { supabase } from "@/integrations/supabase/client";

const SCHEMA = "newsystem";

export type RuleScope = "global" | "store" | "channel" | "product" | "brand";

export interface PriceTierPayload {
  min: number;
  max: number;
  rate: number;
  fixedFee: number;
}

// Sub-regra de condição (Clássico/Premium) associada a UMA marca específica.
// Presente apenas quando o canal é Mercado Livre e a marca tem condição própria.
export interface BrandListingSubRulePayload {
  rate: number;
  fixedFee: number;
}

export interface BrandRulePayload {
  brand: string;
  commission_rate: number;
  fixed_fee: number;
  classico?: BrandListingSubRulePayload;
  premium?: BrandListingSubRulePayload;
}

export interface ListingTypeRulePayload {
  commission_rate: number;
  fixed_fee: number;
  frete?: number | null;
  frete_mode?: "fixed" | "percent";
}

// Bloco de Condição (Clássico/Premium) para UM modo de precificação específico.
export interface ListingTypeRulesByMode {
  classico: ListingTypeRulePayload;
  premium: ListingTypeRulePayload;
}

// listing_type_rules é indexado por pricing_mode — cada modo
// (flat/tiered/brand) carrega sua PRÓPRIA condição Clássico/Premium,
// permitindo configurações independentes por modo sem se sobrescreverem.
export type ListingTypeRulesMap = Partial<
  Record<"flat" | "tiered" | "brand", ListingTypeRulesByMode>
>;

// =====================
// NOVO: cada canal pode ter múltiplos blocos habilitados simultaneamente.
// `pricing_mode` é mantido apenas como metadado (última aba editada no
// modal), mas a RESOLUÇÃO REAL passa a seguir uma cascata de prioridade
// fixa: brand_rules > commission_tiers > default_rule > flat (comissao),
// filtrada pelos flags *_enabled. Isso substitui o modelo antigo em que
// só um modo "vencia" por vez.
// =====================
export interface MarketplaceChannelRule {
  channel: string;
  pricing_mode: "flat" | "tiered" | "brand";
  flat_enabled?: boolean | null;
  tiered_enabled?: boolean | null;
  brand_enabled?: boolean | null;
  comissao: number;
  frete: number;
  frete_mode: "fixed" | "percent";
  commission_tiers?: PriceTierPayload[] | null;
  default_rule?: { commission_rate: number; fixed_fee: number } | null;
  brand_rules?: BrandRulePayload[] | null;
  listing_type_rules?: ListingTypeRulesMap | null;
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

// Prioridade de escopo compartilhada por resolveRule e resolveRulesBatch.
const SCOPE_PRIORITY: Record<RuleScope, number> = {
  product: 1,
  brand: 2,
  channel: 3,
  store: 4,
  global: 5,
};

function buildScopeOrFilter(params: {
  code?: string;
  store?: string;
  channel?: string;
  brand?: string;
}) {
  return [
    params.code ? `and(scope.eq.product,scope_value.eq.${params.code})` : null,
    params.channel ? `and(scope.eq.channel,scope_value.eq.${params.channel})` : null,
    params.store ? `and(scope.eq.store,scope_value.eq.${params.store})` : null,
    params.brand ? `and(scope.eq.brand,scope_value.eq.${params.brand})` : null,
    `scope.eq.global`,
  ]
    .filter(Boolean)
    .join(",");
}

/**
 * -----------------------------------------------------------------------
 * CACHE DE resolveRule POR COMBINAÇÃO DE PARÂMETROS.
 * -----------------------------------------------------------------------
 * Sem cache, cada chamada bate direto no banco — mesmo que seja
 * exatamente a mesma combinação rule_type/brand/channel/store/code pedida
 * segundos antes. Dedup + reuso de Promise, igual ao padrão já usado em
 * loadMarketplaceChannelRule.
 * -----------------------------------------------------------------------
 */
const resolveRuleCache = new Map<string, Promise<any | null>>();

function resolveRuleCacheKey(params: {
  rule_type: string;
  code?: string;
  store?: string;
  channel?: string;
  brand?: string;
}) {
  return [
    toDbRuleType(params.rule_type),
    params.code ?? "",
    params.store ?? "",
    params.channel ?? "",
    params.brand ?? "",
  ].join("|");
}

/** Invalida o cache de resolveRule — chamar após createRule/deactivateRule. */
export function invalidateResolveRuleCache(rule_type?: string) {
  if (!rule_type) {
    resolveRuleCache.clear();
    return;
  }
  const dbType = toDbRuleType(rule_type);
  for (const key of resolveRuleCache.keys()) {
    if (key.startsWith(`${dbType}|`)) {
      resolveRuleCache.delete(key);
    }
  }
}

export async function resolveRule(params: {
  rule_type: string;
  code?: string;
  store?: string;
  channel?: string;
  brand?: string;
}) {
  const key = resolveRuleCacheKey(params);
  const cached = resolveRuleCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const dbRuleType = toDbRuleType(params.rule_type);

    const { data, error } = await supabase
      .schema(SCHEMA)
      .from("pricing_rules")
      .select("*")
      .eq("active", true)
      .eq("rule_type", dbRuleType)
      .or(buildScopeOrFilter(params));

    if (error) throw error;
    if (!data?.length) return null;

    const sorted = data.sort(
      (a, b) => SCOPE_PRIORITY[a.scope as RuleScope] - SCOPE_PRIORITY[b.scope as RuleScope]
    )[0];

    return { ...sorted, rule_type: fromDbRuleType(sorted.rule_type) };
  })().catch((err) => {
    resolveRuleCache.delete(key); // permite retry em caso de erro
    throw err;
  });

  resolveRuleCache.set(key, promise);
  return promise;
}

/**
 * Resolve múltiplas rule_types de uma vez em UMA única query (em vez de
 * N chamadas a resolveRule). Usado principalmente por
 * usebrandpricingoverrides.ts para buscar marketing + margem + desconto
 * de uma marca em 1 round-trip, ao invés de 3.
 *
 * Retorna um mapa { [rule_type_front]: regra_resolvida | null }.
 */
export async function resolveRulesBatch(params: {
  rule_types: string[]; // nomes em PT (front), ex: ["marketing", "margem_minima", "desconto"]
  code?: string;
  store?: string;
  channel?: string;
  brand?: string;
}) {
  const dbRuleTypes = params.rule_types.map(toDbRuleType);

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .in("rule_type", dbRuleTypes)
    .or(buildScopeOrFilter(params));

  if (error) throw error;

  const result: Record<string, any | null> = {};

  for (const rt of params.rule_types) {
    const dbType = toDbRuleType(rt);
    const rows = (data ?? []).filter((r: any) => r.rule_type === dbType);

    if (!rows.length) {
      result[rt] = null;
      continue;
    }

    const sorted = rows.sort(
      (a: any, b: any) =>
        SCOPE_PRIORITY[a.scope as RuleScope] - SCOPE_PRIORITY[b.scope as RuleScope]
    )[0];

    result[rt] = { ...sorted, rule_type: fromDbRuleType(sorted.rule_type) };
  }

  return result;
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
 * scope_value é opcional, mas cost_id é OBRIGATÓRIO.
 */
export async function createRule(payload: {
  rule_type: string;
  scope: RuleScope;
  scope_value: string | null;
  rate: number;
  cost_id?: string | null;
}) {
  // ✅ Validação explícita: escopo "product" exige cost_id válido
  if (payload.scope === "product" && !payload.cost_id) {
    throw new Error(
      `cost_id é obrigatório para regras de escopo "product" (rule_type: ${payload.rule_type}, scope_value: ${payload.scope_value}).`
    );
  }

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
    // ✅ Removido fallback `?? ""` — cost_id já garantido pela validação acima
    deactivateQuery = deactivateQuery.eq("cost_id", payload.cost_id as string);
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

  // ✅ Invalida o cache de resolveRule/resolveRulesBatch para este rule_type,
  // garantindo que a próxima leitura reflita a nova regra imediatamente.
  invalidateResolveRuleCache(payload.rule_type);

  return { ...data, rule_type: fromDbRuleType(data.rule_type) };
}

export async function deactivateRule(id: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  // ✅ Não sabemos o rule_type aqui sem outra query — limpa todo o cache
  // de resolveRule por segurança, já que uma regra foi desativada.
  invalidateResolveRuleCache();
}

/**
 * -----------------------------------------------------------------------
 * CACHE DE loadDistinctStores/Channels/Brands.
 * -----------------------------------------------------------------------
 * Dados que alimentam dropdowns e mudam raramente (só quando surge loja,
 * canal ou marca nova). TTL de 10 minutos evita refazer a RPC toda vez
 * que o modal de ajustes é reaberto na mesma sessão.
 * -----------------------------------------------------------------------
 */
const DISTINCT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const distinctCache = new Map<string, { promise: Promise<string[]>; timestamp: number }>();

function loadDistinctCached(
  key: string,
  rpcName: string,
  field: string
): Promise<string[]> {
  const cached = distinctCache.get(key);
  if (cached && Date.now() - cached.timestamp < DISTINCT_CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = supabase
    .schema(SCHEMA)
    .rpc(rpcName)
    .then(({ data, error }) => {
      if (error) throw error;
      return (data || [])
        .map((r: any) => String(r[field] ?? "").trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));
    })
    .catch((err) => {
      distinctCache.delete(key); // permite retry
      throw err;
    });

  distinctCache.set(key, { promise, timestamp: Date.now() });
  return promise;
}

/** Invalida o cache de lojas/canais/marcas distintas (todos ou um específico). */
export function invalidateDistinctCache(key?: "stores" | "channels" | "brands") {
  if (key) {
    distinctCache.delete(key);
  } else {
    distinctCache.clear();
  }
}

/**
 * Lista as lojas distintas cadastradas em `announce.store`,
 * usada para popular o seletor de escopo "Loja" no modal de ajustes.
 */
export function loadDistinctStores(): Promise<string[]> {
  return loadDistinctCached("stores", "get_distinct_stores", "store");
}

/**
 * Lista os canais distintos cadastrados (ex: Mercado Livre, Shopee, etc.),
 * usada para popular o seletor de escopo "Canal" no modal de ajustes
 * e o dropdown de canais no ChannelPricingRulesModal.
 */
export function loadDistinctChannels(): Promise<string[]> {
  return loadDistinctCached("channels", "get_distinct_channels", "channel");
}

/**
 * Lista as marcas distintas cadastradas em `newsystem.costs` (coluna "Mark"),
 * usada para popular o seletor de "Restringir por marca" no campo Desconto
 * do modal de ajustes em massa.
 */
export function loadDistinctBrands(): Promise<string[]> {
  return loadDistinctCached("brands", "get_distinct_brands", "brand");
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
 * -----------------------------------------------------------------------
 * CACHE DE REGRAS DE MARKETPLACE POR NOME DE CANAL (dbRuleName).
 * -----------------------------------------------------------------------
 * Canais como "Mercado Livre Clássico" e "Mercado Livre Premium"
 * compartilham o mesmo dbRuleName ("Mercado Livre") — sem cache, isso
 * gera 2 requisições idênticas ao banco a cada troca de marca/produto.
 * Com o cache, a segunda chamada reaproveita a Promise da primeira
 * (dedupe), e o resultado fica guardado pra buscas futuras da sessão.
 * -----------------------------------------------------------------------
 */
const marketplaceRuleCache = new Map<string, Promise<MarketplaceChannelRule | null>>();

/** Invalida o cache — chamar após salvar uma regra via saveMarketplaceChannelRule. */
export function invalidateMarketplaceRuleCache(channel?: string) {
  if (channel) {
    marketplaceRuleCache.delete(channel);
  } else {
    marketplaceRuleCache.clear();
  }
}

/**
 * Carrega as taxas exclusivas do marketplace (comissão + frete) de um canal,
 * incluindo os blocos habilitados (flat/tiered/brand — via flags
 * flat_enabled/tiered_enabled/brand_enabled) e, quando aplicável, as
 * regras de Condição (Clássico/Premium) do Mercado Livre — sejam elas
 * globais (listing_type_rules, indexadas por pricing_mode) ou específicas
 * de cada marca (brand_rules[].classico/premium). Persistidas em
 * newsystem.marketplace_channel_rules — NÃO alteram current_cost, apenas
 * compõem o preço exibido/enviado ao canal.
 *
 * Com cache por `channel` — evita requisições duplicadas quando múltiplos
 * canais front-end compartilham o mesmo dbRuleName (ex: Mercado Livre
 * Clássico/Premium).
 */
export async function loadMarketplaceChannelRule(
  channel: string
): Promise<MarketplaceChannelRule | null> {
  const cached = marketplaceRuleCache.get(channel);
  if (cached) return cached;

  const promise = supabase
    .schema(SCHEMA)
    .from("marketplace_channel_rules")
    .select("*")
    .eq("channel", channel)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) throw error;
      return data as MarketplaceChannelRule | null;
    });

  marketplaceRuleCache.set(channel, promise);
  return promise;
}

/**
 * Cria ou atualiza (upsert) as taxas exclusivas do marketplace de um canal.
 *
 * =====================================================================
 * NOVO MODELO: MÚLTIPLOS BLOCOS HABILITADOS SIMULTANEAMENTE
 * =====================================================================
 * Um canal pode ter, ao mesmo tempo:
 *  - flat_enabled  → comissão fixa (%) sobre o preço de venda (comissao/frete)
 *  - tiered_enabled → faixas de preço (commission_tiers)
 *  - brand_enabled  → comissão por marca (brand_rules) + regra padrão (default_rule)
 *
 * A RESOLUÇÃO (ver ruleresolvers.ts / calcularComissaoCanal abaixo) segue
 * uma cascata de prioridade FIXA, filtrada pelos flags habilitados:
 *   1) brand_rules (marca específica do produto)
 *   2) commission_tiers (faixa de preço)
 *   3) default_rule (fallback do modo "brand", se habilitado)
 *   4) comissao flat (fallback final)
 *
 * `pricing_mode` é mantido apenas como metadado de UI (última aba
 * editada no modal) — NÃO decide mais qual bloco é aplicado.
 *
 * IMPORTANTE — listing_type_rules (Clássico/Premium GLOBAL) continua
 * indexado POR modo: `listing_type_rules["flat" | "tiered" | "brand"]`.
 * Cada modo tem sua PRÓPRIA condição Clássico/Premium, configurada e
 * persistida de forma independente — salvar a condição de um modo não
 * apaga a condição configurada nos outros modos.
 *
 * Este save faz MERGE PROFUNDO em `listing_type_rules`: preserva todas
 * as chaves de modo já existentes, sobrescrevendo (ou removendo, se
 * receber `null` naquela chave) apenas os modos efetivamente enviados
 * no payload (`payload.listing_type_rules` agora é um mapa completo
 * {flat, tiered, brand}, cada valor podendo ser um bloco ou `null`).
 *
 * Os demais campos (commission_tiers, default_rule, brand_rules,
 * comissao/frete) seguem merge raso — só são sobrescritos quando o
 * `payload` os envia explicitamente (!== undefined); se vierem como
 * `null` explícito, o bloco é limpo (ex: usuário desabilitou o modo).
 */
export async function saveMarketplaceChannelRule(payload: {
  channel: string;
  pricing_mode: "flat" | "tiered" | "brand";
  flat_enabled?: boolean;
  tiered_enabled?: boolean;
  brand_enabled?: boolean;
  comissao?: number;
  frete?: number;
  freteMode?: "fixed" | "percent";
  commission_tiers?: PriceTierPayload[] | null;
  default_rule?: { commission_rate: number; fixed_fee: number } | null;
  brand_rules?: BrandRulePayload[] | null;
  listing_type_rules?: Partial<Record<"flat" | "tiered" | "brand", ListingTypeRulesByMode | null>>;
}) {
  // Carrega o registro atual — necessário para preservar blocos que este
  // salvamento específico não está enviando.
  const { data: existing, error: fetchError } = await supabase
    .schema(SCHEMA)
    .from("marketplace_channel_rules")
    .select("*")
    .eq("channel", payload.channel)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const existingListingTypeRules: ListingTypeRulesMap =
    existing?.listing_type_rules ?? {};

  // Merge profundo por modo: para cada chave (flat/tiered/brand) enviada
  // no payload.listing_type_rules, sobrescreve ou remove (se null); as
  // chaves NÃO enviadas permanecem como estavam.
  let mergedListingTypeRules: ListingTypeRulesMap = { ...existingListingTypeRules };

  if (payload.listing_type_rules) {
    for (const mode of ["flat", "tiered", "brand"] as const) {
      if (!(mode in payload.listing_type_rules)) continue;
      const value = payload.listing_type_rules[mode];
      if (value === null || value === undefined) {
        delete mergedListingTypeRules[mode];
      } else {
        mergedListingTypeRules[mode] = value;
      }
    }
  }

  const finalListingTypeRules = Object.keys(mergedListingTypeRules).length
    ? mergedListingTypeRules
    : null;

  const mergedRow = {
    channel: payload.channel,
    pricing_mode: payload.pricing_mode,
    flat_enabled:
      payload.flat_enabled !== undefined
        ? payload.flat_enabled
        : existing?.flat_enabled ?? true,
    tiered_enabled:
      payload.tiered_enabled !== undefined
        ? payload.tiered_enabled
        : existing?.tiered_enabled ?? false,
    brand_enabled:
      payload.brand_enabled !== undefined
        ? payload.brand_enabled
        : existing?.brand_enabled ?? false,
    comissao:
      payload.comissao !== undefined ? payload.comissao : existing?.comissao ?? 0,
    frete: payload.frete !== undefined ? payload.frete : existing?.frete ?? 0,
    frete_mode:
      payload.freteMode !== undefined
        ? payload.freteMode
        : existing?.frete_mode ?? "fixed",
    commission_tiers:
      payload.commission_tiers !== undefined
        ? payload.commission_tiers
        : existing?.commission_tiers ?? null,
    default_rule:
      payload.default_rule !== undefined
        ? payload.default_rule
        : existing?.default_rule ?? null,
    brand_rules:
      payload.brand_rules !== undefined
        ? payload.brand_rules
        : existing?.brand_rules ?? null,
    listing_type_rules: finalListingTypeRules,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("marketplace_channel_rules")
    .upsert(mergedRow, { onConflict: "channel" })
    .select()
    .single();

  if (error) throw error;

  // ✅ Invalida o cache para que a próxima leitura reflita a mudança
  invalidateMarketplaceRuleCache(payload.channel);

  return data;
}

/**
 * -----------------------------------------------------------------------
 * RESOLUÇÃO EM CASCATA (substitui o antigo "pricing_mode exclusivo").
 * -----------------------------------------------------------------------
 * Dado o produto (marca, faixa de preço, listingType), decide QUAL bloco
 * habilitado se aplica, na ordem:
 *   1) brand_rules (se brand_enabled e a marca do produto tiver regra)
 *   2) commission_tiers (se tiered_enabled e existir faixa compatível)
 *   3) default_rule (se brand_enabled, como fallback do modo marca)
 *   4) flat (comissao) — fallback final, sempre disponível
 *
 * A Condição (Clássico/Premium) de CADA bloco é resolvida dentro do
 * próprio bloco vencedor (listing_type_rules[modoVencedor] ou
 * brand_rules[].classico/premium), preservando a precedência anterior.
 * -----------------------------------------------------------------------
 */
type ResolvedMode = "brand" | "tiered" | "flat";

interface ResolvedRuleResult {
  mode: ResolvedMode;
  commissionRate: number; // decimal (ex: 0.14)
  fixedFee: number;
  frete: number;
  freteMode: "fixed" | "percent";
}

export function resolveRuleForChannel(
  rule: MarketplaceChannelRule | null,
  precoVenda: number,
  produto: { brand?: string; listingType?: "classico" | "premium" }
): ResolvedRuleResult {
  const fallbackFlat: ResolvedRuleResult = {
    mode: "flat",
    commissionRate: (rule?.comissao ?? 0) / 100,
    fixedFee: 0,
    frete: rule?.frete ?? 0,
    freteMode: rule?.frete_mode ?? "fixed",
  };

  if (!rule) return fallbackFlat;

  const normalizedBrand = norm(produto.brand ?? "");

  // 1º: brand_rules (marca específica)
  if (rule.brand_enabled && rule.brand_rules?.length) {
    const brandRule = rule.brand_rules.find((b) => norm(b.brand) === normalizedBrand);
    if (brandRule) {
      // Condição própria da marca tem prioridade sobre a taxa geral da marca
      if (produto.listingType && brandRule[produto.listingType]) {
        const sub = brandRule[produto.listingType]!;
        return {
          mode: "brand",
          commissionRate: sub.rate / 100,
          fixedFee: sub.fixedFee,
          frete: rule.frete,
          freteMode: rule.frete_mode,
        };
      }

      // Condição global do modo "brand" (listing_type_rules.brand)
      const listingRules = rule.listing_type_rules?.brand;
      if (listingRules && produto.listingType) {
        const lt = listingRules[produto.listingType];
        if (lt) {
          return {
            mode: "brand",
            commissionRate: lt.commission_rate,
            fixedFee: lt.fixed_fee,
            frete: lt.frete ?? rule.frete,
            freteMode: lt.frete_mode ?? rule.frete_mode,
          };
        }
      }

      return {
        mode: "brand",
        commissionRate: brandRule.commission_rate,
        fixedFee: brandRule.fixed_fee,
        frete: rule.frete,
        freteMode: rule.frete_mode,
      };
    }
  }

  // 2º: commission_tiers (faixa de preço)
  if (rule.tiered_enabled && rule.commission_tiers?.length) {
    const tier = rule.commission_tiers.find(
      (t) => precoVenda >= t.min && (t.max == null || precoVenda <= t.max)
    );
    if (tier) {
      // Condição global do modo "tiered"
      const listingRules = rule.listing_type_rules?.tiered;
      if (listingRules && produto.listingType) {
        const lt = listingRules[produto.listingType];
        if (lt) {
          return {
            mode: "tiered",
            commissionRate: lt.commission_rate,
            fixedFee: lt.fixed_fee,
            frete: lt.frete ?? tier.fixedFee,
            freteMode: lt.frete_mode ?? "fixed",
          };
        }
      }

      return {
        mode: "tiered",
        commissionRate: tier.rate,
        fixedFee: tier.fixedFee,
        frete: tier.fixedFee,
        freteMode: "fixed",
      };
    }
  }

  // 3º: default_rule (fallback do modo "brand", sem marca correspondente)
  if (rule.brand_enabled && rule.default_rule) {
    const listingRules = rule.listing_type_rules?.brand;
    if (listingRules && produto.listingType) {
      const lt = listingRules[produto.listingType];
      if (lt) {
        return {
          mode: "brand",
          commissionRate: lt.commission_rate,
          fixedFee: lt.fixed_fee,
          frete: lt.frete ?? rule.frete,
          freteMode: lt.frete_mode ?? rule.frete_mode,
        };
      }
    }

    return {
      mode: "brand",
      commissionRate: rule.default_rule.commission_rate,
      fixedFee: rule.default_rule.fixed_fee,
      frete: rule.frete,
      freteMode: rule.frete_mode,
    };
  }

  // 4º: flat (fallback final)
  if (rule.flat_enabled !== false) {
    const listingRules = rule.listing_type_rules?.flat;
    if (listingRules && produto.listingType) {
      const lt = listingRules[produto.listingType];
      if (lt) {
        return {
          mode: "flat",
          commissionRate: lt.commission_rate,
          fixedFee: lt.fixed_fee,
          frete: lt.frete ?? rule.frete,
          freteMode: lt.frete_mode ?? rule.frete_mode,
        };
      }
    }
  }

  return fallbackFlat;
}

/**
 * Calcula a comissão de um produto para um canal usando a cascata de
 * resolução (resolveRuleForChannel). Retorna o valor em R$ da comissão
 * sobre o preço informado.
 */
export function calcularComissaoCanal(
  rule: MarketplaceChannelRule | null,
  precoVenda: number,
  produto: { brand?: string; listingType?: "classico" | "premium" }
): number {
  const resolved = resolveRuleForChannel(rule, precoVenda, produto);
  return precoVenda * resolved.commissionRate + resolved.fixedFee;
}

/**
 * Calcula o valor do frete (fixo em R$ ou percentual) sobre o preço de
 * venda, usando a mesma cascata de resolução da comissão.
 */
export function calcularFreteCanal(
  rule: MarketplaceChannelRule | null,
  precoVenda: number,
  listingType?: "classico" | "premium",
  brand?: string
): number {
  const resolved = resolveRuleForChannel(rule, precoVenda, { brand, listingType });
  return resolved.freteMode === "percent"
    ? precoVenda * (resolved.frete / 100)
    : resolved.frete;
}
