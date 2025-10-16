import { Anuncio } from "@/components/announce/types/Announce";

export type TableName = "anuncios_pk" | "anuncios_sb";

export const ORDERABLE_COLUMNS: Record<string, keyof Anuncio> = {
  ID: "id",
  Loja: "loja",
  "ID Bling": "id_bling",
  "ID Tray": "id_tray",
  "Referência": "referencia",
  Nome: "nome",
  Marca: "marca",
};

export const SHOP_LABEL: Record<TableName, string> = {
  anuncios_pk: "Pikot Shop",
  anuncios_sb: "Sóbaquetas",
};

export const toNum = (v?: string) => {
  if (v == null || v === "") return undefined;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
