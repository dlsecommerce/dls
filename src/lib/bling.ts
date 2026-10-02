import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BLING = "https://api.bling.com.br/Api/v3";
const RPC_NAME = "rotate_bling_tokens";
const MARGEM_MS = 10 * 60_000;

export const LOJAS = ["sobaquetas", "pikot"] as const;
export type Loja = (typeof LOJAS)[number];
export const isLoja = (v: unknown): v is Loja => LOJAS.includes(v as Loja);

/**
 * Convenção de env por loja (ex.: pikot):
 *   BLING_LOJA_ML_PIKOT_ID          -> id da loja ML no Bling
 *   BLING_CLIENT_ID_PIKOT / BLING_CLIENT_SECRET_PIKOT -> app Bling da conta
 *   BLING_CONTA_PIKOT (opcional)    -> use "sobaquetas" se for a MESMA conta Bling
 */
function cfg(loja: Loja) {
  const L = loja.toUpperCase();
  const conta = (process.env[`BLING_CONTA_${L}`] ?? loja).toLowerCase();
  const C = conta.toUpperCase();
  return {
    conta,
    idLoja: process.env[`BLING_LOJA_ML_${L}_ID`],
    clientId: process.env[`BLING_CLIENT_ID_${C}`],
    clientSecret: process.env[`BLING_CLIENT_SECRET_${C}`],
  };
}

let _sb: SupabaseClient | null = null;
export function getSb(): SupabaseClient {
  if (_sb) return _sb;
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_SECRET?.trim();
  if (!url) throw new Error("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY_SECRET");
  _sb = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "newsystem" },
  });
  return _sb;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Tokens = { access_token: string; refresh_token: string; expires_at: string };

async function lerTokens(conta: string): Promise<Tokens> {
  const { data, error } = await getSb()
    .from("bling_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("conta", conta)
    .single();
  if (error || !data) throw new Error(`Tokens do Bling (${conta}) não encontrados: ${error?.message}`);
  return data as Tokens;
}

export async function getAccessToken(loja: Loja): Promise<string> {
  const { conta, clientId, clientSecret } = cfg(loja);
  if (!clientId || !clientSecret) throw new Error(`Faltam credenciais Bling da conta "${conta}"`);

  const atual = await lerTokens(conta);
  if (new Date(atual.expires_at).getTime() - Date.now() > MARGEM_MS) return atual.access_token;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch(`${BLING}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: atual.refresh_token }),
  });

  if (!resp.ok) {
    await sleep(1000);
    const novo = await lerTokens(conta);
    if (novo.refresh_token !== atual.refresh_token) return novo.access_token;
    throw new Error(`Falha no refresh do Bling (${conta}): ${await resp.text()}`);
  }

  const t = await resp.json();
  const { data: gravou, error } = await getSb().rpc(RPC_NAME, {
    p_conta: conta,
    p_old_refresh: atual.refresh_token,
    p_access: t.access_token,
    p_refresh: t.refresh_token,
    p_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  });
  if (error) throw new Error("Erro ao gravar tokens: " + error.message);
  if (!gravou) return (await lerTokens(conta)).access_token;
  return t.access_token;
}

export async function blingGet<T = any>(
  loja: Loja,
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const token = await getAccessToken(loja);
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const url = `${BLING}${path}${qs.size ? `?${qs}` : ""}`;

  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (r.status === 429) {
      await sleep(1000 * (i + 1));
      continue;
    }
    if (!r.ok) throw new Error(`Bling ${r.status}: ${await r.text()}`);
    return r.json();
  }
  throw new Error("Bling: limite de requisições excedido");
}

/** Lista todos os vínculos produto↔anúncio da loja ML informada */
export async function listarAnunciosML(loja: Loja) {
  const { idLoja } = cfg(loja);
  if (!idLoja) throw new Error(`BLING_LOJA_ML_${loja.toUpperCase()}_ID não definido`);

  const limite = 100;
  const out: { idBling: number; idMercadoLivre: string; preco: number }[] = [];

  for (let pagina = 1; ; pagina++) {
    const { data = [] } = await blingGet(loja, "/produtos/lojas", { idLoja, pagina, limite });
    for (const i of data) {
      if (String(i.loja?.id) !== String(idLoja) || !i.codigo) continue;
      out.push({ idBling: i.produto?.id, idMercadoLivre: i.codigo, preco: i.preco });
    }
    if (data.length < limite) break;
    await sleep(350);
  }
  return out;
}
