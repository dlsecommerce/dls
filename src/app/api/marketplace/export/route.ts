import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Writable } from "stream";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const COL = {
  ID: 1, LOJA: 2, CANAL: 3, ID_BLING: 4, REFERENCIA: 5, PRODUTO: 6, MARCA: 7,
  COMISSAO: 9, FRETE: 10, MARGEM: 11, CUSTO: 13, PRECO_VENDA: 14,
  MARGIN_MIN: 15, // ✅ NOVO — coluna oculta para conditional formatting em lote
};

const COLOR_BLUE = "FF1A8CEB";
const COLOR_GREEN = "FF5CFF8D";
const COLOR_MARGIN_OK = "FFC6EFCE";
const COLOR_MARGIN_OK_FONT = "FF006100";
const BLUE_COLS = [1, 2, 3, 4, 5, 6, 7];
const GREEN_COLS = [9, 10, 11, 13, 14];

function getSupabaseServer(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
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

        // ============================================================
        // Resolve em lote: imposto, marketing, desconto, margem mínima,
        // comissão, taxa fixa, frete% e frete fixo por anúncio
        // ============================================================
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
          (resolved ?? []).map((r: any) => [r.announce_id, r])
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

        const headers = [
          "ID", "Loja", "Canal", "ID Bling", "Referência", "Produto", "Marca",
          "", "Comissão", "Frete", "Margem de Lucro", "", "Custo", "Preço de Venda",
          "MargemMin", // ✅ coluna oculta O
        ];

        sheet.columns = headers.map((h) => ({
          header: h,
          key: h || `col_${Math.random()}`,
          width: h ? 18 : 4,
        }));

        // ✅ Oculta a coluna auxiliar (O) usada só para o conditional formatting
        sheet.getColumn(COL.MARGIN_MIN).hidden = true;

        const headerRow = sheet.getRow(1);
        headerRow.values = headers;
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

        // ✅ Intervalo de progresso ajustado para volumes maiores (menos overhead)
        const progressStep = total > 20000 ? 5000 : 1000;

        for (let i = 0; i < total; i++) {
          const row = data[i];
          const res: any = resolvedMap.get(row.announce_id) || null;

          const costLiquido = res?.cost_liquido ?? row.current_cost ?? 0;
          const tax = res?.tax ?? 0;
          const marketing = res?.marketing ?? 0;
          const freteRate = res?.frete_rate ?? 0;
          const freteFixed = res?.frete_fixed ?? 0;
          const fixedFee = res?.fixed_fee ?? 0;
          const marginMin = res?.margin_min ?? 0;
          const commissionRate = res?.commission_rate
            ? res.commission_rate * 100
            : row.commission_rate ?? 0;

          const marginInicial =
            row.profit_margin && row.profit_margin !== 0
              ? row.profit_margin
              : marginMin;

          const freteInicial =
            freteFixed && freteFixed !== 0 ? freteFixed : row.freight ?? 0;

          // ✅ Adiciona marginMin na coluna oculta O (15)
          const excelRow = sheet.addRow([
            row.id || "", row.store || "", row.channel || "", row.id_bling || "",
            row.reference || "", row.product || "", row.mark || "", "",
            commissionRate, freteInicial, marginInicial, "",
            costLiquido, null, marginMin,
          ]);

          const rn = excelRow.number;

          const constPart = (tax + marketing + freteRate).toFixed(6);
          const freteFixedStr = freteFixed.toFixed(2);
          const fixedFeeStr = fixedFee.toFixed(2);

          if (row.channel === "Shopee") {
            const margemSafe = `IF(K${rn}="",0,K${rn})`;
            const PV1 = `((M${rn}+4)/(1-((20+${margemSafe})/100)))`;
            const PV2 = `((M${rn}+16)/(1-((14+${margemSafe})/100)))`;
            const PV3 = `((M${rn}+20)/(1-((14+${margemSafe})/100)))`;

            excelRow.getCell(COL.FRETE).value = {
              formula: `IF(${PV1}<=79.99,4,IF(${PV2}<=99.99,16,IF(${PV3}<=199.99,20,26)))`,
            };
            excelRow.getCell(COL.COMISSAO).value = {
              formula: `IF(${PV1}<=79.99,20,14)`,
            };
          }

          excelRow.getCell(COL.PRECO_VENDA).value = {
            formula: `ROUND(M${rn}/(1-(${constPart}+I${rn}/100+K${rn}/100))+${freteFixedStr}+${fixedFeeStr},2)`,
          };

          excelRow.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });

          // ❌ REMOVIDO: addConditionalFormatting por linha (era o bottleneck)

          excelRow.commit();

          if (i % progressStep === 0 || i === total - 1) {
            sendProgress(8 + Math.round((i / total) * 82), i + 1, total);
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        // ============================================================
        // ✅ ÚNICA regra de conditional formatting para toda a coluna K,
        // comparando com a coluna oculta O (relativo, ajusta linha a linha)
        // ============================================================
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
