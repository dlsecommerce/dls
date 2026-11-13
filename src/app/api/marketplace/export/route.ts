import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Writable } from "stream";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

type Row = Record<string, any>;

const COL = {
  ID: 1, LOJA: 2, CANAL: 3, ID_BLING: 4, REFERENCIA: 5, PRODUTO: 6, MARCA: 7,
  COMISSAO: 9, FRETE: 10, MARGEM: 11, CUSTO: 13, PRECO_VENDA: 14,
  MARGIN_MIN: 15, // O — oculta, usada no conditional formatting
  DESCONTO: 16,   // P — oculta, entra na fórmula do preço
  EMBALAGEM: 17,  // Q — oculta, entra na fórmula do preço
};

const COLOR_BLUE = "FF1A8CEB";
const COLOR_GREEN = "FF5CFF8D";
const COLOR_RED = "FFFFC7CE";
const COLOR_RED_FONT = "FF9C0006";
const COLOR_MARGIN_OK = "FFC6EFCE";
const COLOR_MARGIN_OK_FONT = "FF006100";
const BLUE_COLS = [1, 2, 3, 4, 5, 6, 7];
const GREEN_COLS = [9, 10, 11, 13, 14];
const HIDDEN_COLS = [COL.MARGIN_MIN, COL.DESCONTO, COL.EMBALAGEM];

const HEADERS = [
  "ID", "Loja", "Canal", "ID Bling", "Referência", "Produto", "Marca",
  "", "Comissão", "Frete", "Margem de Lucro", "", "Custo", "Preço de Venda",
  "MargemMin", "Desconto", "Embalagem",
];

const PAGE_SIZE = 1000;          // limite padrão do PostgREST
const ID_CHUNK = 500;            // evita URL longa no .in()
const PRICING_CHUNK = 500;       // lote para resolve_pricing_batch
const PREVIEW_CONCURRENCY = 50;  // chamadas paralelas a get_pricing_preview
const CHUNK_SIZE = 200_000;      // tamanho do chunk base64 enviado no stream

const SELECT_COLS =
  "id, store, channel, announce_id, id_bling, reference, product, mark, commission_rate, profit_margin, freight, current_cost, selling_price, listing_type";

function getSupabaseServer(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
}

function normalizePart(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function resolveKey(announceId: unknown, store: unknown, channel: unknown): string {
  return [announceId, store, channel].map(normalizePart).join("::");
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function dedupeById(rows: Row[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) map.set(String(r.id), r);
  return Array.from(map.values());
}

// Busca todas as páginas de uma RPC/consulta com range().
// Usa a contagem exata do servidor como referência e falha se não bater,
// para nunca gerar planilha com volume parcial em silêncio.
async function fetchAllPaginated(
  label: string,
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any; count?: number | null }>
): Promise<Row[]> {
  const rows: Row[] = [];
  let expected: number | null = null;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error, count } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);

    if (expected === null && typeof count === "number") expected = count;

    const page = data ?? [];
    if (page.length === 0) break;
    rows.push(...page);

    const done = expected !== null ? rows.length >= expected : page.length < PAGE_SIZE;
    if (done) break;
  }

  const unique = dedupeById(rows);

  if (expected !== null && unique.length !== expected) {
    throw new Error(
      `${label}: esperado ${expected} linhas, recebido ${unique.length}. Verifique se a RPC ordena com desempate por id.`
    );
  }

  return unique;
}

// Preview de preço (mesma RPC do modal "Ajustar Preço de Venda")
async function fetchPricingPreviews(
  supabase: any,
  ids: string[]
): Promise<Map<string, { data: any | null; error: string | null }>> {
  const map = new Map<string, { data: any | null; error: string | null }>();

  for (const lote of chunkArray(ids, PREVIEW_CONCURRENCY)) {
    const results = await Promise.all(
      lote.map((id) =>
        supabase
          .schema("newsystem")
          .rpc("get_pricing_preview", { p_marketplace_id: id })
          .single()
      )
    );

    results.forEach((r: any, j: number) => {
      const id = lote[j];
      if (r.error) map.set(id, { data: null, error: r.error.message });
      else if (!r.data) map.set(id, { data: null, error: "sem retorno" });
      else map.set(id, { data: r.data, error: null });
    });
  }

  return map;
}

// Taxa fixa (fixed_fee) e sinalização de erro de cálculo
async function fetchResolvedMap(supabase: any, rows: Row[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();

  for (const lote of chunkArray(rows, PRICING_CHUNK)) {
    const { data, error } = await supabase
      .schema("newsystem")
      .rpc("resolve_pricing_batch", {
        p_announce_ids: lote.map((r) => r.announce_id),
        p_stores: lote.map((r) => r.store),
        p_channels: lote.map((r) => r.channel),
        p_listing_types: lote.map((r) => r.listing_type),
        p_profit_margins: lote.map((r) => r.profit_margin ?? 0),
      });

    if (error) throw new Error(`resolve_pricing_batch: ${error.message}`);

    for (const r of data ?? []) {
      map.set(resolveKey(r.announce_id, r.store, r.channel), r);
    }
  }

  return map;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "");

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filtros = body?.filtros || {};
  const selectedIds: string[] = Array.isArray(body?.ids)
    ? Array.from(new Set(body.ids.filter(Boolean).map(String)))
    : [];
  const isSelectionMode = selectedIds.length > 0;

  const supabase = getSupabaseServer(accessToken);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line + "\n"));
      const sendProgress = (percent: number, current: number, total: number) =>
        send(`PROGRESS:${JSON.stringify({ percent, current, total })}`);

      try {
        sendProgress(0, 0, 0);

        let data: Row[] = [];

        if (isSelectionMode) {
          const collected: Row[] = [];
          for (const slice of chunkArray(selectedIds, ID_CHUNK)) {
            const { data: part, error } = await supabase
              .schema("newsystem")
              .from("marketplace")
              .select(SELECT_COLS)
              .in("id", slice)
              .order("id", { ascending: true });

            if (error) throw new Error(`marketplace (seleção): ${error.message}`);
            collected.push(...(part ?? []));
          }
          data = dedupeById(collected);

          if (data.length !== selectedIds.length) {
            console.warn(
              `[export ml] divergência: ${selectedIds.length} IDs selecionados, ${data.length} linhas encontradas`
            );
          }
        } else {
          const storeParam = filtros.loja && filtros.loja !== "Todos" ? filtros.loja : null;
          const channelParam = filtros.canal && filtros.canal !== "Todos" ? filtros.canal : null;
          const tipoParam = filtros.tipo && filtros.tipo !== "Todos" ? filtros.tipo : null;
          const condicaoParam = filtros.condicao && filtros.condicao !== "Todos" ? filtros.condicao : null;
          const searchParam = filtros.produto || filtros.codigo || null;
          const situacaoParam = filtros.situacao || "Ativos";
          const brandsParam = filtros.brands?.length > 0 ? filtros.brands : null;

          data = await fetchAllPaginated("fetch_all_marketplace_filtered", (from, to) =>
            supabase
              .schema("newsystem")
              .rpc(
                "fetch_all_marketplace_filtered",
                {
                  p_store: storeParam,
                  p_channel: channelParam,
                  p_tipo: tipoParam,
                  p_condicao: condicaoParam,
                  p_search: searchParam,
                  p_situacao: situacaoParam,
                  p_brands: brandsParam,
                },
                { count: "exact" }
              )
              .range(from, to)
          );
        }

        console.info("[export ml]", {
          modo: isSelectionMode ? "selecao" : "filtros",
          idsRecebidos: selectedIds.length,
          linhasBuscadas: data.length,
          filtros,
        });

        if (data.length === 0) {
          send(`ERROR:${JSON.stringify({ message: "Nenhum dado disponível para exportar." })}`);
          controller.close();
          return;
        }

        const total = data.length;
        sendProgress(3, 0, total);

        const previewMap = await fetchPricingPreviews(supabase, data.map((r) => String(r.id)));
        sendProgress(5, 0, total);

        const resolvedMap = await fetchResolvedMap(supabase, data);
        sendProgress(8, 0, total);

        const chunks: Buffer[] = [];
        const sink = new Writable({
          write(chunk, _enc, cb) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            cb();
          },
        });

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
          stream: sink as any,
          useStyles: true,
          useSharedStrings: true,
        });
        workbook.calcProperties = { fullCalcOnLoad: true };

        const sheet = workbook.addWorksheet("MARKETPLACE");

        sheet.columns = HEADERS.map((h, idx) => ({
          header: h,
          key: `c${idx + 1}`,
          width: h ? 18 : 4,
        }));

        HIDDEN_COLS.forEach((c) => {
          sheet.getColumn(c).hidden = true;
        });

        const headerRow = sheet.getRow(1);
        headerRow.values = HEADERS;
        headerRow.height = 24;
        headerRow.eachCell((cell, col) => {
          let fillColor: string | null = null;
          if (BLUE_COLS.includes(col)) fillColor = COLOR_BLUE;
          if (GREEN_COLS.includes(col)) fillColor = COLOR_GREEN;
          if (fillColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
          cell.font = { bold: true, color: { argb: BLUE_COLS.includes(col) ? "FFFFFFFF" : "FF000000" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        headerRow.commit();

        sheet.getColumn(COL.FRETE).numFmt = '_("R$"* #,##0.00_)';
        sheet.getColumn(COL.CUSTO).numFmt = '_("R$"* #,##0.00_)';
        sheet.getColumn(COL.PRECO_VENDA).numFmt = '_("R$"* #,##0.00_)';
        sheet.getColumn(COL.COMISSAO).numFmt = '0.00 " %"';
        sheet.getColumn(COL.MARGEM).numFmt = '0.00 " %"';

        const baseRowValues = (row: Row) => [
          row.id || "", row.store || "", row.channel || "", row.id_bling || "",
          row.reference || "", row.product || "", row.mark || "",
        ];

        const writeErrorRow = (row: Row, mensagem: string) => {
          const excelRow = sheet.addRow([
            ...baseRowValues(row), "",
            0, 0, 0, "", 0, null, 0, 0, 0,
          ]);
          excelRow.getCell(COL.PRECO_VENDA).value = "ERRO: " + mensagem;
          excelRow.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
            cell.font = { color: { argb: COLOR_RED_FONT } };
          });
          excelRow.commit();
        };

        const progressStep = total > 20000 ? 5000 : 1000;

        for (let i = 0; i < total; i++) {
          const row = data[i];

          const res: any = resolvedMap.get(resolveKey(row.announce_id, row.store, row.channel)) ?? null;
          const previewEntry = previewMap.get(String(row.id)) ?? null;
          const pv: any = previewEntry?.data ?? null;

          if (!pv) {
            writeErrorRow(row, `Sem preview de preço (get_pricing_preview): ${previewEntry?.error ?? "não encontrado"}`);
          } else if (!res) {
            writeErrorRow(row, "Sem resolução de taxas (resolve_pricing_batch)");
          } else if (res.has_error) {
            writeErrorRow(row, res.error_message || "Falha no cálculo");
          } else {
            const custoProduto = Number(pv.cost_total ?? 0);
            const embalagem = Number(pv.packaging ?? 0);
            const descontoPct = Number(pv.desconto ?? 0);
            const taxRate = Number(pv.imposto ?? 0) / 100;
            const marketingRate = Number(pv.marketing ?? 0) / 100;
            const margemMinima = Number(pv.margem_minima ?? 0);
            const fixedFee = Number(res.fixed_fee ?? 0);

            // Campo CUSTO do modal: base + embalagem (sem desconto)
            const custoExibido = custoProduto + embalagem;

            // Comissão, margem e frete: colunas do próprio marketplace
            const commissionRate = Number(row.commission_rate ?? 0); // percentual, ex: 11.5
            const marginInicial = Number(row.profit_margin ?? 0);    // percentual, ex: 15
            const freteExibido = Number(row.freight ?? 0);           // R$, ex: 20.45

            // Desconto incide só no custo base; embalagem e frete entram inteiros
            const numerador = custoProduto * (1 - descontoPct / 100) + embalagem + freteExibido;
            const divisor = 1 - (taxRate + marketingRate + commissionRate / 100 + marginInicial / 100);

            if (divisor <= 0) {
              writeErrorRow(row, "Divisor inválido (imposto + comissão + margem + marketing >= 100%)");
            } else {
              const sellingPrice = Math.round((numerador / divisor) * 100) / 100 + fixedFee;

              const excelRow = sheet.addRow([
                ...baseRowValues(row), "",
                commissionRate, freteExibido, marginInicial, "",
                custoExibido, null, margemMinima,
                descontoPct, embalagem,
              ]);

              const rn = excelRow.number;

              // M = custo exibido, Q = embalagem, P = desconto %, J = frete,
              // I = comissão %, K = margem %. Editar qualquer um recalcula N.
              excelRow.getCell(COL.PRECO_VENDA).value = {
                formula: `ROUND((((M${rn}-Q${rn})*(1-P${rn}/100)+Q${rn}+J${rn})/(1-(${taxRate.toFixed(6)}+${marketingRate.toFixed(6)}+I${rn}/100+K${rn}/100))),2)+${fixedFee.toFixed(2)}`,
                result: sellingPrice,
              };

              excelRow.eachCell((cell) => {
                cell.alignment = { horizontal: "center", vertical: "middle" };
              });

              excelRow.commit();
            }
          }

          if (i % progressStep === 0 || i === total - 1) {
            sendProgress(8 + Math.round((i / total) * 82), i + 1, total);
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        sheet.addConditionalFormatting({
          ref: `K2:K${total + 1}`,
          rules: [
            {
              type: "expression",
              formulae: [`K2>=O2`],
              style: {
                fill: { type: "pattern", pattern: "solid", bgColor: { argb: COLOR_MARGIN_OK } },
                font: { color: { argb: COLOR_MARGIN_OK_FONT }, bold: true },
              },
            },
          ],
        });

        sheet.commit();
        await workbook.commit();

        sendProgress(93, total, total);

        const base64 = Buffer.concat(chunks).toString("base64");
        for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
          send(`CHUNK:${base64.slice(i, i + CHUNK_SIZE)}`);
        }

        sendProgress(100, total, total);
        send(`DONE:${JSON.stringify({ total })}`);
        controller.close();
      } catch (err: any) {
        send(`ERROR:${JSON.stringify({ message: err?.message || "Erro ao gerar planilha." })}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
