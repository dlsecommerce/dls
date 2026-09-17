import type { Calculo } from "@/components/pricing/PricingCalculatorModern";
import type { ChannelDef, PriceTierLike } from "@/components/costs/hooks/channelsconfig";

export type ResolvedRule = { comissao: string; frete: string };

/**
 * Resolve comissão/frete de uma brand_rule específica quando ela carrega
 * condição própria (classico/premium) — usado apenas quando o canal é ML
 * e pricing_mode === "brand". Tem prioridade máxima: se a marca tiver
 * classico/premium preenchido, isso sobrepõe QUALQUER outra regra
 * (listing_type_rules global, flat, default_rule, tiers).
 */
function resolveBrandListingRule(
  rule: any | null,
  marca: string,
  mlListingType: "classico" | "premium" | undefined,
  fallback: ResolvedRule
): ResolvedRule | null {
  if (!rule || rule.pricing_mode !== "brand" || !mlListingType) return null;

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

function resolveFlatOrBrandRule(
  rule: any | null,
  marca: string,
  fallback: ResolvedRule
): ResolvedRule | null {
  if (!rule) return null;

  if (rule.pricing_mode === "flat") {
    return {
      comissao: String(rule.comissao ?? fallback.comissao),
      frete: String(rule.frete ?? fallback.frete),
    };
  }

  if (rule.pricing_mode === "brand") {
    const brandRule = rule.brand_rules?.find(
      (b: any) => (b.brand || "").toLowerCase() === marca.toLowerCase()
    );

    const source = brandRule ?? rule.default_rule;

    if (source) {
      return {
        comissao: String((source.commission_rate ?? 0) * 100),
        frete: String(source.fixed_fee ?? 0),
      };
    }
  }

  return null;
}

function tiersFromRule(rule: any | null): PriceTierLike[] | null {
  if (!rule || rule.pricing_mode !== "tiered") return null;
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

/**
 * Resolve comissão/frete de um canal seguindo, em ordem de prioridade:
 * 1) Condição por marca (Mercado Livre, modo "brand" com classico/premium
 *    preenchido na própria marca) — MAIOR prioridade
 * 2) Regra de listing-type global (Mercado Livre Clássico/Premium,
 *    definida fora do modo "brand")
 * 3) Regra flat ou por marca sem condição (vinda do banco)
 * 4) Regra por faixa de preço (tiered, banco ou fallback hardcoded do canal)
 *
 * Retorna null quando não há nenhuma regra aplicável (canal mantém valores atuais).
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

  // 1) Condição por marca (prioridade máxima)
  const brandListing = resolveBrandListingRule(rule, marca, def.mlListingType, fallback);
  if (brandListing) return brandListing;

  // 2) Condição global (só se não achou regra de marca com condição própria)
  if (def.mlListingType && rule?.listing_type_rules) {
    const lt = rule.listing_type_rules[def.mlListingType];

    if (lt) {
      return {
        comissao: String((lt.commission_rate ?? 0) * 100),
        frete: lt.frete != null ? String(lt.frete) : fallback.frete,
      };
    }
  }

  // 3) Flat ou marca sem condição
  const flatOrBrand = resolveFlatOrBrandRule(rule, marca, fallback);
  if (flatOrBrand) return flatOrBrand;

  // 4) Tiers
  const tiers = tiersFromRule(rule) ?? def.tiers;
  if (!tiers || !tiers.length) return null;

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

  return { comissao: tierDetectado.comissao, frete: tierDetectado.frete };
}
