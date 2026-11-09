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

type MotivoCodigo =
  | "id_bling_ausente"
  | "codigo_ausente"
  | "quantidade_invalida"
  | "quantidade_ambigua"
  | "duplicado_arquivo";

type SkippedDetalhe = {
  linha: number;
  id_bling: string;
  store: string;
  reference: string;
  code: string;
  motivo_codigo: MotivoCodigo;
  motivo: string;
};

type ModoImportacaoComposicao = "merge" | "replace";

type ResultadoQuantidade =
  | { ok: true; valor: number }
  | { ok: false; codigo: "quantidade_invalida" | "quantidade_ambigua"; motivo: string };

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

/**
 * Interpreta a quantidade da planilha.
 *
 * - number: usado direto (precisa ser > 0).
 * - texto com vírgula e ponto: o último separador é o decimal.
 * - texto só com vírgula: vírgula é decimal ("0,5" -> 0.5).
 * - texto só com ponto: "0.5" e "2.25" são decimais, mas ponto seguido de
 *   3 dígitos ("1.000") é ambíguo (milhar ou decimal) e é rejeitado,
 *   para não gerar quantidade errada sem aviso.
 */
function parseQuantidade(raw: unknown): ResultadoQuantidade {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { ok: false, codigo: "quantidade_invalida", motivo: "Quantidade não informada." };
  }

  if (typeof raw === "number") {
    if (Number.isFinite(raw) && raw > 0) return { ok: true, valor: raw };
    return {
      ok: false,
      codigo: "quantidade_invalida",
      motivo: `Quantidade inválida (${raw}). Deve ser maior que zero.`,
    };
  }

  const original = String(raw).trim();
  const s = original.replace(/\s+/g, "");

  if (!/^[0-9.,]+$/.test(s)) {
    return {
      ok: false,
      codigo: "quantidade_invalida",
      motivo: `Quantidade inválida ("${original}"). Use apenas números, com vírgula ou ponto decimal.`,
    };
  }

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  let normalizado: string;

  if (temVirgula && temPonto) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // "1.000,5" -> "1000.5"
      normalizado = s.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,000.5" -> "1000.5"
      normalizado = s.replace(/,/g, "");
    }
  } else if (temVirgula) {
    const partes = s.split(",");
    if (partes.length > 2) {
      return {
        ok: false,
        codigo: "quantidade_invalida",
        motivo: `Quantidade inválida ("${original}"). Use apenas uma vírgula decimal.`,
      };
    }
    normalizado = s.replace(",", ".");
  } else if (temPonto) {
    const partes = s.split(".");
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      return {
        ok: false,
        codigo: "quantidade_ambigua",
        motivo: `Quantidade ambígua ("${original}"): ponto seguido de 3 dígitos pode ser milhar ou decimal. Use vírgula para decimal (ex.: "${partes[0]},${partes[1] ?? ""}") ou um número sem separador.`,
      };
    }
    normalizado = s;
  } else {
    normalizado = s;
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor <= 0) {
    return {
      ok: false,
      codigo: "quantidade_invalida",
      motivo: `Quantidade inválida ("${original}", interpretada como ${normalizado}). Deve ser maior que zero.`,
    };
  }

  return { ok: true, valor };
}

function parseMode(raw: FormDataEntryValue | null): ModoImportacaoComposicao {
  return raw === "replace" ? "replace" : "merge";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    const usuario = userData.user.email ?? userData.user.id;
    console.info(`${logPrefix} Usuário autenticado:`, usuario);

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

    if (raw.length > 0) {
      console.info(`${logPrefix} Colunas detectadas na planilha:`, Object.keys(raw[0]));
    }

    const nonEmptyRaw = raw.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").trim() !== "")
    );

    console.info(`${logPrefix} Linhas lidas: ${raw.length} (não-vazias: ${nonEmptyRaw.length})`);

    if (nonEmptyRaw.length === 0) {
      return NextResponse.json({ error: "A planilha está vazia." }, { status: 400 });
    }

    if (nonEmptyRaw.length > MAX_REGISTROS) {
      console.warn(`${logPrefix} Excedeu MAX_REGISTROS:`, nonEmptyRaw.length, ">", MAX_REGISTROS);
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
    const skippedDetalhado: SkippedDetalhe[] = [];
    const registros: Record<string, unknown>[] = [];
    const chavesVistas = new Map<string, { linha: number; amount: number }>();

    const pular = (
      linha: number,
      idBling: string,
      store: string,
      reference: string,
      code: string,
      motivo_codigo: MotivoCodigo,
      motivo: string
    ) => {
      skippedDetalhado.push({ linha, id_bling: idBling, store, reference, code, motivo_codigo, motivo });
    };

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
        pular(excelLine, "", store, reference, code, "id_bling_ausente", "ID Bling não informado.");
        continue;
      }

      if (!code) {
        pular(excelLine, idBling, store, reference, "", "codigo_ausente", "Código do Item não informado.");
        continue;
      }

      const quantidade = parseQuantidade(amountRaw);
      if (!quantidade.ok) {
        pular(excelLine, idBling, store, reference, code, quantidade.codigo, quantidade.motivo);
        continue;
      }

      const amount = quantidade.valor;
      const chave = `${idBling}::${code}`;
      const anterior = chavesVistas.get(chave);

      if (anterior) {
        const mesmaQuantidade = anterior.amount === amount;
        const motivo = mesmaQuantidade
          ? `Duplicado da linha ${anterior.linha} (mesmo ID Bling + Código do Item e mesma quantidade). Ignorada.`
          : `Duplicado da linha ${anterior.linha} (mesmo ID Bling + Código do Item) com quantidade diferente (${anterior.amount} na linha ${anterior.linha}, ${amount} nesta). Apenas a primeira foi processada; revise o arquivo.`;

        pular(excelLine, idBling, store, reference, code, "duplicado_arquivo", motivo);
        continue;
      }

      chavesVistas.set(chave, { linha: excelLine, amount });

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

    console.info(`${logPrefix} Registros válidos: ${registros.length}, puladas: ${skippedDetalhado.length}`);

    if (skippedDetalhado.length > 0) {
      const motivosAgrupados = skippedDetalhado.reduce<Record<string, number>>((acc, item) => {
        acc[item.motivo_codigo] = (acc[item.motivo_codigo] ?? 0) + 1;
        return acc;
      }, {});
      console.info(`${logPrefix} Puladas por motivo:`, motivosAgrupados);
    }

    if (registros.length === 0) {
      console.warn(`${logPrefix} Nenhuma linha válida após normalização.`);
      return NextResponse.json(
        {
          success: false,
          status: "erro",
          processed: 0,
          skipped: skippedDetalhado.length,
          skippedDetails: skippedDetalhado,
          errors: [],
          message:
            "Nenhuma linha válida encontrada. Verifique se as colunas ID Bling, Código do Item e Quantidade estão preenchidas corretamente.",
        },
        { status: 400 }
      );
    }

    // ---------- 4. Execução no banco ----------
    const sql = getPostgresClient();

    console.info(`${logPrefix} Iniciando transação com ${registros.length} registros (modo ${mode}).`);

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

    const errors = resultados
      .filter((r) => r.status === "erro")
      .map((r) => ({
        linha: r.linha,
        id_bling: r.id_bling,
        store: r.store,
        reference: r.reference,
        code: r.code,
        motivo: r.motivo,
      }));

    const processed = resultados.filter((r) => r.status === "ok").length;

    if (errors.length > 0) {
      const motivosErroAgrupados = errors.reduce<Record<string, number>>((acc, item) => {
        acc[item.motivo] = (acc[item.motivo] ?? 0) + 1;
        return acc;
      }, {});
      console.warn(`${logPrefix} Erros no banco por motivo:`, motivosErroAgrupados);
    }

    // sucesso: tudo processado, sem puladas e sem erros
    // parcial: algo processado, mas com puladas ou erros
    // erro: nada processado
    const status: "sucesso" | "parcial" | "erro" =
      errors.length === 0 && skippedDetalhado.length === 0
        ? "sucesso"
        : processed > 0
          ? "parcial"
          : "erro";

    console.info(`${logPrefix} Importação concluída:`, {
      usuario,
      modo: mode,
      status,
      totalLinhasArquivo: nonEmptyRaw.length,
      processadas: processed,
      puladas: skippedDetalhado.length,
      comErro: errors.length,
      duracaoMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: status === "sucesso",
      status,
      processed,
      skipped: skippedDetalhado.length,
      skippedDetails: skippedDetalhado,
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

    console.error(`${logPrefix} Erro fatal na importação (após ${Date.now() - startedAt}ms):`, {
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
