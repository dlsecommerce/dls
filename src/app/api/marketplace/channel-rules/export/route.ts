import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";
const ACCENT = "1A8CEB";
const PAGE_SIZE = 1000;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function headerStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${ACCENT}` },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function buildFileName() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  const time = `${pad(now.getHours())}h${pad(now.getMinutes())}m`;
  return `REGRA - MARKETPLACE - ${date} ${time}.xlsx`;
}

// Taxa armazenada como fração (0.12 = 12%), igual ao restante do export
const toPct = (v: unknown) =>
  v == null || v === "" ? "" : Number(v) * 100;

const orEmpty = (v: unknown) => (v == null ? "" : v);

const normaliza = (v: unknown) => (v == null ? "" : String(v).trim());

// Busca todas as páginas de uma consulta paginada por range()
async function fetchAllPaginated(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>
): Promise<any[]> {
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    all.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function fetchAllProductRules() {
  return fetchAllPaginated((from, to) =>
    supabaseAdmin
      .schema(SCHEMA)
      .from("marketplace_product_rules")
      .select(
        "channel, store, id_bling, referencia, brand, classico_rate, classico_fixed_fee, premium_rate, premium_fixed_fee, frete_classico, frete_classico_mode, frete_premium, frete_premium_mode"
      )
      .is("deleted_at", null)
      .order("channel", { ascending: true })
      .order("store", { ascending: true })
      .order("id_bling", { ascending: true })
      .range(from, to)
  );
}

async function fetchAllListings() {
  return fetchAllPaginated((from, to) =>
    supabaseAdmin
      .schema(SCHEMA)
      .from("vw_listing_produto")
      .select("id_bling, mlb, variation_id, titulo, referencia, custo_vendedor")
      .order("id_bling", { ascending: true })
      .order("variation_id", { ascending: true })
      .order("mlb", { ascending: true })
      .range(from, to)
  );
}

type ProdutoAnuncio = {
  mlb: string;
  titulo: string;
  referencia: string;
  frete: unknown;
  isPai: boolean;
};

// Preenche campos vazios de "base" com valores de "extra"
function mesclar(base: ProdutoAnuncio, extra: ProdutoAnuncio): ProdutoAnuncio {
  return {
    ...base,
    mlb: base.mlb || extra.mlb,
    titulo: base.titulo || extra.titulo,
    referencia: base.referencia || extra.referencia,
    frete: base.frete ?? extra.frete,
  };
}

// Uma entrada por id_bling. Prefere o anúncio pai (variation_id = '0');
// se não houver, usa a primeira variação. Campos vazios são completados
// com os das demais linhas do mesmo id_bling.
function buildListingMap(rows: any[]) {
  const map = new Map<string, ProdutoAnuncio>();

  for (const r of rows) {
    const idBling = normaliza(r.id_bling);
    if (!idBling) continue;

    const variacao = normaliza(r.variation_id);
    const novo: ProdutoAnuncio = {
      mlb: normaliza(r.mlb),
      titulo: normaliza(r.titulo),
      referencia: normaliza(r.referencia),
      frete: r.custo_vendedor ?? null,
      isPai: variacao === "0" || variacao === "",
    };

    const atual = map.get(idBling);

    if (!atual) {
      map.set(idBling, novo);
    } else if (novo.isPai && !atual.isPai) {
      map.set(idBling, mesclar(novo, atual));
    } else {
      map.set(idBling, mesclar(atual, novo));
    }
  }

  return map;
}

export async function GET() {
  try {
    const { data: rules, error } = await supabaseAdmin
      .schema(SCHEMA)
      .from("marketplace_channel_rules")
      .select("*")
      .order("channel", { ascending: true });

    if (error) throw error;

    const productRules = await fetchAllProductRules();
    const listingMap = buildListingMap(await fetchAllListings());

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MyHUB.IA";
    workbook.created = new Date();

    // ---------- Aba: Fixo ----------
    const flatSheet = workbook.addWorksheet("Fixo");
    flatSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Comissão (%)", key: "comissao", width: 16 },
      { header: "Frete", key: "frete", width: 14 },
      { header: "Modo Frete (fixed/percent)", key: "frete_mode", width: 24 },
    ];
    flatSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Por Preço ----------
    const tieredSheet = workbook.addWorksheet("Por Preço");
    tieredSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Mín (R$)", key: "min", width: 12 },
      { header: "Máx (R$) - vazio = sem limite", key: "max", width: 28 },
      { header: "Taxa (%)", key: "rate", width: 12 },
      { header: "Frete Fixo (R$)", key: "fixedFee", width: 16 },
    ];
    tieredSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Por Marca ----------
    const brandSheet = workbook.addWorksheet("Por Marca");
    brandSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Marca", key: "brand", width: 20 },
      { header: "Comissão (%)", key: "rate", width: 14 },
      { header: "Taxa Fixa (R$)", key: "fixedFee", width: 16 },
      { header: "Clássico % (opcional)", key: "classico_rate", width: 20 },
      { header: "Clássico R$ (opcional)", key: "classico_fee", width: 20 },
      { header: "Premium % (opcional)", key: "premium_rate", width: 20 },
      { header: "Premium R$ (opcional)", key: "premium_fee", width: 20 },
      { header: "É Regra Padrão? (SIM/NÃO)", key: "is_default", width: 24 },
    ];
    brandSheet.getRow(1).eachCell(headerStyle);

    // ---------- Aba: Por Produto ----------
    const productSheet = workbook.addWorksheet("Por Produto");
    productSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Loja", key: "store", width: 18 },
      { header: "ID Bling", key: "id_bling", width: 16 },
      { header: "MLB", key: "mlb", width: 16 },
      { header: "Título", key: "titulo", width: 50 },
      { header: "Referência", key: "referencia", width: 20 },
      { header: "Frete Vendedor (R$)", key: "frete_vendedor", width: 20 },
      { header: "Marca", key: "brand", width: 20 },
      { header: "Clássico (%)", key: "classico_rate", width: 14 },
      { header: "Clássico Taxa Fixa (R$)", key: "classico_fixed_fee", width: 22 },
      { header: "Premium (%)", key: "premium_rate", width: 14 },
      { header: "Premium Taxa Fixa (R$)", key: "premium_fixed_fee", width: 22 },
      { header: "Frete Clássico", key: "frete_classico", width: 16 },
      { header: "Modo Frete Clássico (fixed/percent)", key: "frete_classico_mode", width: 32 },
      { header: "Frete Premium", key: "frete_premium", width: 16 },
      { header: "Modo Frete Premium (fixed/percent)", key: "frete_premium_mode", width: 32 },
    ];
    productSheet.getRow(1).eachCell(headerStyle);
    productSheet.views = [{ state: "frozen", ySplit: 1 }];

    // ---------- Aba: Condição ML (Global) ----------
    const conditionSheet = workbook.addWorksheet("Condição ML (Global)");
    conditionSheet.columns = [
      { header: "Canal", key: "channel", width: 28 },
      { header: "Modo (flat/tiered/brand)", key: "mode", width: 22 },
      { header: "Listing (classico/premium)", key: "listing", width: 24 },
      { header: "Comissão (%)", key: "rate", width: 14 },
      { header: "Taxa Fixa (R$)", key: "fixedFee", width: 16 },
      { header: "Frete", key: "frete", width: 12 },
      { header: "Modo Frete (fixed/percent)", key: "frete_mode", width: 24 },
    ];
    conditionSheet.getRow(1).eachCell(headerStyle);

    // ---------- Preenche as abas por canal ----------
    for (const rule of rules ?? []) {
      if (rule.pricing_mode === "flat") {
        flatSheet.addRow({
          channel: rule.channel,
          comissao: rule.comissao,
          frete: rule.frete,
          frete_mode: rule.frete_mode,
        });
      }

      if (rule.pricing_mode === "tiered" && rule.commission_tiers?.length) {
        for (const t of rule.commission_tiers) {
          tieredSheet.addRow({
            channel: rule.channel,
            min: t.min,
            max: t.max ?? "",
            rate: Number(t.rate) * 100,
            fixedFee: t.fixedFee,
          });
        }
      }

      if (rule.pricing_mode === "brand") {
        if (rule.default_rule) {
          brandSheet.addRow({
            channel: rule.channel,
            brand: "",
            rate: Number(rule.default_rule.commission_rate) * 100,
            fixedFee: rule.default_rule.fixed_fee,
            classico_rate: "",
            classico_fee: "",
            premium_rate: "",
            premium_fee: "",
            is_default: "SIM",
          });
        }
        for (const b of rule.brand_rules ?? []) {
          brandSheet.addRow({
            channel: rule.channel,
            brand: b.brand,
            rate: Number(b.commission_rate) * 100,
            fixedFee: b.fixed_fee,
            classico_rate: b.classico ? Number(b.classico.rate) * 100 : "",
            classico_fee: b.classico ? b.classico.fixedFee : "",
            premium_rate: b.premium ? Number(b.premium.rate) * 100 : "",
            premium_fee: b.premium ? b.premium.fixedFee : "",
            is_default: "NÃO",
          });
        }
      }

      if (rule.listing_type_rules) {
        for (const mode of ["flat", "tiered", "brand"] as const) {
          const block = rule.listing_type_rules[mode];
          if (!block) continue;
          for (const listing of ["classico", "premium"] as const) {
            const lt = block[listing];
            if (!lt) continue;
            conditionSheet.addRow({
              channel: rule.channel,
              mode,
              listing,
              rate: Number(lt.commission_rate) * 100,
              fixedFee: lt.fixed_fee,
              frete: lt.frete ?? "",
              frete_mode: lt.frete_mode ?? "",
            });
          }
        }
      }
    }

    // ---------- Preenche a aba Por Produto ----------
    for (const p of productRules) {
      const idBling = normaliza(p.id_bling);
      const anuncio = listingMap.get(idBling);

      // Referência gravada na regra tem prioridade sobre o SKU da view
      const referencia = normaliza(p.referencia) || anuncio?.referencia || "";

      productSheet.addRow({
        channel: orEmpty(p.channel),
        store: orEmpty(p.store),
        id_bling: idBling,
        mlb: anuncio?.mlb ?? "",
        titulo: anuncio?.titulo ?? "",
        referencia,
        frete_vendedor:
          anuncio?.frete == null || anuncio?.frete === "" ? "" : Number(anuncio.frete),
        brand: orEmpty(p.brand),
        classico_rate: toPct(p.classico_rate),
        classico_fixed_fee: orEmpty(p.classico_fixed_fee),
        premium_rate: toPct(p.premium_rate),
        premium_fixed_fee: orEmpty(p.premium_fixed_fee),
        frete_classico: orEmpty(p.frete_classico),
        frete_classico_mode: orEmpty(p.frete_classico_mode),
        frete_premium: orEmpty(p.frete_premium),
        frete_premium_mode: orEmpty(p.frete_premium_mode),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = buildFileName();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err: any) {
    console.error("Erro ao exportar regras de canal:", err);
    return NextResponse.json(
      { error: "Erro ao gerar planilha de regras de canal." },
      { status: 500 }
    );
  }
}
