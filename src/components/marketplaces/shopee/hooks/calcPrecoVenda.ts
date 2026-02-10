// calcPrecoVenda.ts
import { Row } from "./types";

/**
 * ✅ parseBR — robusto (não retorna NaN)
 * - remove símbolos (R$, %, espaços, etc.)
 * - entende 1.234,56 e 10,5
 * - entende 10.50 (decimal)
 * - entende 1.234 (milhar)
 */
export const parseBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();

  // remove tudo que não seja dígito, separador decimal/milhar, sinal
  const s = s0.replace(/[^\d.,-]/g, "");
  if (!s) return 0;

  let out: number;

  if (s.includes(",")) {
    // 1.234,56
    if (/\.\d{3},/.test(s)) out = Number(s.replace(/\./g, "").replace(",", "."));
    else out = Number(s.replace(",", "."));
  } else if (s.includes(".") && s.split(".")[1]?.length <= 2) {
    out = Number(s);
  } else {
    out = Number(s.replace(/\./g, ""));
  }

  return Number.isFinite(out) ? out : 0;
};

/**
 * ✅ parseBRNullable
 * - vazio => null (volta pro automático)
 * - number => number
 * - string numérica => number
 */
export const parseBRNullable = (
  v: string | number | null | undefined
): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = parseBR(v);
  return Number.isFinite(n) ? n : null;
};

type AppliedRules = {
  Embalagem: number; // R$
  Frete: number; // R$
  "Comissão": number; // %
  Imposto: number; // %
  "Margem de Lucro": number; // %
  Marketing: number; // %
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
  if (divisor <= 0 || !Number.isFinite(divisor)) return 0;

  const numerador = custoLiquido + params.Embalagem + params.Frete;
  const pv = numerador / divisor;

  if (!Number.isFinite(pv) || pv <= 0) return 0;
  return round2(pv);
}

function pickRulesByPV(
  custo: number,
  descontoPct: number
): { pv: number; applied: AppliedRules } {
  for (const r of RULES) {
    const pv = calcPVWithParams(custo, descontoPct, r.values);
    const okMin = pv >= r.min;
    const okMax = r.max === null ? true : pv <= r.max;
    if (pv > 0 && okMin && okMax) {
      return { pv, applied: { faixa: r.faixa, ...r.values } };
    }
  }

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
 * ✅ Resolve cada campo:
 * - se manual (não-null) usa manual
 * - se null => usa regra (applied)
 */
function resolveParams(
  applied: AppliedRules,
  manual: Partial<Omit<AppliedRules, "faixa">>
): Omit<AppliedRules, "faixa"> {
  return {
    Embalagem: manual.Embalagem ?? applied.Embalagem,
    Frete: manual.Frete ?? applied.Frete,
    "Comissão": manual["Comissão"] ?? applied["Comissão"],
    Imposto: manual.Imposto ?? applied.Imposto,
    "Margem de Lucro": manual["Margem de Lucro"] ?? applied["Margem de Lucro"],
    Marketing: manual.Marketing ?? applied.Marketing,
  };
}

/**
 * ✅ PV simples (mantido pra compat)
 */
export function calcPrecoVenda(row: Row, overrides?: Partial<Row>) {
  const { pv } = calcPrecoVendaWithApplied(row, overrides);
  return pv;
}

/**
 * ✅ Função principal pro seu caso:
 * - regra é padrão (campos null usam RULES)
 * - campos com número são manuais
 * - retorna PV + params resolvidos + applied (da regra)
 */
export function calcPrecoVendaWithApplied(row: Row, overrides?: Partial<Row>) {
  const getN = (k: keyof Row) => parseBR(overrides?.[k] ?? row[k] ?? 0);
  const getNullable = (k: keyof Row) =>
    parseBRNullable(overrides?.[k] ?? row[k]);

  const custo = getN("Custo");
  const descontoPct = getN("Desconto");

  // 1) pega a regra (faixa) base
  const { applied } = pickRulesByPV(custo, descontoPct);

  // 2) lê manuais (null = automático)
  const manual: Partial<Omit<AppliedRules, "faixa">> = {
    Embalagem: getNullable("Embalagem") ?? undefined,
    Frete: getNullable("Frete") ?? undefined,
    "Comissão": getNullable("Comissão") ?? undefined,
    Imposto: getNullable("Imposto") ?? undefined,
    "Margem de Lucro": getNullable("Margem de Lucro") ?? undefined,
    Marketing: getNullable("Marketing") ?? undefined,
  };

  // 3) resolve (manual ou regra)
  const resolved = resolveParams(applied, manual);

  // 4) calcula PV com resolved
  const pv = calcPVWithParams(custo, descontoPct, resolved);

  // 5) se tem qualquer manual, marcamos
  const isManual = Object.values(manual).some((v) => v !== undefined);

  return {
    pv,
    applied, // regra base escolhida
    resolved, // params efetivos usados no cálculo
    isManual: isManual as boolean,
  };
}
