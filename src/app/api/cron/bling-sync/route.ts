import { NextRequest, NextResponse } from "next/server";
import { blingGet, getSb, listarAnunciosML, LOJAS, type Loja } from "@/lib/bling";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sincronizarAnuncios(loja: Loja) {
  const sb = getSb();
  const inicio = new Date().toISOString();

  const todos = await listarAnunciosML(loja);
  const rows = todos.map((a) => {
    const mlb = /^MLB\d+$/.test(a.idMercadoLivre);
    return {
      loja,
      codigo: a.idMercadoLivre,
      tipo: mlb ? "anuncio" : "variacao",
      id_bling: a.idBling,
      item_id: mlb ? a.idMercadoLivre : null,
      preco: Math.round(a.preco * 100) / 100,
      atualizado_em: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb
      .from("anuncios_ml")
      .upsert(rows.slice(i, i + 500), { onConflict: "loja,codigo" });
    if (error) throw new Error(`upsert anúncios: ${error.message}`);
  }

  // Remove o que não veio mais do Bling (só se a listagem não veio vazia)
  let removidos = 0;
  if (rows.length > 0) {
    const { data, error } = await sb
      .from("anuncios_ml")
      .delete()
      .eq("loja", loja)
      .lt("atualizado_em", inicio)
      .select("codigo");
    if (error) throw new Error(`delete removidos: ${error.message}`);
    removidos = data?.length ?? 0;
  }

  return { gravados: rows.length, removidos };
}

async function preencherTitulos(loja: Loja, todos: boolean) {
  const sb = getSb();

  let q = sb.from("anuncios_ml").select("loja, codigo, tipo, id_bling").eq("loja", loja);
  if (!todos) q = q.is("titulo", null);
  const { data, error } = await q.limit(100_000);
  if (error) throw new Error(`select títulos: ${error.message}`);

  const pend = data ?? [];
  const ids = [...new Set(pend.map((r) => Number(r.id_bling)))];
  const nomes = new Map<number, string>();

  // 1) Lote de 100, incluindo todos os status (criterio=5)
  for (let i = 0; i < ids.length; i += 100) {
    const qs = ids
      .slice(i, i + 100)
      .map((id) => `idsProdutos[]=${id}`)
      .join("&");
    const resp = await blingGet(loja, `/produtos?limite=100&criterio=5&${qs}`);
    for (const p of resp?.data ?? []) nomes.set(Number(p.id), String(p.nome ?? "").trim());
    await sleep(350);
  }

  // 2) Os que o lote não devolveu: busca individual
  const faltando = ids.filter((id) => !nomes.has(id));
  for (const id of faltando) {
    try {
      const r = await blingGet(loja, `/produtos/${id}`);
      const nome = String(r?.data?.nome ?? "").trim();
      if (nome) nomes.set(id, nome);
    } catch {
      // produto não existe mais no Bling: segue sem título
    }
    await sleep(350);
  }

  const rows = pend
    .filter((r) => nomes.get(Number(r.id_bling)))
    .map((r) => ({ ...r, titulo: nomes.get(Number(r.id_bling)) }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await sb
      .from("anuncios_ml")
      .upsert(rows.slice(i, i + 500), { onConflict: "loja,codigo" });
    if (e) throw new Error(`upsert títulos: ${e.message}`);
  }
  return { buscados: ids.length, gravados: rows.length, semTitulo: ids.length - nomes.size };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
  }

  // Domingo (horário de Brasília) ou ?titulos=todos => refaz todos os títulos
  const domingo =
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "America/Sao_Paulo",
    }) === "Sun";
  const todosTitulos = req.nextUrl.searchParams.get("titulos") === "todos" || domingo;

  const resultado: Record<string, unknown> = {};

  for (const loja of LOJAS) {
    if (!process.env[`BLING_LOJA_ML_${loja.toUpperCase()}_ID`]) {
      resultado[loja] = "ignorada (sem BLING_LOJA_ML_*_ID)";
      continue;
    }
    try {
      const sync = await sincronizarAnuncios(loja);
      const titulos = await preencherTitulos(loja, todosTitulos);
      resultado[loja] = { ...sync, titulos };
    } catch (e) {
      resultado[loja] = { erro: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json(resultado);
}
