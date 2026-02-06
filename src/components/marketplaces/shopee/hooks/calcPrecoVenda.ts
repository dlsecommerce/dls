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
    // 1.234,56
    if (s.match(/\.\d{3},/)) {
      return Number(s.replace(/\./g, "").replace(",", "."));
    }
    // 10,5
    return Number(s.replace(",", "."));
  }

  // 10.50
  if (s.includes(".") && s.split(".")[1]?.length <= 2) {
    return Number(s);
  }

  // 1234 or 1.234 (tratando como milhar)
  return Number(s.replace(/\./g, ""));
};

/**
 * Calcula o preço de venda (IGUAL À SUA FÓRMULA DO EXCEL):
 *
 * SE(
 *  (S - (S*K/100) + L + M) > 500;
 *  (S - (S*K/100) + L + 100) / (1 - (O+P+Q)/100);
 *  (S - (S*K/100) + L + M)   / (1 - (N+O+P+Q)/100)
 * )
 */
export function calcPrecoVenda(row: Row, overrides?: Partial<Row>) {
  const get = (k: keyof Row, fallback = 0) =>
    parseBR(overrides?.[k] ?? row[k] ?? fallback);

  // ----------- valores base -----------
  const custo = get("Custo");                 // S
  const descontoPct = get("Desconto");        // K (%)
  const embalagem = get("Embalagem", 2.5);    // L (R$)
  const frete = get("Frete");                 // M (R$)

  // ----------- percentuais (em %) -----------
  const comissaoPct = get("Comissão");        // N (%)
  const impostoPct = get("Imposto");          // O (%)
  const lucroPct = get("Margem de Lucro");    // P (%)
  const marketingPct = get("Marketing");      // Q (%)

  if (custo <= 0) return 0;

  // custo líquido: S * (1 - K/100)
  const custoLiquido = custo * (1 - descontoPct / 100);

  // teste do SE: (S*(1-K/100) + L + M) > 500
  const baseTeste = custoLiquido + embalagem + frete;

  // helper divisor
  const safeCalc = (numerador: number, divisor: number) => {
    if (divisor <= 0 || !isFinite(divisor)) return 0;
    const pv = numerador / divisor;
    if (!isFinite(pv) || isNaN(pv)) return 0;
    return pv;
  };

  let pv = 0;

  if (baseTeste > 500) {
    // TRUE:
    // numerador = custoLiquido + embalagem + 100
    // divisor   = 1 - (O+P+Q)/100   (sem comissão)
    const numerador = custoLiquido + embalagem + 100;
    const divisor = 1 - (impostoPct + lucroPct + marketingPct) / 100;
    pv = safeCalc(numerador, divisor);
  } else {
    // FALSE:
    // numerador = custoLiquido + embalagem + frete
    // divisor   = 1 - (N+O+P+Q)/100
    const numerador = custoLiquido + embalagem + frete;
    const divisor =
      1 - (comissaoPct + impostoPct + lucroPct + marketingPct) / 100;
    pv = safeCalc(numerador, divisor);
  }

  if (pv <= 0) return 0;
  return Number(pv.toFixed(2));
}
