import { Anuncio } from "@/components/announce/types/Announce";
import { TableName, SHOP_LABEL, toNum } from "./constants";

export type RowShape = {
  ID: string | number;
  Loja?: string;
  "ID Bling"?: string;
  "ID Tray"?: string;
  "ID Var"?: string;
  "OD"?: string;
  "Referência"?: string;
  "Nome"?: string;
  "Marca"?: string;
  "Categoria"?: string;
  "Peso"?: string;
  "Altura"?: string;
  "Largura"?: string;
  "Comprimento"?: string;
  "Código 1"?: string; "Quantidade 1"?: string;
  "Código 2"?: string; "Quantidade 2"?: string;
  "Código 3"?: string; "Quantidade 3"?: string;
  "Código 4"?: string; "Quantidade 4"?: string;
  "Código 5"?: string; "Quantidade 5"?: string;
  "Código 6"?: string; "Quantidade 6"?: string;
  "Código 7"?: string; "Quantidade 7"?: string;
  "Código 8"?: string; "Quantidade 8"?: string;
  "Código 9"?: string; "Quantidade 9"?: string;
  "Código 10"?: string; "Quantidade 10"?: string;
};

export const mapRowToAnuncio = (row: RowShape, table: TableName): Anuncio => ({
  id: String(row.ID ?? ""),
  loja: SHOP_LABEL[table],
  id_bling: String(row["ID Bling"] ?? ""),
  id_tray: String(row["ID Tray"] ?? ""),
  id_var: row["ID Var"] ? String(row["ID Var"]) : undefined,
  od: row["OD"] ? String(row["OD"]) : undefined,
  referencia: row["Referência"] ? String(row["Referência"]) : undefined,
  nome: String(row["Nome"] ?? ""),
  marca: String(row["Marca"] ?? ""),
  categoria: row["Categoria"] ? String(row["Categoria"]) : undefined,
  peso: toNum(row["Peso"]),
  altura: toNum(row["Altura"]),
  largura: toNum(row["Largura"]),
  comprimento: toNum(row["Comprimento"]),
  codigo_1: row["Código 1"] ?? undefined,
  quantidade_1: toNum(row["Quantidade 1"]),
  codigo_2: row["Código 2"] ?? undefined,
  quantidade_2: toNum(row["Quantidade 2"]),
  codigo_3: row["Código 3"] ?? undefined,
  quantidade_3: toNum(row["Quantidade 3"]),
  codigo_4: row["Código 4"] ?? undefined,
  quantidade_4: toNum(row["Quantidade 4"]),
  codigo_5: row["Código 5"] ?? undefined,
  quantidade_5: toNum(row["Quantidade 5"]),
  codigo_6: row["Código 6"] ?? undefined,
  quantidade_6: toNum(row["Quantidade 6"]),
  codigo_7: row["Código 7"] ?? undefined,
  quantidade_7: toNum(row["Quantidade 7"]),
  codigo_8: row["Código 8"] ?? undefined,
  quantidade_8: toNum(row["Quantidade 8"]),
  codigo_9: row["Código 9"] ?? undefined,
  quantidade_9: toNum(row["Quantidade 9"]),
  codigo_10: row["Código 10"] ?? undefined,
  quantidade_10: toNum(row["Quantidade 10"]),
});
