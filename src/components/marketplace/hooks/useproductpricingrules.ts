import { supabase } from "@/integrations/supabase/client";

const SCHEMA = "newsystem";

export interface ProductPricingRule {
  id?: number;
  channel: string;
  store: string;
  id_bling: string;
  referencia?: string | null;
  brand?: string | null;
  classico_rate?: number | null;
  classico_fixed_fee?: number | null;
  frete_classico?: number | null;
  frete_classico_mode?: "fixed" | "percent";
  premium_rate?: number | null;
  premium_fixed_fee?: number | null;
  frete_premium?: number | null;
  frete_premium_mode?: "fixed" | "percent";
}

/**
 * Carrega a regra específica de produto (se existir) para
 * channel + store + id_bling. Retorna null se não houver regra
 * cadastrada — nesse caso, o preço cai para a regra de canal/marca/global.
 */
export async function loadProductPricingRule(params: {
  channel: string;
  store: string;
  id_bling: string;
}): Promise<ProductPricingRule | null> {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("marketplace_product_rules")
    .select("*")
    .eq("channel", params.channel)
    .eq("store", params.store)
    .eq("id_bling", params.id_bling)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as ProductPricingRule | null;
}

/**
 * Cria ou atualiza a regra específica de um produto.
 *
 * OBS: o índice único (channel, store, id_bling) na tabela é PARCIAL
 * (WHERE deleted_at IS NULL). O Postgres não permite inferir
 * ON CONFLICT a partir de índices parciais via upsert do PostgREST,
 * então fazemos select -> update ou insert manualmente.
 */
export async function saveProductPricingRule(
  payload: ProductPricingRule
): Promise<ProductPricingRule> {
  const row = {
    channel: payload.channel,
    store: payload.store,
    id_bling: payload.id_bling,
    referencia: payload.referencia ?? null,
    brand: payload.brand ?? null,
    classico_rate: payload.classico_rate ?? null,
    classico_fixed_fee: payload.classico_fixed_fee ?? null,
    frete_classico: payload.frete_classico ?? null,
    frete_classico_mode: payload.frete_classico_mode ?? "fixed",
    premium_rate: payload.premium_rate ?? null,
    premium_fixed_fee: payload.premium_fixed_fee ?? null,
    frete_premium: payload.frete_premium ?? null,
    frete_premium_mode: payload.frete_premium_mode ?? "fixed",
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: selectError } = await supabase
    .schema(SCHEMA)
    .from("marketplace_product_rules")
    .select("id")
    .eq("channel", row.channel)
    .eq("store", row.store)
    .eq("id_bling", row.id_bling)
    .is("deleted_at", null)
    .maybeSingle();

  if (selectError) throw selectError;

  let data: any;

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabase
      .schema(SCHEMA)
      .from("marketplace_product_rules")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) throw updateError;
    data = updated;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .schema(SCHEMA)
      .from("marketplace_product_rules")
      .insert(row)
      .select()
      .single();

    if (insertError) throw insertError;
    data = inserted;
  }

  // Dispara recálculo apenas deste produto
  const { error: rpcError } = await supabase
    .schema(SCHEMA)
    .rpc("recalc_product_pricing", {
      p_channel: payload.channel,
      p_store: payload.store,
      p_id_bling: payload.id_bling,
    });

  if (rpcError) throw rpcError;

  return data as ProductPricingRule;
}

/**
 * Remove (soft delete) a regra específica do produto — volta a usar
 * a regra de canal/marca/global normalmente.
 */
export async function deleteProductPricingRule(params: {
  channel: string;
  store: string;
  id_bling: string;
}): Promise<void> {
  const { error } = await supabase
    .schema(SCHEMA)
    .from("marketplace_product_rules")
    .update({ deleted_at: new Date().toISOString() })
    .eq("channel", params.channel)
    .eq("store", params.store)
    .eq("id_bling", params.id_bling)
    .is("deleted_at", null);

  if (error) throw error;

  const { error: rpcError } = await supabase
    .schema(SCHEMA)
    .rpc("recalc_product_pricing", {
      p_channel: params.channel,
      p_store: params.store,
      p_id_bling: params.id_bling,
    });

  if (rpcError) throw rpcError;
}
