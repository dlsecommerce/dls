// ---------- helpers ----------

// Formata número para padrão brasileiro SEM alterar o valor real
export const toBR = (v: any): string => {
  const n = parseBR(v); // Garantimos que SEMPRE vira número antes de formatar
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Converte qualquer formato (string ou número) em número real seguro
export const parseBR = (val: any): number => {
  if (val === null || val === undefined) return 0;

  // Se for número válido, retorna direto
  if (typeof val === "number" && isFinite(val)) return val;

  // Remove "R$ ", espaços, tabs, etc.
  let s = String(val).trim().replace(/^R\$\s?/, "");

  if (!s) return 0;

  /**
   * TRATAMENTO PROFISSIONAL:
   * - Remove pontos SOMENTE se forem separadores de milhares
   * - Mantém o último separador decimal (vírgula ou ponto)
   */

  // Se a string tem vírgula como decimal
  if (s.includes(",")) {
    // remove milhares
    s = s.replace(/\./g, "");
    // vírgula vira ponto decimal
    s = s.replace(",", ".");
  } else {
    // caso venha como 224.15 → decimal válido
    // mas se vier 22.415, tratar milhares
    const parts = s.split(".");
    if (parts.length > 2) {
      // ex: "22.415.300" → remove todos menos o último
      const last = parts.pop();
      s = parts.join("") + "." + last;
    }
  }

  const n = Number(s);

  return isFinite(n) ? n : 0;
};
