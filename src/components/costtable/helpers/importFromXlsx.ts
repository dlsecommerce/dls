import * as XLSX from "xlsx";

/**
 * Importa e normaliza dados a partir de arquivos XLSX ou CSV.
 * Retorna um array de objetos com as colunas padrão:
 * Código, Marca, Custo Atual, Custo Antigo, NCM
 */
export async function importFromXlsxOrCsv(file: File) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, {
    type: "array",
    codepage: 65001,
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  const normalized = json.map((row) => {
    const findKey = (possibleKeys: string[]) => {
      const key = Object.keys(row).find((k) =>
        possibleKeys.some(
          (p) => k.trim().toLowerCase() === p.trim().toLowerCase()
        )
      );
      return key ? row[key] : "";
    };

    return {
      ["Código"]: findKey(["Código", "codigo", "code"]),
      ["Marca"]: findKey(["Marca", "marca", "brand"]),
      ["Custo Atual"]: Number(findKey(["Custo Atual", "custo atual", "current cost"])) || 0,
      ["Custo Antigo"]: Number(findKey(["Custo Antigo", "custo antigo", "old cost"])) || 0,
      ["NCM"]: findKey(["NCM", "ncm"]),
    };
  });

  // Filtra linhas vazias (sem código)
  return normalized.filter((r) => r["Código"] && String(r["Código"]).trim() !== "");
}
