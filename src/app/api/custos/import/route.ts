// app/api/custos/importar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustoPayload = {
  code: string;
  mark: string | null;
  product: string;
  current_cost: number;
  previous_cost: number;
  packaging_cost: number;
  ncm: string | null;
};

type RequestBody = {
  tipo?: unknown;
  registros?: unknown;
};

const MAX_REGISTROS = 60_000;

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

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCodigo(value: unknown): string {
  return normalizeText(value)?.toUpperCase() ?? "";
}

function parseNumero(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validateTipo(value: unknown): "inclusao" | "alteracao" {
  if (value !== "inclusao" && value !== "alteracao") {
    throw new Error('O campo tipo precisa ser "inclusao" ou "alteracao".');
  }
  return value;
}

function validateRegistros(value: unknown): CustoPayload[] {
  if (!Array.isArray(value)) {
    throw new Error("O campo registros precisa ser uma lista.");
  }

  if (value.length === 0) {
    throw new Error("Nenhum registro foi enviado.");
  }

  if (value.length > MAX_REGISTROS) {
    throw new Error(
      `A importação não pode ultrapassar ${MAX_REGISTROS} registros por vez.`
    );
  }

  const codigosVistos = new Set<string>();

  return value.map((item: unknown, index: number): CustoPayload => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Registro inválido na posição ${index + 1}.`);
    }

    const row = item as Record<string, unknown>;
    const code = normalizeCodigo(row.code);

    if (!code) {
      throw new Error(`Código ausente ou inválido na posição ${index + 1}.`);
    }

    if (codigosVistos.has(code)) {
      throw new Error(
        `Código duplicado na posição ${index + 1}: "${code}". Remova a duplicidade antes de enviar.`
      );
    }
    codigosVistos.add(code);

    const product = normalizeText(row.product);

    if (!product) {
      throw new Error(
        `Campo "product" ausente ou inválido na posição ${index + 1} (código "${code}"). Essa coluna é obrigatória.`
      );
    }

    const currentCost = parseNumero(row.current_cost);
    const previousCost = parseNumero(row.previous_cost);

    if (currentCost === null || previousCost === null) {
      throw new Error(
        `Custo atual ou custo antigo inválido na posição ${index + 1} (código "${code}").`
      );
    }

    const packagingCost = parseNumero(row.packaging_cost) ?? 0;

    return {
      code,
      mark: normalizeText(row.mark),
      product,
      current_cost: Number(currentCost.toFixed(2)),
      previous_cost: Number(previousCost.toFixed(2)),
      packaging_cost: Number(packagingCost.toFixed(2)),
      ncm: normalizeText(row.ncm),
    };
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    /*
     * 3. Lê o corpo da requisição.
     */
    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          error: "O corpo da requisição não contém um JSON válido.",
        },
        { status: 400 }
      );
    }

    /*
     * 4. Valida e normaliza tipo + registros.
     */
    const tipo = validateTipo(body.tipo);
    const registros = validateRegistros(body.registros);

    const sql = getPostgresClient();

    /*
     * 5. Executa diretamente no PostgreSQL, sem PostgREST,
     * sem /rest/v1/rpc e sem schema cache.
     */
    const resultado = await sql.begin(async (transaction) => {
      /*
       * Reproduz o contexto do usuário autenticado
       * para auth.uid() e RLS.
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

      await transaction`
        set local role authenticated
      `;

      /*
       * transaction.json() envia registros como JSON real,
       * não como array nativo do PostgreSQL nem como string
       * JSON duplicadamente codificada.
       *
       * A CTE garante que a função receba exatamente
       * o mesmo valor testado pelo jsonb_typeof().
       */
      const rows = await transaction`
        with payload as (
          select
            ${transaction.json(registros)}::jsonb as valor
        )
        select
          jsonb_typeof(payload.valor) as tipo_payload,
          case
            when jsonb_typeof(payload.valor) = 'array'
            then
              public.upsert_custos_lote(
                payload.valor,
                ${tipo}
              )
            else null
          end as resultado
        from payload
      `;

      const tipoPayload = rows[0]?.tipo_payload;

      if (tipoPayload !== "array") {
        throw new Error(
          `O payload enviado ao PostgreSQL deveria ser um array JSON, mas foi recebido como "${
            tipoPayload ?? "desconhecido"
          }".`
        );
      }

      return rows[0]?.resultado ?? null;
    });

    return NextResponse.json(
      {
        success: true,
        resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const databaseError = error as {
      name?: string;
      message?: string;
      code?: string;
      detail?: string;
      hint?: string;
      where?: string;
    };

    console.error("Erro na importação de custos:", {
      name: databaseError?.name ?? null,
      message: databaseError?.message ?? null,
      code: databaseError?.code ?? null,
      detail: databaseError?.detail ?? null,
      hint: databaseError?.hint ?? null,
      where: databaseError?.where ?? null,
    });

    const status = databaseError?.code === "42501" ? 403 : 400;

    return NextResponse.json(
      {
        error:
          databaseError?.message ??
          "Não foi possível importar os custos.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
