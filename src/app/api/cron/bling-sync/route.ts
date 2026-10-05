import { NextRequest, NextResponse } from "next/server";
import { blingGet, getSb, listarAnunciosML, LOJAS, type Loja } from "@/lib/bling";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function preencherTitulos(loja: Loja, todos: boolean) {
  const sb = getSb();

  let q = sb.from("anuncios_ml").select("loja, codigo, tipo, id_bling").eq("loja", loja);
  if (!todos) q = q.is("titulo", null);
  const { data, error } = await q.limit(100_000);
  if (error) throw new Error(`select títulos: ${error.message}`);

  const pend = data ?? [];
  const ids = [...new Set(pend.map((r) => Number(r.id_bling)))];
  const nomes = new Map<number, string>();

  for (let i = 0; i < ids.length; i += 100) {
    const qs = ids
      .slice(i, i + 100)
      .map((id) => `idsProdutos[]=${id}`)
      .join("&");
    const resp = await blingGet(loja, `/produtos?limite=100&${qs}`);
    for (const p of resp?.data ?? []) nomes.set(Number(p.id), String(p.nome ?? "").trim());
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
  return { buscados: ids.length, gravados: rows.length };
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
  }

  // ?titulos=todos  -> rebusca o título de tudo (pega títulos editados no Bling)
  // Também roda completo aos domingos
  const diaSemana = new Date(Date.now() - 3 * 3600_000).getUTCDay();
  const refazerTodos =
    req.nextUrl.searchParams.get("titulos") === "todos" || diaSemana === 0;

  const sb = getSb();
  const resultado: Record<string, unknown> = {};

  for (const loja of LOJAS) {
    if (!process.env[`BLING_LOJA_ML_${loja.toUpperCase()}_ID`]) {
      resultado[loja] = "ignorada (sem BLING_LOJA_ML_*_ID)";
      continue;
    }

    try {
      const inicio = new Date().toISOString();
      const todos = await listarAnunciosML(loja);

      const map = new Map<string, any>();
      for (const a of todos) {
        const mlb = /^MLB\d+$/.test(a.idMercadoLivre);
        map.set(a.idMercadoLivre, {
          loja,
          codigo: a.idMercadoLivre,
          tipo: mlb ? "anuncio" : "variacao",
          id_bling: a.idBling,
          item_id: mlb ? a.idMercadoLivre : null,
          preco: Math.round(a.preco * 100) / 100,
          atualizado_em: inicio,
        });
      }
      const rows = Array.from(map.values());

      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await sb
          .from("anuncios_ml")
          .upsert(rows.slice(i, i + 500), { onConflict: "loja,codigo" });
        if (error) throw new Error(`upsert lote ${i}: ${error.message}`);
      }

      let removidos = 0;
      if (rows.length > 0) {
        const { count } = await sb
          .from("anuncios_ml")
          .delete({ count: "exact" })
          .eq("loja", loja)
          .lt("atualizado_em", inicio);
        removidos = count ?? 0;
      }

      const titulos = await preencherTitulos(loja, refazerTodos);

      resultado[loja] = { gravados: rows.length, removidos, titulos };
    } catch (e) {
      resultado[loja] = { erro: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json(resultado);
}
