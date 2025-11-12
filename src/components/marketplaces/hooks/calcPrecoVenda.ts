import { Row } from "./types";

// ---------- cálculo ----------
export const calcPrecoVenda = (row: Row, overrides?: Partial<Row>) => {
  const get = (k: keyof Row, fb = 0) =>
    Number((overrides && overrides[k] != null ? overrides[k] : row[k]) ?? fb);

  const custo = get("Custo");
  const frete = get("Frete");
  const embalagem = get("Embalagem");
  const comissao = get("Comissão");
  const imposto = get("Imposto");
  const marketing = get("Marketing");
  const margem = get("Margem de Lucro");

  if (!custo) return 0;
  const denom = 1 - (comissao + imposto + marketing + margem) / 100;
  if (denom <= 0) return 0;

  return (custo + frete + embalagem) / denom;
};
