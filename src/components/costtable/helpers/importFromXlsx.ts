import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  data: any[];
  warnings: string[];
  fileName: string;
};

// =====================================================================
// ✅ FUNÇÃO UNIVERSAL PARA CONVERTER QUALQUER FORMATO DE MOEDA EM NUMBER
// =====================================================================
function parseCurrency(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  let str = String(value).trim();

  // Remove R$ e espaços
  str = str.replace(/R\$/g, "").replace(/\s/g, "");

  // Somente números
  if (/^\d+$/.test(str)) {
    return Number(str);
  }

  // Formato BR: 1.234,56
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(str)) {
    return Number(str.replace(/\./g, "").replace(",", "."));
  }

  // Formato US: 1234.56
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Number(str);
  }

  // Formato híbrido: 1,234.56
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(str)) {
    return Number(str.replace(/,/g, ""));
  }

  // Remove tudo exceto números, vírgula e ponto
  str = str.replace(/[^0-9.,]/g, "");

  // Se tiver só vírgula -> decimal BR
  if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  }

  const n = Number(str);
  if (isNaN(n)) return null;

  return Number(n.toFixed(2));
}

// =====================================================================
// 🔥 FUNÇÃO PRINCIPAL DE IMPORTAÇÃO (FILE OU DADOS JÁ PARSEADOS)
// =====================================================================
export async function importFromXlsxOrCsv(
  input: File | any[],
  previewOnly = false,
  tipo: "inclusao" | "alteracao" = "alteracao"
): Promise<ImportResult> {
  const requiredColumns = [
    "Código",
    "Marca",
    "Custo Atual",
    "Custo Antigo",
    "NCM",
  ];

  const warnings: string[] = [];

  // Nome automático do arquivo
  const now = new Date();
  const fileName = `${
    tipo === "inclusao" ? "INCLUSÃO" : "ALTERAÇÃO"
  } - ${now.toLocaleDateString()} ${now
    .toLocaleTimeString()
    .replace(/:/g, "-")}.xlsx`;

  let rows: Record<string, any>[] = [];

  // =====================================================================
  // 📁 CASO 1 — INPUT É FILE (preview ou importação direta)
  // =====================================================================
  if (input instanceof File) {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      codepage: 65001,
      cellDates: true,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
    });
  }

  // =====================================================================
  // 📦 CASO 2 — INPUT JÁ É ARRAY (confirmImport)
  // =====================================================================
  else if (Array.isArray(input)) {
    rows = input;
  }

  else {
    throw new Error("Formato de importação inválido.");
  }

  // =====================================================================
  // 🔎 Validação de colunas (somente quando vem de File)
  // =====================================================================
  if (rows.length > 0 && input instanceof File) {
    const headers = Object.keys(rows[0] || {});
    const missing = requiredColumns.filter(
      (col) =>
        !headers.some(
          (h) =>
            h.trim().toLowerCase() === col.trim().toLowerCase()
        )
    );

    if (missing.length > 0) {
      warnings.push(
        `As seguintes colunas estão ausentes: ${missing.join(", ")}.`
      );
    }
  }

  // =====================================================================
  // 🔧 Normalização das linhas
  // =====================================================================
  const normalized = rows
    .map((row) => {
      const findKey = (keys: string[]) => {
        const key = Object.keys(row).find((k) =>
          keys.some(
            (p) =>
              k.trim().toLowerCase() === p.trim().toLowerCase()
          )
        );
        return key ? row[key] : undefined;
      };

      const codigo = findKey(["Código", "codigo", "code"]);
      if (!codigo || String(codigo).trim() === "") return null;

      const custoAtualRaw = findKey(["Custo Atual", "custo atual"]);
      const custoAntigoRaw = findKey(["Custo Antigo", "custo antigo"]);

      return {
        Código: String(codigo).trim(),
        Marca: findKey(["Marca", "marca", "brand"]) || null,
        "Custo Atual": parseCurrency(custoAtualRaw),
        "Custo Antigo": parseCurrency(custoAntigoRaw),
        NCM: findKey(["NCM", "ncm"]) || null,
      };
    })
    .filter(Boolean) as any[];

  // =====================================================================
  // 🔍 PREVIEW — NÃO GRAVA NADA
  // =====================================================================
  if (previewOnly) {
    return {
      data: normalized,
      warnings,
      fileName,
    };
  }

  // =====================================================================
  // 🟩 INCLUSÃO — INSERT
  // =====================================================================
  if (tipo === "inclusao") {
    const { error } = await supabase.from("custos").insert(normalized);

    if (error) {
      if (error.code === "23505") {
        warnings.push(
          "Alguns códigos já existem e foram bloqueados."
        );
      } else {
        throw error;
      }
    }

    return {
      data: normalized,
      warnings,
      fileName,
    };
  }

  // =====================================================================
  // 🟨 ALTERAÇÃO — UPSERT + ARQUIVO DE ALTERAÇÕES
  // =====================================================================
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    newWorkbook,
    XLSX.utils.json_to_sheet(normalized),
    "Alterações"
  );
  XLSX.writeFile(newWorkbook, fileName);

  const { error } = await supabase
    .from("custos")
    .upsert(normalized, { onConflict: "Código" });

  if (error) {
    throw error;
  }

  return {
    data: normalized,
    warnings,
    fileName,
  };
}
