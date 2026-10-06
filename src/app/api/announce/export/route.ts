// src/app/api/announce/export/route.ts

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx-js-style";
import { getPostgresClient } from "@/lib/postgres";
import { isLoja } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Source = "announce" | "bling";

type AnnounceRow = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  code_id: number | null;
  titulo?: string | null;
};

type BlingRow = {
  loja: string;
  id_bling: string | number;
  codigo: string;
  tipo: "anuncio" | "variacao";
  item_id: string | null;
  preco: string | number | null;
  titulo: string | null;
};

type ExportRow = AnnounceRow | BlingRow;

type Layout = {
  headers: string[];
  widths: number[];
  sheet: string;
  toCells: (row: ExportRow) => unknown[];
};

const PAGE_SIZE = 20_000;
const MAX_LINHAS = 300_000; // trava de segurança contra export descontrolado
const MAX_IDS_SELECAO = 300_000; // mesma trava aplicada ao modo seleção
const BASE64_CHUNK_SIZE = 200_000; // tamanho de cada pedaço do arquivo

// Layout de colunas por fonte de dados.
const LAYOUTS: Record<Source, Layout> = {
  announce: {
    headers: ["Loja", "ID Bling", "Título", "Referência", "Produto", "Marca", "Código ID"],
    widths: [15, 18, 50, 22, 34, 20, 14],
    sheet: "Announce",
    toCells: (row) => {
      const r = row as AnnounceRow;
      return [r.store, r.id_bling, r.titulo ?? "", r.reference, r.product, r.mark, r.code_id];
    },
  },
  bling: {
    headers: ["Loja", "ID Bling", "Título", "ID na Loja (MLB)", "Tipo", "Anúncio pai", "Preço"],
    widths: [15, 18, 50, 22, 12, 20, 12],
    sheet: "Anuncios",
    toCells: (row) => {
      const r = row as BlingRow;
      return [
        r.loja,
        r.id_bling,
        r.titulo ?? "",
        r.codigo,
        r.tipo === "anuncio" ? "Anúncio" : "Variação",
        r.item_id ?? "",
        r.preco === null ? null : Number(r.preco),
      ];
    },
  },
};

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
 */
function rowsToCsv(rows: ExportRow[], layout: Layout): string {
  const header = layout.headers.join(",");

  const lines = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    lines[i] = layout.toCells(rows[i]).map(escapeCsvValue).join(",");
  }

  return `${header}\n${lines.join("\n")}`;
}

/**
 * Monta o XLSX com cabeçalho em português e estilizado em azul,
 * no mesmo padrão visual usado em Exportcosts.tsx.
 */
function buildStyledXlsxBuffer(rows: ExportRow[], layout: Layout): Buffer {
  const data = rows.map(layout.toCells);

  const worksheet = XLSX.utils.aoa_to_sheet([layout.headers, ...data]);

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1A8CEB" } },
    alignment: { horizontal: "center", vertical: "center" },
  };

  layout.headers.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    (worksheet as any)[cellRef] = (worksheet as any)[cellRef] || {};
    (worksheet as any)[cellRef].s = headerStyle;
  });

  (worksheet as any)["!cols"] = layout.widths.map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, layout.sheet);

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

/**
 * Faz o parse do parâmetro "ids" da query string.
 * Aceita formato "ids=uuid1,uuid2,uuid3" (separado por vírgula).
 * Retorna null se o parâmetro não foi enviado ou está vazio.
 */
function parseIdsParam(searchParams: URLSearchParams): string[] | null {
  const raw = searchParams.get("ids");
  if (!raw) return null;

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? ids : null;
}

/**
 * Normaliza o array de IDs recebido no body de uma requisição POST.
 * Retorna null se estiver ausente/vazio ou não for um array de strings.
 */
function normalizeIdsBody(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids = value
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  return ids.length > 0 ? ids : null;
}

/**
 * Busca o título em newsystem.anuncios_ml (preenchido pelo cron do Bling)
 * e anexa às linhas. Roda FORA da transação com role "authenticated",
 * usando a conexão direta, pois anuncios_ml não é acessível a esse role.
 */
async function anexarTitulos(
  sql: ReturnType<typeof getPostgresClient>,
  rows: AnnounceRow[]
) {
  const ids = [
    ...new Set(
      rows
        .map((r) => (r.id_bling === null ? "" : String(r.id_bling).trim()))
        .filter((v) => /^\d+$/.test(v))
    ),
  ];
  if (ids.length === 0) return;

  const porLoja = new Map<string, string>(); // "loja|id" -> título
  const porId = new Map<string, string>(); // "id" -> título (fallback)

  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    const found = await sql<{ loja: string; id_bling: string; titulo: string }[]>`
      select loja, id_bling::text as id_bling, titulo
      from newsystem.anuncios_ml
      where titulo is not null
        and id_bling = any(${chunk}::bigint[])
    `;
    for (const f of found) {
      porLoja.set(`${f.loja}|${f.id_bling}`, f.titulo);
      if (!porId.has(f.id_bling)) porId.set(f.id_bling, f.titulo);
    }
  }

  for (const r of rows) {
    if (r.id_bling === null) continue;
    const id = String(r.id_bling).trim();
    const loja = String(r.store).toLowerCase().includes("pikot") ? "pikot" : "sobaquetas";
    r.titulo = porLoja.get(`${loja}|${id}`) ?? porId.get(id) ?? "";
  }
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Núcleo compartilhado da exportação. Recebe os parâmetros já
 * extraídos (independente de terem vindo de querystring no GET ou
 * de JSON no body no POST) e devolve o Response de streaming NDJSON.
 */
async function handleExport(
  request: NextRequest,
  params: {
    source: Source;
    store: string | null;
    loja: string | null;
    format: string;
    selectedIds: string[] | null;
  }
): Promise<Response> {
  const { source, store, loja, format } = params;
  // Modo seleção só existe para a tabela do sistema (announce)
  const selectedIds = source === "announce" ? params.selectedIds : null;
  const layout = LAYOUTS[source];

  /*
   * 1. Obtém e valida o token antes de abrir o stream — se falhar,
   * retorna erro comum em JSON (sem streaming).
   */
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonError("Usuário não autenticado. Entre novamente no sistema.", 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return jsonError("As variáveis do Supabase não foram configuradas no servidor.", 500);
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
    return jsonError(
      "Sua sessão não é válida ou expirou. Entre novamente no sistema.",
      401
    );
  }

  if (source === "bling" && !isLoja(loja)) {
    return jsonError('O parâmetro "loja" deve ser "sobaquetas" ou "pikot".', 400);
  }

  // ✅ modo seleção — se vierem IDs, ignora completamente o filtro
  // de loja e exporta apenas os registros selecionados na tabela.
  const isSelectionMode = selectedIds !== null;

  if (isSelectionMode && selectedIds.length > MAX_IDS_SELECAO) {
    return jsonError(
      `Seleção excede o limite máximo de ${MAX_IDS_SELECAO} registros.`,
      400
    );
  }

  if (format !== "xlsx" && format !== "csv") {
    return jsonError('O parâmetro "format" deve ser "xlsx" ou "csv".', 400);
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
  let totalRows = 0; // total esperado, usado no contador do toast
  request.signal.addEventListener("abort", () => {
    clientDisconnected = true;
  });

  function checkDisconnected() {
    if (clientDisconnected) {
      throw new Error("CLIENT_DISCONNECTED");
    }
  }

  // Nunca deixa o write() travar a transação: timeout curto na escrita.
  function sendProgress(percent: number, processed: number) {
    return Promise.race([
      sendLine(writer, encoder, {
        type: "progress",
        percent,
        processed,
        current: processed,
        total: totalRows,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("CLIENT_DISCONNECTED")), 5000)
      ),
    ]);
  }

  /*
   * 2. Processa tudo em background e vai escrevendo linhas NDJSON
   * no stream conforme avança.
   */
  (async () => {
    try {
      const sql = getPostgresClient();

      const allRows: ExportRow[] = await sql.begin(async (transaction) => {
        // Timeout de segurança: se uma query travar por qualquer motivo
        // (lock, RLS lenta), o Postgres cancela em vez de ficar preso
        // para sempre segurando lock em outras operações (ex.: importação).
        const collected: ExportRow[] = [];

        // ============================================================
        // ✅ FONTE BLING: espelho do Bling (newsystem.anuncios_ml).
        // A tabela só tem permissão para service_role/conexão direta,
        // então NÃO troca para o role "authenticated". O acesso já foi
        // protegido pela validação do token acima.
        // ============================================================
        if (source === "bling") {
          await transaction.unsafe(`set local statement_timeout = '30000'`);

          const [{ count: blingCount }] = await transaction<{ count: number }[]>`
            select count(*)::int as count
            from newsystem.anuncios_ml
            where loja = ${loja!}
          `;
          totalRows = Math.min(blingCount, MAX_LINHAS);

          let lastCodigo: string | null = null;

          while (true) {
            checkDisconnected();

            const rows: BlingRow[] =
              lastCodigo === null
                ? await transaction<BlingRow[]>`
                    select loja, id_bling, codigo, tipo, item_id, preco, titulo
                    from newsystem.anuncios_ml
                    where loja = ${loja!}
                    order by codigo
                    limit ${PAGE_SIZE}
                  `
                : await transaction<BlingRow[]>`
                    select loja, id_bling, codigo, tipo, item_id, preco, titulo
                    from newsystem.anuncios_ml
                    where loja = ${loja!}
                      and codigo > ${lastCodigo}
                    order by codigo
                    limit ${PAGE_SIZE}
                  `;

            checkDisconnected();

            if (rows.length === 0) break;

            collected.push(...rows);
            lastCodigo = rows[rows.length - 1].codigo;

            await sendProgress(
              Math.min(70, 1 + Math.round((collected.length / MAX_LINHAS) * 69)),
              collected.length
            );

            if (collected.length >= MAX_LINHAS) break;
            if (rows.length < PAGE_SIZE) break;
          }

          return collected;
        }

        // ============================================================
        // FONTE ANNOUNCE (sistema): roda como usuário autenticado (RLS)
        // ============================================================
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
        await transaction.unsafe(`set local statement_timeout = '30000'`);

        // ============================================================
        // ✅ MODO SELEÇÃO: busca direto pelos IDs marcados na tabela,
        // paginando em blocos para não sobrecarregar o Postgres com
        // um array gigante de uma vez só.
        // ============================================================
        if (isSelectionMode) {
          const ids = selectedIds!;
          totalRows = ids.length;

          for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
            checkDisconnected();

            const idsChunk = ids.slice(offset, offset + PAGE_SIZE);

            const rows = await transaction<AnnounceRow[]>`
              select store, id_bling, reference, product, mark, code_id
              from newsystem.announce
              where deleted_at is null
                and id = any(${idsChunk})
              order by store, reference
            `;

            checkDisconnected();

            collected.push(...rows);

            await sendProgress(
              Math.min(
                70,
                1 + Math.round((collected.length / Math.max(ids.length, 1)) * 69)
              ),
              collected.length
            );
          }

          return collected;
        }

        // ============================================================
        // MODO FILTRO/PAGINAÇÃO (comportamento original, sem alterações)
        // ============================================================
        const [{ count: announceCount }] = store
          ? await transaction<{ count: number }[]>`
              select count(*)::int as count
              from newsystem.announce
              where deleted_at is null and store = ${store}
            `
          : await transaction<{ count: number }[]>`
              select count(*)::int as count
              from newsystem.announce
              where deleted_at is null
            `;
        totalRows = Math.min(announceCount, MAX_LINHAS);

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

          await sendProgress(
            Math.min(70, 1 + Math.round((collected.length / MAX_LINHAS) * 69)),
            collected.length
          );

          if (collected.length >= MAX_LINHAS) break;
          if (rows.length < PAGE_SIZE) break;
        }

        return collected;
      });

      if (allRows.length === 0) {
        await sendLine(writer, encoder, {
          type: "error",
          error:
            source === "bling"
              ? "Nenhum anúncio do Bling encontrado. Sincronize com o Bling primeiro."
              : "Nenhum registro encontrado para exportar.",
        });
        await writer.close();
        return;
      }

      if (allRows.length >= MAX_LINHAS) {
        console.warn(
          `Exportação (${source}) atingiu o limite de ${MAX_LINHAS} linhas. Considere aplicar filtros.`
        );
      }

      if (source === "announce") {
        await anexarTitulos(sql, allRows as AnnounceRow[]);
      }

      await sendLine(writer, encoder, {
        type: "progress",
        percent: 75,
        current: allRows.length,
        total: allRows.length,
      });

      /*
       * 3. Monta o arquivo no formato solicitado, com cabeçalho em
       * português e, no caso do XLSX, estilizado em azul.
       */
      let buffer: Buffer;
      let fileName: string;
      let mimeType: string;

      const filePrefix =
        source === "bling"
          ? `BLING - ANÚNCIOS ${String(loja).toUpperCase()}`
          : isSelectionMode
            ? "ANÚNCIOS - SELECIONADOS"
            : "ANÚNCIOS - PLANILHA";

      if (format === "csv") {
        const csv = rowsToCsv(allRows, layout);
        buffer = Buffer.from(csv, "utf-8");
        fileName = buildTimestampedFileName(filePrefix, "csv");
        mimeType = "text/csv; charset=utf-8";
      } else {
        buffer = buildStyledXlsxBuffer(allRows, layout);
        fileName = buildTimestampedFileName(filePrefix, "xlsx");
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      await sendLine(writer, encoder, {
        type: "progress",
        percent: 90,
        current: allRows.length,
        total: allRows.length,
      });

      // ============================================================
      // Envia o arquivo em pedaços (chunks) de base64, em vez de um
      // único payload gigante. Evita travar o event loop e picos de
      // memória em exports grandes (100k-300k linhas).
      // ============================================================
      const fileBase64 = buffer.toString("base64");
      const totalChunks = Math.ceil(fileBase64.length / BASE64_CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        checkDisconnected();

        const start = i * BASE64_CHUNK_SIZE;
        const chunk = fileBase64.slice(start, start + BASE64_CHUNK_SIZE);

        await Promise.race([
          sendLine(writer, encoder, {
            type: "chunk",
            index: i,
            data: chunk,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("CLIENT_DISCONNECTED")), 5000)
          ),
        ]);

        // Progresso de 90% a 99% durante o envio dos chunks
        const chunkPercent = 90 + Math.round(((i + 1) / totalChunks) * 9);
        if (i % 10 === 0 || i === totalChunks - 1) {
          await sendLine(writer, encoder, {
            type: "progress",
            percent: Math.min(chunkPercent, 99),
            current: allRows.length,
            total: allRows.length,
          });
        }
      }

      // Mensagem final SEM o arquivo — apenas metadados
      await sendLine(writer, encoder, {
        type: "done",
        percent: 100,
        current: allRows.length,
        total: allRows.length,
        fileName,
        mimeType,
        totalChunks,
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

      console.error(`Erro na exportação (${source}):`, {
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

/**
 * Exportação por filtro/loja (comportamento original) e, com
 * `?source=bling&loja=sobaquetas`, exportação do espelho do Bling.
 * Não use para listas grandes de IDs — nesse caso, use POST.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const source: Source =
    searchParams.get("source") === "bling" ? "bling" : "announce";
  const store = searchParams.get("store")?.trim() || null;
  const loja = searchParams.get("loja")?.trim().toLowerCase() || null;
  const format = (searchParams.get("format") ?? "xlsx").toLowerCase();
  const selectedIds = parseIdsParam(searchParams);

  return handleExport(request, { source, store, loja, format, selectedIds });
}

/**
 * ✅ Usado para exportação por seleção de IDs na tabela.
 * Recebe os IDs no corpo JSON em vez de querystring, evitando o
 * erro 414 (Request-URI Too Long) quando há muitos itens
 * selecionados (centenas/milhares de UUIDs).
 *
 * Body esperado: { ids: string[], format?: "xlsx" | "csv" }
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { ids?: unknown; format?: unknown; store?: unknown } = {};

  try {
    body = await request.json();
  } catch {
    return jsonError("Corpo da requisição inválido. Esperado JSON.", 400);
  }

  const selectedIds = normalizeIdsBody(body.ids);

  if (!selectedIds) {
    return jsonError('O campo "ids" é obrigatório e deve conter ao menos 1 item.', 400);
  }

  const format =
    typeof body.format === "string" ? body.format.toLowerCase() : "xlsx";
  const store = typeof body.store === "string" ? body.store.trim() || null : null;

  return handleExport(request, {
    source: "announce",
    store,
    loja: null,
    format,
    selectedIds,
  });
}
