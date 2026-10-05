export type AnuncioMLRow = {
  loja: string;
  codigo: string;
  tipo: "anuncio" | "variacao";
  id_bling: number;
  item_id: string | null;
  preco: number | null;
  atualizado_em: string;
};

// ⚠️ AJUSTAR: assumi que `codigo` do produto no Bling é o código MLB,
// e que as variações têm o próprio `codigo`. Confirme se é isso.
export function mapProductToRows(p: any, loja: string): AnuncioMLRow[] {
  const now = new Date().toISOString();
  const rows: AnuncioMLRow[] = [];

  if (p?.codigo) {
    rows.push({
      loja,
      codigo: String(p.codigo),
      tipo: "anuncio",
      id_bling: Number(p.id),
      item_id: String(p.codigo),
      preco: p.preco != null ? Number(p.preco) : null,
      atualizado_em: now,
    });
  }

  for (const v of p?.variacoes ?? []) {
    if (!v?.codigo) continue;
    rows.push({
      loja,
      codigo: String(v.codigo),
      tipo: "variacao",
      id_bling: Number(v.id),
      item_id: p?.codigo ? String(p.codigo) : null,
      preco: v.preco != null ? Number(v.preco) : null,
      atualizado_em: now,
    });
  }

  return rows;
}
