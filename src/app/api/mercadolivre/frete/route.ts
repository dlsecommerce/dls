// src/app/api/mercadolivre/frete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const API = "https://api.mercadolibre.com";

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const [type, token] = (req.headers.get("authorization") ?? "").split(" ");
  if (type?.toLowerCase() !== "bearer" || !token?.trim()) return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token.trim());
  return !error && !!data.user;
}

async function getAccessToken(conta: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // serializa renovações da mesma conta (refresh_token é de uso único)
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `ml_token_${conta}`,
    ]);

    const { rows } = await client.query(
      "select * from newsystem.ml_tokens where conta = $1",
      [conta]
    );
    const t = rows[0];
    if (!t) throw new Error("Conta sem token em ml_tokens");

    if (new Date(t.expires_at).getTime() > Date.now() + 60_000) {
      await client.query("commit");
      return t.access_token;
    }

    const r = await fetch(`${API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ML_CLIENT_ID!,
        client_secret: process.env.ML_CLIENT_SECRET!,
        refresh_token: t.refresh_token,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Falha ao renovar token: ${JSON.stringify(d)}`);

    await client.query(
      `update newsystem.ml_tokens
       set access_token = $1,
           refresh_token = $2,
           expires_at = now() + ($3 || ' seconds')::interval,
           refresh_expires_at = now() + interval '180 days'
       where conta = $4`,
      [d.access_token, d.refresh_token, String(d.expires_in), conta]
    );
    await client.query("commit");
    return d.access_token;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

type Opcao = {
  nome: string;
  metodo_id: number | null;
  custo_comprador: number | null;
  custo_lista: number | null;
  prazo_horas: number | null;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** MLB -> [MLB]. MLBU -> lista de MLB do vendedor ligados ao produto. */
async function resolverItens(id: string, token: string): Promise<string[]> {
  if (!id.startsWith("MLBU")) return [id];

  const meRes = await fetch(`${API}/users/me`, {
    headers: auth(token),
    cache: "no-store",
  });
  const me = await meRes.json();
  if (!meRes.ok || !me?.id) {
    throw new Error(`Falha ao obter usuário: ${JSON.stringify(me)}`);
  }

  const ids: string[] = [];
  let offset = 0;
  while (true) {
    const r = await fetch(
      `${API}/users/${me.id}/items/search?user_product_id=${id}&limit=50&offset=${offset}`,
      { headers: auth(token), cache: "no-store" }
    );
    const j = await r.json();
    if (!r.ok) throw new Error(`Busca por MLBU falhou: ${JSON.stringify(j)}`);
    const res: string[] = j.results ?? [];
    ids.push(...res);
    offset += res.length;
    if (!res.length || offset >= (j.paging?.total ?? 0)) break;
  }
  return ids;
}

async function salvarOpcoes(
  conta: string,
  itemId: string,
  cep: string,
  opcoes: Opcao[]
) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // preserva o que já existia para o item (qualquer CEP) antes do delete
    const { rows } = await client.query(
      `select max(custo_vendedor) as custo_vendedor, max(titulo) as titulo
         from newsystem.ml_fretes where conta = $1 and item_id = $2`,
      [conta, itemId]
    );
    const zero = opcoes.find((o) => Number(o.custo_comprador) === 0);
    const custoVendedor = zero?.custo_lista ?? rows[0]?.custo_vendedor ?? null;
    const titulo = rows[0]?.titulo ?? null;

    await client.query(
      "delete from newsystem.ml_fretes where conta = $1 and item_id = $2 and cep = $3",
      [conta, itemId, cep]
    );
    for (const o of opcoes) {
      await client.query(
        `insert into newsystem.ml_fretes
           (conta, item_id, titulo, cep, metodo_id, nome, custo_comprador, custo_lista,
            prazo_horas, custo_vendedor, consultado_em)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
         on conflict (conta, item_id, cep, metodo_id) do update set
           nome = excluded.nome,
           custo_comprador = excluded.custo_comprador,
           custo_lista = excluded.custo_lista,
           prazo_horas = excluded.prazo_horas,
           custo_vendedor = coalesce(excluded.custo_vendedor, newsystem.ml_fretes.custo_vendedor),
           consultado_em = now()`,
        [
          conta,
          itemId,
          titulo,
          cep,
          o.metodo_id,
          o.nome,
          o.custo_comprador,
          o.custo_lista,
          o.prazo_horas,
          custoVendedor,
        ]
      );
    }

    // mantém o custo igual em todas as linhas do item
    if (custoVendedor !== null) {
      await client.query(
        `update newsystem.ml_fretes set custo_vendedor = $3
          where conta = $1 and item_id = $2`,
        [conta, itemId, custoVendedor]
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// GET /api/mercadolivre/frete?conta=sobaquetas&item_id=MLB123|MLBU123&cep=88701000[&salvar=1]
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada. Entre novamente no sistema." },
      { status: 401 }
    );
  }

  const p = req.nextUrl.searchParams;
  const conta = p.get("conta")?.trim().toLowerCase();
  const itemId = p.get("item_id")?.trim().toUpperCase();
  const cep = p.get("cep")?.replace(/\D/g, "");
  const salvar = p.get("salvar") === "1";

  if (!conta || !itemId || !cep) {
    return NextResponse.json(
      { error: "Informe conta, item_id e cep" },
      { status: 400 }
    );
  }
  if (!/^MLBU?\d+$/.test(itemId)) {
    return NextResponse.json({ error: "item_id inválido." }, { status: 400 });
  }
  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP deve ter 8 dígitos." }, { status: 400 });
  }

  try {
    const token = await getAccessToken(conta);
    const ids = await resolverItens(itemId, token);
    if (!ids.length) {
      return NextResponse.json(
        { error: "Nenhum anúncio encontrado para este ID nesta conta." },
        { status: 404 }
      );
    }

    const itens: { item_id: string; cep: string; opcoes: Opcao[] }[] = [];
    let ultimoErro: { body: unknown; status: number } | null = null;

    for (const id of ids) {
      const r = await fetch(`${API}/items/${id}/shipping_options?zip_code=${cep}`, {
        headers: auth(token),
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) {
        ultimoErro = { body: data, status: r.status };
        continue;
      }

      const opcoes: Opcao[] = (data.options ?? []).map((o: any) => ({
        nome: o.name,
        metodo_id: o.shipping_method_id ?? o.id ?? null,
        custo_comprador: o.cost ?? null,
        custo_lista: o.list_cost ?? null,
        prazo_horas: o.estimated_delivery_time?.shipping ?? null,
      }));

      if (salvar && opcoes.length > 0) {
        await salvarOpcoes(conta, id, cep, opcoes);
      }
      itens.push({ item_id: id, cep, opcoes });
    }

    if (!itens.length && ultimoErro) {
      return NextResponse.json(ultimoErro.body, { status: ultimoErro.status });
    }

    // MLB mantém o formato antigo; MLBU retorna a lista de anúncios
    if (itemId.startsWith("MLBU")) {
      return NextResponse.json({ mlbu: itemId, cep, itens });
    }
    return NextResponse.json(itens[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
