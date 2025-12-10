// calcPrecoVenda.ts
import { Row } from "./types";

/**
 * parseBR — mesmo parser do hook usePrecificacao
 */
export const parseBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).trim();

  if (typeof v === "number") return v;

  if (s.includes(",")) {
    if (s.match(/\.\d{3},/)) {
      return Number(s.replace(/\./g, "").replace(",", "."));
    }
    return Number(s.replace(",", "."));
  }

  if (s.includes(".") && s.split(".")[1]?.length <= 2) {
    return Number(s);
  }

  return Number(s);
};

/**
 * Calcula o preço de venda seguindo a mesma fórmula usada no hook:
 *
 * PV = (custoLiquido + frete + EMBALAGEM_FIXA) / (1 - (imposto + lucro + comissao + marketing))
 *
 * Onde:
 * custoLiquido = custo * (1 - desconto)
 */
export function calcPrecoVenda(row: Row, overrides?: Partial<Row>) {
  // Utiliza override se existir
  const get = (k: keyof Row, fallback = 0) =>
    parseBR(overrides?.[k] ?? row[k] ?? fallback);

  // ----------- valores base -----------
  const custo = get("Custo");
  const frete = get("Frete");
  const EMBALAGEM_FIXA = 2.5; // Mesmo do hook

  // ----------- percentuais -----------
  const desconto = get("Desconto") / 100;
  const imposto = get("Imposto") / 100;
  const lucro = get("Margem de Lucro") / 100;
  const comissao = get("Comissão") / 100;
  const marketing = get("Marketing") / 100;

  if (custo <= 0) return 0;

  // ----------- custo líquido -----------
  const custoLiquido = custo * (1 - desconto);

  // ----------- soma de taxas -----------
  const divisor = 1 - (imposto + lucro + comissao + marketing);

  // Proteção para divisor inválido
  if (divisor <= 0 || !isFinite(divisor)) return 0;

  // ----------- cálculo final -----------
  const preco = (custoLiquido + frete + EMBALAGEM_FIXA) / divisor;

  if (!isFinite(preco) || isNaN(preco)) return 0;

  // ✅ retorna com 2 casas decimais
  return Number(preco.toFixed(2));
}
