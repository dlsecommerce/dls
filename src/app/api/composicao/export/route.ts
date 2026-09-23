// app/api/composicao/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ComposicaoRow = {
  id_bling: string | null;
  store: string | null;
  reference: string | null;
  product: string | null;
  mark: string | null;
  code: string | null;
  amount: number | null;
};

const MAX_IDS_SELECAO = 300_000;

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [type, token] = authorization.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token?.trim()) return null;

  return token.trim();
}

function buildFilename(hasFilterOrSelection: boolean): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  const dataFormatada = `${pad(now.getDate())}-${pad(
    now.getMonth() + 1
  )}-${now.getFullYear()}`;
  const horaFormatada = `${pad(now.getHours())}h${pad(now.getMinutes())}min`;

  const prefix = hasFilterOrSelection
    ? "COMPOSIÇÃO - FILTRADA"
    : "COMPOSIÇÃO";

  return `${prefix} - ${dataFormatada} ${horaFormatada}.xlsx`;
}

function buildContentDisposition(filename: string): string {
  const asciiFallback = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_");

  const encoded = encodeURIComponent(filename);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Normaliza o filtro de tipo, aceitando os mesmos valores usados
 * em useAnnounce/TIPO_TO_FILTER_VALUE ("all" | "products" | "variations").
 */
function normalizeTypeFilter(value: string | null): "all" | "products" | "variations" {
  if (value === "products" || value === "variations") return value;
  return "all";
}

function parseIdsParam(searchParams: URLSearchParams): string[] | null {
  const raw = searchParams.get("ids");
  if (!raw) return null;

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? ids : null;
}

function normalizeIdsBody(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids = value
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  return ids.length > 0 ? ids : null;
}

function normalizeMarksBody(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

type ExportParams = {
  store: string | null;
  search: string | null;
  type: "all" | "products" | "variations";
  marks: string[];
  selectedIds: string[] | null;
};

async function handleExport(
  request: NextRequest,
  params: ExportParams
): Promise<NextResponse> {
  const { store, search, type, marks, selectedIds } = params;

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Usuário não autenticado. Entre novamente no sistema." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "As variáveis do Supabase não foram configuradas no servidor." },
      { status: 500 }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "Sua sessão não é válida ou expirou. Entre novamente no sistema." },
      { status: 401 }
    );
  }

  const isSelectionMode = selectedIds !== null;

  if (isSelectionMode && selectedIds.length > MAX_IDS_SELECAO) {
    return NextResponse.json(
      { error: `Seleção excede o limite máximo de ${MAX_IDS_SELECAO} registros.` },
      { status: 400 }
    );
  }

  const hasActiveFilter =
    isSelectionMode || Boolean(store) || Boolean(search) || type !== "all" || marks.length > 0;

  try {
    const sql = getPostgresClient();

    const composicoes = await sql.begin(async (transaction) => {
      const jwtClaims = JSON.stringify({
        sub: userData.user.id,
        role: "authenticated",
        email: userData.user.email ?? null,
      });

      await transaction`select set_config('request.jwt.claims', ${jwtClaims}, true)`;
      await transaction`select set_config('request.jwt.claim.sub', ${userData.user.id}, true)`;
      await transaction`select set_config('request.jwt.claim.role', 'authenticated', true)`;
      await transaction`set local role authenticated`;
      await transaction.unsafe(`set local statement_timeout = '30000'`);

      // ✅ Monta as condições dinamicamente, aplicadas sobre "a"
      // (announce), respeitando o mesmo filtro/seleção da tabela.
      const conditions = [transaction`comp.deleted_at is null`, transaction`a.deleted_at is null`];

      if (isSelectionMode) {
        conditions.push(transaction`a.id = any(${selectedIds})`);
      } else {
        if (store) {
          conditions.push(transaction`a.store = ${store}`);
        }

        if (search) {
          const term = `%${search}%`;
          conditions.push(
            transaction`(a.product ilike ${term} or a.reference ilike ${term} or a.id_bling ilike ${term})`
          );
        }

        if (type === "products") {
          conditions.push(transaction`a.reference not ilike 'VAR%'`);
        } else if (type === "variations") {
          conditions.push(transaction`a.reference ilike 'VAR%'`);
        }

        if (marks.length > 0) {
          conditions.push(transaction`a.mark = any(${marks})`);
        }
      }

      const whereClause = conditions.reduce((acc, cond) => transaction`${acc} and ${cond}`);

      const rows = await transaction<ComposicaoRow[]>`
        select
          a.id_bling,
          a.store,
          a.reference,
          a.product,
          a.mark,
          c.code,
          comp.amount
        from newsystem.composition comp
        inner join newsystem.announce a
          on a.id = comp.announce_id
        left join newsystem.costs c
          on c.id = comp.cost_id
        where ${whereClause}
        order by a.store, a.reference
      `;

      return rows;
    });

    if (composicoes.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma composição encontrada para o filtro/seleção informado." },
        { status: 404 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = false;

    const worksheet = workbook.addWorksheet("Composições");

    worksheet.columns = [
      { header: "ID Bling", key: "id_bling", width: 16 },
      { header: "Loja", key: "loja", width: 12 },
      { header: "Referência", key: "referencia", width: 22 },
      { header: "Produto", key: "produto", width: 35 },
      { header: "Marca", key: "marca", width: 18 },
      { header: "Código do Item", key: "codigo_item", width: 16 },
      { header: "Quantidade", key: "quantidade", width: 12 },
    ];

    const rowsData = composicoes.map((c) => ({
      id_bling: c.id_bling ?? "",
      loja: c.store ?? "",
      referencia: c.reference ?? "",
      produto: c.product ?? "",
      marca: c.mark ?? "",
      codigo_item: c.code ?? "",
      quantidade: c.amount ?? 0,
    }));

    worksheet.addRows(rowsData);

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A8CEB" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    headerRow.height = 20;

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition(buildFilename(hasActiveFilter)),
      },
    });
  } catch (error: unknown) {
    const databaseError = error as {
      name?: string;
      message?: string;
      code?: string;
      detail?: string;
      hint?: string;
      where?: string;
    };

    console.error("Erro na exportação de composições:", {
      name: databaseError?.name ?? null,
      message: databaseError?.message ?? null,
      code: databaseError?.code ?? null,
      detail: databaseError?.detail ?? null,
      hint: databaseError?.hint ?? null,
      where: databaseError?.where ?? null,
    });

    const status = databaseError?.code === "42501" ? 403 : 500;

    return NextResponse.json(
      {
        error: databaseError?.message ?? "Não foi possível exportar as composições.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}

/**
 * GET — exportação por filtro (store, search, type, marks).
 * Não use para seleção com muitos IDs (use POST).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const store = searchParams.get("store")?.trim() || null;
  const search = searchParams.get("search")?.trim() || null;
  const type = normalizeTypeFilter(searchParams.get("type"));
  const marksRaw = searchParams.get("marks");
  const marks = marksRaw
    ? marksRaw.split(",").map((m) => m.trim()).filter(Boolean)
    : [];
  const selectedIds = parseIdsParam(searchParams);

  return handleExport(request, { store, search, type, marks, selectedIds });
}

/**
 * POST — exportação por seleção de IDs (evita limite de URL) ou
 * também por filtro, se enviado no body.
 * Body esperado: { ids?: string[], store?, search?, type?, marks? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido. Esperado JSON." },
      { status: 400 }
    );
  }

  const selectedIds = normalizeIdsBody(body.ids);
  const store = typeof body.store === "string" ? body.store.trim() || null : null;
  const search = typeof body.search === "string" ? body.search.trim() || null : null;
  const type = normalizeTypeFilter(typeof body.type === "string" ? body.type : null);
  const marks = normalizeMarksBody(body.marks);

  return handleExport(request, { store, search, type, marks, selectedIds });
}
