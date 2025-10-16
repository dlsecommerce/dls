"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProdutoState = {
  id: string;
  id_bling: string;
  referencia: string;
  id_tray: string;
  id_var: string;
  od: string;
  nome: string;
  marca: string;
  categoria: string;
  tipo_anuncio: "simples" | "variacoes";
  peso: string;
  altura: string;
  largura: string;
  comprimento: string;
};

export type ItemComposicao = {
  codigo: string;
  quantidade: string;
  custo: string;
};

/**
 * Hook que carrega automaticamente:
 * - Informações gerais
 * - Peso e medidas
 * - Códigos, quantidades e custos
 * de um anúncio existente no Supabase.
 * Se não houver ID, inicia em branco (modo cadastro).
 */
export function useAnuncioDetalhes(id?: string | null) {
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<ProdutoState>({
    id: "",
    id_bling: "",
    referencia: "",
    id_tray: "",
    id_var: "",
    od: "",
    nome: "",
    marca: "",
    categoria: "",
    tipo_anuncio: "simples",
    peso: "",
    altura: "",
    largura: "",
    comprimento: "",
  });

  const [composicao, setComposicao] = useState<ItemComposicao[]>([
    { codigo: "", quantidade: "1", custo: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return; // novo cadastro → vazio

    const carregar = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔹 1. Buscar dados do anúncio
        const { data: anuncio, error: anuncioError } = await supabase
          .from("anuncios_all")
          .select("*")
          .eq("ID", id)
          .maybeSingle();

        if (anuncioError) throw anuncioError;
        if (!anuncio) return;

        // 🔹 2. Mapear dados gerais + medidas
        setProduto({
          id: anuncio["ID"] || "",
          id_bling: anuncio["ID Bling"] || "",
          referencia: anuncio["Referência"] || "",
          id_tray: anuncio["ID Tray"] || "",
          id_var: anuncio["ID Var"] || "",
          od: anuncio["OD"] || "",
          nome: anuncio["Nome"] || "",
          marca: anuncio["Marca"] || "",
          categoria: anuncio["Categoria"] || "",
          tipo_anuncio:
            anuncio["Tipo Anúncio"] === "variacoes"
              ? "variacoes"
              : "simples",
          peso: anuncio["Peso"]?.toString() || "",
          altura: anuncio["Altura"]?.toString() || "",
          largura: anuncio["Largura"]?.toString() || "",
          comprimento: anuncio["Comprimento"]?.toString() || "",
        });

        // 🔹 3. Extrair códigos e quantidades
        const pares: { codigo: string; quantidade: string }[] = [];
        for (let i = 1; i <= 10; i++) {
          const codigo = anuncio[`Código ${i}`];
          const quantidade = anuncio[`Quantidade ${i}`];
          if (codigo) {
            pares.push({
              codigo: String(codigo),
              quantidade: String(quantidade ?? "1"),
            });
          }
        }

        if (pares.length === 0) {
          setComposicao([{ codigo: "", quantidade: "1", custo: "" }]);
          return;
        }

        // 🔹 4. Buscar custos no Supabase
        const codigos = pares.map((p) => p.codigo);
        const { data: custos, error: custosError } = await supabase
          .from("custos")
          .select('"Código", "Custo Atual"')
          .in('"Código"', codigos);

        if (custosError) throw custosError;

        // 🔹 5. Montar composição final
        const resultado: ItemComposicao[] = pares.map((p) => {
          const custoItem = custos?.find((c) => c["Código"] === p.codigo);
          const custo = custoItem ? Number(custoItem["Custo Atual"]) : 0;
          return {
            codigo: p.codigo,
            quantidade: p.quantidade,
            custo: custo.toFixed(2),
          };
        });

        setComposicao(resultado);
      } catch (err: any) {
        console.error("Erro ao carregar dados do anúncio:", err);
        setError(err.message || "Erro ao carregar anúncio.");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [id]);

  return { produto, setProduto, composicao, setComposicao, loading, error };
}
