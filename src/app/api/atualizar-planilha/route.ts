// app/api/announce/importar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnnouncePayload = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  code_id: number | null;
  parent_id: string | null;
};

type RegistroResultado = {
  store: string;
  reference: string;
  status: "ok" | "erro";
  message: string;
};

type RequestBody = {
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

function normalizeStore(value: unknown): string {
  return normalizeText(value) ?? "";
}

function normalizeReference(value: unknown): string {
  return normalizeText(value) ?? "";
}

function parseInteiro(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseUuid(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(text) ? text : null;
}

function validateRegistros(value: unknown): AnnouncePayload[] {
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

  const chavesVistas = new Set<string>();

  return value.map((item: unknown, index: number): AnnouncePayload => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Registro inválido na posição ${index + 1}.`);
    }

    const row = item as Record<string, unknown>;
    const store = normalizeStore(row.store);
    const reference = normalizeReference(row.reference);

    if (!store) {
      throw new Error(
        `Campo "store" ausente ou inválido na posição ${index + 1}.`
      );
    }

    if (!reference) {
      throw new Error(
        `Campo "reference" ausente ou inválido na posição ${index + 1} (loja "${store}").`
      );
    }

    const chave = `${store}::${reference}`;
    if (chavesVistas.has(chave)) {
      throw new Error(
        `Combinação duplicada de loja + referência na posição ${index + 1}: "${store}" / "${reference}". Remova a duplicidade antes de enviar.`
      );
    }
    chavesVistas.add(chave);

    const codeIdRaw = row.code_id;
    const codeId = parseInteiro(codeIdRaw);

    if (
      codeIdRaw !== null &&
      codeIdRaw !== undefined &&
      codeIdRaw !== "" &&
      codeId === null
    ) {
      throw new Error(
        `Campo "code_id" inválido na posição ${index + 1} (loja "${store}", referência "${reference}"). Deve ser um número inteiro.`
      );
    }

    const parentIdRaw = row.parent_id;
    const parentId = parseUuid(parentIdRaw);

    if (
      parentIdRaw !== null &&
      parentIdRaw !== undefined &&
      normalizeText(parentIdRaw) !== null &&
      parentId === null
    ) {
      throw new Error(
        `Campo "parent_id" inválido na posição ${index + 1} (loja "${store}", referência "${reference}"). Deve ser um UUID válido.`
      );
    }

    return {
      store,
      id_bling: normalizeText(row.id_bling),
      reference,
      product: normalizeText(row.product),
      mark: normalizeText(row.mark),
      code_id: codeId,
      parent_id: parentId,
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
     * 4. Valida e normaliza os registros.
     */
    const registros = validateRegistros(body.registros);

    const sql = getPostgresClient();

    /*
     * 5. Executa diretamente no PostgreSQL, sem PostgREST,
     * sem /rest/v1/rpc e sem schema cache.
     *
     * upsert_announce_bulk retorna uma TABELA (store, reference, status, message),
     * então agregamos o SETOF em jsonb_agg dentro da própria query,
     * mantendo o mesmo padrão de validação de tipo do payload usado em custos.
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

      const rows = await transaction`
        with payload as (
          select
            ${transaction.json(registros)}::jsonb as valor
        ),
        execucao as (
          select
            jsonb_typeof(payload.valor) as tipo_payload,
            resultado.*
          from payload
          left join lateral (
            select *
            from newsystem.upsert_announce_bulk(payload.valor)
            where jsonb_typeof(payload.valor) = 'array'
          ) as resultado on true
        )
        select
          (select tipo_payload from execucao limit 1) as tipo_payload,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'store', store,
                'reference', reference,
                'status', status,
                'message', message
              )
            ) filter (where store is not null),
            '[]'::jsonb
          ) as resultado
        from execucao
      `;

      const tipoPayload = rows[0]?.tipo_payload;

      if (tipoPayload !== "array") {
        throw new Error(
          `O payload enviado ao PostgreSQL deveria ser um array JSON, mas foi recebido como "${
            tipoPayload ?? "desconhecido"
          }".`
        );
      }

      return (rows[0]?.resultado ?? []) as RegistroResultado[];
    });

    const total = resultado.length;
    const importados = resultado.filter((r) => r.status === "ok").length;
    const erros = resultado.filter((r) => r.status === "erro");

    return NextResponse.json(
      {
        success: true,
        total,
        importados,
        errosCount: erros.length,
        erros,
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

    console.error("Erro na importação de announce:", {
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
          databaseError?.message ?? "Não foi possível importar os anúncios.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
