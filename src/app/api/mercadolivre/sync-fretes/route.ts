import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});
const API = "https://api.mercadolibre.com";
const TIMEOUT_MS = 20_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Custo = {
  variation_id: number | null;
  valor: number | null;
  dims?: string;
  motivo?: string;
};

async function getToken(conta: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // serializa renovações da mesma conta (refresh_token é de uso único); mesmo lock da rota /frete
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`ml_token_${conta}`]);

    const { rows } = await client.query(
      `select * from newsystem.ml_tokens where conta=$1`, [conta]);
    const t = rows[0];
    if (!t) throw new Error("conta sem token");
    if (new Date(t.expires_at).getTime() > Date.now() + 60_000) {
      await client.query("commit");
      return t.access_token as string;
    }

    // credenciais por conta: ML_CLIENT_ID_SOBAQUETAS / ML_CLIENT_SECRET_SOBAQUETAS
    const sufixo = conta.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const clientId = (process.env[`ML_CLIENT_ID_${sufixo}`] ?? process.env.ML_CLIENT_ID)?.trim();
    const clientSecret = (process.env[`ML_CLIENT_SECRET_${sufixo}`] ?? process.env.ML_CLIENT_SECRET)?.trim();
    if (!clientId || !clientSecret)
      throw new Error(`ML_CLIENT_ID_${sufixo}/ML_CLIENT_SECRET_${sufixo} não carregados`);

    const r = await fetch(`${API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: t.refresh_token,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const j = await r.json();
    if (!r.ok) throw new Error("refresh falhou: " + JSON.stringify(j));
    await client.query(
      `update newsystem.ml_tokens
         set access_token=$2, refresh_token=$3,
             expires_at=now() + ($4 || ' seconds')::interval,
             refresh_expires_at=now() + interval '180 days'
       where conta=$1`,
      [conta, j.access_token, j.refresh_token, String(j.expires_in)]);
    await client.query("commit");
    return j.access_token as string;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** fetch com timeout e retry para 429, 424, 5xx e falhas de rede/timeout. 404/4xx são devolvidos sem retry. */
const ml = async (path: string, token: string) => {
  let last: Response | null = null;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(API + path, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
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

const TODOS = ["active", "paused", "inactive", "under_review", "payment_required"];

/**
 * status: "active" (padrão) | "all" (todos, exceto closed) | "full" (all + closed)
 *         | lista separada por vírgula, ex.: "paused,inactive"
 * Sem estoque = paused (sub_status out_of_stock), já incluído em "paused".
 */
function statusList(status: string): string[] {
  if (status === "all") return TODOS;
  if (status === "full") return [...TODOS, "closed"];
  return status.split(",").map((s) => s.trim()).filter(Boolean);
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
    if (!r.ok) throw new Error(`listagem falhou (${status}): ` + JSON.stringify(j));
    if (!j.results?.length) break;
    ids.push(...j.results);
    scroll = j.scroll_id;
  }
  return ids;
}

async function listarAnuncios(userId: number, token: string, status = "active") {
  const porStatus: Record<string, number> = {};
  const falhou: string[] = [];
  const set = new Set<string>();
  const lista = statusList(status);
  for (const s of lista) {
    try {
      const ids = await listarPorStatus(userId, token, s);
      porStatus[s] = ids.length;
      ids.forEach((id) => set.add(id));
      console.log(`[listar] ${s}: ${ids.length}`);
    } catch (e) {
      // com vários status, um inválido não derruba os demais
      if (lista.length === 1) throw e;
      falhou.push(s);
      console.error("listar", s, e instanceof Error ? e.message : e);
    }
  }
  return { ids: [...set].sort(), porStatus, falhou };
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

/** ids de variação por anúncio; sempre inclui 0 (linha do pai) */
async function variacoes(ids: string[], token: string) {
  const map: Record<string, number[]> = {};
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20).join(",");
    for (let t = 0; t < 3; t++) {
      const r = await ml(`/items?ids=${chunk}&attributes=id,variations`, token);
      const j = await r.json().catch(() => null);
      if (Array.isArray(j)) {
        for (const x of j)
          if (x.code === 200)
            map[x.body.id] = [0, ...(x.body.variations ?? []).map((v: any) => Number(v.id))];
        break;
      }
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
 * Lê um atributo numérico e converte a unidade.
 * tipo "peso": devolve gramas (kg*1000). tipo "comp": devolve cm (m*100, mm/10).
 */
function numAttr(attrs: any[], id: string, tipo: "peso" | "comp"): number | null {
  const a = attrs.find((x) => x.id === id);
  if (!a) return null;
  const s = a.values?.[0]?.struct;
  const nome = String(a.value_name ?? "");
  const n = s?.number ?? parseFloat(nome.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = String(s?.unit ?? nome.replace(/[\d.,\s-]/g, "")).toLowerCase();

  let v = n;
  if (tipo === "peso") {
    if (unit === "kg") v = n * 1000;
    else if (unit === "mg") v = n / 1000;
  } else {
    if (unit === "m") v = n * 100;
    else if (unit === "mm") v = n / 10;
  }
  return Math.max(1, Math.round(v));
}

function dimsDe(attrs: any[]): string | null {
  const h = numAttr(attrs, "SELLER_PACKAGE_HEIGHT", "comp");
  const w = numAttr(attrs, "SELLER_PACKAGE_WIDTH", "comp");
  const l = numAttr(attrs, "SELLER_PACKAGE_LENGTH", "comp");
  const p = numAttr(attrs, "SELLER_PACKAGE_WEIGHT", "peso");
  return h && w && l && p ? `${h}x${w}x${l},${p}` : null;
}

/**
 * Custo de envio do vendedor (o "Você paga R$ X" do painel), um registro por variação.
 * Usa /users/{id}/shipping_options/free com as dimensões do anúncio/variação.
 * Dimensões: shipping.dimensions ou, se nulo, atributos SELLER_PACKAGE_* (cm e gramas),
 * primeiro da variação, depois do anúncio, depois herdadas de outra variação do mesmo anúncio.
 * Funciona com anúncio pausado, sem estoque ou inativo (não depende do status).
 */
async function custosVendedorML(
  itemId: string, userId: number, token: string
): Promise<Custo[]> {
  const ri = await ml(`/items/${itemId}?include_attributes=all`, token);
  const it = await ri.json().catch(() => null);
  if (!ri.ok || !it) return [{ variation_id: null, valor: null, motivo: `item ${ri.status}` }];

  const vars: any[] = it.variations?.length ? it.variations : [null];
  const itemAttrs: any[] = it.attributes ?? [];

  // dimensões do anúncio e, se faltar, a primeira variação que tiver
  const dimsItem: string | null = it.shipping?.dimensions ?? dimsDe(itemAttrs);
  const dimsHerdada: string | null =
    dimsItem ?? vars.map((v) => dimsDe(v?.attributes ?? [])).find(Boolean) ?? null;

  const cache = new Map<string, Custo>();
  const out: Custo[] = [];

  for (const v of vars) {
    const vid: number | null = v?.id ?? null;
    const price = v?.price ?? it.price;

    const dims: string | null =
      dimsDe([...(v?.attributes ?? []), ...itemAttrs]) ?? dimsHerdada;

    if (!dims) {
      out.push({ variation_id: vid, valor: null, motivo: "sem dimensions e sem SELLER_PACKAGE_*" });
      continue;
    }

    const key = `${dims}|${price}`;
    if (!cache.has(key)) {
      const qs = new URLSearchParams({
        dimensions: dims,
        verbose: "true",
        item_price: String(price),
        listing_type_id: it.listing_type_id,
        category_id: it.category_id,
        condition: it.condition,
        mode: it.shipping?.mode ?? "me2",
        logistic_type: it.shipping?.logistic_type ?? "drop_off",
      });
      const r = await ml(`/users/${userId}/shipping_options/free?${qs}`, token);
      const j = await r.json().catch(() => null);
      const val = Number(j?.coverage?.all_country?.list_cost);
      cache.set(
        key,
        Number.isFinite(val)
          ? { variation_id: null, valor: val, dims }
          : { variation_id: null, valor: null, dims, motivo: `free ${r.status}` }
      );
    }
    out.push({ ...cache.get(key)!, variation_id: vid });
  }
  return out;
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
  const debugId = sp.get("debug")?.trim() || null; // testa o custo de 1 anúncio (todas as variações), sem gravar
  const itemParam = sp.get("item")?.trim() || null; // MLB... ou MLBU...
  const dry = !!sp.get("dry"); // lista os anúncios sem gravar
  const status = sp.get("status") ?? "active"; // active | all | full | paused,inactive ...
  const zerados = !!sp.get("zerados"); // só itens sem custo_vendedor > 0
  const pendentes = !!sp.get("pendentes"); // só anúncios com linhas consultado_em = epoch
  const soCusto = !!sp.get("socusto"); // pula o frete por CEP e calcula só o custo do vendedor
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const limit = Number(sp.get("limit") ?? 0) || 0; // 0 = sem limite
  const parcial = offset > 0 || limit > 0 || zerados || pendentes;
  const ceps = (process.env.ML_CEPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const limiteTempo = Date.now() + 270_000; // margem antes dos 300s
  const inicio = new Date();

  let token: string;
  let me: any;
  try {
    token = await getToken(conta);
    const rm = await ml(`/users/me`, token);
    me = await rm.json();
    if (!rm.ok || !me?.id)
      return NextResponse.json({ erro: "falha em /users/me", detalhe: me }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falha ao autenticar" }, { status: 500 });
  }

  if (debugId) {
    const custos = await custosVendedorML(debugId, me.id, token);
    return NextResponse.json({ debug: debugId, custos });
  }

  if (!ceps.length && !soCusto)
    return NextResponse.json({ erro: "defina ML_CEPS" }, { status: 400 });

  let porStatus: Record<string, number> = {};
  let statusFalhos: string[] = [];
  let ids: string[];
  if (itemParam) {
    ids = await resolverItens(itemParam, me.id, token, status);
  } else {
    const l = await listarAnuncios(me.id, token, status);
    porStatus = l.porStatus;
    statusFalhos = l.falhou;
    ids = l.ids;
  }
  const totalListado = ids.length;

  if (!ids.length)
    return NextResponse.json({ erro: "nenhum anúncio encontrado", item: itemParam }, { status: 404 });

  if (dry) {
    // faltantes=1: anúncios sem registro em ml_fretes nem em ml_custo_vendedor_item
    let semRegistro: string[] | undefined;
    if (sp.get("faltantes")) {
      const { rows } = await pool.query(
        `select item_id from newsystem.ml_fretes where conta=$1
         union
         select item_id from newsystem.ml_custo_vendedor_item where conta=$1`, [conta]);
      const tem = new Set(rows.map((r: { item_id: string }) => r.item_id));
      semRegistro = ids.filter((id) => !tem.has(id));
    }

    // subs=1: quebra por status:sub_status (out_of_stock, suspended, forbidden...)
    let subStatus: Record<string, number> | undefined;
    if (sp.get("subs")) {
      subStatus = {};
      for (let i = 0; i < ids.length; i += 20) {
        const rr = await ml(
          `/items?ids=${ids.slice(i, i + 20).join(",")}&attributes=id,status,sub_status`, token);
        const j = await rr.json().catch(() => null);
        if (!Array.isArray(j)) continue;
        for (const x of j) {
          if (x.code !== 200) continue;
          const k = `${x.body.status}:${(x.body.sub_status ?? []).join("+") || "-"}`;
          subStatus[k] = (subStatus[k] ?? 0) + 1;
        }
      }
    }

    return NextResponse.json({
      dry: true,
      status,
      total: totalListado,
      porStatus,
      statusFalhos: statusFalhos.length ? statusFalhos : undefined,
      ceps: ceps.length,
      subStatus,
      semRegistroTotal: semRegistro?.length,
      semRegistro: semRegistro?.slice(0, 200),
      amostra: ids.slice(0, 5),
    });
  }

  // só zerados: remove os que já têm custo > 0 em TODAS as variações de ml_fretes, ou em ml_custo_vendedor_item
  if (zerados && !itemParam) {
    const { rows } = await pool.query(
      `select item_id from newsystem.ml_fretes
        where conta=$1 group by item_id
       having min(coalesce(custo_vendedor,0)) > 0
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

  // só pendentes: anúncios com linhas ainda não consultadas (consultado_em = epoch)
  if (pendentes && !itemParam) {
    const { rows } = await pool.query(
      `select distinct item_id from newsystem.ml_fretes
        where conta=$1 and consultado_em='epoch'`, [conta]);
    const p = new Set(rows.map((r: { item_id: string }) => r.item_id));
    ids = ids.filter((id) => p.has(id));
    if (!ids.length)
      return NextResponse.json({ modo: "pendentes", processados: 0, mensagem: "nenhum pendente" });
  }

  if (offset > 0 || limit > 0) ids = ids.slice(offset, limit ? offset + limit : undefined);

  console.log(`[sync] conta=${conta} listados=${totalListado} processar=${ids.length} socusto=${soCusto}`);
  const tit = await titulos(ids, token);
  const vmap: Record<string, number[]> = soCusto ? {} : await variacoes(ids, token);

  let gravados = 0, erros = 0, bloqueados = 0;
  let tempoEsgotado = false;
  const semCoberturaIds = new Set<string>();
  const falhas: { id: string; cep: string; status: number | string }[] = [];
  // com socusto não há tarefas de frete por CEP
  const tarefas = soCusto ? [] : ids.flatMap((id) => ceps.map((cep) => ({ id, cep })));
  const totalTarefas = tarefas.length;
  let feitasTarefas = 0;
  const CONC = 4;

  async function worker() {
    while (tarefas.length) {
      if (Date.now() > limiteTempo) { tempoEsgotado = true; return; }
      const { id, cep } = tarefas.pop()!;
      feitasTarefas++;
      if (feitasTarefas % 50 === 0)
        console.log(`[frete] ${feitasTarefas}/${totalTarefas}`);
      try {
        const vids = vmap[id];
        if (!vids) {
          // sem lista de variações, não grava (evita o cleanup apagar linhas)
          erros++;
          if (falhas.length < 50) falhas.push({ id, cep, status: "sem variacoes" });
          continue;
        }

        const r = await ml(`/items/${id}/shipping_options?zip_code=${cep}`, token);
        if (!r.ok) {
          const txt = await r.text();
          const semFrete =
            r.status === 404 &&
            /no_coverage_options_found|stock out for all requested products/.test(txt);
          // inativo / com problema: o ML pode responder 400 ou 403
          const bloqueado = r.status === 400 || r.status === 403;

          if (semFrete || bloqueado) {
            // não é erro: o custo vai pelo /free mais abaixo
            semCoberturaIds.add(id);
            if (bloqueado) {
              bloqueados++;
              if (falhas.length < 50) falhas.push({ id, cep, status: r.status });
              console.error("bloqueado", id, cep, r.status, txt.slice(0, 200));
            }
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
               (conta,item_id,titulo,cep,metodo_id,nome,custo_comprador,custo_lista,prazo_horas,consultado_em,variation_id)
             select $1::text,$2::text,$3::text,$4::text,$5::bigint,$6::text,$7::numeric,$8::numeric,$9::integer,now(),u.vid
               from unnest($10::bigint[]) as u(vid)
             on conflict (conta,item_id,variation_id,cep,metodo_id) do update set
               titulo=excluded.titulo, nome=excluded.nome,
               custo_comprador=excluded.custo_comprador, custo_lista=excluded.custo_lista,
               prazo_horas=excluded.prazo_horas, consultado_em=now()`,
            [conta, id, tit[id] ?? null, cep, metodo, o.name,
             o.cost, o.list_cost, o.estimated_delivery_time?.shipping ?? null, vids]);
          gravados += vids.length;
        }

        // sem variações: custo do vendedor vem direto da opção em que o comprador paga 0.
        // com variações: vem do /free por variação (etapa 1 abaixo)
        const zero = options.find((o: any) => Number(o.cost) === 0);
        if (zero && vids.length === 1) {
          await pool.query(
            `update newsystem.ml_fretes set custo_vendedor=$3
              where conta=$1 and item_id=$2 and variation_id=0`,
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
  if (!soCusto) await Promise.all(Array.from({ length: CONC }, worker));

  // ---- Custo do vendedor via /shipping_options/free (por variação) ----
  let custosAtualizados = 0; // anúncios com custo gravado em ml_fretes (por variação + pai = maior entre variações)
  let custosSemCobertura = 0; // anúncios gravados em ml_custo_vendedor_item (1 linha por variação)
  const semCusto: { id: string; motivo: unknown }[] = [];

  async function rodarFila(
    etapa: string,
    fila: string[],
    salvar: (id: string, c: Custo[]) => Promise<void>
  ) {
    const total = fila.length;
    let feitos = 0;
    console.log(`[custo ${etapa}] início: ${total} anúncios`);
    async function w() {
      while (fila.length) {
        if (Date.now() > limiteTempo) { tempoEsgotado = true; return; }
        const id = fila.pop()!;
        try {
          const custos = await custosVendedorML(id, me.id, token);
          if (!custos.some((c) => c.valor !== null && c.valor > 0) && semCusto.length < 100)
            semCusto.push({ id, motivo: custos[0]?.motivo ?? "valor 0/null" });
          await salvar(id, custos);
          if (feitos < 3)
            console.log("custo", id, custos.map((c) => `${c.variation_id}:${c.valor}`).join(" "));
        } catch (e) {
          if (semCusto.length < 100)
            semCusto.push({ id, motivo: e instanceof Error ? e.message : "exception" });
          console.error("custo", id, e instanceof Error ? e.message : e);
        }
        feitos++;
        if (feitos % 10 === 0) console.log(`[custo ${etapa}] ${feitos}/${total}`);
        await sleep(150);
      }
    }
    await Promise.all(Array.from({ length: 3 }, w));
    console.log(`[custo ${etapa}] fim: ${feitos}/${total}`);
  }

  // 1) anúncios com alguma linha em ml_fretes sem custo_vendedor > 0 (pulado com socusto)
  if (!soCusto) {
    const { rows } = await pool.query(
      `select item_id from newsystem.ml_fretes
        where conta=$1 and item_id = any($2)
        group by item_id
       having bool_or(coalesce(custo_vendedor,0) = 0)`,
      [conta, ids]);
    const fila = rows.map((r: { item_id: string }) => r.item_id);
    await rodarFila("fretes", fila, async (id, cs) => {
      let max = 0;
      for (const c of cs) {
        if (c.valor === null || c.valor <= 0) continue;
        max = Math.max(max, c.valor);
        await pool.query(
          `update newsystem.ml_fretes set custo_vendedor=$4
            where conta=$1 and item_id=$2 and variation_id=$3`,
          [conta, id, c.variation_id ?? 0, c.valor]);
      }
      if (max > 0) {
        // linha do pai = maior custo entre as variações
        if (cs.some((c) => c.variation_id !== null))
          await pool.query(
            `update newsystem.ml_fretes set custo_vendedor=$3
              where conta=$1 and item_id=$2 and variation_id=0`,
            [conta, id, max]);
        custosAtualizados++;
      }
    });
  }

  // 2) grava pai + variações em ml_custo_vendedor_item
  {
    await rodarFila("itens", [...ids], async (id, cs) => {
      const linhas: { vid: number; custo: number | null }[] = cs.map((c) => ({
        vid: c.variation_id ?? 0,
        custo: c.valor !== null && c.valor > 0 ? c.valor : null,
      }));

      // anúncio com variações: adiciona a linha do pai (variation_id = 0)
      if (cs.some((c) => c.variation_id !== null)) {
        const max = Math.max(0, ...linhas.map((l) => l.custo ?? 0));
        linhas.push({ vid: 0, custo: max > 0 ? max : null });
      }

      for (const l of linhas) {
        await pool.query(
          `insert into newsystem.ml_custo_vendedor_item
             (conta,item_id,variation_id,titulo,custo,atualizado_em)
           values ($1,$2,$3,$4,$5,now())
           on conflict (conta,item_id,variation_id) do update set
             custo=excluded.custo, titulo=excluded.titulo, atualizado_em=now()`,
          [conta, id, l.vid, tit[id] ?? null, l.custo]);
      }
      custosSemCobertura++;
    });
  }

  // remove anúncios fora da listagem: só em execução completa (all/full), sem erros e sem status falho
  const podeLimpar =
    !itemParam &&
    !parcial &&
    !tempoEsgotado &&
    erros === 0 &&
    (status === "all" || status === "full") &&
    statusFalhos.length === 0;

  let removidosFretes: number | null = null;
  let removidosItens: number | null = null;
  if (podeLimpar) {
    const d1 = await pool.query(
      `delete from newsystem.ml_fretes where conta=$1 and not (item_id = any($2))`,
      [conta, ids]);
    const d2 = await pool.query(
      `delete from newsystem.ml_custo_vendedor_item where conta=$1 and not (item_id = any($2))`,
      [conta, ids]);
    removidosFretes = d1.rowCount;
    removidosItens = d2.rowCount;
  }

  console.log(`[sync] fim: itens=${custosSemCobertura} esgotado=${tempoEsgotado}`);

  return NextResponse.json({
    modo: itemParam
      ? "item"
      : pendentes
        ? "pendentes"
        : zerados
          ? "zerados"
          : parcial
            ? "parcial"
            : "completo",
    socusto: soCusto || undefined,
    status,
    item: itemParam,
    itens: itemParam ? ids : undefined,
    listados: totalListado,
    porStatus,
    statusFalhos: statusFalhos.length ? statusFalhos : undefined,
    processados: ids.length,
    ceps: ceps.length,
    gravados,
    custosAtualizados,
    custosSemCobertura,
    semCusto: semCusto.length,
    semCustoLista: semCusto.length ? semCusto : undefined,
    tempoEsgotado: tempoEsgotado || undefined,
    semCobertura: semCoberturaIds.size,
    bloqueados,
    erros,
    falhas: falhas.length ? falhas : undefined,
    removidos: podeLimpar
      ? { ml_fretes: removidosFretes, ml_custo_vendedor_item: removidosItens }
      : itemParam
        ? "n/a (modo item)"
        : parcial
          ? "n/a (modo parcial)"
          : "pulado (use status=all/full, sem erros, sem tempo esgotado e sem status falho)",
  });
}
