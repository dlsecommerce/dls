import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketplacePayload = {
  id: string;
  freight: number;
  commission_rate: number;
  profit_margin: number;
  current_cost: number;
  selling_price: number;
};

type RequestBody = {
  registros?: unknown;
};

const MAX_REGISTROS = 60_000;

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const [type, token] = authorization.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token?.trim()) return null;
  return token.trim();
}

function parseNumero(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function validateRegistros(value: unknown): MarketplacePayload[] {
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

  return value.map((item: unknown, index: number): MarketplacePayload => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Registro inválido na posição ${index + 1}.`);
    }

    const row = item as Record<string, unknown>;

    if (!isUuid(row.id)) {
      throw new Error(`ID inválido ou ausente na posição ${index + 1}.`);
    }

    const freight = parseNumero(row.freight);
    const commissionRate = parseNumero(row.commission_rate);
    const profitMargin = parseNumero(row.profit_margin);
    const currentCost = parseNumero(row.current_cost);
    const sellingPrice = parseNumero(row.selling_price);

    if (
      freight === null ||
      commissionRate === null ||
      profitMargin === null ||
      currentCost === null ||
      sellingPrice === null
    ) {
      throw new Error(
        `Valores numéricos inválidos na posição ${index + 1} (id "${
          row.id
        }").`
      );
    }

    if (commissionRate < 0 || commissionRate > 100) {
      throw new Error(
        `Comissão fora do intervalo 0-100 na posição ${index + 1}.`
      );
    }

    if (profitMargin < 0 || profitMargin > 100) {
      throw new Error(
        `Margem de lucro fora do intervalo 0-100 na posição ${index + 1}.`
      );
    }

    if (freight < 0 || currentCost < 0 || sellingPrice < 0) {
      throw new Error(
        `Valores negativos não são permitidos na posição ${index + 1}.`
      );
    }

    return {
      id: row.id as string,
      freight: Number(freight.toFixed(2)),
      commission_rate: Number(commissionRate.toFixed(2)),
      profit_margin: Number(profitMargin.toFixed(2)),
      current_cost: Number(currentCost.toFixed(2)),
      selling_price: Number(sellingPrice.toFixed(2)),
    };
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
      throw new Error(
        "As variáveis do Supabase não foram configuradas no servidor."
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
      return NextResponse.json(
        {
          error:
            "Sua sessão não é válida ou expirou. Entre novamente no sistema.",
        },
        { status: 401 }
      );
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "O corpo da requisição não contém um JSON válido." },
        { status: 400 }
      );
    }

    const registros = validateRegistros(body.registros);
    const sql = getPostgresClient();

    const resultado = await sql.begin(async (transaction) => {
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

      const rows = await transaction`
        with payload as (
          select ${transaction.json(registros)}::jsonb as valor
        )
        select
          jsonb_typeof(payload.valor) as tipo_payload,
          case
            when jsonb_typeof(payload.valor) = 'array'
            then newsystem.upsert_marketplace_lote(payload.valor)
            else null
          end as resultado
        from payload
      `;

      const tipoPayload = rows[0]?.tipo_payload;

      if (tipoPayload !== "array") {
        throw new Error(
          `O payload enviado deveria ser um array JSON, mas foi recebido como "${
            tipoPayload ?? "desconhecido"
          }".`
        );
      }

      return rows[0]?.resultado ?? null;
    });

    return NextResponse.json(
      { success: true, resultado },
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

    console.error("Erro na importação de marketplace:", {
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
          databaseError?.message ?? "Não foi possível importar o marketplace.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
