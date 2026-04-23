export function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseArrayParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => item === b[idx]);
}

export function sanitizeTerm(input: string) {
  return input.replace(/[%_]/g, "").replace(/"/g, "").trim();
}

export function parseSearchTokens(q: string) {
  return q
    .split(",")
    .map((s) => sanitizeTerm(s))
    .filter(Boolean);
}

export function escapeForOrValue(v: string) {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildOrSearchParts(tokens: string[]) {
  const orParts: string[] = [];

  for (const term of tokens) {
    if (!term) continue;

    const variants = Array.from(
      new Set([
        term,
        term.replace(/\s+/g, " "),
        term.replace(/\s+/g, "-"),
        term.replace(/\s+/g, ""),
      ])
    );

    for (const v of variants) {
      const pattern = escapeForOrValue(`%${v}%`);
      orParts.push(`Código.ilike.${pattern}`);
      orParts.push(`Marca.ilike.${pattern}`);
      orParts.push(`Produto.ilike.${pattern}`);
      orParts.push(`NCM.ilike.${pattern}`);
    }
  }

  return orParts;
}

export function formatBR(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}