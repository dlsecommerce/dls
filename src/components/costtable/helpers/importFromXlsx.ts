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

// Inclui "Produto" como obrigatório no arquivo.
const REQUIRED_COLUMNS = [
  "Código",
  "Marca",
  "Produto",
  "Custo Atual",
  "Custo Antigo",
  "NCM",
];

/**
 * Ajustes para grandes volumes.
 *
 * DEBUG_STRICT_COMMA_CHECK:
 * validação pesada, desligada por padrão.
 *
 * INITIAL_BATCH_SIZE:
 * tamanho inicial do lote, reduzido automaticamente
 * quando for detectado timeout.
 */
const DEBUG_STRICT_COMMA_CHECK = false;
const INITIAL_BATCH_SIZE = 800;
const MIN_BATCH_SIZE = 50;
const MAX_RETRIES = 6;

/**
 * Remove espaços invisíveis e normaliza espaços múltiplos.
 */
function cleanHeaderKey(key: string): string {
  return String(key)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza as chaves do objeto, correspondentes
 * aos cabeçalhos do XLSX ou CSV.
 */
function normalizeRowKeys(
  row: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    out[cleanHeaderKey(key)] = value;
  }

  return out;
}

// =====================================================================
// Converte qualquer formato de custo/moeda em number ou null.
// =====================================================================
function parseCurrency(value: any): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Number(value.toFixed(2))
      : null;
  }

  let str = String(value).trim();

  str = str
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");

  str = str.replace(/[^\d.,-]/g, "");

  if (!str) {
    return null;
  }

  /*
   * Exemplo brasileiro:
   * 1.234,56
   */
  if (
    str.includes(".") &&
    str.includes(",")
  ) {
    const numberValue = Number(
      str
        .replace(/\./g, "")
        .replace(",", ".")
    );

    return Number.isFinite(numberValue)
      ? Number(numberValue.toFixed(2))
      : null;
  }

  /*
   * Exemplo:
   * 1234,56
   */
  if (
    str.includes(",") &&
    !str.includes(".")
  ) {
    const numberValue = Number(
      str.replace(",", ".")
    );

    return Number.isFinite(numberValue)
      ? Number(numberValue.toFixed(2))
      : null;
  }

  /*
   * Pode ser:
   * 1234.56
   *
   * Ou separador de milhar:
   * 1.234
   */
  if (
    str.includes(".") &&
    !str.includes(",")
  ) {
    const parts = str.split(".");
    const lastPart =
      parts[parts.length - 1];

    if (/^\d{3}$/.test(lastPart)) {
      const numberValue = Number(
        str.replace(/\./g, "")
      );

      return Number.isFinite(numberValue)
        ? Number(numberValue.toFixed(2))
        : null;
    }

    const numberValue = Number(str);

    return Number.isFinite(numberValue)
      ? Number(numberValue.toFixed(2))
      : null;
  }

  const numberValue = Number(str);

  return Number.isFinite(numberValue)
    ? Number(numberValue.toFixed(2))
    : null;
}

// =====================================================================
// NCM como texto contendo somente dígitos.
// =====================================================================
function normalizeNcm(
  value: any
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const digits = String(value)
    .trim()
    .replace(/\D/g, "");

  return digits || null;
}

// =====================================================================
// Produto como texto.
// =====================================================================
function normalizeProduto(
  value: any
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const produto = String(value).trim();

  return produto || null;
}

// =====================================================================
// Marca como texto.
// =====================================================================
function normalizeMarca(
  value: any
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const marca = String(value).trim();

  return marca || null;
}

// =====================================================================
// Código com validação forte.
// Não troca a letra "l" pelo número "1".
// =====================================================================
function normalizeCodigo(
  value: any
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const codigo = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !codigo ||
    codigo.length < 2
  ) {
    return null;
  }

  /*
   * Impede caracteres de controle.
   */
  if (
    /[\u0000-\u001f\u007f]/.test(
      codigo
    )
  ) {
    return null;
  }

  /*
   * O código precisa ter pelo menos uma letra
   * ou um número.
   */
  if (
    !/[a-zA-Z0-9À-ÿ]/.test(
      codigo
    )
  ) {
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
// Normaliza uma linha e devolve o payload final do banco.
// =====================================================================
function normalizeRow(
  rowRaw: Record<string, any>
) {
  const row =
    normalizeRowKeys(rowRaw);

  const findKey = (
    possibleKeys: string[]
  ) => {
    const key = Object.keys(row).find(
      (currentKey) =>
        possibleKeys.some(
          (possibleKey) =>
            cleanHeaderKey(
              currentKey
            ).toLowerCase() ===
            cleanHeaderKey(
              possibleKey
            ).toLowerCase()
        )
    );

    return key
      ? row[key]
      : undefined;
  };

  const codigoRaw = findKey([
    "Código",
    "codigo",
    "code",
  ]);

  const codigo =
    normalizeCodigo(codigoRaw);

  /*
   * Linhas completamente vazias ou sem código
   * são ignoradas.
   */
  if (!codigo) {
    return null;
  }

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

  const custoAtual =
    parseCurrency(custoAtualRaw);

  const custoAntigo =
    parseCurrency(custoAntigoRaw);

  const marca =
    normalizeMarca(marcaRaw);

  /*
   * Não transforma custos vazios ou inválidos em zero,
   * evitando sobrescrever valores existentes por engano.
   */
  if (
    custoAtual === null ||
    custoAntigo === null
  ) {
    throw new Error(
      `O produto de código "${codigo}" possui "Custo Atual" ou "Custo Antigo" vazio ou inválido.`
    );
  }

  return {
    Código: codigo,
    Marca: marca,
    Produto:
      normalizeProduto(produtoRaw),
    "Custo Atual": custoAtual,
    "Custo Antigo": custoAntigo,
    NCM: normalizeNcm(ncmRaw),
  };
}

// =====================================================================
// Validação rápida dos campos numéricos.
// =====================================================================
function assertNumericOkFast(
  batch: any[]
): void {
  for (
    let index = 0;
    index < batch.length;
    index++
  ) {
    const row = batch[index];

    const custoAtual =
      row["Custo Atual"];

    const custoAntigo =
      row["Custo Antigo"];

    const invalidNumeric =
      typeof custoAtual !== "number" ||
      !Number.isFinite(custoAtual) ||
      typeof custoAntigo !== "number" ||
      !Number.isFinite(custoAntigo);

    if (invalidNumeric) {
      console.error(
        "Linha com numeric inválido no lote:",
        index,
        row
      );

      throw new Error(
        'Payload inválido: "Custo Atual" e "Custo Antigo" precisam ser números finitos. Verifique o arquivo de origem.'
      );
    }
  }
}

// =====================================================================
// Validação pesada opcional.
// =====================================================================
function assertNoCommaStringsStrict(
  batch: any[]
): void {
  for (
    let index = 0;
    index < batch.length;
    index++
  ) {
    const row = batch[index];

    const badCommaString =
      Object.entries(row).find(
        ([, value]) =>
          typeof value === "string" &&
          value.includes(",")
      );

    if (badCommaString) {
      console.error(
        "String com vírgula detectada no payload:",
        {
          index,
          field: badCommaString[0],
          value: badCommaString[1],
          row,
        }
      );

      throw new Error(
        `Payload inválido: string com vírgula detectada no campo "${badCommaString[0]}".`
      );
    }
  }
}

// =====================================================================
// Detecta timeout, gateway timeout ou statement_timeout.
// =====================================================================
function isLikelyTimeout(
  error: any
): boolean {
  const message = String(
    error?.message ?? ""
  ).toLowerCase();

  const code = String(
    error?.code ?? ""
  ).toLowerCase();

  const status =
    error?.status ??
    error?.statusCode ??
    error?.cause?.status;

  return (
    status === 504 ||
    message.includes("timeout") ||
    message.includes("time out") ||
    message.includes("gateway") ||
    message.includes(
      "statement timeout"
    ) ||
    code.includes("57014")
  );
}

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds
    );
  });
}

// =====================================================================
// UPSERT EM LOTES
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
): Promise<void> {
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

  /*
   * No Supabase JavaScript v2 não é necessário
   * informar returning: "minimal".
   */
  const upsertArgs =
    tipo === "inclusao"
      ? {
          onConflict: "Código",
          ignoreDuplicates: true,
        }
      : {
          onConflict: "Código",
        };

  for (
    let currentIndex = 0;
    currentIndex < rows.length;
  ) {
    let attempt = 0;

    while (true) {
      /*
       * O lote é recriado dentro do while.
       *
       * Assim, quando batchSize for reduzido após
       * um timeout, a próxima tentativa realmente
       * utilizará o novo tamanho.
       */
      const batch = rows.slice(
        currentIndex,
        currentIndex + batchSize
      );

      if (!batch.length) {
        break;
      }

      if (validateNumeric) {
        assertNumericOkFast(batch);
      }

      if (strictCommaCheck) {
        assertNoCommaStringsStrict(
          batch
        );
      }

      const { error } = await supabase
        .from("custos")
        .upsert(
          batch,
          upsertArgs
        );

      if (!error) {
        currentIndex += batch.length;
        break;
      }

      attempt += 1;

      console.error(
        "Erro no upsert do Supabase:",
        {
          message: error.message,
          code: (error as any).code,
          details:
            (error as any).details,
          hint:
            (error as any).hint,
          batchSize,
          attempt,
          progress:
            `${currentIndex}/${rows.length}`,
        }
      );

      /*
       * Em caso de timeout, diminui o lote
       * e recria o batch na próxima tentativa.
       */
      if (
        isLikelyTimeout(error) &&
        batchSize > minBatchSize
      ) {
        batchSize = Math.max(
          minBatchSize,
          Math.floor(
            batchSize / 2
          )
        );

        /*
         * Reinicia a contagem porque será feita
         * uma tentativa com tamanho diferente.
         */
        attempt = 0;

        console.warn(
          `Timeout detectado. Reduzindo o lote para ${batchSize} registros.`
        );

        await sleep(250);
        continue;
      }

      if (attempt <= maxRetries) {
        const backoff =
          Math.min(
            8000,
            400 *
              2 ** (attempt - 1)
          );

        await sleep(backoff);
        continue;
      }

      console.error(
        "Amostra do lote que falhou:",
        batch.slice(0, 5)
      );

      console.error(
        "Primeiro item do lote:",
        batch[0]
      );

      throw error;
    }

    if (
      pauseMsBetweenBatches > 0
    ) {
      await sleep(
        pauseMsBetweenBatches
      );
    }
  }
}

// =====================================================================
// Cria a notificação do resultado da importação.
// =====================================================================
async function notifyCostImportResult(
  params: {
    tipo:
      | "inclusao"
      | "alteracao";
    total: number;
  }
): Promise<void> {
  const {
    tipo,
    total,
  } = params;

  if (total <= 0) {
    return;
  }

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

    entityType:
      "cost_import",

    link:
      "/dashboard/custos",
  });
}

// =====================================================================
// IMPORTAÇÃO PRINCIPAL DE CUSTOS
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo:
    | "inclusao"
    | "alteracao" = "alteracao"
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

  let rawRows:
    Record<string, any>[] = [];

  // Arquivo XLSX ou CSV.
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

    const firstSheetName =
      workbook.SheetNames[0];

    const sheet =
      workbook.Sheets[
        firstSheetName
      ];

    if (!sheet) {
      throw new Error(
        "A planilha não possui nenhuma aba válida."
      );
    }

    rawRows =
      XLSX.utils.sheet_to_json<
        Record<string, any>
      >(sheet, {
        defval: "",
      });
  }

  // Array de objetos.
  else if (Array.isArray(input)) {
    rawRows =
      input as Record<
        string,
        any
      >[];
  } else {
    throw new Error(
      "Formato de importação inválido."
    );
  }

  if (!rawRows.length) {
    throw new Error(
      "Nenhum registro foi encontrado no arquivo."
    );
  }

  /*
   * Validação das colunas obrigatórias.
   *
   * A importação é interrompida em vez de transformar
   * campos ausentes em valores zero ou null.
   */
  if (input instanceof File) {
    const headers = Object.keys(
      normalizeRowKeys(
        rawRows[0] || {}
      )
    );

    const missing =
      REQUIRED_COLUMNS.filter(
        (requiredColumn) =>
          !headers.some(
            (header) =>
              cleanHeaderKey(
                header
              ).toLowerCase() ===
              cleanHeaderKey(
                requiredColumn
              ).toLowerCase()
          )
      );

    if (missing.length > 0) {
      throw new Error(
        `As seguintes colunas obrigatórias estão ausentes: ${missing.join(", ")}.`
      );
    }
  }

  /*
   * Normalização.
   *
   * Linhas sem código são ignoradas.
   * Linhas com código e custo inválido geram erro.
   */
  const normalizedAll =
    rawRows
      .map(normalizeRow)
      .filter(
        Boolean
      ) as any[];

  const totalLidas =
    rawRows.length;

  const totalValidas =
    normalizedAll.length;

  if (
    totalValidas <
    totalLidas
  ) {
    warnings.push(
      `Foram lidas ${totalLidas} linhas, mas apenas ${totalValidas} possuíam um "Código" válido. Linhas vazias ou sem código foram ignoradas.`
    );
  }

  if (!totalValidas) {
    throw new Error(
      'Nenhuma linha com "Código" válido foi encontrada.'
    );
  }

  /*
   * Remove códigos duplicados, mantendo a última
   * ocorrência encontrada na planilha.
   */
  const dedupeMap =
    new Map<string, any>();

  let duplicatedCount = 0;

  for (
    const row of normalizedAll
  ) {
    const key = String(
      row["Código"] ?? ""
    ).trim();

    if (!key) {
      continue;
    }

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

  if (
    duplicatedCount > 0
  ) {
    warnings.push(
      `Foram encontradas ${duplicatedCount} linha(s) com "Código" repetido. Foi mantida a última ocorrência de cada código. Total de códigos únicos: ${deduped.length}.`
    );
  } else {
    warnings.push(
      `Códigos únicos detectados: ${deduped.length}.`
    );
  }

  /*
   * Pré-visualização:
   * não altera o banco.
   */
  if (previewOnly) {
    return {
      data: deduped,
      warnings,
      fileName,
    };
  }

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
      "Inclusão concluída. Códigos que já existiam foram ignorados."
    );
  } else {
    warnings.push(
      "Alteração concluída. Os registros foram atualizados por Código."
    );
  }

  /*
   * Uma falha na notificação não deve transformar
   * uma importação já concluída em erro.
   */
  try {
    await notifyCostImportResult({
      tipo,
      total: deduped.length,
    });
  } catch (error) {
    console.error(
      "Erro ao criar a notificação da importação:",
      error
    );

    warnings.push(
      "Os custos foram processados, mas não foi possível criar a notificação."
    );
  }

  return {
    data: deduped,
    warnings,
    fileName,
  };
}

// =====================================================================
// IMPORTAÇÃO DE RENOMEAÇÃO DE CÓDIGOS
// =====================================================================
function normalizeRenameHeader(
  value: any
): string {
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
): any {
  const normalizedAliases =
    new Set(
      aliases.map(
        normalizeRenameHeader
      )
    );

  const key = Object.keys(
    row
  ).find((currentKey) =>
    normalizedAliases.has(
      normalizeRenameHeader(
        currentKey
      )
    )
  );

  return key
    ? row[key]
    : undefined;
}

function normalizeRenameRows(
  rawRows:
    Record<string, any>[]
): {
  data: RenomeacaoCodigo[];
  warnings: string[];
} {
  const data:
    RenomeacaoCodigo[] = [];

  const warnings:
    string[] = [];

  const errors:
    string[] = [];

  const oldCodes =
    new Map<
      string,
      number
    >();

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

      /*
       * Mantém o comportamento anterior:
       * códigos são convertidos para maiúsculos.
       *
       * Nenhuma substituição de "l" por "1"
       * é realizada.
       */
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

      /*
       * Linhas sem novo código são ignoradas.
       */
      if (!newCode) {
        return;
      }

      if (!oldCode) {
        errors.push(
          `Linha ${line}: a coluna "Código" está vazia ou inválida.`
        );

        return;
      }

      if (
        oldCode === newCode
      ) {
        warnings.push(
          `Linha ${line}: ${oldCode} foi ignorado porque o novo código é igual ao código atual.`
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
          `Código novo duplicado: ${newCode} será usado por ${previousNewOwner.oldCode}, na linha ${previousNewOwner.line}, e por ${oldCode}, na linha ${line}.`
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
      'Nenhuma renomeação foi encontrada. Preencha a coluna "Novo Código".'
    );
  }

  return {
    data,
    warnings,
  };
}

// =====================================================================
// Lê a planilha de renomeação.
// =====================================================================
async function readRenameFile(
  file: File
): Promise<
  Record<string, any>[]
> {
  const workbook = XLSX.read(
    await file.arrayBuffer(),
    {
      type: "array",
      codepage: 65001,
      cellDates: true,
    }
  );

  const firstSheetName =
    workbook.SheetNames[0];

  const sheet =
    workbook.Sheets[
      firstSheetName
    ];

  if (!sheet) {
    throw new Error(
      "A planilha não possui nenhuma aba válida."
    );
  }

  /*
   * raw: false preserva o valor exibido/formado
   * pela planilha como texto.
   */
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

  const headers =
    Object.keys(
      rows[0] || {}
    ).map(
      normalizeRenameHeader
    );

  const hasHeader = (
    aliases: string[]
  ): boolean =>
    aliases
      .map(
        normalizeRenameHeader
      )
      .some((alias) =>
        headers.includes(alias)
      );

  /*
   * Aceita diferentes nomes equivalentes
   * para a coluna de código atual.
   */
  const hasOldCodeHeader =
    hasHeader([
      "Código",
      "Codigo",
      "Código Atual",
      "Codigo Atual",
      "Código Antigo",
      "Codigo Antigo",
      "codigo_antigo",
    ]);

  /*
   * Aceita diferentes nomes equivalentes
   * para a coluna do novo código.
   */
  const hasNewCodeHeader =
    hasHeader([
      "Novo Código",
      "Novo Codigo",
      "Código Novo",
      "Codigo Novo",
      "codigo_novo",
    ]);

  if (!hasOldCodeHeader) {
    throw new Error(
      'A planilha precisa conter a coluna "Código" ou "Código Antigo".'
    );
  }

  if (!hasNewCodeHeader) {
    throw new Error(
      'A planilha precisa conter a coluna "Novo Código" ou "Código Novo".'
    );
  }

  return rows;
}

// =====================================================================
// Processa a fila de recálculo dos marketplaces.
// =====================================================================
async function processRenameQueue(): Promise<number> {
  let total = 0;

  /*
   * Limite de segurança para impedir loop infinito.
   */
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

// =====================================================================
// Importação principal de renomeação de códigos.
// =====================================================================
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

  /*
   * Pré-visualização:
   * não envia nenhuma alteração ao servidor.
   */
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

  /*
   * A rota do servidor aceita no máximo
   * 5.000 renomeações por chamada.
   */
  if (payload.length > 5000) {
    throw new Error(
      `A planilha contém ${payload.length} renomeações. O limite é de 5.000 por importação.`
    );
  }

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth
    .getSession();

  if (
    sessionError ||
    !sessionData.session
      ?.access_token
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
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${sessionData.session.access_token}`,
      },

      body: JSON.stringify({
        alteracoes: payload,
      }),
    }
  );

  const responseBody =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      responseBody?.error ??
        responseBody?.message ??
        "Não foi possível renomear os códigos."
    );
  }

  let recalculosProcessados = 0;

  /*
   * A renomeação já foi concluída nesse ponto.
   * Uma falha na fila será apresentada apenas
   * como aviso.
   */
  try {
    recalculosProcessados =
      await processRenameQueue();
  } catch (error: any) {
    console.error(
      "Erro ao processar a fila após a renomeação:",
      error
    );

    warnings.push(
      `Os códigos foram renomeados, mas a fila de recálculo apresentou erro: ${
        error?.message ||
        "erro desconhecido"
      }.`
    );
  }

  /*
   * A falha na notificação não desfaz
   * uma renomeação já concluída.
   */
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
  } catch (error) {
    console.error(
      "Erro ao criar a notificação da renomeação:",
      error
    );

    warnings.push(
      "Os códigos foram renomeados, mas não foi possível criar a notificação."
    );
  }

  return {
    data,
    warnings,
    fileName,
    recalculosProcessados,
  };
}