import { supabase } from "@/integrations/supabase/client";

export async function buscarCustoPorCodigo(codigo: string) {
  const { data, error } = await supabase
    .from("custos")
    .select('"Código", "Marca", "Custo Atual", "Custo Antigo", "NCM"')
    .ilike('"Código"', `%${codigo}%`)
    .limit(1)
    .single();

  if (error) {
    console.error("Erro ao buscar custo:", error);
    return null;
  }

  return data;
}
