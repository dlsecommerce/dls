"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { parseValorBR, inferirOD } from "@/components/announce/hooks/useAnuncioEditor";

export function useAnuncioActions() {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // ===========================================================
  // 💾 SALVAR ANÚNCIO (novo ou edição)
  // ===========================================================
  const handleSave = useCallback(
    async (produto: any, composicao: any[], onAfterSave?: () => void) => {
      if (!produto?.loja) {
        alert("Selecione uma loja antes de salvar (Pikot Shop ou Sóbaquetas).");
        return;
      }

      setSaving(true);

      try {
        const tabela =
          produto.loja === "Pikot Shop"
            ? "anuncios_pk"
            : produto.loja === "Sóbaquetas"
            ? "anuncios_sb"
            : null;

        const lojaCodigo = produto.loja === "Pikot Shop" ? "PK" : "SB";

        if (!tabela) throw new Error("Loja inválida. Selecione Pikot Shop ou Sóbaquetas.");

        // =====================================================
        // 🔹 Monta composição (Código 1, Quantidade 1, etc.)
        // =====================================================
        const camposComposicao: Record<string, any> = {};
        composicao.forEach((c: any, i: number) => {
          const idx = i + 1;
          const qtd = parseValorBR(c.quantidade);
          camposComposicao[`Código ${idx}`] = c.codigo || null;
          camposComposicao[`Quantidade ${idx}`] = isNaN(qtd) ? null : qtd;
        });

        const od = inferirOD(produto.referencia);

        let novoId = produto.id ? Number(produto.id) : null;

        // =====================================================
        // 🔹 Se não há ID → novo cadastro
        // =====================================================
        if (!novoId) {
          const { data: maxData, error: maxError } = await supabase
            .from(tabela)
            .select("ID")
            .order("ID", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxError) throw maxError;

          const ultimoId = maxData?.ID ? Number(maxData.ID) : 0;
          novoId = ultimoId + 1;
        }

        const payload = {
          ID: String(novoId).trim(),
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

        // =====================================================
        // 🔹 Verifica se o ID já existe
        // =====================================================
        const { data: existente, error: erroBusca } = await supabase
          .from(tabela)
          .select("ID")
          .eq("ID", String(novoId))
          .eq("Loja", lojaCodigo)
          .maybeSingle();

        if (erroBusca) throw erroBusca;

        let erroOperacao;
        if (existente) {
          const { error } = await supabase
            .from(tabela)
            .update(payload)
            .eq("ID", String(novoId))
            .eq("Loja", lojaCodigo);
          erroOperacao = error;
        } else {
          const { error } = await supabase.from(tabela).insert(payload);
          erroOperacao = error;
        }

        if (erroOperacao) throw erroOperacao;

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
  // 🗑️ EXCLUIR UM ANÚNCIO
  // ===========================================================
  const handleDelete = useCallback(
    async (produto: any, onAfterDelete?: () => void) => {
      if (!produto?.id || !produto?.loja) {
        alert("Produto ou loja inválida para exclusão.");
        return;
      }

      setDeleting(true);

      try {
        const tabela =
          produto.loja === "Pikot Shop"
            ? "anuncios_pk"
            : produto.loja === "Sóbaquetas"
            ? "anuncios_sb"
            : null;

        const lojaCodigo = produto.loja === "Pikot Shop" ? "PK" : "SB";

        if (!tabela) throw new Error("Loja inválida para exclusão.");

        const { error } = await supabase
          .from(tabela)
          .delete()
          .eq("ID", String(produto.id).trim())
          .eq("Loja", lojaCodigo);

        if (error) throw error;

        if (onAfterDelete) onAfterDelete();
        else router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao excluir anúncio: " + (err.message || err));
      } finally {
        setDeleting(false);
      }
    },
    [router]
  );

  // ===========================================================
  // 🗑️ EXCLUIR SELECIONADOS (usado pelo modal)
  // ===========================================================
  const handleDeleteSelected = useCallback(
    async (selectedRows: any[], onAfterDelete?: () => void) => {
      if (!selectedRows?.length) {
        alert("Nenhum anúncio selecionado para exclusão.");
        return;
      }

      setDeleting(true);

      try {
        // 🔹 Agrupa por tabela para deletar em lote
        const grouped = selectedRows.reduce<Record<string, string[]>>((acc, row) => {
          const loja = (row.loja || row.Loja || "").toString().toLowerCase();
          let tabela = "";

          if (loja.includes("pikot") || loja === "pk") tabela = "anuncios_pk";
          else if (loja.includes("sobaquetas") || loja.includes("sóbaquetas") || loja === "sb")
            tabela = "anuncios_sb";
          if (!tabela) return acc;

          acc[tabela] = acc[tabela] || [];
          acc[tabela].push(String(row.id || row.ID).trim());
          return acc;
        }, {});

        const promises = Object.entries(grouped).map(async ([tabela, ids]) => {
          const { error } = await supabase.from(tabela).delete().in("ID", ids);
          if (error) throw error;
        });

        await Promise.all(promises);

        if (onAfterDelete) onAfterDelete(); // atualiza tabela e fecha modal
      } catch (err: any) {
        alert("Erro ao excluir anúncios: " + (err.message || err));
      } finally {
        setDeleting(false);
      }
    },
    []
  );

  return {
    handleSave,
    handleDelete,
    handleDeleteSelected,
    saving,
    deleting,
  };
}
