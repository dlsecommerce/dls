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
  alteracoes?: unknown;
};

function getBearerToken(
  request: NextRequest
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [type, token] =
    authorization.split(" ");

  if (
    type?.toLowerCase() !== "bearer" ||
    !token?.trim()
  ) {
    return null;
  }

  return token.trim();
}

function normalizeCodigo(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
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

  return value.map(
    (
      item: unknown,
      index: number
    ): AlteracaoCodigo => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        throw new Error(
          `Renomeação inválida na posição ${
            index + 1
          }.`
        );
      }

      const row =
        item as Record<
          string,
          unknown
        >;

      const codigoAntigo =
        normalizeCodigo(
          row.codigo_antigo
        );

      const codigoNovo =
        normalizeCodigo(
          row.codigo_novo
        );

      if (
        !codigoAntigo ||
        !codigoNovo
      ) {
        throw new Error(
          `Código antigo ou novo inválido na posição ${
            index + 1
          }.`
        );
      }

      return {
        codigo_antigo:
          codigoAntigo,

        codigo_novo:
          codigoNovo,
      };
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    /*
     * 1. Obtém o token enviado pelo navegador.
     */
    const accessToken =
      getBearerToken(request);

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
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      throw new Error(
        "As variáveis do Supabase não foram configuradas no servidor."
      );
    }

    /*
     * 2. Valida o token diretamente
     * no Supabase Auth.
     */
    const authClient =
      createClient(
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
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
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
     * 3. Lê o corpo da requisição.
     */
    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "O corpo da requisição não contém um JSON válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 4. Valida e normaliza as alterações.
     */
    const alteracoes =
      validateAlteracoes(
        body.alteracoes
      );

    const sql =
      getPostgresClient();

    /*
     * 5. Executa diretamente no PostgreSQL.
     *
     * Não utiliza:
     * - PostgREST
     * - /rest/v1/rpc
     * - schema cache
     */
    const resultado =
      await sql.begin(
        async (transaction) => {
          /*
           * Reproduz o contexto do usuário
           * autenticado para auth.uid() e RLS.
           */
          const jwtClaims =
            JSON.stringify({
              sub:
                userData.user.id,

              role:
                "authenticated",

              email:
                userData.user
                  .email ?? null,
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
           * Passa a executar com os privilégios
           * do papel authenticated.
           */
          await transaction`
            set local role authenticated
          `;

          /*
           * transaction.json() envia alteracoes
           * como JSON real, não como um array
           * nativo do PostgreSQL nem como uma
           * string JSON duplicadamente codificada.
           *
           * A CTE garante que a função receba
           * exatamente o mesmo valor testado
           * pelo jsonb_typeof().
           */
          const rows =
            await transaction`
              with payload as (
                select
                  ${
                    transaction.json(
                      alteracoes
                    )
                  }::jsonb as valor
              )
              select
                jsonb_typeof(
                  payload.valor
                ) as tipo_payload,

                case
                  when jsonb_typeof(
                    payload.valor
                  ) = 'array'
                  then
                    public.renomear_codigos_composicao_lote(
                      payload.valor
                    )
                  else null
                end as resultado
              from payload
            `;

          const tipoPayload =
            rows[0]
              ?.tipo_payload;

          if (
            tipoPayload !== "array"
          ) {
            throw new Error(
              `O payload enviado ao PostgreSQL deveria ser um array JSON, mas foi recebido como "${
                tipoPayload ??
                "desconhecido"
              }".`
            );
          }

          return (
            rows[0]
              ?.resultado ??
            null
          );
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
  } catch (
    error: unknown
  ) {
    const databaseError =
      error as {
        name?: string;
        message?: string;
        code?: string;
        detail?: string;
        hint?: string;
        where?: string;
      };

    console.error(
      "Erro na renomeação de códigos:",
      {
        name:
          databaseError?.name ??
          null,

        message:
          databaseError?.message ??
          null,

        code:
          databaseError?.code ??
          null,

        detail:
          databaseError?.detail ??
          null,

        hint:
          databaseError?.hint ??
          null,

        where:
          databaseError?.where ??
          null,
      }
    );

    const status =
      databaseError?.code ===
      "42501"
        ? 403
        : 400;

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

        where:
          databaseError?.where ??
          null,
      },
      {
        status,
      }
    );
  }
}