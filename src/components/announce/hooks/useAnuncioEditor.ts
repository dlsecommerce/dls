"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { useRouter, useSearchParams } from "next/navigation";

export interface Anuncio {
  id: number;
  loja: "Pikot Shop" | "Sóbaquetas";
  id_bling: string | null;
  id_tray: string | null;
  id_var: string | null;
  referencia: string | null;
  nome: string | null;
  marca: string | null;
  categoria: string | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
  [key: string]: any;
}

interface Custo {
  Código?: string;
  Codigo?: string;
  "Custo Atual"?: number | string;
  "Custo_Atual"?: number | string;
  custo?: number | string;
}

/**
 * 🔧 Hook responsável por carregar, editar e salvar anúncios conforme a loja.
 */
export function useAnuncioEditor(id?: string) {
  const [produto, setProduto] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const loja = params.get("loja") as "Pikot Shop" | "Sóbaquetas" | null;

  const { composicao, setComposicao, custoTotal, setCalculo, setAcrescimos } =
    usePrecificacao();

  // ===========================================================
  // 🔢 PARSERS
  // ===========================================================
  const parseValorBR = (v: string | number | null | undefined): number => {
    if (v === null || v === undefined || v === "") return 0;
    const s = String(v).trim();
    if (typeof v === "number") return v;
    if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
    return Number(s);
  };

  const formatValorBR = (v: number | string): string => {
    if (v === null || v === undefined || isNaN(Number(v))) return "0,00";
    return Number(v).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ===========================================================
  // 🔹 CARREGAR ANÚNCIO (busca em anuncios_all)
  // ===========================================================
  const carregarAnuncio = useCallback(async () => {
    if (!id || !loja) {
      console.warn("⚠️ Nenhum ID ou loja fornecido.");
      return;
    }

    setLoading(true);

    try {
      // 🔹 Mapeia nome da loja para código salvo no banco
      const lojaCodigo =
        loja === "Pikot Shop"
          ? "PK"
          : loja === "Sóbaquetas" || loja === "Sobaquetas"
          ? "SB"
          : null;

      if (!lojaCodigo) {
        console.warn(`⚠️ Loja inválida: ${loja}`);
        return;
      }

      const idFiltro = String(id).trim();

      // 🔹 Busca no banco principal
      const { data, error } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID", idFiltro)
        .eq("Loja", lojaCodigo)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.warn(
          `⚠️ Nenhum anúncio encontrado com ID ${idFiltro} e Loja ${lojaCodigo}`
        );
        setProduto(null);
        return;
      }

      console.log(`✅ Anúncio carregado da tabela anuncios_all:`, data);

      setProduto({
        id: data["ID"],
        loja,
        id_bling: data["ID Bling"] ?? null,
        id_tray: data["ID Tray"] ?? null,
        id_var: data["ID Var"] ?? null,
        referencia: data["Referência"] ?? null,
        nome: data["Nome"] ?? null,
        marca: data["Marca"] ?? null,
        categoria: data["Categoria"] ?? null,
        peso: parseValorBR(data["Peso"]),
        altura: parseValorBR(data["Altura"]),
        largura: parseValorBR(data["Largura"]),
        comprimento: parseValorBR(data["Comprimento"]),
      });

      // 🔹 Monta composição
      const comp: any[] = [];
      for (let i = 1; i <= 10; i++) {
        const codigo = data[`Código ${i}`];
        const quantidade = data[`Quantidade ${i}`];
        if (codigo) {
          comp.push({
            codigo: String(codigo).trim(),
            quantidade: formatValorBR(quantidade || 1),
            custo: "0,00",
          });
        }
      }

      setComposicao(comp);
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));
      setCalculo((prev) => ({ ...prev, frete: "0" }));

    } catch (err: any) {
      console.error("❌ Erro ao carregar anúncio:", err.message || err);
      setProduto(null);
    } finally {
      setLoading(false);
    }
  }, [id, loja, setComposicao, setAcrescimos, setCalculo]);

  // ===========================================================
  // 💾 SALVAR MANUAL
  // ===========================================================
  const handleSave = useCallback(async () => {
    if (!produto || !produto.loja) {
      alert("❌ Selecione a loja (Pikot Shop ou Sóbaquetas).");
      return;
    }

    setSaving(true);

    try {
      // Mapeia novamente a loja para o código salvo no banco
      const lojaCodigo =
        produto.loja === "Pikot Shop"
          ? "PK"
          : produto.loja === "Sóbaquetas"
          ? "SB"
          : null;

      if (!lojaCodigo) throw new Error("Loja inválida.");

      const idNumerico = Number(produto.id);
      const camposComposicaoDb: Record<string, any> = {};
      composicao.forEach((c, i) => {
        const idx = i + 1;
        const qtdNum = parseValorBR(c.quantidade);
        camposComposicaoDb[`Código ${idx}`] = c.codigo || null;
        camposComposicaoDb[`Quantidade ${idx}`] = isNaN(qtdNum) ? null : qtdNum;
      });

      const payloadDb = {
        "ID Bling": produto.id_bling,
        "ID Tray": produto.id_tray,
        "ID Var": produto.id_var,
        "Referência": produto.referencia,
        "Nome": produto.nome,
        "Marca": produto.marca,
        "Categoria": produto.categoria,
        "Peso": produto.peso,
        "Altura": produto.altura,
        "Largura": produto.largura,
        "Comprimento": produto.comprimento,
        ...camposComposicaoDb,
      };

      const { error } = await supabase
        .from("anuncios_all")
        .update(payloadDb)
        .eq("ID", idNumerico)
        .eq("Loja", lojaCodigo);

      if (error) throw error;

      console.log("✅ Salvamento concluído com sucesso!");
      router.refresh();
    } catch (err) {
      console.error("❌ Erro ao salvar anúncio:", err);
    } finally {
      setSaving(false);
    }
  }, [produto, composicao, router]);

  // ===========================================================
  // 💾 AUTOSAVE (debounce)
  // ===========================================================
  useEffect(() => {
    if (!produto || !produto.id || loading || saving) return;

    const timeout = setTimeout(async () => {
      try {
        const lojaCodigo =
          produto.loja === "Pikot Shop"
            ? "PK"
            : produto.loja === "Sóbaquetas"
            ? "SB"
            : null;
        if (!lojaCodigo) return;

        await supabase
          .from("anuncios_all")
          .update({
            Nome: produto.nome,
            Marca: produto.marca,
            Categoria: produto.categoria,
            Peso: produto.peso,
            Altura: produto.altura,
            Largura: produto.largura,
            Comprimento: produto.comprimento,
          })
          .eq("ID", produto.id)
          .eq("Loja", lojaCodigo);

        console.log("✅ Autosave sincronizado no Supabase");
      } catch (err) {
        console.error("❌ Erro no autosave:", err);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [produto, loading, saving]);

  // ===========================================================
  // 🗑️ EXCLUIR ANÚNCIO
  // ===========================================================
  const handleDelete = useCallback(async () => {
    if (!produto?.id) return;
    setDeleting(true);

    try {
      const lojaCodigo =
        produto.loja === "Pikot Shop"
          ? "PK"
          : produto.loja === "Sóbaquetas"
          ? "SB"
          : null;
      if (!lojaCodigo) return;

      const { error } = await supabase
        .from("anuncios_all")
        .delete()
        .eq("ID", produto.id)
        .eq("Loja", lojaCodigo);

      if (error) throw error;

      router.push("/dashboard/anuncios");
    } catch (err) {
      console.error("Erro ao excluir:", err);
    } finally {
      setDeleting(false);
    }
  }, [produto?.id, produto?.loja, router]);

  // ===========================================================
  // 🚀 EXECUÇÃO INICIAL
  // ===========================================================
  useEffect(() => {
    if (id && loja) carregarAnuncio();
  }, [id, loja, carregarAnuncio]);

  // ===========================================================
  // 🔁 RETORNO DO HOOK
  // ===========================================================
  return {
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    loading,
    saving,
    deleting,
    handleSave,
    handleDelete,
    carregarAnuncio,
  };
}
