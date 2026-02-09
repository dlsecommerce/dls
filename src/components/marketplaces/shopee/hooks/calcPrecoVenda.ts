// calcPrecoVenda.ts
import { Row } from "./types";

/**
 * parseBR — mesmo parser do hook usePrecificacao
 */
export const parseBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;

  const s = String(v).trim();

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

type AppliedRules = {
  Embalagem: number; // L (R$)
  Frete: number; // M (R$)
  "Comissão": number; // N (%)
  Imposto: number; // O (%)
  "Margem de Lucro": number; // P (%)
  Marketing: number; // Q (%)
  faixa: "ATE_79_99" | "80_A_99_99" | "100_A_199_99" | "ACIMA_200";
};

const RULES: Array<{
  faixa: AppliedRules["faixa"];
  min: number; // inclusive
  max: number | null; // inclusive (null = infinito)
  values: Omit<AppliedRules, "faixa">;
}> = [
  {
    faixa: "ATE_79_99",
    min: 0,
    max: 79.99,
    values: {
      Embalagem: 2.5,
      Frete: 4.0,
      Imposto: 12.0,
      "Comissão": 20.0,
      "Margem de Lucro": 15.0,
      Marketing: 3.0,
    },
  },
  {
    faixa: "80_A_99_99",
    min: 80.0,
    max: 99.99,
    values: {
      Embalagem: 2.5,
      Frete: 16.0,
      Imposto: 12.0,
      "Comissão": 14.0,
      "Margem de Lucro": 15.0,
      Marketing: 3.0,
    },
  },
  {
    faixa: "100_A_199_99",
    min: 100.0,
    max: 199.99,
    values: {
      Embalagem: 2.5,
      Frete: 20.0,
      Imposto: 12.0,
      "Comissão": 14.0,
      "Margem de Lucro": 15.0,
      Marketing: 3.0,
    },
  },
  {
    faixa: "ACIMA_200",
    min: 200.0,
    max: null,
    values: {
      Embalagem: 2.5,
      Frete: 26.0,
      Imposto: 12.0,
      "Comissão": 14.0,
      "Margem de Lucro": 15.0,
      Marketing: 3.0,
    },
  },
];

const round2 = (n: number) => Number(n.toFixed(2));

/**
 * Fórmula do Preço de Venda (T) conforme sua regra:
 *
 * PV = ( (S - (S*K/100)) + L + M ) + (N%*PV) + (O%*PV) + (P%*PV) + (Q%*PV)
 *
 * Rearranjando:
 * PV = (custoLiquido + embalagem + frete) / (1 - (N+O+P+Q)/100)
 */
function calcPVWithParams(
  custo: number,
  descontoPct: number,
  params: Omit<AppliedRules, "faixa">
): number {
  if (custo <= 0) return 0;

  const custoLiquido = custo * (1 - descontoPct / 100);

  const somaPct =
    (params["Comissão"] +
      params.Imposto +
      params["Margem de Lucro"] +
      params.Marketing) /
    100;

  const divisor = 1 - somaPct;
  if (divisor <= 0 || !isFinite(divisor)) return 0;

  const numerador = custoLiquido + params.Embalagem + params.Frete;
  const pv = numerador / divisor;

  if (!isFinite(pv) || isNaN(pv) || pv <= 0) return 0;
  return round2(pv);
}

function pickRulesByPV(
  custo: number,
  descontoPct: number
): { pv: number; applied: AppliedRules } {
  // testa as faixas em ordem: a primeira cujo PV calculado cair no intervalo, vence
  for (const r of RULES) {
    const pv = calcPVWithParams(custo, descontoPct, r.values);
    const okMin = pv >= r.min;
    const okMax = r.max === null ? true : pv <= r.max;
    if (pv > 0 && okMin && okMax) {
      return { pv, applied: { faixa: r.faixa, ...r.values } };
    }
  }

  // fallback: se nenhuma “encaixou” por arredondamento/limite, escolhe a que gerar maior PV (normalmente ACIMA_200)
  const candidates = RULES.map((r) => ({
    r,
    pv: calcPVWithParams(custo, descontoPct, r.values),
  })).sort((a, b) => b.pv - a.pv);

  const best = candidates[0];
  return {
    pv: best?.pv ?? 0,
    applied: {
      faixa: best?.r.faixa ?? "ACIMA_200",
      ...(best?.r.values ?? RULES[3].values),
    },
  };
}

/**
 * ✅ MANUAL (prioridade total):
 * - se houver valores (não-zerados) em Embalagem/Frete/Comissão/Imposto/Margem/Marketing,
 *   o PV é calculado usando os valores do row (ou overrides).
 * - caso todos estejam 0, cai no automático por faixa (RULES).
 *
 * OBS: se você quiser que SEMPRE use manual (mesmo com 0), remova o "hasAny"
 * e retorne direto calcPVWithParams(custo, descontoPct, manualParams).
 */
export function calcPrecoVenda(row: Row, overrides?: Partial<Row>) {
  const get = (k: keyof Row, fallback = 0) =>
    parseBR(overrides?.[k] ?? row[k] ?? fallback);

  const custo = get("Custo"); // S
  const descontoPct = get("Desconto"); // K (%)

  const manualParams: Omit<AppliedRules, "faixa"> = {
    Embalagem: get("Embalagem"),
    Frete: get("Frete"),
    "Comissão": get("Comissão"),
    Imposto: get("Imposto"),
    "Margem de Lucro": get("Margem de Lucro"),
    Marketing: get("Marketing"),
  };

  const hasAny = Object.values(manualParams).some((v) => Number(v) !== 0);

  if (hasAny) {
    return calcPVWithParams(custo, descontoPct, manualParams);
  }

  const { pv } = pickRulesByPV(custo, descontoPct);
  return pv;
}

/**
 * Versão que devolve também os valores aplicados (L/M/N/O/P/Q + faixa)
 * - Se estiver usando MANUAL, devolve os valores do próprio row (faixa = "MANUAL")
 * - Se estiver no automático (tudo 0), devolve os valores da regra aplicada
 */
export function calcPrecoVendaWithApplied(row: Row, overrides?: Partial<Row>) {
  const get = (k: keyof Row, fallback = 0) =>
    parseBR(overrides?.[k] ?? row[k] ?? fallback);

  const custo = get("Custo");
  const descontoPct = get("Desconto");

  const manualParams: Omit<AppliedRules, "faixa"> = {
    Embalagem: get("Embalagem"),
    Frete: get("Frete"),
    "Comissão": get("Comissão"),
    Imposto: get("Imposto"),
    "Margem de Lucro": get("Margem de Lucro"),
    Marketing: get("Marketing"),
  };

  const hasAny = Object.values(manualParams).some((v) => Number(v) !== 0);

  if (hasAny) {
    const pv = calcPVWithParams(custo, descontoPct, manualParams);
    return {
      pv,
      applied: {
        // "faixa" só pra informação/debug
        faixa: "ACIMA_200", // não existe "MANUAL" no tipo atual; se quiser, eu ajusto o union do tipo
        ...manualParams,
      } as AppliedRules,
      isManual: true as const,
    };
  }

  const { pv, applied } = pickRulesByPV(custo, descontoPct);
  return { pv, applied, isManual: false as const };
}
