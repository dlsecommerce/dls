import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Writable } from "stream";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

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

function getSupabaseServer(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
}

function resolveKey(announceId: string, store: string, channel: string) {
  return `${announceId}::${store}::${channel}`;
}

// Mesma fonte do modal "Ajustar Preço de Venda": get_pricing_preview
// devolve cost_total, packaging, desconto, imposto, marketing e margem_minima.
async function fetchPricingPreviews(supabase: any, ids: string[]) {
  const map = new Map<string, any>();
  const LOTE = 50;
  for (let i = 0; i < ids.length; i += LOTE) {
    const lote = ids.slice(i, i + LOTE);
    const results = await Promise.all(
      lote.map((id) =>
        supabase
          .schema("newsystem")
          .rpc("get_pricing_preview", { p_marketplace_id: id })
          .single()
      )
    );
    results.forEach((r: any, j: number) => {
      if (!r.error && r.data) map.set(lote[j], r.data);
    });
  }
  return map;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "");

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
  }

  const body = await req.json();
  const filtros = body?.filtros || {};
  const selectedIds: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
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

        let data: any[] = [];

        if (isSelectionMode) {
          const { data: fetchedById, error: fetchByIdError } = await supabase
            .schema("newsystem")
            .from("marketplace")
            .select(
              "id, store, channel, announce_id, id_bling, reference, product, mark, commission_rate, profit_margin, freight, current_cost, selling_price, listing_type"
            )
            .in("id", selectedIds);

          if (fetchByIdError) throw new Error(fetchByIdError.message);
          data = fetchedById ?? [];
        } else {
          const storeParam = filtros.loja && filtros.loja !== "Todos" ? filtros.loja : null;
          const channelParam = filtros.canal && filtros.canal !== "Todos" ? filtros.canal : null;
          const tipoParam = filtros.tipo && filtros.tipo !== "Todos" ? filtros.tipo : null;
          const condicaoParam = filtros.condicao && filtros.condicao !== "Todos" ? filtros.condicao : null;
          const searchParam = filtros.produto || filtros.codigo || null;
          const situacaoParam = filtros.situacao || "Ativos";
          const brandsParam = filtros.brands?.length > 0 ? filtros.brands : null;

          const { data: fetched, error: fetchError } = await supabase
            .schema("newsystem")
            .rpc("fetch_all_marketplace_filtered", {
              p_store: storeParam,
              p_channel: channelParam,
              p_tipo: tipoParam,
              p_condicao: condicaoParam,
              p_search: searchParam,
              p_situacao: situacaoParam,
              p_brands: brandsParam,
            });

          if (fetchError) throw new Error(fetchError.message);
          data = fetched ?? [];
        }

        if (data.length === 0) {
          send(`ERROR:${JSON.stringify({ message: "Nenhum dado disponível para exportar." })}`);
          controller.close();
          return;
        }

        const total = data.length;
        sendProgress(3, 0, total);

        // Preview de preço (mesma RPC do modal) — custo base, embalagem, desconto, imposto, marketing, margem mínima
        const previewMap = await fetchPricingPreviews(supabase, data.map((r: any) => r.id));

        sendProgress(5, 0, total);

        // Resolve em lote: usado apenas para taxa fixa (fixed_fee) e para sinalizar erro de cálculo
        const { data: resolved, error: resolveError } = await supabase
          .schema("newsystem")
          .rpc("resolve_pricing_batch", {
            p_announce_ids: data.map((r: any) => r.announce_id),
            p_stores: data.map((r: any) => r.store),
            p_channels: data.map((r: any) => r.channel),
            p_listing_types: data.map((r: any) => r.listing_type),
            p_profit_margins: data.map((r: any) => r.profit_margin ?? 0),
          });

        if (resolveError) throw new Error(resolveError.message);

        const resolvedMap = new Map(
          (resolved ?? []).map((r: any) => [
            resolveKey(r.announce_id, r.store, r.channel),
            r,
          ])
        );

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

        const writeErrorRow = (row: any, mensagem: string) => {
          const excelRow = sheet.addRow([
            row.id || "", row.store || "", row.channel || "", row.id_bling || "",
            row.reference || "", row.product || "", row.mark || "", "",
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

          const res: any =
            resolvedMap.get(resolveKey(row.announce_id, row.store, row.channel)) ?? null;
          const pv: any = previewMap.get(row.id) ?? null;

          // Sem preview ou sem resolução: sinaliza em vez de calcular com dado zerado
          if (!pv) {
            writeErrorRow(row, "Sem preview de preço (get_pricing_preview)");
          } else if (!res) {
            writeErrorRow(row, "Sem resolução de taxas (resolve_pricing_batch)");
          } else if (res.has_error) {
            writeErrorRow(row, res.error_message || "Falha no cálculo");
          } else {
            // Valores idênticos ao modal "Ajustar Preço de Venda"
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

            // Mesma fórmula do modal: desconto incide só no custo base
            const numerador =
              custoProduto * (1 - descontoPct / 100) + embalagem + freteExibido;
            const divisor =
              1 - (taxRate + marketingRate + commissionRate / 100 + marginInicial / 100);

            if (divisor <= 0) {
              writeErrorRow(row, "Divisor inválido (imposto + comissão + margem + marketing >= 100%)");
            } else {
              const sellingPrice =
                Math.round((numerador / divisor) * 100) / 100 + fixedFee;

              const excelRow = sheet.addRow([
                row.id || "", row.store || "", row.channel || "", row.id_bling || "",
                row.reference || "", row.product || "", row.mark || "", "",
                commissionRate, freteExibido, marginInicial, "",
                custoExibido, null, margemMinima,
                descontoPct, embalagem,
              ]);

              const rn = excelRow.number;
              const fixedFeeStr = fixedFee.toFixed(2);

              // M = custo exibido, Q = embalagem, P = desconto %, J = frete,
              // I = comissão %, K = margem %. Editar qualquer um recalcula N.
              excelRow.getCell(COL.PRECO_VENDA).value = {
                formula: `ROUND((((M${rn}-Q${rn})*(1-P${rn}/100)+Q${rn}+J${rn})/(1-(${taxRate.toFixed(6)}+${marketingRate.toFixed(6)}+I${rn}/100+K${rn}/100))),2)+${fixedFeeStr}`,
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

        const fileBuffer = Buffer.concat(chunks);
        const base64 = fileBuffer.toString("base64");
        const CHUNK_SIZE = 200_000;

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
