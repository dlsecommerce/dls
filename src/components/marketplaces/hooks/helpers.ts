// ---------- helpers ----------

export const toBR = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const parseBR = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};
