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

function normalizeStr(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

/** ✅ ID Bling: placeholder/"" vira NULL (evita briga com UNIQUE) */
function normalizeIdBling(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const low = s.toLowerCase();
  if (
    low === "n bling" ||
    low.includes("n bling") ||
    low.includes("nº bling") ||
    low === "n/bling" ||
    low === "na" ||
    low === "n/a"
  ) {
    return null;
  }

  return s;
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

        // =========================
        // 🔹 composição (limpa 1..10)
        // =========================
        const camposComposicao: Record<string, any> = {};
        for (let i = 1; i <= 10; i++) {
          camposComposicao[`Código ${i}`] = null;
          camposComposicao[`Quantidade ${i}`] = null;
        }

        composicao?.slice?.(0, 10)?.forEach?.((c: any, i: number) => {
          const idx = i + 1;

          const codigo = normalizeStr(c?.codigo);
          const qtdNum = parseValorBR(c?.quantidade);

          camposComposicao[`Código ${idx}`] = codigo;
          camposComposicao[`Quantidade ${idx}`] = isNaN(qtdNum) ? null : qtdNum;
        });

        const od = inferirOD(produto?.referencia);

        // ✅ ID atual (edição) – pode vir como id ou ID
        const idAtualStr = String(produto?.id ?? produto?.ID ?? "").trim();

        // =====================================================
        // ✅ payload (colunas do banco)
        // =====================================================
        const payload: Record<string, any> = {
          Loja: lojaCodigo,
          "ID Bling": normalizeIdBling(produto?.id_bling ?? produto?.["ID Bling"]),
          "ID Tray": normalizeStr(produto?.id_tray ?? produto?.["ID Tray"]),
          "ID Var": normalizeStr(produto?.id_var ?? produto?.["ID Var"]),
          Referência: normalizeStr(produto?.referencia ?? produto?.["Referência"]),
          Nome: produto?.nome ?? produto?.["Nome"] ?? null,
          Marca: produto?.marca ?? produto?.["Marca"] ?? null,
          Categoria: produto?.categoria ?? produto?.["Categoria"] ?? null,
          Peso: produto?.peso ?? produto?.["Peso"] ?? null,
          Altura: produto?.altura ?? produto?.["Altura"] ?? null,
          Largura: produto?.largura ?? produto?.["Largura"] ?? null,
          Comprimento: produto?.comprimento ?? produto?.["Comprimento"] ?? null,
          OD: od || produto?.["OD"] || null,
          ...camposComposicao,
        };

        // =====================================================
        // ✅ CASO 1: EDIÇÃO -> UPDATE POR ID (SEM ON CONFLICT)
        // =====================================================
        if (idAtualStr) {
          const { error } = await supabase
            .from(tabela)
            .update(payload)
            .eq("ID", idAtualStr);

          if (error) throw error;

          if (onAfterSave) onAfterSave();
          else router.push("/dashboard/anuncios");

          return;
        }

        // =====================================================
        // ✅ CASO 2: NOVO -> GERA NOVO ID e INSERT
        // =====================================================
        const { data: maxData, error: maxError } = await supabase
          .from(tabela)
          .select("ID")
          .order("ID", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxError) throw maxError;

        const ultimoId = maxData?.ID ? Number(maxData.ID) : 0;
        const novoId = ultimoId + 1;

        const payloadNovo = {
          ...payload,
          ID: String(novoId).trim(),
        };

        const { error: insertError } = await supabase
          .from(tabela)
          .insert([payloadNovo] as any); // array é o padrão mais estável

        if (insertError) throw insertError;

        if (onAfterSave) onAfterSave();
        else router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao salvar anúncio: " + (err?.message || err));
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
          .eq("ID", idProduto);

        if (error) throw error;

        if (onAfterDelete) onAfterDelete();
        else router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao excluir anúncio: " + (err?.message || err));
      } finally {
        setDeleting(false);
      }
    },
    [router]
  );

  // ===========================================================
  // 🗑️ EXCLUIR SELECIONADOS
  // ===========================================================
  const handleDeleteSelected = useCallback(
    async (selectedRows: any[], onAfterDelete?: () => void) => {
      if (!selectedRows?.length) {
        alert("Nenhum anúncio selecionado para exclusão.");
        return;
      }

      setDeleting(true);

      try {
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
        alert("Erro ao excluir anúncios: " + (err?.message || err));
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