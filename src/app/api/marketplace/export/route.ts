import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Writable } from "stream";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const COL = {
  ID: 1, LOJA: 2, CANAL: 3, ID_BLING: 4, REFERENCIA: 5, PRODUTO: 6, MARCA: 7,
  COMISSAO: 9, FRETE: 10, MARGEM: 11, CUSTO: 13, PRECO_VENDA: 14,
};

const COLOR_BLUE = "FF1A8CEB";
const COLOR_GREEN = "FF5CFF8D";
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

  const supabase = getSupabaseServer(accessToken);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line + "\n"));
      const sendProgress = (percent: number, current: number, total: number) =>
        send(`PROGRESS:${JSON.stringify({ percent, current, total })}`);

      try {
        sendProgress(0, 0, 0);

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
        const data = fetched ?? [];

        if (data.length === 0) {
          send(`ERROR:${JSON.stringify({ message: "Nenhum dado disponível para exportar." })}`);
          controller.close();
          return;
        }

        const total = data.length;

        sendProgress(5, 0, total);

        // Buffer coletor — alimenta o WorkbookWriter em modo streaming
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
        ];

        sheet.columns = headers.map((h) => ({
          header: h,
          key: h || `col_${Math.random()}`,
          width: h ? 18 : 4,
        }));

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

        for (let i = 0; i < total; i++) {
          const row = data[i];

          const excelRow = sheet.addRow([
            row.id || "", row.store || "", row.channel || "", row.id_bling || "",
            row.reference || "", row.product || "", row.mark || "", "",
            row.commission_rate ?? 0, row.freight ?? 0, row.profit_margin ?? 0, "",
            row.current_cost ?? 0, null,
          ]);

          const rn = excelRow.number;

          // ============================================================
          // ✅ SHOPEE: Frete (J) e Comissão (I) recalculam sozinhos
          // se o usuário editar a Margem (K) na planilha — via faixa de PV
          // ============================================================
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

          // ✅ Preço de Venda: fórmula pra todos os canais (reage a edição de Custo/Frete/Comissão/Margem)
          excelRow.getCell(COL.PRECO_VENDA).value = {
            formula: `ROUND((M${rn}+J${rn})/(1-((I${rn}+K${rn})/100)),2)`,
          };

          excelRow.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          });
          excelRow.commit();

          if (i % 1000 === 0 || i === total - 1) {
            sendProgress(5 + Math.round((i / total) * 85), i + 1, total);
            await new Promise((r) => setTimeout(r, 0));
          }
        }

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
