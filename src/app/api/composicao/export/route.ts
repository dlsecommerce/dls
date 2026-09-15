// app/api/composicao/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ComposicaoRow = {
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
     * 4. Monta a planilha.
     */
    const rows = composicoes.map((c) => ({
      Loja: c.store ?? "",
      Referência: c.reference ?? "",
      Produto: c.product ?? "",
      "Código do Item": c.code ?? "",
      "Produto do Item": c.item_product ?? "",
      Quantidade: c.amount ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 35 },
      { wch: 16 },
      { wch: 35 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Composições");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="composicoes.xlsx"`,
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
