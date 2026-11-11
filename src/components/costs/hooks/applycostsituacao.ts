import type { Situacao } from "./types";

/**
 * Contrato mínimo do query builder do Supabase usado aqui.
 * Os métodos retornam o próprio builder, então o tipo genérico é preservado.
 */
type SituacaoFilterable = {
  is: (column: string, value: null) => unknown;
  eq: (column: string, value: boolean) => unknown;
  not: (column: string, operator: string, value: unknown) => unknown;
};

/**
 * Aplica o filtro de Situação numa query de `newsystem.costs`.
 *
 * Regras:
 * - Ativos:    deleted_at IS NULL AND active = true
 * - Inativos:  deleted_at IS NULL AND active = false
 * - Excluídos: deleted_at IS NOT NULL
 * - Todos:     deleted_at IS NULL (exclui excluídos, sem filtrar active)
 *
 * Deve ser aplicada na listagem, no count, na seleção em massa e na exportação,
 * com o mesmo `situacao`, para que os três respondam o mesmo conjunto de IDs.
 */
export function applyCostSituacao<Q extends SituacaoFilterable>(
  query: Q,
  situacao: Situacao
): Q {
  switch (situacao) {
    case "Ativos":
      return query
        .is("deleted_at", null)
        .eq("active", true) as Q;

    case "Inativos":
      return query
        .is("deleted_at", null)
        .eq("active", false) as Q;

    case "Excluídos":
      return query.not("deleted_at", "is", null) as Q;

    case "Todos":
    default:
      return query.is("deleted_at", null) as Q;
  }
}
