// app/api/composicao/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { getPostgresClient } from "@/lib/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RawRow = Record<string, any>;

type ResultadoLinha = {
  linha: number;
  id_bling: string | null;
  store: string | null;
  reference: string | null;
  code: string | null;
  status: "ok" | "erro";
  motivo: string;
};

type ModoImportacaoComposicao = "merge" | "replace";

const MAX_REGISTROS = 5000;
const MAX_FILE_SIZE_MB = 15;

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [type, token] = authorization.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token?.trim()) return null;

  return token.trim();
}

function normalizeKey(key: string): string {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const ID_BLING_ALIASES = ["id bling", "idbling", "id_bling"];
const STORE_ALIASES = ["loja", "store"];
const REFERENCE_ALIASES = ["referencia", "reference"];
const MARK_ALIASES = ["marca", "mark"];
const CODE_ALIASES = ["codigo do item", "codigo item", "code", "item_code"];
const QUANTITY_ALIASES = ["quantidade", "amount", "qtd"];

function findValue(normalized: Record<string, any>, aliases: string[]): string {
  const key = aliases.find((a) => normalized[a] !== undefined);
  return key ? String(normalized[key] ?? "").trim() : "";
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  const normalized = String(raw).trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * ✅ Modo de importação escolhido no ImportComposicaoModal:
 *  - "merge"   → adiciona/atualiza itens da planilha, sem remover o
 *                que já existia (comportamento padrão/seguro).
 *  - "replace" → substitui totalmente a composição dos anúncios
 *                presentes na planilha (itens não listados são
 *                removidos). Ação destrutiva, exige confirmação no
 *                modal antes de chegar aqui.
 * Qualquer valor diferente de "replace" cai em "merge" (fail-safe).
 */
function parseMode(raw: FormDataEntryValue | null): ModoImportacaoComposicao {
  return raw === "replace" ? "replace" : "merge";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ---------- 1. Autenticação ----------
    const accessToken = getBearerToken(req);

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
      throw new Error("As variáveis do Supabase não foram configuradas no servidor.");
    }

    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Sua sessão não é válida ou expirou. Entre novamente no sistema." },
        { status: 401 }
      );
    }

    // ---------- 2. Leitura do arquivo ----------
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // ✅ Modo de importação vindo do ImportComposicaoModal.
    const mode = parseMode(formData.get("mode"));

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: "buffer",
        dense: true,
        cellDates: false,
        cellText: false,
      });
    } catch {
      return NextResponse.json(
        { error: "Não foi possível ler o arquivo. Verifique se é um Excel válido (.xlsx)." },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "Nenhuma aba encontrada no arquivo." }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: true, defval: "" });

    // Remove linhas totalmente vazias (fantasmas do Excel)
    const nonEmptyRaw = raw.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").trim() !== "")
    );

    if (nonEmptyRaw.length === 0) {
      return NextResponse.json({ error: "A planilha está vazia." }, { status: 400 });
    }

    if (nonEmptyRaw.length > MAX_REGISTROS) {
      return NextResponse.json(
        {
          error: `A importação não pode ultrapassar ${MAX_REGISTROS.toLocaleString(
            "pt-BR"
          )} linhas por vez (encontradas: ${nonEmptyRaw.length.toLocaleString("pt-BR")}).`,
        },
        { status: 400 }
      );
    }

    // ---------- 3. Normalização e validação linha a linha ----------
    const skippedDetalhado: { linha: number; motivo: string }[] = [];
    const registros: Record<string, unknown>[] = [];
    const chavesVistas = new Map<string, number>(); // id_bling+code -> primeira linha

    for (let index = 0; index < nonEmptyRaw.length; index++) {
      const row = nonEmptyRaw[index];
      const excelLine = index + 2; // +1 header, +1 índice base 1

      const normalized: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        normalized[normalizeKey(key)] = row[key];
      }

      const idBling = findValue(normalized, ID_BLING_ALIASES);
      const store = findValue(normalized, STORE_ALIASES);
      const reference = findValue(normalized, REFERENCE_ALIASES);
      const mark = findValue(normalized, MARK_ALIASES);
      const code = findValue(normalized, CODE_ALIASES);
      const amountRawKey = QUANTITY_ALIASES.find((a) => normalized[a] !== undefined);
      const amountRaw = amountRawKey ? normalized[amountRawKey] : undefined;

      if (!idBling) {
        skippedDetalhado.push({ linha: excelLine, motivo: "ID Bling não informado." });
        continue;
      }
      if (!code) {
        skippedDetalhado.push({ linha: excelLine, motivo: "Código do Item não informado." });
        continue;
      }

      const amount = parseAmount(amountRaw);
      if (amount === null) {
        skippedDetalhado.push({
          linha: excelLine,
          motivo: `Quantidade inválida ("${amountRaw ?? ""}"). Deve ser um número maior que zero.`,
        });
        continue;
      }

      const chave = `${idBling}::${code}`;
      const linhaAnterior = chavesVistas.get(chave);
      if (linhaAnterior !== undefined) {
        skippedDetalhado.push({
          linha: excelLine,
          motivo: `Duplicado da linha ${linhaAnterior} (mesmo ID Bling + Código do Item). Apenas a primeira ocorrência foi processada.`,
        });
        continue;
      }
      chavesVistas.set(chave, excelLine);

      registros.push({
        linha: excelLine,
        id_bling: idBling,
        store,
        reference,
        mark,
        code,
        amount,
      });
    }

    if (registros.length === 0) {
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          skipped: skippedDetalhado.length,
          skippedDetails: skippedDetalhado.slice(0, 200),
          errors: [],
          message:
            "Nenhuma linha válida encontrada. Verifique se as colunas ID Bling, Código do Item e Quantidade estão preenchidas corretamente.",
        },
        { status: 400 }
      );
    }

    // ---------- 4. Execução no banco ----------
    const sql = getPostgresClient();

    const resultados = await sql.begin(async (transaction) => {
      const jwtClaims = JSON.stringify({
        sub: userData.user.id,
        role: "authenticated",
        email: userData.user.email ?? null,
      });

      await transaction`select set_config('request.jwt.claims', ${jwtClaims}, true)`;
      await transaction`select set_config('request.jwt.claim.sub', ${userData.user.id}, true)`;
      await transaction`select set_config('request.jwt.claim.role', 'authenticated', true)`;
      await transaction`set local role authenticated`;

      // ✅ FIX: removido o JSON.stringify manual. Passar o array de
      // objetos diretamente para o driver, deixando-o serializar como
      // jsonb. O bug anterior (JSON.stringify(registros) + ::jsonb)
      // causava DUPLA serialização — a lib serializava a string já
      // stringificada de novo, virando um jsonb do tipo string escalar
      // em vez de array, o que quebrava o jsonb_array_elements() na
      // função upsert_composition_lote com o erro:
      // "cannot extract elements from a scalar".
      //
      // ✅ `mode` é repassado como segundo argumento (p_mode) da RPC.
      // "merge" mantém o comportamento antigo (upsert sem remover
      // nada); "replace" faz a função remover, dentro dos anúncios
      // presentes no lote, todo item de composição que não estiver
      // sendo enviado agora.
      const rows = await transaction<ResultadoLinha[]>`
        select *
        from newsystem.upsert_composition_lote(${transaction.json(registros)}, ${mode})
      `;

      return rows;
    });

    const errors = resultados
      .filter((r) => r.status === "erro")
      .map((r) => ({ linha: r.linha, id_bling: r.id_bling, code: r.code, motivo: r.motivo }));

    const processed = resultados.filter((r) => r.status === "ok").length;

    console.info("[composicao/import] Importação concluída:", {
      usuario: userData.user.email,
      modo: mode,
      totalLinhasArquivo: nonEmptyRaw.length,
      processadas: processed,
      puladas: skippedDetalhado.length,
      comErro: errors.length,
    });

    return NextResponse.json({
      success: errors.length === 0,
      processed,
      skipped: skippedDetalhado.length,
      skippedDetails: skippedDetalhado.slice(0, 200),
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
        error: databaseError?.message ?? "Não foi possível importar as composições.",
        code: databaseError?.code ?? null,
        detail: databaseError?.detail ?? null,
        hint: databaseError?.hint ?? null,
        where: databaseError?.where ?? null,
      },
      { status }
    );
  }
}
