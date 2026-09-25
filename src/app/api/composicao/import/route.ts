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

function parseMode(raw: FormDataEntryValue | null): ModoImportacaoComposicao {
  return raw === "replace" ? "replace" : "merge";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ✅ LOG: id único por requisição, facilita rastrear no console
  // quando há importações concorrentes/paralelas.
  const requestId = Math.random().toString(36).slice(2, 8);
  const logPrefix = `[composicao/import:${requestId}]`;
  const startedAt = Date.now();

  try {
    // ---------- 1. Autenticação ----------
    const accessToken = getBearerToken(req);

    if (!accessToken) {
      console.warn(`${logPrefix} Sem token Bearer no header Authorization.`);
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
      console.warn(`${logPrefix} Token inválido/expirado:`, userError?.message);
      return NextResponse.json(
        { error: "Sua sessão não é válida ou expirou. Entre novamente no sistema." },
        { status: 401 }
      );
    }

    console.info(`${logPrefix} Usuário autenticado:`, userData.user.email);

    // ---------- 2. Leitura do arquivo ----------
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = parseMode(formData.get("mode"));

    console.info(`${logPrefix} Modo de importação:`, mode);

    if (!file) {
      console.warn(`${logPrefix} Nenhum arquivo no FormData.`);
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    console.info(`${logPrefix} Arquivo recebido:`, {
      nome: file.name,
      tamanhoBytes: file.size,
      tipo: file.type,
    });

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      console.warn(`${logPrefix} Arquivo excede limite:`, fileSizeMb.toFixed(2), "MB");
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
    } catch (readError) {
      console.error(`${logPrefix} Falha ao parsear o Excel:`, readError);
      return NextResponse.json(
        { error: "Não foi possível ler o arquivo. Verifique se é um Excel válido (.xlsx)." },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    console.info(`${logPrefix} Abas encontradas:`, workbook.SheetNames);

    if (!sheetName) {
      return NextResponse.json({ error: "Nenhuma aba encontrada no arquivo." }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: true, defval: "" });

    // ✅ LOG: cabeçalhos reais encontrados na planilha — essencial
    // pra detectar nome de coluna diferente do esperado.
    if (raw.length > 0) {
      console.info(`${logPrefix} Colunas detectadas na planilha:`, Object.keys(raw[0]));
      console.info(`${logPrefix} Primeira linha (amostra bruta):`, raw[0]);
    }

    const nonEmptyRaw = raw.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").trim() !== "")
    );

    console.info(`${logPrefix} Total de linhas lidas (raw):`, raw.length);
    console.info(`${logPrefix} Total de linhas não-vazias:`, nonEmptyRaw.length);

    if (nonEmptyRaw.length === 0) {
      return NextResponse.json({ error: "A planilha está vazia." }, { status: 400 });
    }

    if (nonEmptyRaw.length > MAX_REGISTROS) {
      console.warn(
        `${logPrefix} Excedeu MAX_REGISTROS:`,
        nonEmptyRaw.length,
        ">",
        MAX_REGISTROS
      );
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
    const chavesVistas = new Map<string, number>();

    for (let index = 0; index < nonEmptyRaw.length; index++) {
      const row = nonEmptyRaw[index];
      const excelLine = index + 2;

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

    console.info(`${logPrefix} Registros válidos montados:`, registros.length);
    console.info(`${logPrefix} Linhas puladas:`, skippedDetalhado.length);

    // ✅ LOG: motivo agregado das linhas puladas (top 5 motivos mais
    // comuns), pra rapidamente saber se o problema é sistemático.
    if (skippedDetalhado.length > 0) {
      const motivosAgrupados = skippedDetalhado.reduce<Record<string, number>>((acc, item) => {
        const chaveMotivo = item.motivo.split("(")[0].trim();
        acc[chaveMotivo] = (acc[chaveMotivo] ?? 0) + 1;
        return acc;
      }, {});
      console.info(`${logPrefix} Motivos de linhas puladas (agrupado):`, motivosAgrupados);
      console.info(`${logPrefix} Amostra de linhas puladas (até 5):`, skippedDetalhado.slice(0, 5));
    }

    // ✅ LOG: amostra dos primeiros registros que serão enviados ao
    // banco — confirma se id_bling/code/amount vieram corretos.
    if (registros.length > 0) {
      console.info(`${logPrefix} Amostra de registros enviados ao banco (até 3):`, registros.slice(0, 3));
    }

    if (registros.length === 0) {
      console.warn(`${logPrefix} Nenhuma linha válida após normalização.`);
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

    console.info(`${logPrefix} Iniciando transação SQL com`, registros.length, "registros.");

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

      const rows = await transaction<ResultadoLinha[]>`
        select *
        from newsystem.upsert_composition_lote(${transaction.json(registros)}, ${mode})
      `;

      return rows;
    });

    console.info(`${logPrefix} Retorno do banco: ${resultados.length} linhas processadas.`);

    const errors = resultados
      .filter((r) => r.status === "erro")
      .map((r) => ({ linha: r.linha, id_bling: r.id_bling, code: r.code, motivo: r.motivo }));

    const processed = resultados.filter((r) => r.status === "ok").length;

    // ✅ LOG: motivos agregados dos erros de banco (top motivos),
    // mesmo raciocínio de agrupamento do skip.
    if (errors.length > 0) {
      const motivosErroAgrupados = errors.reduce<Record<string, number>>((acc, item) => {
        const chaveMotivo = item.motivo.split("(")[0].trim();
        acc[chaveMotivo] = (acc[chaveMotivo] ?? 0) + 1;
        return acc;
      }, {});
      console.warn(`${logPrefix} Motivos de erro no banco (agrupado):`, motivosErroAgrupados);
      console.warn(`${logPrefix} Amostra de erros de banco (até 5):`, errors.slice(0, 5));
    }

    const duracaoMs = Date.now() - startedAt;

    console.info(`${logPrefix} Importação concluída:`, {
      usuario: userData.user.email,
      modo: mode,
      totalLinhasArquivo: nonEmptyRaw.length,
      processadas: processed,
      puladas: skippedDetalhado.length,
      comErro: errors.length,
      duracaoMs,
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

    const duracaoMs = Date.now() - startedAt;

    console.error(`${logPrefix} Erro fatal na importação (após ${duracaoMs}ms):`, {
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
