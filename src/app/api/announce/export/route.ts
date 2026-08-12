// src/app/api/announce/export/route.ts

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx-js-style";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnnounceRow = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  code_id: number | null;
};

const PAGE_SIZE = 20_000;
const MAX_LINHAS = 300_000; // trava de segurança contra export descontrolado

// Cabeçalhos traduzidos para português, na ordem das colunas do banco.
const HEADERS_PT = ["Loja", "ID Bling", "Referência", "Produto", "Marca", "Código ID"];

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function buildTimestampedFileName(prefix: string, extension: string): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
  const timePart = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
  return `${prefix} - ${datePart} ${timePart}.${extension}`;
}

/**
 * Escapa um valor para uso seguro dentro de um campo CSV.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converte as linhas diretamente para CSV, sem passar por XLSX.
 * Muito mais rápido para grandes volumes (50k-100k+ linhas).
 * Cabeçalho traduzido para português.
 */
function rowsToCsv(rows: AnnounceRow[]): string {
  const header = HEADERS_PT.join(",");

  const lines = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    lines[i] = [
      escapeCsvValue(r.store),
      escapeCsvValue(r.id_bling),
      escapeCsvValue(r.reference),
      escapeCsvValue(r.product),
      escapeCsvValue(r.mark),
      escapeCsvValue(r.code_id),
    ].join(",");
  }

  return `${header}\n${lines.join("\n")}`;
}

/**
 * Monta o XLSX com cabeçalho em português e estilizado em azul,
 * no mesmo padrão visual usado em Exportcosts.tsx.
 */
function buildStyledXlsxBuffer(rows: AnnounceRow[]): Buffer {
  const data = rows.map((r) => [
    r.store,
    r.id_bling,
    r.reference,
    r.product,
    r.mark,
    r.code_id,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS_PT, ...data]);

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1A8CEB" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  HEADERS_PT.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    (worksheet as any)[cellRef] = (worksheet as any)[cellRef] || {};
    (worksheet as any)[cellRef].s = headerStyle;
  });

  (worksheet as any)["!cols"] = [
    { wch: 15 }, // Loja
    { wch: 18 }, // ID Bling
    { wch: 22 }, // Referência
    { wch: 34 }, // Produto
    { wch: 20 }, // Marca
    { wch: 14 }, // Código ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Announce");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });
}

/**
 * Envia uma linha NDJSON (um objeto JSON por linha, terminado em \n).
 */
async function sendLine(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  payload: Record<string, unknown>
) {
  await writer.write(encoder.encode(`${JSON.stringify(payload)}\n`));
}

export async function GET(request: NextRequest): Promise<Response> {
  /*
   * 1. Obtém e valida o token antes de abrir o stream — se falhar,
   * retorna erro comum em JSON (sem streaming).
   */
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return new Response(
      JSON.stringify({
        error: "Usuário não autenticado. Entre novamente no sistema.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        error: "As variáveis do Supabase não foram configuradas no servidor.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } =
    await authClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({
        error:
          "Sua sessão não é válida ou expirou. Entre novamente no sistema.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store")?.trim() || null;
  const format = (searchParams.get("format") ?? "xlsx").toLowerCase();

  if (format !== "xlsx" && format !== "csv") {
    return new Response(
      JSON.stringify({ error: 'O parâmetro "format" deve ser "xlsx" ou "csv".' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();

  // Preâmbulo de bytes neutros para forçar o início imediato do streaming
  // em proxies/CDNs que aguardam um buffer mínimo antes de repassar.
  writer.write(encoder.encode(`${" ".repeat(2048)}\n`)).catch(() => {});

  /*
   * Detecta desconexão do cliente (fechou a aba, cancelou o download,
   * refresh, perda de rede) e propaga como sinal de cancelamento.
   * Sem isso, um `writer.write()` pendurado dentro da transação nunca
   * resolve, e a transação Postgres fica presa em "idle in transaction"
   * para sempre — segurando lock e travando outras operações (ex.:
   * importação) na mesma tabela.
   */
  let clientDisconnected = false;
  request.signal.addEventListener("abort", () => {
    clientDisconnected = true;
  });

  function checkDisconnected() {
    if (clientDisconnected) {
      throw new Error("CLIENT_DISCONNECTED");
    }
  }

  /*
   * 2. Processa tudo em background e vai escrevendo linhas NDJSON
   * no stream conforme avança.
   */
  (async () => {
    try {
      const sql = getPostgresClient();

      const allRows: AnnounceRow[] = await sql.begin(async (transaction) => {
        const jwtClaims = JSON.stringify({
          sub: userData.user.id,
          role: "authenticated",
          email: userData.user.email ?? null,
        });

        await transaction`
          select set_config('request.jwt.claims', ${jwtClaims}, true)
        `;
        await transaction`
          select set_config('request.jwt.claim.sub', ${userData.user.id}, true)
        `;
        await transaction`
          select set_config('request.jwt.claim.role', 'authenticated', true)
        `;
        await transaction`set local role authenticated`;

        // Timeout de segurança: se uma query travar por qualquer motivo
        // (lock, RLS lenta), o Postgres cancela em vez de ficar preso
        // para sempre segurando lock em outras operações (ex.: importação).
        await transaction.unsafe(`set local statement_timeout = '30000'`);

        const collected: AnnounceRow[] = [];
        let lastStore: string | null = null;
        let lastReference: string | null = null;

        while (true) {
          checkDisconnected(); // ← aborta o loop se o cliente já saiu

          let rows: AnnounceRow[];

          if (store && lastStore !== null) {
            rows = await transaction<AnnounceRow[]>`
              select store, id_bling, reference, product, mark, code_id
              from newsystem.announce
              where deleted_at is null
                and store = ${store}
                and (store, reference) > (${lastStore}, ${lastReference})
              order by store, reference
              limit ${PAGE_SIZE}
            `;
          } else if (store) {
            rows = await transaction<AnnounceRow[]>`
              select store, id_bling, reference, product, mark, code_id
              from newsystem.announce
              where deleted_at is null and store = ${store}
              order by store, reference
              limit ${PAGE_SIZE}
            `;
          } else if (lastStore !== null) {
            rows = await transaction<AnnounceRow[]>`
              select store, id_bling, reference, product, mark, code_id
              from newsystem.announce
              where deleted_at is null
                and (store, reference) > (${lastStore}, ${lastReference})
              order by store, reference
              limit ${PAGE_SIZE}
            `;
          } else {
            rows = await transaction<AnnounceRow[]>`
              select store, id_bling, reference, product, mark, code_id
              from newsystem.announce
              where deleted_at is null
              order by store, reference
              limit ${PAGE_SIZE}
            `;
          }

          checkDisconnected(); // ← checa de novo antes de escrever no stream

          if (rows.length === 0) break;

          collected.push(...rows);

          const last = rows[rows.length - 1];
          lastStore = last.store;
          lastReference = last.reference;

          const percent = Math.min(
            70,
            1 + Math.round((collected.length / MAX_LINHAS) * 69)
          );

          // Nunca deixa o write() travar a transação: dá um timeout
          // curto na própria escrita. Se o cliente já foi, isso falha
          // rápido em vez de ficar pendurado para sempre.
          await Promise.race([
            sendLine(writer, encoder, {
              type: "progress",
              percent,
              processed: collected.length,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("CLIENT_DISCONNECTED")), 5000)
            ),
          ]);

          if (collected.length >= MAX_LINHAS) break;
          if (rows.length < PAGE_SIZE) break;
        }

        return collected;
      });

      if (allRows.length === 0) {
        await sendLine(writer, encoder, {
          type: "error",
          error: "Nenhum registro encontrado para exportar.",
        });
        await writer.close();
        return;
      }

      if (allRows.length >= MAX_LINHAS) {
        console.warn(
          `Exportação de announce atingiu o limite de ${MAX_LINHAS} linhas. Considere aplicar filtros.`
        );
      }

      await sendLine(writer, encoder, { type: "progress", percent: 75 });

      /*
       * 3. Monta o arquivo no formato solicitado, com cabeçalho em
       * português e, no caso do XLSX, estilizado em azul.
       */
      let buffer: Buffer;
      let fileName: string;
      let mimeType: string;

      if (format === "csv") {
        const csv = rowsToCsv(allRows);
        buffer = Buffer.from(csv, "utf-8");
        fileName = buildTimestampedFileName("MODELO - PLANILHA", "csv");
        mimeType = "text/csv; charset=utf-8";
      } else {
        buffer = buildStyledXlsxBuffer(allRows);
        fileName = buildTimestampedFileName("MODELO - PLANILHA", "xlsx");
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      await sendLine(writer, encoder, { type: "progress", percent: 95 });

      const fileBase64 = buffer.toString("base64");

      await sendLine(writer, encoder, {
        type: "done",
        percent: 100,
        fileName,
        mimeType,
        fileBase64,
      });

      await writer.close();
    } catch (error: unknown) {
      // Cliente cancelou/desconectou: a transação já foi revertida
      // automaticamente pelo sql.begin (a rejeição propagada faz
      // rollback). Não faz sentido tentar escrever no stream nem
      // registrar isso como um erro real do sistema.
      if (error instanceof Error && error.message === "CLIENT_DISCONNECTED") {
        await writer.close().catch(() => {});
        return;
      }

      const databaseError = error as {
        name?: string;
        message?: string;
        code?: string;
        detail?: string;
        hint?: string;
        where?: string;
      };

      console.error("Erro na exportação de announce:", {
        name: databaseError?.name ?? null,
        message: databaseError?.message ?? null,
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      });

      await sendLine(writer, encoder, {
        type: "error",
        error:
          databaseError?.message ?? "Não foi possível exportar os anúncios.",
        code: databaseError?.code ?? null,
      }).catch(() => {});

      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "identity",
      "Transfer-Encoding": "chunked",
    },
  });
}
