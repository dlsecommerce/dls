import { Anuncio } from "@/components/announce/types/Announce";

export interface RowShape {
  [key: string]: any;
}

/**
 * Mapeia uma linha bruta do Supabase (colunas com letras maiúsculas e acentos)
 * para o formato padronizado do app.
 */
export function mapRowToAnuncio(row: RowShape, table: string): Anuncio {
  return {
    id: row["ID"],
    loja: row["Loja"] || (table === "anuncios_pk" ? "Pikot Shop" : "Sóbaquetas"),
    id_bling: row["ID Bling"],
    id_tray: row["ID Tray"],
    id_var: row["ID Var"],
    od: row["OD"],
    referencia: row["Referência"],
    nome: row["Nome"],
    marca: row["Marca"],
    categoria: row["Categoria"],
    peso: row["Peso"],
    altura: row["Altura"],
    largura: row["Largura"],
    comprimento: row["Comprimento"],

    codigo_1: row["Código 1"],
    quantidade_1: row["Quantidade 1"],
    codigo_2: row["Código 2"],
    quantidade_2: row["Quantidade 2"],
    codigo_3: row["Código 3"],
    quantidade_3: row["Quantidade 3"],
    codigo_4: row["Código 4"],
    quantidade_4: row["Quantidade 4"],
    codigo_5: row["Código 5"],
    quantidade_5: row["Quantidade 5"],
    codigo_6: row["Código 6"],
    quantidade_6: row["Quantidade 6"],
    codigo_7: row["Código 7"],
    quantidade_7: row["Quantidade 7"],
    codigo_8: row["Código 8"],
    quantidade_8: row["Quantidade 8"],
    codigo_9: row["Código 9"],
    quantidade_9: row["Quantidade 9"],
    codigo_10: row["Código 10"],
    quantidade_10: row["Quantidade 10"],
  };
}
