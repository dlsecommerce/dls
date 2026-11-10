import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = "newsystem";
const PRODUCT_SHEET = "Por Produto";
const UPSERT_CHUNK = 500;
const PAGE_SIZE = 1000;
const CANAL_ML = "Mercado Livre";

// Canais canônicos. Chave em minúsculas, valor com o nome gravado no banco.
const CANAIS_CANONICOS: Record<string, string> = {
  "mercado livre": CANAL_ML,
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Nomes exatos dos cabeçalhos da aba Por Produto.
// MLB, Título e Frete Vendedor não estão aqui: são informativos e não são importados.
const COL = {
  channel: "Canal",
  store: "Loja",
  id_bling: "ID Bling",
  referencia: "Referência",
  brand: "Marca",
  classico_rate: "Clássico (%)",
  classico_fixed_fee: "Clássico Taxa Fixa (R$)",
  premium_rate: "Premium (%)",
  premium_fixed_fee: "Premium Taxa Fixa (R$)",
  frete_classico: "Frete Clássico",
  frete_classico_mode: "Modo Frete Clássico (fixed/percent)",
  frete_premium: "Frete Premium",
  frete_premium_mode: "Modo Frete Premium (fixed/percent)",
} as const;

type Mode = "fixed" | "percent";
type Pricing = "flat" | "tiered" | "brand";

type ChannelEntry = {
  pricing_mode?: Pricing;
  comissao?: number;
  frete?: number;
  frete_mode?: Mode;
  commission_tiers?: any[];
  default_rule?: { commission_rate: number; fixed_fee: number } | null;
  brand_rules?: any[];
  // modo -> listing -> regra
  listing_type_rules?: Record<string, Record<string, any>>;
};

type ByChannel = Record<string, ChannelEntry>;

type ProductRow = {
  channel: string;
  store: string;
  id_bling: string;
  referencia: string | null;
  brand: string | null;
  classico_rate: number | null;
  classico_fixed_fee: number | null;
  premium_rate: number | null;
  premium_fixed_fee: number | null;
  frete_classico: number | null;
  frete_classico_mode: Mode | null;
  frete_premium: number | null;
  frete_premium_mode: Mode | null;
  deleted_at: null;
};

// ---------- Helpers de leitura ----------

function cellText(cell: ExcelJS.Cell): string {
  return String(cell.value ?? "").trim();
}

function vazio(val: unknown): boolean {
  return val == null || val === "";
}

function normalizaCanal(val: unknown): string {
  const texto = String(val ?? "").trim().replace(/\s+/g, " ");
  if (!texto) return "";
  return CANAIS_CANONICOS[texto.toLowerCase()] ?? texto;
}

type NumeroLido = { ok: true; value: number | null } | { ok: false };

// Aceita número, "12,5", "R$ 1.234,56", "1.234" (milhar) e "12%". Vazio vira null. Lixo vira ok: false.
function lerNumero(val: unknown): NumeroLido {
  if (vazio(val)) return { ok: true, value: null };
  if (typeof val === "number") {
    return Number.isFinite(val) ? { ok: true, value: val } : { ok: false };
  }

  let s = String(val).replace(/R\$/gi, "").replace(/%/g, "").replace(/\s/g, "");
  if (s === "") return { ok: true, value: null };

  if (s.includes(",")) {
    // Formato brasileiro com decimal: 1.234,56 -> 1234.56
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Só pontos seguidos de três dígitos: separador de milhar (1.234 -> 1234)
    s = s.replace(/\./g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false };

  return { ok: true, value: Number(s) };
}

// Registra erro quando o valor não é número. Retorna null para vazio ou inválido.
function numero(val: unknown, rotulo: string, local: string, errors: string[]): number | null {
  const r = lerNumero(val);
  if (!r.ok) {
    errors.push(`${local}: "${rotulo}" inválido (${String(val)})`);
    return null;
  }
  return r.value;
}

// Planilha guarda percentual (12 = 12%); o banco guarda fração (0.12)
function taxa(val: unknown, rotulo: string, local: string, errors: string[]): number | null {
  const n = numero(val, rotulo, local, errors);
  return n == null ? null : n / 100;
}

// Modo de frete: vazio vira "fixed" quando há valor, senão null.
function modoFrete(
  raw: string,
  temValor: boolean,
  rotulo: string,
  local: string,
  errors: string[]
): Mode | null {
  const v = raw.toLowerCase();
  if (v === "fixed" || v === "percent") return v;
  if (v) {
    errors.push(`${local}: "${rotulo}" deve ser fixed ou percent`);
    return null;
  }
  return temValor ? "fixed" : null;
}

// Mescla listing_type_rules em dois níveis (modo -> listing),
// para que importar só "brand.premium" não apague "brand.classico".
function mesclarListingTypeRules(
  base: unknown,
  extra: unknown
): Record<string, Record<string, any>> | null {
  const out: Record<string, Record<string, any>> = {};
  for (const origem of [base ?? {}, extra ?? {}] as Array<Record<string, Record<string, any>>>) {
    for (const [modo, listings] of Object.entries(origem)) {
      out[modo] = { ...(out[modo] ?? {}), ...listings };
    }
  }
  return Object.keys(out).length ? out : null;
}

// Contas do Mercado Livre existentes em ml_fretes (usadas para validar a coluna Loja)
async function buscarContasML(): Promise<Set<string>> {
  const contas = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .schema(SCHEMA)
      .from("ml_fretes")
      .select("conta")
      .order("conta", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    for (const r of data ?? []) {
      const conta = String(r.conta ?? "").trim();
      if (conta) contas.add(conta);
    }

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return contas;
}

// ---------- Aba Por Produto ----------

function parseProductSheet(workbook: ExcelJS.Workbook, errors: string[]): ProductRow[] {
  const sheet = workbook.getWorksheet(PRODUCT_SHEET);
  if (!sheet) return [];

  const headerIdx = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const h = cellText(cell);
    if (h) headerIdx.set(h, col);
  });

  const obrigatorias = [COL.channel, COL.id_bling];
  const ausentes = obrigatorias.filter((h) => !headerIdx.has(h));
  if (ausentes.length) {
    errors.push(`Por Produto: colunas obrigatórias ausentes: ${ausentes.join(", ")}`);
    return [];
  }

  const raw = (row: ExcelJS.Row, header: string) => {
    const idx = headerIdx.get(header);
    return idx ? row.getCell(idx).value : null;
  };
  const txt = (row: ExcelJS.Row, header: string) => String(raw(row, header) ?? "").trim();

  const rows: ProductRow[] = [];
  const seen = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const local = `Por Produto, linha ${rowNumber}`;
    const channel = normalizaCanal(txt(row, COL.channel));
    const idBling = txt(row, COL.id_bling);

    // Linha totalmente vazia: ignora
    if (!channel && !idBling) return;

    if (!channel) {
      errors.push(`${local}: "Canal" é obrigatório`);
      return;
    }
    if (!idBling) {
      errors.push(`${local}: "ID Bling" é obrigatório`);
      return;
    }

    // Loja é a chave de ligação com ml_fretes.conta; sem ela a regra nunca casa no export
    const store = txt(row, COL.store);
    if (channel === CANAL_ML && !store) {
      errors.push(`${local}: "Loja" é obrigatória para o Mercado Livre`);
      return;
    }

    const key = `${channel}|${store}|${idBling}`;
    if (seen.has(key)) {
      errors.push(
        `${local}: ID Bling "${idBling}" repetido para o canal "${channel}" e loja "${store}"`
      );
      return;
    }
    seen.add(key);

    const freteClassico = numero(raw(row, COL.frete_classico), "Frete Clássico", local, errors);
    const fretePremium = numero(raw(row, COL.frete_premium), "Frete Premium", local, errors);

    rows.push({
      channel,
      store,
      id_bling: idBling,
      referencia: txt(row, COL.referencia) || null,
      brand: txt(row, COL.brand) || null,
      classico_rate: taxa(raw(row, COL.classico_rate), "Clássico (%)", local, errors),
      classico_fixed_fee: numero(raw(row, COL.classico_fixed_fee), "Clássico Taxa Fixa (R$)", local, errors),
      premium_rate: taxa(raw(row, COL.premium_rate), "Premium (%)", local, errors),
      premium_fixed_fee: numero(raw(row, COL.premium_fixed_fee), "Premium Taxa Fixa (R$)", local, errors),
      frete_classico: freteClassico,
      frete_classico_mode: modoFrete(
        txt(row, COL.frete_classico_mode),
        freteClassico != null,
        "Modo Frete Clássico",
        local,
        errors
      ),
      frete_premium: fretePremium,
      frete_premium_mode: modoFrete(
        txt(row, COL.frete_premium_mode),
        fretePremium != null,
        "Modo Frete Premium",
        local,
        errors
      ),
      deleted_at: null,
    });
  });

  return rows;
}

// ---------- Handler ----------

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const errors: string[] = [];
    const warnings: string[] = [];
    const byChannel: ByChannel = {};

    const ensureChannel = (channel: string): ChannelEntry => {
      if (!byChannel[channel]) byChannel[channel] = {};
      return byChannel[channel];
    };

    // ---------- Aba Fixo ----------
    const flatSheet = workbook.getWorksheet("Fixo");
    flatSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const canal = normalizaCanal(cellText(row.getCell(1)));
      if (!canal) return;

      const local = `Fixo, linha ${rowNumber}`;
      const entry = ensureChannel(canal);
      entry.pricing_mode = "flat";
      entry.comissao = numero(row.getCell(2).value, "Comissão (%)", local, errors) ?? 0;
      entry.frete = numero(row.getCell(3).value, "Frete", local, errors) ?? 0;
      entry.frete_mode =
        modoFrete(cellText(row.getCell(4)), true, "Modo Frete", local, errors) ?? "fixed";
    });

    // ---------- Aba Por Preço ----------
    const tieredSheet = workbook.getWorksheet("Por Preço");
    tieredSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const canal = normalizaCanal(cellText(row.getCell(1)));
      if (!canal) return;

      const local = `Por Preço, linha ${rowNumber}`;
      const minRaw = row.getCell(2).value;
      if (vazio(minRaw)) {
        errors.push(`${local}: "Mín (R$)" é obrigatório`);
        return;
      }

      const entry = ensureChannel(canal);
      entry.pricing_mode = "tiered";
      if (!entry.commission_tiers) entry.commission_tiers = [];

      entry.commission_tiers.push({
        min: numero(minRaw, "Mín (R$)", local, errors) ?? 0,
        max: numero(row.getCell(3).value, "Máx (R$)", local, errors),
        rate: taxa(row.getCell(4).value, "Taxa (%)", local, errors) ?? 0,
        fixedFee: numero(row.getCell(5).value, "Frete Fixo (R$)", local, errors) ?? 0,
      });
    });

    // ---------- Aba Por Marca ----------
    const brandSheet = workbook.getWorksheet("Por Marca");
    brandSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const canal = normalizaCanal(cellText(row.getCell(1)));
      if (!canal) return;

      const local = `Por Marca, linha ${rowNumber}`;
      const entry = ensureChannel(canal);
      entry.pricing_mode = "brand";

      // Se a aba trouxe qualquer linha para o canal, a lista de marcas é substituída.
      // Sem isso, marcas antigas do banco seriam mantidas em silêncio.
      if (!entry.brand_rules) entry.brand_rules = [];

      const marca = cellText(row.getCell(2));
      const isDefault = cellText(row.getCell(9)).toUpperCase() === "SIM";
      const comissao = taxa(row.getCell(3).value, "Comissão (%)", local, errors) ?? 0;
      const taxaFixa = numero(row.getCell(4).value, "Taxa Fixa (R$)", local, errors) ?? 0;

      if (isDefault || !marca) {
        entry.default_rule = { commission_rate: comissao, fixed_fee: taxaFixa };
        return;
      }

      const temClassico = !vazio(row.getCell(5).value) || !vazio(row.getCell(6).value);
      const temPremium = !vazio(row.getCell(7).value) || !vazio(row.getCell(8).value);

      entry.brand_rules.push({
        brand: marca,
        commission_rate: comissao,
        fixed_fee: taxaFixa,
        ...(temClassico
          ? {
              classico: {
                rate: taxa(row.getCell(5).value, "Clássico (%)", local, errors) ?? 0,
                fixedFee: numero(row.getCell(6).value, "Clássico R$", local, errors) ?? 0,
              },
            }
          : {}),
        ...(temPremium
          ? {
              premium: {
                rate: taxa(row.getCell(7).value, "Premium (%)", local, errors) ?? 0,
                fixedFee: numero(row.getCell(8).value, "Premium R$", local, errors) ?? 0,
              },
            }
          : {}),
      });
    });

    // ---------- Aba Condição ML (Global) ----------
    const conditionSheet = workbook.getWorksheet("Condição ML (Global)");
    conditionSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const canal = normalizaCanal(cellText(row.getCell(1)));
      const mode = cellText(row.getCell(2)).toLowerCase();
      const listing = cellText(row.getCell(3)).toLowerCase();

      // Linha totalmente vazia: ignora
      if (!canal && !mode && !listing) return;

      const local = `Condição ML, linha ${rowNumber}`;

      if (!canal) {
        errors.push(`${local}: "Canal" é obrigatório`);
        return;
      }
      if (!mode || !listing) {
        errors.push(`${local}: "Modo" e "Listing" são obrigatórios`);
        return;
      }
      if (!["flat", "tiered", "brand"].includes(mode)) {
        errors.push(`${local}: modo "${mode}" inválido`);
        return;
      }
      if (!["classico", "premium"].includes(listing)) {
        errors.push(`${local}: listing "${listing}" inválido`);
        return;
      }

      const frete = numero(row.getCell(6).value, "Frete", local, errors);

      const entry = ensureChannel(canal);
      if (!entry.listing_type_rules) entry.listing_type_rules = {};
      if (!entry.listing_type_rules[mode]) entry.listing_type_rules[mode] = {};

      entry.listing_type_rules[mode][listing] = {
        commission_rate: taxa(row.getCell(4).value, "Comissão (%)", local, errors) ?? 0,
        fixed_fee: numero(row.getCell(5).value, "Taxa Fixa (R$)", local, errors) ?? 0,
        frete,
        frete_mode: modoFrete(cellText(row.getCell(7)), frete != null, "Modo Frete", local, errors),
      };
    });

    // ---------- Aba Por Produto ----------
    const productRows = parseProductSheet(workbook, errors);

    if (errors.length) {
      return NextResponse.json(
        { error: "Erros de validação encontrados.", details: errors },
        { status: 400 }
      );
    }

    const channels = Object.keys(byChannel);
    if (!channels.length && !productRows.length) {
      return NextResponse.json(
        { error: "Nenhum dado válido encontrado na planilha." },
        { status: 400 }
      );
    }

    // ---------- Valida lojas do Mercado Livre (aviso, não bloqueia) ----------
    const lojasML = new Set(
      productRows.filter((p) => p.channel === CANAL_ML).map((p) => p.store)
    );

    if (lojasML.size) {
      try {
        const contas = await buscarContasML();
        for (const loja of lojasML) {
          if (!contas.has(loja)) {
            warnings.push(
              `Loja "${loja}" não existe em ml_fretes.conta. A regra será gravada, mas não casa com nenhum anúncio no export até haver frete consultado para essa loja.`
            );
          }
        }
      } catch {
        warnings.push("Não foi possível validar as lojas do Mercado Livre.");
      }
    }

    const saveErrors: string[] = [];

    // ---------- 1) Salva regras por produto (antes do canal e do recálculo) ----------
    let productsSaved = 0;

    for (let i = 0; i < productRows.length; i += UPSERT_CHUNK) {
      const chunk = productRows.slice(i, i + UPSERT_CHUNK);

      // Exige a constraint completa (channel, store, id_bling); índice parcial não serve para ON CONFLICT
      const { error: productError } = await supabaseAdmin
        .schema(SCHEMA)
        .from("marketplace_product_rules")
        .upsert(chunk, { onConflict: "channel,store,id_bling" });

      if (productError) {
        saveErrors.push(
          `Por Produto (linhas ${i + 1} a ${i + chunk.length}): ${productError.message}.`
        );
      } else {
        productsSaved += chunk.length;
      }
    }

    // ---------- 2) Salva regras por canal (sem recalcular ainda) ----------
    const canaisSalvos: string[] = [];

    for (const channel of channels) {
      const entry = byChannel[channel];

      try {
        const { data: existing, error: readError } = await supabaseAdmin
          .schema(SCHEMA)
          .from("marketplace_channel_rules")
          .select("*")
          .eq("channel", channel)
          .maybeSingle();

        if (readError) throw readError;

        // Canal que só traz Condição ML herda o modo e os campos já gravados
        const mode = entry.pricing_mode ?? existing?.pricing_mode;
        if (!mode) {
          throw new Error("sem regra de precificação. Preencha Fixo, Por Preço ou Por Marca");
        }

        const doc: ChannelEntry = entry.pricing_mode ? entry : {};

        // Upsert com todas as colunas obrigatórias, para não depender do estado da linha
        const row = {
          channel,
          pricing_mode: mode,
          comissao: doc.comissao ?? existing?.comissao ?? 0,
          frete: doc.frete ?? existing?.frete ?? 0,
          frete_mode: doc.frete_mode ?? existing?.frete_mode ?? "fixed",
          commission_tiers:
            mode === "tiered" ? doc.commission_tiers ?? existing?.commission_tiers ?? null : null,
          default_rule:
            mode === "brand" ? doc.default_rule ?? existing?.default_rule ?? null : null,
          brand_rules:
            mode === "brand" ? doc.brand_rules ?? existing?.brand_rules ?? null : null,
          listing_type_rules: mesclarListingTypeRules(
            existing?.listing_type_rules,
            entry.listing_type_rules
          ),
        };

        const { error: upsertError } = await supabaseAdmin
          .schema(SCHEMA)
          .from("marketplace_channel_rules")
          .upsert(row, { onConflict: "channel" });

        if (upsertError) throw upsertError;

        canaisSalvos.push(channel);
      } catch (err: any) {
        saveErrors.push(`Canal "${channel}": ${err?.message ?? "erro desconhecido"}.`);
      }
    }

    // ---------- 3) Recalcula uma vez por canal salvo, após produtos e canais ----------
    const recalculos: Array<Record<string, unknown>> = [];

    for (const channel of canaisSalvos) {
      try {
        const { data, error: rpcError } = await supabaseAdmin
          .schema(SCHEMA)
          .rpc("recalc_channel_pricing", { p_channel: channel });

        if (rpcError) throw rpcError;

        const resumo = Array.isArray(data) ? data[0] : data;
        recalculos.push({ channel, ...(resumo ?? {}) });

        // Linhas com preço manual mantêm comissão e frete; a regra de produto não se aplica a elas
        const { count, error: countError } = await supabaseAdmin
          .schema(SCHEMA)
          .from("marketplace")
          .select("announce_id", { count: "exact", head: true })
          .ilike("channel", channel)
          .eq("has_manual_pricing", true)
          .is("deleted_at", null);

        if (!countError && count) {
          warnings.push(
            `Canal "${channel}": ${count} anúncio(s) com preço manual preservaram comissão e frete. As regras importadas não se aplicam a eles.`
          );
        }
      } catch (err: any) {
        saveErrors.push(
          `Canal "${channel}": regras salvas, mas o recálculo falhou: ${err?.message ?? "erro desconhecido"}.`
        );
      }
    }

    const sucesso = saveErrors.length === 0;

    return NextResponse.json(
      {
        success: sucesso,
        updatedChannels: canaisSalvos.length,
        totalChannels: channels.length,
        updatedProducts: productsSaved,
        totalProducts: productRows.length,
        recalculos,
        warnings: warnings.length ? warnings : undefined,
        errors: saveErrors.length ? saveErrors : undefined,
      },
      { status: sucesso ? 200 : 207 }
    );
  } catch (err: any) {
    console.error("Erro ao importar regras de canal:", err);
    return NextResponse.json(
      { error: "Erro ao processar a planilha de regras de canal." },
      { status: 500 }
    );
  }
}
