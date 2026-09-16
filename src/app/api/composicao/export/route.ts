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
  code: string | null;
  item_product: string | null;
  amount: number | null;
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

/**
 * Gera o nome do arquivo no formato:
 * COMPOSIÇÃO - DD-MM-AAAA HHhMMmin.xlsx
 */
function buildFilename(): string {
  const now = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  const dataFormatada = `${pad(now.getDate())}-${pad(
    now.getMonth() + 1
  )}-${now.getFullYear()}`;

  const horaFormatada = `${pad(now.getHours())}h${pad(now.getMinutes())}min`;

  return `COMPOSIÇÃO - ${dataFormatada} ${horaFormatada}.xlsx`;
}

/**
 * Monta o header Content-Disposition de forma segura para nomes
 * de arquivo com acentuação (ex: "COMPOSIÇÃO"), seguindo RFC 5987.
 *
 * - filename="..." → fallback ASCII (navegadores antigos)
 * - filename*=UTF-8''... → nome real com acentos (navegadores atuais)
 */
function buildContentDisposition(filename: string): string {
  const asciiFallback = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\x20-\x7E]/g, "_"); // troca qualquer não-ASCII por "_"

  const encoded = encodeURIComponent(filename);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    /*
     * 1. Obtém o token enviado pelo navegador.
     */
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado. Entre novamente no sistema.",
        },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "As variáveis do Supabase não foram configuradas no servidor."
      );
    }

    /*
     * 2. Valida o token diretamente no Supabase Auth.
     */
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
      return NextResponse.json(
        {
          error:
            "Sua sessão não é válida ou expirou. Entre novamente no sistema.",
        },
        { status: 401 }
      );
    }

    const sql = getPostgresClient();

    /*
     * 3. Executa diretamente no PostgreSQL, com o contexto do usuário
     * autenticado para respeitar RLS (auth.uid()).
     */
    const composicoes = await sql.begin(async (transaction) => {
      const jwtClaims = JSON.stringify({
        sub: userData.user.id,
        role: "authenticated",
        email: userData.user.email ?? null,
      });

      await transaction`
        select set_config(
          'request.jwt.claims',
          ${jwtClaims},
          true
        )
      `;

      await transaction`
        select set_config(
          'request.jwt.claim.sub',
          ${userData.user.id},
          true
        )
      `;

      await transaction`
        select set_config(
          'request.jwt.claim.role',
          'authenticated',
          true
        )
      `;

      await transaction`
        set local role authenticated
      `;

      const rows = await transaction<ComposicaoRow[]>`
        select
          a.id_bling,
          a.store,
          a.reference,
          a.product,
          c.code,
          c.product as item_product,
          comp.amount
        from newsystem.composition comp
        left join newsystem.announce a
          on a.id = comp.announce_id
        left join newsystem.costs c
          on c.id = comp.cost_id
        where comp.deleted_at is null
        order by a.store, a.reference
      `;

      return rows;
    });

    /*
     * 4. Monta a planilha com ExcelJS (permite estilizar o cabeçalho).
     */
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Composições");

    worksheet.columns = [
      { header: "ID Bling", key: "id_bling", width: 16 },
      { header: "Loja", key: "loja", width: 12 },
      { header: "Referência", key: "referencia", width: 22 },
      { header: "Produto", key: "produto", width: 35 },
      { header: "Código do Item", key: "codigo_item", width: 16 },
      { header: "Produto do Item", key: "produto_item", width: 35 },
      { header: "Quantidade", key: "quantidade", width: 12 },
    ];

    composicoes.forEach((c) => {
      worksheet.addRow({
        id_bling: c.id_bling ?? "",
        loja: c.store ?? "",
        referencia: c.reference ?? "",
        produto: c.product ?? "",
        codigo_item: c.code ?? "",
        produto_item: c.item_product ?? "",
        quantidade: c.amount ?? 0,
      });
    });

    /*
     * 5. Estiliza o cabeçalho: fundo azul #1a8ceb, fonte branca em negrito.
     */
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A8CEB" },
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    headerRow.height = 20;

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition(buildFilename()),
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
        error:
          databaseError?.message ??
          "Não foi possível exportar as composições.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
