import { Anuncio } from "@/components/announce/types/Announce";

export type TableName = "anuncios_pk" | "anuncios_sb";

/**
 * 🔹 Define as colunas que podem ser ordenadas ou exibidas
 * Somente as principais (ID, Loja, ID Bling, ID Tray, Referência, Nome, Marca)
 */
export const ORDERABLE_COLUMNS: Record<string, string> = {
  ID: "ID",
  Nome: "Nome",
  Marca: "Marca",
  Categoria: "Categoria",
  Loja: "Loja",
  "ID Bling": "ID Bling",
  "ID Tray": "ID Tray",
  Referência: "Referência",
};

/**
 * 🔹 Mapeamento de tabelas para os nomes das lojas
 */
export const SHOP_LABEL: Record<TableName, string> = {
  anuncios_pk: "Pikot Shop",
  anuncios_sb: "Sóbaquetas",
};

/**
 * 🔹 Conversão numérica simples (mantém compatibilidade com hooks existentes)
 */
export const toNum = (v?: string) => {
  if (v == null || v === "") return undefined;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
