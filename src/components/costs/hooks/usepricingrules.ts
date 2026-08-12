import { supabase } from "@/integrations/supabase/client";

const SCHEMA = "newsystem";

export type RuleScope = "global" | "store" | "product";

export async function resolveRule({
  rule_type,
  code,
  store,
}: {
  rule_type: string;
  code?: string;
  store?: string;
}) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .eq("rule_type", rule_type)
    .or(
      [
        code ? `and(scope.eq.product,scope_value.eq.${code})` : null,
        store ? `and(scope.eq.store,scope_value.eq.${store})` : null,
        `scope.eq.global`,
      ]
        .filter(Boolean)
        .join(",")
    );

  if (error) throw error;
  if (!data?.length) return null;

  // Prioridade: product > store > global
  const priority: Record<RuleScope, number> = {
    product: 1,
    store: 2,
    global: 3,
  };

  return data.sort(
    (a, b) => priority[a.scope as RuleScope] - priority[b.scope as RuleScope]
  )[0];
}

export function applyRule(baseValue: number, rule: any) {
  if (!rule) return baseValue;
  // Todas as regras hoje operam como percentual sobre o valor base
  return baseValue * (1 + Number(rule.rate) / 100);
}

export async function createRule(payload: {
  rule_type: string;
  scope: RuleScope;
  scope_value: string;
  rate: number;
}) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("pricing_rules")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
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
