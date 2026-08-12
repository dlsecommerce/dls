// src/components/announce/hooks/types.ts

export type StoreName = "Pikot Shop" | "Sóbaquetas";

export interface Announce {
  id: string;
  code_id: string;
  store: StoreName;
  id_bling: string | null;
  reference: string;
  product: string | null;
  mark: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface AnnounceFilters {
  situacao: string;
  loja: string;
  codigo: string;
  produto: string;
  tipo: TipoOption;
}

export const SITUACAO_OPTIONS = ["Todos", "Ativos", "Excluídos"] as const;

export const STORE_OPTIONS = ["Todos", "Pikot Shop", "Sóbaquetas"] as const;

export const TIPO_OPTIONS = [
  "Todos",
  "Produtos",
  "Variações",
] as const;

export type TipoOption = (typeof TIPO_OPTIONS)[number];

/**
 * Mapeia a label exibida na UI (dropdown "Tipo")
 * para o valor esperado pelo hook useAnnounce (AnnounceTypeFilter).
 */
export const TIPO_TO_FILTER_VALUE: Record<TipoOption, string> = {
  Todos: "all",
  Produtos: "products",
  Variações: "variations",
};

export const DEFAULT_ANUNCIO_FILTERS: AnnounceFilters = {
  situacao: "Todos",
  loja: "Todos",
  codigo: "",
  produto: "",
  tipo: "Todos",
};
