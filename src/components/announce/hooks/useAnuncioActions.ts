"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import {
  parseValorBR,
  inferirOD,
  lojaNomeToCodigo,
} from "@/components/announce/hooks/useAnuncioEditor";

/**
 * ✅ CONTRATO:
 * - Front/UI trabalha com produto.loja = "PK" | "SB"
 * - Ainda aceitamos "Pikot Shop" / "Sóbaquetas" (caso algum estado antigo vaze)
 * - Supabase:
 *   - tabela: anuncios_pk / anuncios_sb
 *   - coluna "Loja": "PK" | "SB"
 */

type LojaCodigo = "PK" | "SB";

function lojaAnyToCodigo(v: any): LojaCodigo | null {
  if (v === "PK" || v === "SB") return v;
  if (typeof v === "string") return (lojaNomeToCodigo(v) as LojaCodigo) ?? null;
  return null;
}

function tabelaFromCodigo(c: LojaCodigo): "anuncios_pk" | "anuncios_sb" {
  return c === "PK" ? "anuncios_pk" : "anuncios_sb";
}

export function useAnuncioActions() {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // ===========================================================
  // 💾 SALVAR ANÚNCIO (novo ou edição)
  // ===========================================================
  const handleSave = useCallback(
    async (produto: any, composicao: any[], onAfterSave?: () => void) => {
      const lojaCodigo = lojaAnyToCodigo(produto?.loja);

      if (!lojaCodigo) {
        alert('Selecione uma loja antes de salvar ("PK" ou "SB").');
        return;
      }

      setSaving(true);

      try {
        const tabela = tabelaFromCodigo(lojaCodigo);

        // =====================================================
        // 🔹 Monta composição (Código 1..10, Quantidade 1..10)
        // ✅ limpa antes para não sobrar lixo antigo quando reduzir itens
        // =====================================================
        const camposComposicao: Record<string, any> = {};
        for (let i = 1; i <= 10; i++) {
          camposComposicao[`Código ${i}`] = null;
          camposComposicao[`Quantidade ${i}`] = null;
        }

        composicao?.slice?.(0, 10)?.forEach?.((c: any, i: number) => {
          const idx = i + 1;
          const qtd = parseValorBR(c?.quantidade);
          camposComposicao[`Código ${idx}`] = c?.codigo
            ? String(c.codigo).trim()
            : null;
          camposComposicao[`Quantidade ${idx}`] = isNaN(qtd) ? null : qtd;
        });

        const od = inferirOD(produto?.referencia);

        // =====================================================
        // ✅ FIX: considerar ID vindo como "id" OU "ID"
        // (suas tabelas usam coluna "ID", então em edição pode vir como produto.ID)
        // =====================================================
        const idAtualStr = String(produto?.id ?? produto?.ID ?? "").trim();
        let novoId = idAtualStr ? Number(idAtualStr) : null;

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
          Loja: lojaCodigo, // ✅ "PK" | "SB" (coluna Loja)
          "ID Bling": produto?.id_bling || produto?.["ID Bling"] || null,
          "ID Tray": produto?.id_tray || produto?.["ID Tray"] || null,
          "ID Var": produto?.id_var || produto?.["ID Var"] || null,
          Referência: produto?.referencia || produto?.["Referência"] || null,
          Nome: produto?.nome || produto?.["Nome"] || null,
          Marca: produto?.marca || produto?.["Marca"] || null,
          Categoria: produto?.categoria || produto?.["Categoria"] || null,
          Peso: produto?.peso ?? produto?.["Peso"] ?? null,
          Altura: produto?.altura ?? produto?.["Altura"] ?? null,
          Largura: produto?.largura ?? produto?.["Largura"] ?? null,
          Comprimento: produto?.comprimento ?? produto?.["Comprimento"] ?? null,
          OD: od || produto?.["OD"] || null,
          ...camposComposicao,
        };

        // =====================================================
        // 🔹 Verifica se o ID já existe (mesma loja)
        // =====================================================
        const { data: existente, error: erroBusca } = await supabase
          .from(tabela)
          .select("ID")
          .eq("ID", String(novoId))
          .eq("Loja", lojaCodigo)
          .maybeSingle();

        if (erroBusca) throw erroBusca;

        let erroOperacao: any;
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
      const idProduto = String(produto?.id ?? produto?.ID ?? "").trim();
      const lojaCodigo = lojaAnyToCodigo(produto?.loja ?? produto?.Loja);

      if (!idProduto || !lojaCodigo) {
        alert("Produto ou loja inválida para exclusão.");
        return;
      }

      setDeleting(true);

      try {
        const tabela = tabelaFromCodigo(lojaCodigo);

        const { error } = await supabase
          .from(tabela)
          .delete()
          .eq("ID", idProduto)
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
        const grouped = selectedRows.reduce<Record<string, string[]>>(
          (acc, row) => {
            const lojaCodigo = lojaAnyToCodigo(row?.loja ?? row?.Loja);
            if (!lojaCodigo) return acc;

            const tabela = tabelaFromCodigo(lojaCodigo);
            acc[tabela] = acc[tabela] || [];
            acc[tabela].push(String(row?.id ?? row?.ID ?? "").trim());
            return acc;
          },
          {}
        );

        const promises = Object.entries(grouped).map(async ([tabela, ids]) => {
          const { error } = await supabase.from(tabela).delete().in("ID", ids);
          if (error) throw error;
        });

        await Promise.all(promises);

        if (onAfterDelete) onAfterDelete();
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
