"use client";
import { useMemo, useState } from "react";

/**
 * Hook responsável por gerenciar a composição de custos
 * e funções auxiliares de formatação numérica e cálculo total.
 */
export const useComposicao = () => {
  /**
   * Estado que armazena a lista de itens da composição.
   * Cada item possui:
   * - código
   * - quantidade
   * - custo
   */
  const [composicao, setComposicao] = useState([
    { codigo: "", quantidade: "1", custo: "" },
  ]);

  /**
   * Converte um valor digitado para formato interno numérico,
   * removendo espaços, símbolos e padronizando ponto decimal.
   */
  const toInternal = (v: string): string => {
    if (!v) return "";
    let s = v.replace(/\s+/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    s = s.replace(/[^\d.-]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts.shift()! + "." + parts.join("");
    return s;
  };

  /**
   * Formata um número para exibição em padrão brasileiro (pt-BR),
   * com duas casas decimais.
   */
  const toDisplay = (v: string): string => {
    if (!v) return "";
    const num = Number(v);
    if (!isFinite(num)) return v;
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  /**
   * Calcula o custo total somando (quantidade × custo) de cada item.
   * É atualizado automaticamente via useMemo para performance.
   */
  const custoTotal = useMemo(
    () =>
      composicao.reduce((sum, item) => {
        const q = parseFloat(toInternal(item.quantidade)) || 0;
        const c = parseFloat(toInternal(item.custo)) || 0;
        return sum + q * c;
      }, 0),
    [composicao]
  );

  return { composicao, setComposicao, toInternal, toDisplay, custoTotal };
};
