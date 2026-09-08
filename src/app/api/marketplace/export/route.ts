import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Writable } from "stream";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

// ✅ Colunas auxiliares (16-20) adicionadas: Imposto, Marketing, FreteRate,
// TaxaFixa e Desconto — ficam ocultas mas alimentam a fórmula de Preço de
// Venda via referência de célula, tornando o recálculo 100% dinâmico e os
// percentuais externos auditáveis dentro da própria planilha.
const COL = {
  ID: 1, LOJA: 2, CANAL: 3, ID_BLING: 4, REFERENCIA: 5, PRODUTO: 6, MARCA: 7,
  COMISSAO: 9, FRETE: 10, MARGEM: 11, CUSTO: 13, PRECO_VENDA: 14,
  MARGIN_MIN: 15,   // O — usada no conditional formatting
  IMPOSTO: 16,      // P — % (decimal), ex: 0.08
  MARKETING: 17,    // Q — % (decimal)
  FRETE_RATE: 18,   // R — % de frete (decimal), quando o canal cobra frete por percentual
  TAXA_FIXA: 19,    // S — R$ fixo cobrado pelo canal (fixed_fee)
  DESCONTO: 20,     // T — % de desconto aplicado no custo (informativo/auditoria)
};

const COLOR_BLUE = "FF1A8CEB";
const COLOR_GREEN = "FF5CFF8D";
const COLOR_MARGIN_OK = "FFC6EFCE";
const COLOR_MARGIN_OK_FONT = "FF006100";
const BLUE_COLS = [1, 2, 3, 4, 5, 6, 7];
const GREEN_COLS = [9, 10, 11, 13, 14];
const HIDDEN_COLS = [15, 16, 17, 18, 19, 20];

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
          "MargemMin", "Imposto", "Marketing", "FreteRate", "TaxaFixa", "Desconto",
        ];

        sheet.columns = headers.map((h) => ({
          header: h,
          key: h || `col_${Math.random()}`,
          width: h ? 18 : 4,
        }));

        // ✅ Oculta todas as colunas auxiliares usadas só para cálculo/CF
        HIDDEN_COLS.forEach((c) => {
          sheet.getColumn(c).hidden = true;
        });

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
        sheet.getColumn(COL.TAXA_FIXA).numFmt = '_("R$"* #,##0.00_)';

        // ✅ Intervalo de progresso ajustado para volumes maiores (menos overhead)
        const progressStep = total > 20000 ? 5000 : 1000;

        for (let i = 0; i < total; i++) {
          const row = data[i];
          const res: any = resolvedMap.get(row.announce_id) || null;

          const costLiquido = res?.cost_liquido ?? row.current_cost ?? 0;
          const tax = res?.tax ?? 0;
          const marketing = res?.marketing ?? 0;
          const discount = res?.discount ?? 0;
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

          // ✅ Colunas auxiliares (15-20) alimentam a fórmula de preço de
          // venda por referência de célula — qualquer edição do usuário
          // nas colunas visíveis (I, J, K, M) recalcula automaticamente.
          const excelRow = sheet.addRow([
            row.id || "", row.store || "", row.channel || "", row.id_bling || "",
            row.reference || "", row.product || "", row.mark || "", "",
            commissionRate, freteInicial, marginInicial, "",
            costLiquido, null,
            marginMin, tax, marketing, freteRate, fixedFee, discount,
          ]);

          const rn = excelRow.number;

          // ✅ REMOVIDA a regra especial da Shopee — todos os canais agora
          // usam a mesma fórmula unificada, alimentada pelas colunas
          // auxiliares (P=Imposto, Q=Marketing, R=FreteRate, S=TaxaFixa).
          // J (Frete R$) e S (Taxa Fixa) somam diretamente ao numerador;
          // P, Q, R e I (comissão %) e K (margem %) entram no divisor —
          // exatamente os percentuais "de fora" que compõem o preço.
          excelRow.getCell(COL.PRECO_VENDA).value = {
            formula: `ROUND(M${rn}/(1-(P${rn}+Q${rn}+R${rn}+I${rn}/100+K${rn}/100))+J${rn}+S${rn},2)`,
          };

          excelRow.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });

          excelRow.commit();

          if (i % progressStep === 0 || i === total - 1) {
            sendProgress(8 + Math.round((i / total) * 82), i + 1, total);
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        // ============================================================
        // Regra de conditional formatting para toda a coluna K,
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
