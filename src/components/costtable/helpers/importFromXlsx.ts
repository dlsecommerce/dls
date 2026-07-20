import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/createNotification";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

export type RenomeacaoCodigo = {
  codigo_antigo: string;
  codigo_novo: string;
  linha?: number;
};

export type RenomeacaoImportResult = {
  data: RenomeacaoCodigo[];
  warnings: string[];
  fileName: string;
  recalculosProcessados?: number;
};

// ✅ NOVO: inclui "Produto" como obrigatório no arquivo
const REQUIRED_COLUMNS = [
  "Código",
  "Marca",
  "Produto",
  "Custo Atual",
  "Custo Antigo",
  "NCM",
];

/**
 * Ajustes para grandes volumes (50k+)
 * - DEBUG_STRICT_COMMA_CHECK: validação bem pesada (desligada por padrão)
 * - INITIAL_BATCH_SIZE: tamanho inicial do lote (vai se adaptar pra baixo se der timeout)
 */
const DEBUG_STRICT_COMMA_CHECK = false;
const INITIAL_BATCH_SIZE = 800;
const MIN_BATCH_SIZE = 50;
const MAX_RETRIES = 6;

/**
 * Remove espaços invisíveis (NBSP) e normaliza espaços múltiplos
 */
function cleanHeaderKey(key: string) {
  return String(key)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza chaves do objeto (headers do XLSX/CSV)
 */
function normalizeRowKeys(row: Record<string, any>) {
  const out: Record<string, any> = {};

  for (const [k, v] of Object.entries(row)) {
    out[cleanHeaderKey(k)] = v;
  }

  return out;
}

// =====================================================================
// ✅ Converte qualquer formato de custo/moeda em NUMBER (ou null)
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }

  let str = String(value).trim();

  str = str.replace(/R\$/gi, "").replace(/\s/g, "");
  str = str.replace(/[^\d.,-]/g, "");

  if (!str) return null;

  if (str.includes(".") && str.includes(",")) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));

    return Number.isFinite(n)
      ? Number(n.toFixed(2))
      : null;
  }

  if (str.includes(",") && !str.includes(".")) {
    const n = Number(str.replace(",", "."));

    return Number.isFinite(n)
      ? Number(n.toFixed(2))
      : null;
  }

  if (str.includes(".") && !str.includes(",")) {
    const parts = str.split(".");
    const last = parts[parts.length - 1];

    if (/^\d{3}$/.test(last)) {
      const n = Number(str.replace(/\./g, ""));

      return Number.isFinite(n)
        ? Number(n.toFixed(2))
        : null;
    }

    const n = Number(str);

    return Number.isFinite(n)
      ? Number(n.toFixed(2))
      : null;
  }

  const n = Number(str);

  return Number.isFinite(n)
    ? Number(n.toFixed(2))
    : null;
}

// =====================================================================
// ✅ NCM como texto (só dígitos) — sua coluna no banco é TEXT
// =====================================================================
function normalizeNcm(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const digits = String(value)
    .trim()
    .replace(/\D/g, "");

  return digits || null;
}

// =====================================================================
// ✅ Produto como texto (trim) — sua coluna no banco é TEXT
// =====================================================================
function normalizeProduto(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const s = String(value).trim();

  return s || null;
}

// =====================================================================
// ✅ Marca como texto (trim)
// =====================================================================
function normalizeMarca(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const s = String(value).trim();

  return s || null;
}

// =====================================================================
// ✅ Código com validação forte
// =====================================================================
function normalizeCodigo(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const codigo = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!codigo || codigo.length < 2) {
    return null;
  }

  if (/[\u0000-\u001f\u007f]/.test(codigo)) {
    return null;
  }

  if (!/[a-zA-Z0-9À-ÿ]/.test(codigo)) {
    return null;
  }

  const lower = codigo.toLowerCase();

  if (
    lower === "null" ||
    lower === "undefined" ||
    lower === "nan"
  ) {
    return null;
  }

  return codigo;
}

// =====================================================================
// ✅ normalizeRow já devolve o PAYLOAD FINAL do banco
// =====================================================================
function normalizeRow(rowRaw: Record<string, any>) {
  const row = normalizeRowKeys(rowRaw);

  const findKey = (keys: string[]) => {
    const key = Object.keys(row).find((k) =>
      keys.some(
        (p) =>
          cleanHeaderKey(k).toLowerCase() ===
          cleanHeaderKey(p).toLowerCase()
      )
    );

    return key ? row[key] : undefined;
  };

  const codigoRaw = findKey([
    "Código",
    "codigo",
    "code",
  ]);

  const codigo = normalizeCodigo(codigoRaw);

  if (!codigo) return null;

  const marcaRaw = findKey([
    "Marca",
    "marca",
    "brand",
  ]);

  const produtoRaw = findKey([
    "Produto",
    "produto",
    "product",
  ]);

  const custoAtualRaw = findKey([
    "Custo Atual",
    "custo atual",
  ]);

  const custoAntigoRaw = findKey([
    "Custo Antigo",
    "custo antigo",
  ]);

  const ncmRaw = findKey([
    "NCM",
    "ncm",
  ]);

  const custoAtual = parseCurrency(custoAtualRaw);
  const custoAntigo = parseCurrency(custoAntigoRaw);
  const marca = normalizeMarca(marcaRaw);

  return {
    Código: codigo,
    Marca: marca,
    Produto: normalizeProduto(produtoRaw),
    "Custo Atual":
      typeof custoAtual === "number"
        ? custoAtual
        : 0,
    "Custo Antigo":
      typeof custoAntigo === "number"
        ? custoAntigo
        : 0,
    NCM: normalizeNcm(ncmRaw),
  };
}

// =====================================================================
// ✅ Validação rápida
// =====================================================================
function assertNumericOkFast(batch: any[]) {
  for (let idx = 0; idx < batch.length; idx++) {
    const r = batch[idx];

    const ca = r["Custo Atual"];
    const co = r["Custo Antigo"];

    const badNumeric =
      typeof ca !== "number" ||
      !Number.isFinite(ca) ||
      typeof co !== "number" ||
      !Number.isFinite(co);

    if (badNumeric) {
      console.error(
        "🚨 Linha com numeric inválido (índice no batch):",
        idx,
        r
      );

      throw new Error(
        "Payload inválido: 'Custo Atual'/'Custo Antigo' precisa ser number finito. Verifique o arquivo de origem."
      );
    }
  }
}

// =====================================================================
// 🧪 Validação pesada opcional
// =====================================================================
function assertNoCommaStringsStrict(batch: any[]) {
  for (let idx = 0; idx < batch.length; idx++) {
    const r = batch[idx];

    const badCommaString = Object.entries(r).find(
      ([, v]) =>
        typeof v === "string" &&
        v.includes(",")
    );

    if (badCommaString) {
      console.error(
        "🚨 String com vírgula detectada no payload (índice no batch):",
        idx,
        "campo:",
        badCommaString[0],
        "valor:",
        badCommaString[1],
        "linha:",
        r
      );

      throw new Error(
        `Payload inválido: string com vírgula detectada no campo "${badCommaString[0]}".`
      );
    }
  }
}

// =====================================================================
// ✅ Heurística para detectar timeout / 504 / statement_timeout
// =====================================================================
function isLikelyTimeout(err: any) {
  const msg = String(
    err?.message ?? ""
  ).toLowerCase();

  const code = String(
    err?.code ?? ""
  ).toLowerCase();

  const status =
    err?.status ??
    err?.statusCode ??
    err?.cause?.status;

  return (
    status === 504 ||
    msg.includes("timeout") ||
    msg.includes("time out") ||
    msg.includes("gateway") ||
    msg.includes("statement timeout") ||
    code.includes("57014")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

// =====================================================================
// 🚚 UPSERT EM LOTES
// =====================================================================
async function upsertInBatches(
  rows: any[],
  tipo: "inclusao" | "alteracao",
  options?: {
    initialBatchSize?: number;
    minBatchSize?: number;
    maxRetries?: number;
    validateNumeric?: boolean;
    strictCommaCheck?: boolean;
    pauseMsBetweenBatches?: number;
  }
) {
  let batchSize =
    options?.initialBatchSize ??
    INITIAL_BATCH_SIZE;

  const minBatchSize =
    options?.minBatchSize ??
    MIN_BATCH_SIZE;

  const maxRetries =
    options?.maxRetries ??
    MAX_RETRIES;

  const validateNumeric =
    options?.validateNumeric ??
    true;

  const strictCommaCheck =
    options?.strictCommaCheck ??
    DEBUG_STRICT_COMMA_CHECK;

  const pauseMsBetweenBatches =
    options?.pauseMsBetweenBatches ??
    10;

  const upsertArgs =
    tipo === "inclusao"
      ? {
          onConflict: "Código",
          ignoreDuplicates: true,
          returning: "minimal" as const,
        }
      : {
          onConflict: "Código",
          returning: "minimal" as const,
        };

  for (let i = 0; i < rows.length; ) {
    const batch = rows.slice(
      i,
      i + batchSize
    );

    if (validateNumeric) {
      assertNumericOkFast(batch);
    }

    if (strictCommaCheck) {
      assertNoCommaStringsStrict(batch);
    }

    let attempt = 0;

    while (true) {
      const { error } = await supabase
        .from("custos")
        .upsert(
          batch,
          upsertArgs
        );

      if (!error) {
        i += batch.length;
        break;
      }

      attempt++;

      console.error("❌ ERRO SUPABASE:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        batchSize,
        attempt,
        progress: `${i}/${rows.length}`,
      });

      if (
        isLikelyTimeout(error) &&
        batchSize > minBatchSize
      ) {
        batchSize = Math.max(
          minBatchSize,
          Math.floor(batchSize / 2)
        );

        console.warn(
          `⏳ Timeout detectado. Reduzindo batch para ${batchSize} e tentando novamente...`
        );

        await sleep(250 * attempt);

        continue;
      }

      if (attempt <= maxRetries) {
        const backoff = Math.min(
          8000,
          400 * 2 ** (attempt - 1)
        );

        await sleep(backoff);

        continue;
      }

      console.error(
        "📦 Batch (amostra):",
        batch.slice(0, 5)
      );

      console.error(
        "📦 Batch[0] (primeiro item):",
        batch[0]
      );

      throw error;
    }

    if (pauseMsBetweenBatches > 0) {
      await sleep(pauseMsBetweenBatches);
    }
  }
}

async function notifyCostImportResult(params: {
  tipo: "inclusao" | "alteracao";
  total: number;
}) {
  const { tipo, total } = params;

  if (total <= 0) return;

  await createNotification({
    title:
      tipo === "inclusao"
        ? "Importação de custos concluída"
        : "Atualização de custos concluída",

    message:
      tipo === "inclusao"
        ? `${total} custo(s) foram processados. Códigos existentes foram ignorados.`
        : `${total} custo(s) foram atualizados por código.`,

    action:
      tipo === "inclusao"
        ? "create"
        : "update",

    entityType: "cost_import",

    link: "/dashboard/custos",
  });
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao"
): Promise<ImportResult> {
  const warnings: string[] = [];

  const now = new Date();

  const fileName = `${
    tipo === "inclusao"
      ? "INCLUSÃO"
      : "ALTERAÇÃO"
  } - ${now
    .toLocaleDateString("pt-BR")
    .replace(/\//g, "-")} ${now
    .toLocaleTimeString("pt-BR")
    .replace(/:/g, "-")}.xlsx`;

  let rawRows: Record<string, any>[] = [];

  // 📁 INPUT FILE
  if (input instanceof File) {
    const buffer =
      await input.arrayBuffer();

    const workbook = XLSX.read(
      buffer,
      {
        type: "array",
        codepage: 65001,
        cellDates: true,
      }
    );

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];

    rawRows =
      XLSX.utils.sheet_to_json<
        Record<string, any>
      >(sheet, {
        defval: "",
      });
  }

  // 📦 INPUT ARRAY
  else if (Array.isArray(input)) {
    rawRows =
      input as Record<string, any>[];
  } else {
    throw new Error(
      "Formato de importação inválido."
    );
  }

  // 🔎 Validação de colunas (somente quando veio de arquivo)
  if (
    rawRows.length > 0 &&
    input instanceof File
  ) {
    const headers = Object.keys(
      normalizeRowKeys(
        rawRows[0] || {}
      )
    );

    const missing =
      REQUIRED_COLUMNS.filter(
        (col) =>
          !headers.some(
            (h) =>
              cleanHeaderKey(
                h
              ).toLowerCase() ===
              cleanHeaderKey(
                col
              ).toLowerCase()
          )
      );

    if (missing.length > 0) {
      warnings.push(
        `As seguintes colunas estão ausentes: ${missing.join(", ")}.`
      );
    }
  }

  // 🔧 NORMALIZAÇÃO
  const normalizedAll = rawRows
    .map(normalizeRow)
    .filter(Boolean) as any[];

  const totalLidas =
    rawRows.length;

  const totalValidas =
    normalizedAll.length;

  if (totalValidas < totalLidas) {
    warnings.push(
      `Foram lidas ${totalLidas} linhas do arquivo, mas apenas ${totalValidas} tinham "Código" válido (linhas sem Código ou com código inválido foram ignoradas).`
    );
  }

  // 🧹 DEDUPE POR "Código" (mantém a última ocorrência)
  const dedupeMap =
    new Map<string, any>();

  let duplicatedCount = 0;

  for (const row of normalizedAll) {
    const key = String(
      row["Código"] ?? ""
    ).trim();

    if (!key) continue;

    if (dedupeMap.has(key)) {
      duplicatedCount += 1;
    }

    dedupeMap.set(
      key,
      row
    );
  }

  const deduped =
    Array.from(
      dedupeMap.values()
    );

  if (duplicatedCount > 0) {
    warnings.push(
      `Detectei ${duplicatedCount} linhas com "Código" repetido. Mantive a última ocorrência de cada código (códigos únicos: ${deduped.length}).`
    );
  } else {
    warnings.push(
      `Códigos únicos detectados: ${deduped.length}.`
    );
  }

  // 🔍 PREVIEW
  if (previewOnly) {
    return {
      data: deduped,
      warnings,
      fileName,
    };
  }

  // ✅ IMPORTAÇÃO REAL
  await upsertInBatches(
    deduped,
    tipo,
    {
      initialBatchSize:
        INITIAL_BATCH_SIZE,

      minBatchSize:
        MIN_BATCH_SIZE,

      maxRetries:
        MAX_RETRIES,

      validateNumeric:
        true,

      strictCommaCheck:
        DEBUG_STRICT_COMMA_CHECK,

      pauseMsBetweenBatches:
        10,
    }
  );

  if (tipo === "inclusao") {
    warnings.push(
      "Inclusão concluída. Códigos existentes foram ignorados."
    );
  } else {
    warnings.push(
      "Alteração concluída. Registros atualizados por Código."
    );
  }

  await notifyCostImportResult({
    tipo,
    total: deduped.length,
  });

  return {
    data: deduped,
    warnings,
    fileName,
  };
}

// =====================================================================
// 🔄 IMPORTAÇÃO DE RENOMEAÇÃO DE CÓDIGOS
// =====================================================================
function normalizeRenameHeader(
  value: any
) {
  return cleanHeaderKey(
    String(value ?? "")
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function findRenameValue(
  row: Record<string, any>,
  aliases: string[]
) {
  const normalizedAliases =
    new Set(
      aliases.map(
        normalizeRenameHeader
      )
    );

  const key = Object.keys(
    row
  ).find((k) =>
    normalizedAliases.has(
      normalizeRenameHeader(k)
    )
  );

  return key
    ? row[key]
    : undefined;
}

function normalizeRenameRows(
  rawRows: Record<string, any>[]
) {
  const data: RenomeacaoCodigo[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const oldCodes =
    new Map<string, number>();

  const newCodes =
    new Map<
      string,
      {
        oldCode: string;
        line: number;
      }
    >();

  rawRows.forEach(
    (row, index) => {
      const line =
        Number(row?.linha) ||
        index + 2;

      const oldRaw =
        row?.codigo_antigo ??
        findRenameValue(
          row,
          [
            "Código",
            "Codigo",
            "Código Atual",
            "Codigo Atual",
            "Código Antigo",
            "Codigo Antigo",
            "codigo_antigo",
          ]
        );

      const newRaw =
        row?.codigo_novo ??
        findRenameValue(
          row,
          [
            "Novo Código",
            "Novo Codigo",
            "Código Novo",
            "Codigo Novo",
            "codigo_novo",
          ]
        );

      const oldCode =
        normalizeCodigo(
          oldRaw
        )?.toUpperCase() ??
        null;

      const newCode =
        normalizeCodigo(
          newRaw
        )?.toUpperCase() ??
        null;

      // Linhas sem Novo Código são ignoradas.
      if (!newCode) return;

      if (!oldCode) {
        errors.push(
          `Linha ${line}: a coluna "Código" está vazia ou inválida.`
        );

        return;
      }

      if (oldCode === newCode) {
        warnings.push(
          `Linha ${line}: ${oldCode} foi ignorado porque o novo código é igual ao atual.`
        );

        return;
      }

      const previousOldLine =
        oldCodes.get(oldCode);

      if (
        previousOldLine !==
        undefined
      ) {
        errors.push(
          `Código antigo duplicado: ${oldCode} nas linhas ${previousOldLine} e ${line}.`
        );

        return;
      }

      const previousNewOwner =
        newCodes.get(newCode);

      if (
        previousNewOwner &&
        previousNewOwner.oldCode !==
          oldCode
      ) {
        errors.push(
          `Código novo duplicado: ${newCode} será usado por ${previousNewOwner.oldCode} (linha ${previousNewOwner.line}) e ${oldCode} (linha ${line}).`
        );

        return;
      }

      oldCodes.set(
        oldCode,
        line
      );

      newCodes.set(
        newCode,
        {
          oldCode,
          line,
        }
      );

      data.push({
        codigo_antigo:
          oldCode,

        codigo_novo:
          newCode,

        linha:
          line,
      });
    }
  );

  if (errors.length) {
    const shown =
      errors.slice(0, 10);

    const remaining =
      errors.length -
      shown.length;

    throw new Error(
      `${shown.join("\n")}${
        remaining > 0
          ? `\n... e mais ${remaining} erro(s).`
          : ""
      }`
    );
  }

  if (!data.length) {
    throw new Error(
      'Nenhuma renomeação encontrada. Preencha a coluna "Novo Código".'
    );
  }

  return {
    data,
    warnings,
  };
}

async function readRenameFile(
  file: File
) {
  const workbook = XLSX.read(
    await file.arrayBuffer(),
    {
      type: "array",
      codepage: 65001,
      cellDates: true,
    }
  );

  const sheet =
    workbook.Sheets[
      workbook.SheetNames[0]
    ];

  if (!sheet) {
    throw new Error(
      "A planilha não possui nenhuma aba válida."
    );
  }

  const rows =
    XLSX.utils.sheet_to_json<
      Record<string, any>
    >(sheet, {
      defval: "",
      raw: false,
    });

  if (!rows.length) {
    throw new Error(
      "A planilha está vazia."
    );
  }

  const headers = Object.keys(
    rows[0] || {}
  ).map(
    normalizeRenameHeader
  );

  if (
    !headers.includes(
      normalizeRenameHeader(
        "Código"
      )
    )
  ) {
    throw new Error(
      'A planilha precisa conter a coluna "Código".'
    );
  }

  if (
    !headers.includes(
      normalizeRenameHeader(
        "Novo Código"
      )
    )
  ) {
    throw new Error(
      'A planilha precisa conter a coluna "Novo Código".'
    );
  }

  return rows;
}

async function processRenameQueue() {
  let total = 0;

  for (
    let attempt = 0;
    attempt < 1000;
    attempt++
  ) {
    const {
      data,
      error,
    } = await (
      supabase as any
    ).rpc(
      "fn_processar_fila_recalculo_marketplace",
      {
        p_limite: 500,
      }
    );

    if (error) {
      throw error;
    }

    const processed =
      Number(data ?? 0);

    if (
      !Number.isFinite(
        processed
      ) ||
      processed <= 0
    ) {
      break;
    }

    total += processed;
  }

  return total;
}

export async function importRenomeacaoCodigosFromXlsxOrCsv(
  input:
    | File
    | RenomeacaoCodigo[],
  previewOnly = false
): Promise<RenomeacaoImportResult> {
  const rawRows =
    input instanceof File
      ? await readRenameFile(
          input
        )
      : input;

  if (!Array.isArray(rawRows)) {
    throw new Error(
      "Formato de importação de renomeação inválido."
    );
  }

  const {
    data,
    warnings,
  } = normalizeRenameRows(
    rawRows as Record<
      string,
      any
    >[]
  );

  const now = new Date();

  const fileName =
    `RENOMEAÇÃO - ${now
      .toLocaleDateString(
        "pt-BR"
      )
      .replace(
        /\//g,
        "-"
      )} ${now
      .toLocaleTimeString(
        "pt-BR"
      )
      .replace(
        /:/g,
        "-"
      )}.xlsx`;

  if (previewOnly) {
    return {
      data,
      warnings,
      fileName,
    };
  }

  const payload = data.map(
    ({
      codigo_antigo,
      codigo_novo,
    }) => ({
      codigo_antigo,
      codigo_novo,
    })
  );

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (
    sessionError ||
    !sessionData.session?.access_token
  ) {
    throw new Error(
      "Sua sessão expirou. Entre novamente no sistema."
    );
  }

  const response = await fetch(
    "/api/custos/renomear-codigos",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        alteracoes: payload,
      }),
    }
  );

  const responseBody = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      responseBody?.error ??
        responseBody?.message ??
        "Não foi possível renomear os códigos."
    );
  }

  let recalculosProcessados =
    0;

  try {
    recalculosProcessados =
      await processRenameQueue();
  } catch (err: any) {
    console.error(
      "Erro ao processar fila após renomeação:",
      err
    );

    warnings.push(
      `Os códigos foram renomeados, mas a fila apresentou erro: ${
        err?.message ||
        "erro desconhecido"
      }.`
    );
  }

  try {
    await createNotification({
      title:
        "Renomeação de códigos concluída",

      message:
        `${data.length} código(s) foram processados.`,

      action:
        "update",

      entityType:
        "cost_code_rename",

      link:
        "/dashboard/custos",
    });
  } catch (err) {
    console.error(
      "Erro ao criar notificação de renomeação:",
      err
    );
  }

  return {
    data,
    warnings,
    fileName,
    recalculosProcessados,
  };
}