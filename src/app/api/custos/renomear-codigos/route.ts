import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlteracaoCodigo = {
  codigo_antigo: string;
  codigo_novo: string;
};

type RequestBody = {
  alteracoes?: AlteracaoCodigo[];
};

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(" ");

  if (
    type?.toLowerCase() !== "bearer" ||
    !token?.trim()
  ) {
    return null;
  }

  return token.trim();
}

function validateAlteracoes(
  value: unknown
): AlteracaoCodigo[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "O campo alteracoes precisa ser uma lista."
    );
  }

  if (value.length === 0) {
    throw new Error(
      "Nenhuma renomeação foi enviada."
    );
  }

  if (value.length > 5000) {
    throw new Error(
      "A importação não pode ultrapassar 5.000 renomeações por vez."
    );
  }

  return value.map((item, index) => {
    if (
      !item ||
      typeof item !== "object"
    ) {
      throw new Error(
        `Renomeação inválida na posição ${index + 1}.`
      );
    }

    const row = item as Record<string, unknown>;

    const codigoAntigo =
      typeof row.codigo_antigo === "string"
        ? row.codigo_antigo.trim()
        : "";

    const codigoNovo =
      typeof row.codigo_novo === "string"
        ? row.codigo_novo.trim()
        : "";

    if (!codigoAntigo || !codigoNovo) {
      throw new Error(
        `Código antigo ou novo inválido na posição ${index + 1}.`
      );
    }

    return {
      codigo_antigo: codigoAntigo,
      codigo_novo: codigoNovo,
    };
  });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    /*
     * 1. Obtém o token enviado pelo navegador.
     */
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Usuário não autenticado. Entre novamente no sistema.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

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
    const authClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await authClient.auth.getUser(
      accessToken
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Sua sessão não é válida ou expirou. Entre novamente no sistema.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 3. Lê e valida o corpo da requisição.
     */
    const body =
      (await request.json()) as RequestBody;

    const alteracoes = validateAlteracoes(
      body.alteracoes
    );

    const sql = getPostgresClient();

    /*
     * 4. Executa diretamente no PostgreSQL.
     *
     * Não passa por:
     * /rest/v1/rpc
     * PostgREST
     * schema cache
     */
    const resultado = await sql.begin(
      async (transaction) => {
        /*
         * Reproduz o contexto do usuário autenticado,
         * permitindo que auth.uid() e as políticas RLS
         * continuem funcionando.
         */
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

        /*
         * Executa com os mesmos privilégios do papel
         * authenticated, em vez de usar os privilégios
         * administrativos da conexão.
         */
        await transaction`
          set local role authenticated
        `;

        const rows = await transaction`
          select
            public.renomear_codigos_composicao_lote(
              ${JSON.stringify(alteracoes)}::jsonb
            ) as resultado
        `;

        return rows[0]?.resultado ?? null;
      }
    );

    return NextResponse.json(
      {
        success: true,
        resultado,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    const databaseError = error as {
      message?: string;
      code?: string;
      detail?: string;
      hint?: string;
    };

    console.error(
      "Erro na renomeação de códigos:",
      databaseError
    );

    return NextResponse.json(
      {
        error:
          databaseError?.message ??
          "Não foi possível renomear os códigos.",

        code:
          databaseError?.code ??
          null,

        detail:
          databaseError?.detail ??
          null,

        hint:
          databaseError?.hint ??
          null,
      },
      {
        status: 400,
      }
    );
  }
}