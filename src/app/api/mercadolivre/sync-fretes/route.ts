import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const maxDuration = 300;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});
const API = "https://api.mercadolibre.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getToken(conta: string) {
  const { rows } = await pool.query(
    `select * from newsystem.ml_tokens where conta=$1`, [conta]);
  const t = rows[0];
  if (!t) throw new Error("conta sem token");
  if (new Date(t.expires_at).getTime() > Date.now() + 60_000) return t.access_token as string;

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
  const j = await r.json();
  if (!r.ok) throw new Error("refresh falhou: " + JSON.stringify(j));
  await pool.query(
    `update newsystem.ml_tokens
       set access_token=$2, refresh_token=$3,
           expires_at=now() + ($4 || ' seconds')::interval,
           refresh_expires_at=now() + interval '180 days'
     where conta=$1`,
    [conta, j.access_token, j.refresh_token, String(j.expires_in)]);
  return j.access_token as string;
}

/** fetch com retry para 429, 424, 5xx e falhas de rede. 404/4xx são devolvidos sem retry. */
const ml = async (path: string, token: string) => {
  let last: Response | null = null;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 429 || r.status === 424 || r.status >= 500) {
        last = r;
        await sleep(1500 * (i + 1));
        continue;
      }
      return r;
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  if (last) return last;
  throw new Error("ML indisponível após retries");
};

/** status: "active" (padrão) | "paused" | "all" (active + paused) | outro status do ML */
function statusList(status: string): string[] {
  if (status === "all") return ["active", "paused"];
  return [status];
}

async function listarPorStatus(userId: number, token: string, status: string) {
  const ids: string[] = [];
  let scroll = "";
  while (true) {
    const r = await ml(
      `/users/${userId}/items/search?status=${status}&search_type=scan&limit=100` +
        (scroll ? `&scroll_id=${scroll}` : ""),
      token
    );
    const j = await r.json();
    if (!r.ok) throw new Error("listagem falhou: " + JSON.stringify(j));
    if (!j.results?.length) break;
    ids.push(...j.results);
    scroll = j.scroll_id;
  }
  return ids;
}

async function listarAnuncios(userId: number, token: string, status = "active") {
  const porStatus: Record<string, number> = {};
  const set = new Set<string>();
  for (const s of statusList(status)) {
    const lista = await listarPorStatus(userId, token, s);
    porStatus[s] = lista.length;
    lista.forEach((id) => set.add(id));
  }
  return { ids: [...set].sort(), porStatus };
}

async function titulos(ids: string[], token: string) {
  const map: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20).join(",");
    for (let t = 0; t < 3; t++) {
      const r = await ml(`/items?ids=${chunk}&attributes=id,title`, token);
      const j = await r.json().catch(() => null);
      if (Array.isArray(j)) {
        for (const x of j) if (x.code === 200) map[x.body.id] = x.body.title;
        break;
      }
      console.error("titulos", r.status, JSON.stringify(j)?.slice(0, 200));
      await sleep(1500 * (t + 1));
    }
  }
  return map;
}

/**
 * Aceita MLB... (retorna ele mesmo) ou MLBU... (retorna os MLB ligados ao produto).
 */
async function resolverItens(
  id: string, userId: number, token: string, status: string
): Promise<string[]> {
  if (!/^MLBU/i.test(id)) return [id];
  const upper = id.toUpperCase();

  const r = await ml(`/users/${userId}/items/search?user_product_id=${upper}`, token);
  if (r.ok) {
    const j = await r.json();
    if (j.results?.length) return j.results as string[];
  }

  const { ids: todos } = await listarAnuncios(userId, token, status);
  const achados: string[] = [];
  for (let i = 0; i < todos.length; i += 20) {
    const rr = await ml(
      `/items?ids=${todos.slice(i, i + 20).join(",")}&attributes=id,user_product_id`, token);
    const j = await rr.json().catch(() => null);
    if (!Array.isArray(j)) continue;
    for (const x of j) {
      if (x.code === 200 && x.body.user_product_id === upper) achados.push(x.body.id);
    }
  }
  return achados;
}

/**
 * Custo de envio do vendedor (o "Você paga R$ X" do painel).
 * Usa /users/{id}/shipping_options/free com as dimensões do anúncio.
 * Dimensões: shipping.dimensions ou, se nulo, atributos SELLER_PACKAGE_* (cm e gramas).
 */
async function custoVendedorML(
  itemId: string, userId: number, token: string
): Promise<{ valor: number | null; raw?: unknown }> {
  const ri = await ml(
    `/items/${itemId}?attributes=price,category_id,listing_type_id,condition,shipping,attributes`,
    token
  );
  const it = await ri.json().catch(() => null);
  if (!ri.ok || !it) return { valor: null, raw: { item: it, status: ri.status } };

  const num = (id: string) => {
    const a = (it.attributes ?? []).find((x: any) => x.id === id);
    const n =
      a?.values?.[0]?.struct?.number ??
      parseFloat(String(a?.value_name ?? "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  let dims: string | null = it.shipping?.dimensions ?? null;
  if (!dims) {
    const h = num("SELLER_PACKAGE_HEIGHT");
    const w = num("SELLER_PACKAGE_WIDTH");
    const l = num("SELLER_PACKAGE_LENGTH");
    const p = num("SELLER_PACKAGE_WEIGHT"); // precisa estar em gramas
    if (h && w && l && p) dims = `${h}x${w}x${l},${p}`;
  }
  if (!dims) {
    return {
      valor: null,
      raw: {
        motivo: "sem dimensions e sem SELLER_PACKAGE_*",
        item: {
          category_id: it.category_id,
          price: it.price,
          listing_type_id: it.listing_type_id,
          shipping: it.shipping,
        },
        pacote: (it.attributes ?? []).filter((x: any) => /PACKAGE/.test(x.id)),
      },
    };
  }

  const qs = new URLSearchParams({
    dimensions: dims,
    verbose: "true",
    item_price: String(it.price),
    listing_type_id: it.listing_type_id,
    category_id: it.category_id,
    condition: it.condition,
    mode: it.shipping?.mode ?? "me2",
    logistic_type: it.shipping?.logistic_type ?? "drop_off",
  });

  const r = await ml(`/users/${userId}/shipping_options/free?${qs}`, token);
  const txt = await r.text();
  let j: any = null;
  try { j = JSON.parse(txt); } catch {}
  if (!r.ok || !j) {
    return { valor: null, raw: { status: r.status, body: txt.slice(0, 500), dims } };
  }

  const v = Number(j.coverage?.all_country?.list_cost);
  return { valor: Number.isFinite(v) ? v : null, raw: { dims, resposta: j } };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (
    !process.env.CRON_SECRET ||
    (auth !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET)
  )
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const conta = sp.get("conta") ?? "sobaquetas";
  const debugId = sp.get("debug")?.trim() || null; // testa o custo do vendedor de 1 anúncio, sem gravar
  const itemParam = sp.get("item")?.trim() || null; // MLB... ou MLBU...
  const dry = !!sp.get("dry"); // lista os anúncios sem gravar
  const status = sp.get("status") ?? "active"; // active | paused | all
  const zerados = !!sp.get("zerados"); // só itens sem custo_vendedor > 0 (em ml_fretes ou ml_custo_vendedor_item)
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const limit = Number(sp.get("limit") ?? 0) || 0; // 0 = sem limite
  const parcial = offset > 0 || limit > 0 || zerados;
  const ceps = (process.env.ML_CEPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const limiteTempo = Date.now() + 270_000; // margem antes dos 300s
  const inicio = new Date();
  const token = await getToken(conta);
  const me = await (await ml(`/users/me`, token)).json();

  if (debugId) {
    const r = await custoVendedorML(debugId, me.id, token);
    return NextResponse.json({ debug: debugId, valor: r.valor, raw: r.raw });
  }

  if (!ceps.length) return NextResponse.json({ erro: "defina ML_CEPS" }, { status: 400 });

  let porStatus: Record<string, number> = {};
  let ids: string[];
  if (itemParam) {
    ids = await resolverItens(itemParam, me.id, token, status);
  } else {
    const l = await listarAnuncios(me.id, token, status);
    porStatus = l.porStatus;
    ids = l.ids;
  }
  const totalListado = ids.length;

  if (!ids.length)
    return NextResponse.json({ erro: "nenhum anúncio encontrado", item: itemParam }, { status: 404 });

  if (dry)
    return NextResponse.json({
      dry: true,
      status,
      total: totalListado,
      porStatus,
      ceps: ceps.length,
      amostra: ids.slice(0, 5),
    });

  // só zerados: remove os que já têm custo > 0 em ml_fretes ou em ml_custo_vendedor_item
  if (zerados && !itemParam) {
    const { rows } = await pool.query(
      `select item_id from newsystem.ml_fretes
        where conta=$1 group by item_id
       having max(coalesce(custo_vendedor,0)) > 0
       union
       select item_id from newsystem.ml_custo_vendedor_item
        where conta=$1 and custo > 0`, [conta]);
    const ok = new Set(rows.map((r: { item_id: string }) => r.item_id));
    ids = ids.filter((id) => !ok.has(id));
    if (!ids.length)
      return NextResponse.json({
        modo: "zerados",
        status,
        listados: totalListado,
        processados: 0,
        mensagem: "nenhum anúncio zerado",
      });
  }

  if (offset > 0 || limit > 0) ids = ids.slice(offset, limit ? offset + limit : undefined);

  const tit = await titulos(ids, token);

  let gravados = 0, erros = 0;
  const semCoberturaIds = new Set<string>();
  const falhas: { id: string; cep: string; status: number | string }[] = [];
  const tarefas = ids.flatMap((id) => ceps.map((cep) => ({ id, cep })));
  const CONC = 4;

  async function worker() {
    while (tarefas.length) {
      const { id, cep } = tarefas.pop()!;
      try {
        const r = await ml(`/items/${id}/shipping_options?zip_code=${cep}`, token);
        if (!r.ok) {
          const txt = await r.text();
          if (
            r.status === 404 &&
            /no_coverage_options_found|stock out for all requested products/.test(txt)
          ) {
            // sem cobertura ou sem estoque: não é erro; o custo vai pelo /free mais abaixo
            semCoberturaIds.add(id);
            await pool.query(
              `delete from newsystem.ml_fretes where conta=$1 and item_id=$2 and cep=$3`,
              [conta, id, cep]);
            continue;
          }
          erros++;
          if (falhas.length < 50) falhas.push({ id, cep, status: r.status });
          console.error("shipping_options", id, cep, r.status, txt.slice(0, 200));
          continue;
        }
        const { options = [] } = await r.json();
        for (const o of options) {
          const metodo = o.shipping_method_id ?? o.id;
          if (!metodo) continue;
          await pool.query(
            `insert into newsystem.ml_fretes
               (conta,item_id,titulo,cep,metodo_id,nome,custo_comprador,custo_lista,prazo_horas,consultado_em)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
             on conflict (conta,item_id,cep,metodo_id) do update set
               titulo=excluded.titulo, nome=excluded.nome,
               custo_comprador=excluded.custo_comprador, custo_lista=excluded.custo_lista,
               prazo_horas=excluded.prazo_horas, consultado_em=now()`,
            [conta, id, tit[id] ?? null, cep, metodo, o.name,
             o.cost, o.list_cost, o.estimated_delivery_time?.shipping ?? null]);
          gravados++;
        }

        // custo do vendedor (não depende do CEP): opção em que o comprador paga 0
        const zero = options.find((o: any) => Number(o.cost) === 0);
        if (zero) {
          await pool.query(
            `update newsystem.ml_fretes set custo_vendedor=$3
              where conta=$1 and item_id=$2`,
            [conta, id, zero.list_cost]);
        }

        // remove métodos que deixaram de existir para este item/CEP
        await pool.query(
          `delete from newsystem.ml_fretes
            where conta=$1 and item_id=$2 and cep=$3 and consultado_em < $4`,
          [conta, id, cep, inicio]);
      } catch (e) {
        erros++;
        if (falhas.length < 50) falhas.push({ id, cep, status: "exception" });
        console.error("worker", id, cep, e instanceof Error ? e.message : e);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  // ---- Custo do vendedor via /shipping_options/free ----
  let custosAtualizados = 0; // gravados em ml_fretes
  let custosSemCobertura = 0; // gravados em ml_custo_vendedor_item
  let tempoEsgotado = false;
  const semCusto: { id: string; motivo: unknown }[] = [];

  async function rodarFila(fila: string[], salvar: (id: string, v: number) => Promise<void>) {
    async function w() {
      while (fila.length) {
        if (Date.now() > limiteTempo) { tempoEsgotado = true; return; }
        const id = fila.pop()!;
        try {
          const r = await custoVendedorML(id, me.id, token);
          if (r.valor !== null && r.valor > 0) {
            await salvar(id, r.valor);
          } else if (semCusto.length < 100) {
            semCusto.push({
              id,
              motivo: (r.raw as any)?.motivo ?? (r.raw as any)?.status ?? "valor 0/null",
            });
          }
        } catch (e) {
          if (semCusto.length < 100)
            semCusto.push({ id, motivo: e instanceof Error ? e.message : "exception" });
        }
        await sleep(150);
      }
    }
    await Promise.all(Array.from({ length: 3 }, w));
  }

  // 1) anúncios com linha em ml_fretes mas sem custo_vendedor > 0
  {
    const { rows } = await pool.query(
      `select item_id from newsystem.ml_fretes
        where conta=$1 and item_id = any($2)
        group by item_id
       having max(coalesce(custo_vendedor,0)) = 0`,
      [conta, ids]);
    const fila = rows.map((r: { item_id: string }) => r.item_id);
    await rodarFila(fila, async (id, v) => {
      await pool.query(
        `update newsystem.ml_fretes set custo_vendedor=$3 where conta=$1 and item_id=$2`,
        [conta, id, v]);
      custosAtualizados++;
    });
  }

  // 2) anúncios sem cobertura/sem estoque: grava em ml_custo_vendedor_item
  {
    const fila = [...semCoberturaIds];
    await rodarFila(fila, async (id, v) => {
      await pool.query(
        `insert into newsystem.ml_custo_vendedor_item (conta,item_id,custo,atualizado_em)
         values ($1,$2,$3,now())
         on conflict (conta,item_id) do update set custo=excluded.custo, atualizado_em=now()`,
        [conta, id, v]);
      custosSemCobertura++;
    });
  }

  // remove anúncios fora da listagem: só na execução completa, sem erros
  const podeLimpar = !itemParam && !parcial && erros === 0;
  const del = podeLimpar
    ? await pool.query(
        `delete from newsystem.ml_fretes where conta=$1 and not (item_id = any($2))`,
        [conta, ids])
    : null;

  return NextResponse.json({
    modo: itemParam ? "item" : zerados ? "zerados" : parcial ? "parcial" : "completo",
    status,
    item: itemParam,
    itens: itemParam ? ids : undefined,
    listados: totalListado,
    processados: ids.length,
    ceps: ceps.length,
    gravados,
    custosAtualizados,
    custosSemCobertura,
    semCusto: semCusto.length,
    semCustoLista: semCusto.length ? semCusto : undefined,
    tempoEsgotado: tempoEsgotado || undefined,
    semCobertura: semCoberturaIds.size,
    erros,
    falhas: falhas.length ? falhas : undefined,
    removidos: del
      ? del.rowCount
      : itemParam
        ? "n/a (modo item)"
        : parcial
          ? "n/a (modo parcial)"
          : "pulado (houve erros)",
  });
}
