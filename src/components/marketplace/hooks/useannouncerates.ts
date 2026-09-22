import { supabase } from "@/integrations/supabase/client";

export type AnnounceRateSuggestion = {
  announceId: string;
  reference: string;
  product: string;
  mark: string | null;
};

export type AnnounceRates = {
  classico?: { commissionRate: number; freight: number };
  premium?: { commissionRate: number; freight: number };
};

/** Busca anúncios do ML agrupados por announce_id (evita duplicar clássico/premium na lista). */
export async function buscarAnunciosML(
  termo: string,
  store: string,
  signal: AbortSignal
): Promise<AnnounceRateSuggestion[]> {
  const raw = termo.trim();
  if (!raw) return [];

  const { data, error } = await supabase
    .schema("newsystem")
    .from("marketplace")
    .select("announce_id, reference, product, mark")
    .eq("store", store)
    .eq("channel", "Mercado Livre")
    .is("deleted_at", null)
    .or(`reference.ilike.%${raw}%,product.ilike.%${raw}%,id_bling.ilike.%${raw}%`)
    .limit(20)
    .abortSignal(signal);

  if (error || !data) return [];

  const seen = new Set<string>();
  const result: AnnounceRateSuggestion[] = [];

  for (const row of data) {
    if (seen.has(row.announce_id)) continue;
    seen.add(row.announce_id);

    result.push({
      announceId: row.announce_id,
      reference: row.reference,
      product: row.product,
      mark: row.mark,
    });

    if (result.length >= 8) break;
  }

  return result;
}

// ✅ arredonda pra 2 casas decimais, evitando erro de ponto
// flutuante (ex: 0.15 * 100 = 15.000000000000002 em JS puro).
// Sem isso, o valor exibido no input aparecia como "15,000..." em
// vez de "15,00".
const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Busca as taxas (clássico + premium) de um announce_id específico. */
export async function buscarTaxasDoAnuncio(
  announceId: string,
  store: string
): Promise<AnnounceRates> {
  const { data, error } = await supabase
    .schema("newsystem")
    .from("marketplace")
    .select("listing_type, commission_rate, freight")
    .eq("announce_id", announceId)
    .eq("store", store)
    .eq("channel", "Mercado Livre")
    .is("deleted_at", null);

  if (error || !data) return {};

  const rates: AnnounceRates = {};

  for (const row of data) {
    // commission_rate já vem em formato percentual (ex: 11.50 = 11,50%)
    const entry = {
      commissionRate: round2(Number(row.commission_rate)),
      freight: round2(Number(row.freight)),
    };

    if (row.listing_type === "premium") rates.premium = entry;
    else rates.classico = entry;
  }

  return rates;
}
