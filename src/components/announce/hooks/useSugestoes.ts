"use client";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSugestoes = () => {
  const [sugestoes, setSugestoes] = useState<{ codigo: string; custo: number }[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<number | null>(null);
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(-1);
  const listaRef = useRef<HTMLDivElement>(null);

  const buscarSugestoes = async (termo: string, idx: number) => {
    if (!termo.trim()) {
      setSugestoes([]);
      return;
    }
    const { data, error } = await supabase
      .from("custos")
      .select('"Código", "Custo Atual"')
      .ilike('"Código"', `%${termo}%`)
      .limit(5);
    if (error) {
      console.error("Erro ao buscar sugestões:", error);
      return;
    }
    setCampoAtivo(idx);
    setSugestoes(
      data?.map((d) => ({
        codigo: d["Código"],
        custo: Number(d["Custo Atual"]) || 0,
      })) || []
    );
    setIndiceSelecionado(0);
  };

  return {
    sugestoes,
    setSugestoes,
    campoAtivo,
    setCampoAtivo,
    indiceSelecionado,
    setIndiceSelecionado,
    listaRef,
    buscarSugestoes,
  };
};
