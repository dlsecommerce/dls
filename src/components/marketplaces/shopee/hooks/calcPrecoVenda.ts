// calcPrecoVenda.ts
import { Row } from "./types";

export const parseBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).trim();
  if (typeof v === "number") return v;

  if (s.includes(",")) {
    if (s.match(/\.\d{3},/)) return Number(s.replace(/\./g, "").replace(",", "."));
    return Number(s.replace(",", "."));
  }

  if (s.includes(".") && s.split(".")[1]?.length <= 2) return Number(s);

  return Number(s.replace(/\./g, ""));
};

type RegraFaixa = {
  embalagem: number;
  frete: number;
  impostoPct: number;
  comissaoPct: number;
  margemPct: number;
  marketingPct: number;
};

const regraPorPrecoVenda = (pv: number): RegraFaixa => {
  // pv aqui é o preço de venda "estimado" na iteração atual
  if (pv <= 79.99) {
    return {
      embalagem: 2.5,
      frete: 4,
      impostoPct: 12,
      comissaoPct: 20,
      margemPct: 15,
      marketingPct: 3,
    };
  }
  if (pv <= 99.99) {
    return {
      embalagem: 2.5,
      frete: 16,
      impostoPct: 12,
      comissaoPct: 14,
      margemPct: 15,
      marketingPct: 3,
    };
  }
  if (pv <= 199.99) {
    return {
      embalagem: 2.5,
      frete: 20,
      impostoPct: 12,
      comissaoPct: 14,
      margemPct: 15,
      marketingPct: 3,
    };
  }
  return {
    embalagem: 2.5,
    frete: 26,
    impostoPct: 12,
    comissaoPct: 14,
    margemPct: 15,
    marketingPct: 3,
  };
};

export function calcPrecoVenda(row: Row, overrides?: Partial<Row>) {
  const get = (k: keyof Row, fallback = 0) =>
    parseBR(overrides?.[k] ?? row[k] ?? fallback);

  const custo = get("Custo");          // S
  const descontoPct = get("Desconto"); // K (%)

  if (custo <= 0) return 0;

  const custoLiquido = custo * (1 - descontoPct / 100);

  const safeCalc = (numerador: number, divisor: number) => {
    if (divisor <= 0 || !isFinite(divisor)) return 0;
    const pv = numerador / divisor;
    if (!isFinite(pv) || isNaN(pv)) return 0;
    return pv;
  };

  // Chute inicial de PV (pode ser qualquer valor razoável)
  let pv = 100;

  // Itera até estabilizar a faixa (geralmente 2-4 vezes resolve)
  for (let i = 0; i < 8; i++) {
    const r = regraPorPrecoVenda(pv);

    // Mantém sua regra do "SE baseTeste > 500"
    const baseTeste = custoLiquido + r.embalagem + r.frete;

    let novoPv = 0;

    if (baseTeste > 500) {
      // TRUE: sem comissão, frete vira 100 (como na sua fórmula)
      const numerador = custoLiquido + r.embalagem + 100;
      const divisor = 1 - (r.impostoPct + r.margemPct + r.marketingPct) / 100;
      novoPv = safeCalc(numerador, divisor);
    } else {
      // FALSE: com comissão + frete por faixa
      const numerador = custoLiquido + r.embalagem + r.frete;
      const divisor =
        1 - (r.comissaoPct + r.impostoPct + r.margemPct + r.marketingPct) / 100;
      novoPv = safeCalc(numerador, divisor);
    }

    novoPv = Number(novoPv.toFixed(2));

    // Se mudou muito pouco, para
    if (Math.abs(novoPv - pv) < 0.01) {
      pv = novoPv;
      break;
    }

    pv = novoPv;
  }

  if (pv <= 0) return 0;
  return pv;
}
