// src/components/announce/hooks/types.ts

// ✅ Loja agora é dinâmica — qualquer texto cadastrado em newsystem.announce.store
// é uma loja válida. Não há mais union fixa, pois novas lojas (ex: "PIKOT KIDS")
// podem ser criadas livremente via importação ou cadastro manual.
export type StoreName = string;

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

export const SITUACAO_OPTIONS = ["Todos", "Ativos", "Inativos", "Excluídos"] as const;

// ✅ Lista fixa removida. As opções de loja agora vêm do banco
// (ver fetchDistinctStores em hooks/useannounce.ts), carregadas
// dinamicamente — assim, novas lojas aparecem no filtro automaticamente,
// sem precisar alterar código.
//
// Mantido aqui apenas como fallback/opção inicial, para o dropdown
// nunca ficar vazio antes do fetch completar.
export const STORE_OPTIONS_FALLBACK = ["Todos", "Pikot Shop", "Sóbaquetas"] as const;

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
  situacao: "Ativos",
  loja: "Todos",
  codigo: "",
  produto: "",
  tipo: "Todos",
};
