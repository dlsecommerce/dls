// app/api/composicao/export-modelo/route.ts

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModeloRow = {
  id_bling: string | null;
  store: string | null;
  reference: string | null;
  product: string | null;
  code: string | null;
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
 * MODELO - COMPOSIÇÃO - DD-MM-AAAA HHhMMmin.xlsx
 */
function buildFilename(): string {
  const now = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  const dataFormatada = `${pad(now.getDate())}-${pad(
    now.getMonth() + 1
  )}-${now.getFullYear()}`;

  const horaFormatada = `${pad(now.getHours())}h${pad(now.getMinutes())}min`;

  return `MODELO - COMPOSIÇÃO - ${dataFormatada} ${horaFormatada}.xlsx`;
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
     *
     * left join em composition/costs preserva anúncios sem
     * composição cadastrada (linha em branco para preencher).
     *
     * ⚠️ Ajuste o nome da coluna abaixo (a.id_bling) caso o campo
     * real na tabela `announce` tenha outro nome.
     */
    const rows = await sql.begin(async (transaction) => {
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

      const result = await transaction<ModeloRow[]>`
        select
          a.id_bling,
          a.store,
          a.reference,
          a.product,
          c.code,
          comp.amount
        from newsystem.announce a
        left join newsystem.composition comp
          on comp.announce_id = a.id
          and comp.deleted_at is null
        left join newsystem.costs c
          on c.id = comp.cost_id
        where a.deleted_at is null
        order by a.store, a.reference
      `;

      return result;
    });

    /*
     * 4. Monta a planilha com ExcelJS (permite estilizar o cabeçalho).
     * Quando não há composição (code é null), a linha fica em
     * branco nas colunas de item, para o usuário preencher.
     */
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Modelo Composição");

    const headers = [
      "ID Bling",
      "Loja",
      "Referência",
      "Produto",
      "Código do Item",
      "Quantidade",
    ];

    worksheet.columns = [
      { header: headers[0], key: "id_bling", width: 16 },
      { header: headers[1], key: "loja", width: 12 },
      { header: headers[2], key: "referencia", width: 22 },
      { header: headers[3], key: "produto", width: 35 },
      { header: headers[4], key: "codigo_item", width: 16 },
      { header: headers[5], key: "quantidade", width: 12 },
    ];

    rows.forEach((r) => {
      worksheet.addRow({
        id_bling: r.id_bling ?? "",
        loja: r.store ?? "",
        referencia: r.reference ?? "",
        produto: r.product ?? "",
        codigo_item: r.code ?? "",
        quantidade: r.amount ?? "",
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
        "Content-Disposition": `attachment; filename="${buildFilename()}"`,
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

    console.error("Erro na exportação do modelo de composição:", {
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
          "Não foi possível gerar o modelo de composição.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
