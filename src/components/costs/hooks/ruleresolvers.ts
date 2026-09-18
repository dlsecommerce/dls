import type { Calculo } from "@/components/pricing/PricingCalculatorModern";
import type { ChannelDef, PriceTierLike } from "@/components/costs/hooks/channelsconfig";

export type ResolvedRule = { comissao: string; frete: string };

/**
 * Resolve comissão/frete de uma brand_rule específica quando ela carrega
 * condição própria (classico/premium) — usado apenas quando o canal é ML
 * e o bloco "brand" está habilitado. Tem prioridade máxima dentro do
 * bloco de marca: se a marca tiver classico/premium preenchido, isso
 * sobrepõe a condição global do modo brand e a taxa geral da marca.
 */
function resolveBrandListingRule(
  rule: any | null,
  marca: string,
  mlListingType: "classico" | "premium" | undefined,
  fallback: ResolvedRule
): ResolvedRule | null {
  if (!rule?.brand_enabled || !mlListingType) return null;

  const brandRule = rule.brand_rules?.find(
    (b: any) => (b.brand || "").toLowerCase() === marca.toLowerCase()
  );

  const listing = brandRule?.[mlListingType];
  if (!listing) return null;

  return {
    comissao: String((listing.rate ?? 0) * 100),
    frete: listing.fixedFee != null ? String(listing.fixedFee) : fallback.frete,
  };
}

/**
 * Condição global (Clássico/Premium) de UM modo específico, lida a partir
 * de listing_type_rules[mode]. Cada modo (flat/tiered/brand) tem sua
 * própria condição independente.
 */
function resolveListingRuleForMode(
  rule: any | null,
  mode: "flat" | "tiered" | "brand",
  mlListingType: "classico" | "premium" | undefined,
  fallback: ResolvedRule
): ResolvedRule | null {
  if (!rule?.listing_type_rules || !mlListingType) return null;

  const listingRulesForMode = rule.listing_type_rules[mode];
  const lt = listingRulesForMode?.[mlListingType];
  if (!lt) return null;

  return {
    comissao: String((lt.commission_rate ?? 0) * 100),
    frete: lt.frete != null ? String(lt.frete) : fallback.frete,
  };
}

/**
 * Resolve a regra de marca (taxa específica da marca ou default_rule como
 * fallback), sem considerar condição classico/premium — usada quando o
 * bloco "brand" está habilitado mas a marca não tem listing próprio nem
 * há condição global do modo "brand".
 */
function resolveBrandRule(rule: any | null, marca: string): ResolvedRule | null {
  if (!rule?.brand_enabled) return null;

  const brandRule = rule.brand_rules?.find(
    (b: any) => (b.brand || "").toLowerCase() === marca.toLowerCase()
  );

  const source = brandRule ?? rule.default_rule;
  if (!source) return null;

  return {
    comissao: String((source.commission_rate ?? 0) * 100),
    frete: String(source.fixed_fee ?? 0),
  };
}

function tiersFromRule(rule: any | null): PriceTierLike[] | null {
  if (!rule?.tiered_enabled) return null;
  if (!Array.isArray(rule.commission_tiers) || !rule.commission_tiers.length) {
    return null;
  }

  return rule.commission_tiers.map((t: any) => ({
    min: Number(t.min) || 0,
    max: t.max != null && t.max !== "" ? Number(t.max) : Infinity,
    frete: String(t.fixedFee ?? 0),
    comissao: String((t.rate ?? 0) * 100),
  }));
}

function resolveFlatRule(rule: any | null): ResolvedRule | null {
  if (rule?.flat_enabled === false) return null;
  if (!rule) return null;

  return {
    comissao: String(rule.comissao ?? ""),
    frete: String(rule.frete ?? ""),
  };
}

/**
 * Resolve comissão/frete de um canal seguindo a CASCATA de blocos
 * habilitados, em ordem de prioridade fixa:
 *
 *  1) BLOCO MARCA (brand_enabled), nesta sub-ordem:
 *     a) Condição própria da marca (classico/premium na brand_rule) — maior prioridade
 *     b) Condição global do modo "brand" (listing_type_rules.brand)
 *     c) Taxa da marca (ou default_rule como fallback) sem condição
 *
 *  2) BLOCO FAIXA DE PREÇO (tiered_enabled):
 *     a) Condição global do modo "tiered" (listing_type_rules.tiered) —
 *        aplicada ao tier detectado
 *     b) Tier detectado sem condição
 *
 *  3) BLOCO FIXO (flat_enabled, padrão true se não definido):
 *     a) Condição global do modo "flat" (listing_type_rules.flat)
 *     b) Comissão/frete fixos do canal
 *
 * Cada bloco só é considerado se estiver habilitado E tiver dado
 * aplicável (ex: marca não encontrada e sem default_rule → passa pro
 * próximo bloco). Retorna null apenas se NENHUM bloco habilitado
 * resolver nada (canal mantém valores atuais).
 */
export function resolveRuleForChannel(
  def: ChannelDef,
  rule: any | null,
  marca: string,
  calc: Calculo,
  calcularPreco: (c: Calculo) => number,
  embalagemOverride: string | null
): ResolvedRule | null {
  const fallback: ResolvedRule = { comissao: calc.comissao, frete: calc.frete };

  // ===== 1) BLOCO MARCA =====
  if (rule?.brand_enabled) {
    // 1a) Condição própria da marca
    const brandListing = resolveBrandListingRule(rule, marca, def.mlListingType, fallback);
    if (brandListing) return brandListing;

    // 1b) Condição global do modo "brand"
    const brandModeListing = resolveListingRuleForMode(rule, "brand", def.mlListingType, fallback);
    if (brandModeListing) return brandModeListing;

    // 1c) Taxa da marca / default_rule
    const brandRule = resolveBrandRule(rule, marca);
    if (brandRule) return brandRule;
  }

  // ===== 2) BLOCO FAIXA DE PREÇO =====
  if (rule?.tiered_enabled) {
    const tiers = tiersFromRule(rule) ?? def.tiers;

    if (tiers && tiers.length) {
      let tierDetectado: PriceTierLike = tiers[0];

      for (const tier of tiers) {
        const precoTeste = calcularPreco({
          ...calc,
          embalagem: embalagemOverride ?? "",
          comissao: tier.comissao,
          frete: tier.frete,
        });

        if (precoTeste >= tier.min && precoTeste <= tier.max) {
          tierDetectado = tier;
          break;
        }
      }

      // 2a) Condição global do modo "tiered" sobrepõe o tier detectado
      const tieredModeListing = resolveListingRuleForMode(rule, "tiered", def.mlListingType, {
        comissao: tierDetectado.comissao,
        frete: tierDetectado.frete,
      });
      if (tieredModeListing) return tieredModeListing;

      // 2b) Tier detectado sem condição
      return { comissao: tierDetectado.comissao, frete: tierDetectado.frete };
    }
  }

  // ===== 3) BLOCO FIXO =====
  if (rule?.flat_enabled !== false) {
    // 3a) Condição global do modo "flat"
    const flatModeListing = resolveListingRuleForMode(rule, "flat", def.mlListingType, fallback);
    if (flatModeListing) return flatModeListing;

    // 3b) Comissão/frete fixos
    const flatRule = resolveFlatRule(rule);
    if (flatRule) return flatRule;
  }

  return null;
}
