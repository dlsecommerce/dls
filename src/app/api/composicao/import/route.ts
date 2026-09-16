// app/api/composicao/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportRow = {
  "ID Bling"?: string | number;
  Loja?: string;
  Referência?: string;
  "Código do Item"?: string | number;
  Quantidade?: string | number;
};

type ResultadoLinha = {
  linha: number;
  id_bling: string | null;
  store: string | null;
  reference: string | null;
  code: string | null;
  status: "ok" | "erro";
  motivo: string;
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /*
     * 1. Obtém o token enviado pelo navegador.
     */
    const accessToken = getBearerToken(req);

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
     * 3. Lê o arquivo enviado.
     */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<ImportRow>(sheet);

    if (raw.length === 0) {
      return NextResponse.json(
        { error: "A planilha está vazia." },
        { status: 400 }
      );
    }

    const MAX_REGISTROS = 5000;

    if (raw.length > MAX_REGISTROS) {
      return NextResponse.json(
        {
          error: `A importação não pode ultrapassar ${MAX_REGISTROS} linhas por vez.`,
        },
        { status: 400 }
      );
    }

    /*
     * 4. Monta os registros válidos para enviar ao banco.
     *
     * ID Bling agora é a chave usada para localizar o anúncio
     * exato (evita duplicidade/erro de casamento por Loja+Referência).
     *
     * Linhas sem "ID Bling", "Código do Item" ou "Quantidade"
     * são puladas aqui mesmo, sem gerar erro.
     */
    const skipped: number[] = [];
    const registros: Record<string, unknown>[] = [];

    raw.forEach((row, index) => {
      const excelLine = index + 2; // +1 header, +1 índice base 1

      const idBling = String(row["ID Bling"] ?? "").trim();
      const store = String(row["Loja"] ?? "").trim();
      const reference = String(row["Referência"] ?? "").trim();
      const code = String(row["Código do Item"] ?? "").trim();
      const amountRaw = row["Quantidade"];

      if (!idBling || !code || !amountRaw) {
        skipped.push(excelLine);
        return;
      }

      registros.push({
        linha: excelLine,
        id_bling: idBling,
        store,
        reference,
        code,
        amount: amountRaw,
      });
    });

    if (registros.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: skipped.length,
        errors: [],
      });
    }

    const sql = getPostgresClient();

    /*
     * 5. Executa a função SQL dentro de uma transação, com o
     * contexto do usuário autenticado para respeitar RLS.
     */
    const resultados = await sql.begin(async (transaction) => {
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

      const rows = await transaction<ResultadoLinha[]>`
        select *
        from newsystem.upsert_composition_lote(${JSON.stringify(registros)}::jsonb)
      `;

      return rows;
    });

    const errors = resultados
      .filter((r) => r.status === "erro")
      .map((r) => ({
        linha: r.linha,
        motivo: r.motivo,
      }));

    const processed = resultados.filter((r) => r.status === "ok").length;

    return NextResponse.json({
      success: errors.length === 0,
      processed,
      skipped: skipped.length,
      errors,
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

    console.error("Erro na importação de composições:", {
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
          "Não foi possível importar as composições.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
