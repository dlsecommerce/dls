"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { parseValorBR, inferirOD } from "@/components/announce/hooks/useAnuncioEditor";

export function useNewListing() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ estados que faltavam para o novo cadastro
  const [produto, setProduto] = useState<any>({
    ID: "",
    Loja: "Pikot Shop",
    "ID Bling": "",
    "ID Tray": "",
    "ID Var": "",
    Referência: "",
    Nome: "",
    Marca: "",
    Categoria: "",
    Peso: "",
    Altura: "",
    Largura: "",
    Comprimento: "",
    OD: "",
  });

  const [composicao, setComposicao] = useState<any[]>([]); // ✅ inicializado
  const [custoTotal, setCustoTotal] = useState<number>(0); // ✅ inicializado

  // ===========================================================
  // 🆕 GERAR NOVO PRODUTO (sem salvar ainda)
  // ===========================================================
  const handleCreate = useCallback(async (loja: "Pikot Shop" | "Sóbaquetas") => {
    try {
      const tabela = loja === "Pikot Shop" ? "anuncios_pk" : "anuncios_sb";

      const { data: ultimo, error } = await supabase
        .from(tabela)
        .select("ID")
        .order("ID", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const ultimoId = ultimo?.ID ? parseInt(ultimo.ID) : 0;
      const novoId = ultimoId + 1;

      // Retorna apenas os dados base do produto
      const novoProduto = {
        ID: novoId,
        Loja: loja,
        "ID Bling": "",
        "ID Tray": "",
        "ID Var": "",
        Referência: "",
        Nome: "",
        Marca: "",
        Categoria: "",
        Peso: "",
        Altura: "",
        Largura: "",
        Comprimento: "",
        OD: "",
      };

      setProduto(novoProduto); // ✅ define o produto novo
      setComposicao([]); // ✅ limpa composição
      setCustoTotal(0); // ✅ zera custo total

      return novoProduto;
    } catch (err: any) {
      alert("Erro ao criar novo produto: " + (err.message || err));
      return null;
    }
  }, []);

  // ===========================================================
  // 💾 SALVAR
  // ===========================================================
  const handleSave = useCallback(
    async (produto: any, composicao: any[], onAfterSave?: () => void) => {
      try {
        setSaving(true);

        const lojaCodigo = produto.loja === "Pikot Shop" ? "PK" : "SB";
        const tabela = produto.loja === "Pikot Shop" ? "anuncios_pk" : "anuncios_sb";

        if (!tabela) {
          alert("Loja inválida.");
          return;
        }

        const camposComposicao: Record<string, any> = {};
        composicao.forEach((c: any, i: number) => {
          const idx = i + 1;
          const qtd = parseValorBR(c.quantidade);
          camposComposicao[`Código ${idx}`] = c.codigo || null;
          camposComposicao[`Quantidade ${idx}`] = isNaN(qtd) ? null : qtd;
        });

        const od = inferirOD(produto.referencia);

        const payload = {
          ID: String(produto.id || produto.ID),
          Loja: lojaCodigo,
          "ID Bling": produto.id_bling || null,
          "ID Tray": produto.id_tray || null,
          "ID Var": produto.id_var || null,
          Referência: produto.referencia || null,
          Nome: produto.nome || null,
          Marca: produto.marca || null,
          Categoria: produto.categoria || null,
          Peso: produto.peso || null,
          Altura: produto.altura || null,
          Largura: produto.largura || null,
          Comprimento: produto.comprimento || null,
          OD: od || null,
          ...camposComposicao,
        };

        const { data: existente } = await supabase
          .from(tabela)
          .select("ID")
          .eq("ID", payload.ID)
          .eq("Loja", lojaCodigo)
          .maybeSingle();

        let erroOperacao = null;

        if (existente) {
          const { error } = await supabase
            .from(tabela)
            .update(payload)
            .eq("ID", payload.ID)
            .eq("Loja", lojaCodigo);
          erroOperacao = error;
        } else {
          const { error } = await supabase.from(tabela).insert(payload);
          erroOperacao = error;
        }

        if (erroOperacao) throw erroOperacao;

        alert("✅ Anúncio salvo com sucesso!");
        if (onAfterSave) onAfterSave();
        else router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao salvar anúncio: " + (err.message || err));
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  // ===========================================================
  // 🗑️ EXCLUIR
  // ===========================================================
  const handleDelete = useCallback(
    async (produto: any) => {
      if (!produto?.ID && !produto?.id) {
        alert("Produto inválido para exclusão.");
        return;
      }

      try {
        setDeleting(true);

        const lojaCodigo = produto.loja === "Pikot Shop" ? "PK" : "SB";
        const tabela = produto.loja === "Pikot Shop" ? "anuncios_pk" : "anuncios_sb";
        const idProduto = String(produto.ID || produto.id).trim();

        const { error } = await supabase
          .from(tabela)
          .delete()
          .eq("ID", idProduto)
          .eq("Loja", lojaCodigo);

        if (error) throw error;

        alert("🗑️ Anúncio excluído com sucesso!");
        router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao excluir anúncio: " + (err.message || err));
      } finally {
        setDeleting(false);
      }
    },
    [router]
  );

  // ===========================================================
  // ✅ Retorna todos os dados necessários para ProductDetails
  // ===========================================================
  return {
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    setCustoTotal,
    handleCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    loading: false, // no novo cadastro não há carregamento inicial
    toInternal: (v: any) => v,
    toDisplay: (v: any) => v,
  };
}
