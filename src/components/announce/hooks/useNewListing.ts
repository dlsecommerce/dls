"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  parseValorBR,
  inferirOD,
  lojaNomeToCodigo,
} from "@/components/announce/hooks/useAnuncioEditor";

/**
 * ✅ Contrato deste hook (igual ao editor):
 * - produto.loja SEMPRE "PK" | "SB" (UI mostra PK/SB)
 * - URL (?loja=...) pode vir como "PK", "SB", "Pikot Shop", "Sóbaquetas" etc
 * - Banco:
 *   - tabela = anuncios_pk / anuncios_sb
 *   - coluna "Loja" = "PK" | "SB"
 *   - demais colunas com nomes: "ID Bling", "ID Tray", "Referência", etc.
 */

type LojaCodigo = "PK" | "SB";

function lojaAnyToCodigo(v: any): LojaCodigo | null {
  // Reaproveita o normalizador central (aceita nomes e códigos)
  if (typeof v === "string") return lojaNomeToCodigo(v);
  if (v === "PK" || v === "SB") return v;
  return null;
}

function tabelaFromCodigo(codigo: LojaCodigo): "anuncios_pk" | "anuncios_sb" {
  return codigo === "PK" ? "anuncios_pk" : "anuncios_sb";
}

export function useNewListing(lojaInicial?: LojaCodigo) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const idParam = searchParams.get("id");
  const lojaParam = searchParams.get("loja");

  // ✅ decide loja inicial:
  // 1) parâmetro lojaInicial (vindo do ProductDetails)
  // 2) querystring (?loja=...)
  // 3) fallback "PK"
  const lojaCodigoInicial = useMemo<LojaCodigo>(() => {
    return lojaInicial ?? lojaNomeToCodigo(lojaParam) ?? "PK";
  }, [lojaInicial, lojaParam]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===========================================================
  // 🧠 Estado principal (contrato do front)
  // ===========================================================
  const [produto, setProduto] = useState<any>({
    id: "",
    loja: lojaCodigoInicial, // ✅ "PK" | "SB"
    id_bling: "",
    id_tray: "",
    id_var: "",
    referencia: "",
    nome: "",
    marca: "",
    categoria: "",
    peso: "",
    altura: "",
    largura: "",
    comprimento: "",
    od: "",
  });

  const [composicao, setComposicao] = useState<any[]>([]);
  const [custoTotal, setCustoTotal] = useState<number>(0);

  // ===========================================================
  // 💰 Atualiza custo total automaticamente
  // ===========================================================
  useEffect(() => {
    const total = composicao.reduce((acc, item) => {
      const qtd = parseValorBR(item.quantidade);
      const custo = Number(item.custo) || 0;
      return acc + qtd * custo;
    }, 0);
    setCustoTotal(total);
  }, [composicao]);

  // ===========================================================
  // 🔁 Se URL/prop mudar a loja, mantém produto.loja consistente
  // ===========================================================
  useEffect(() => {
    setProduto((p: any) => ({
      ...p,
      loja: lojaCodigoInicial,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaCodigoInicial]);

  // ===========================================================
  // 🆕 Criar novo produto (gera próximo ID na tabela certa)
  // Aceita "PK"/"SB" e também nomes ("Pikot Shop"/"Sóbaquetas")
  // ===========================================================
  const handleCreate = useCallback(async (loja: any) => {
    try {
      const codigo = lojaAnyToCodigo(loja) ?? "PK";
      const tabela = tabelaFromCodigo(codigo);

      const { data: ultimo, error } = await supabase
        .from(tabela)
        .select("ID")
        .order("ID", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const ultimoId = ultimo?.ID ? parseInt(String(ultimo.ID), 10) : 0;
      const novoId = ultimoId + 1;

      const novoProduto = {
        id: novoId,
        loja: codigo,
        id_bling: "",
        id_tray: "",
        id_var: "",
        referencia: "",
        nome: "",
        marca: "",
        categoria: "",
        peso: "",
        altura: "",
        largura: "",
        comprimento: "",
        od: "",
      };

      setProduto(novoProduto);
      setComposicao([]);
      setCustoTotal(0);

      return novoProduto;
    } catch (err: any) {
      alert("Erro ao criar novo produto: " + (err.message || err));
      return null;
    }
  }, []);

  // ===========================================================
  // 💾 Salvar produto
  // ✅ Agora aceita produto.loja vindo como:
  // - "PK"/"SB" (UI)
  // - "Pikot Shop"/"Sóbaquetas" (caso algum estado antigo vaze)
  // e sempre salva com coluna Loja = "PK"/"SB"
  // ===========================================================
  const handleSave = useCallback(
    async (produto: any, composicao: any[], onAfterSave?: () => void) => {
      try {
        setSaving(true);

        const lojaCodigo = lojaAnyToCodigo(produto?.loja);
        if (!lojaCodigo) {
          alert('Loja inválida. Selecione "PK" ou "SB".');
          return;
        }

        const tabela = tabelaFromCodigo(lojaCodigo);

        const camposComposicao: Record<string, any> = {};
        // limpa todos campos até 10 para evitar "sobras" antigas
        for (let i = 1; i <= 10; i++) {
          camposComposicao[`Código ${i}`] = null;
          camposComposicao[`Quantidade ${i}`] = null;
        }

        composicao.slice(0, 10).forEach((c: any, i: number) => {
          const idx = i + 1;
          const qtd = parseValorBR(c.quantidade);
          camposComposicao[`Código ${idx}`] = c.codigo ? String(c.codigo).trim() : null;
          camposComposicao[`Quantidade ${idx}`] = isNaN(qtd) ? null : qtd;
        });

        const od = inferirOD(produto?.referencia);

        const payload = {
          ID: String(produto?.id ?? produto?.ID ?? "").trim(),
          Loja: lojaCodigo, // ✅ "PK" | "SB"
          "ID Bling": produto?.id_bling || null,
          "ID Tray": produto?.id_tray || null,
          "ID Var": produto?.id_var || null,
          Referência: produto?.referencia || null,
          Nome: produto?.nome || null,
          Marca: produto?.marca || null,
          Categoria: produto?.categoria || null,
          Peso: produto?.peso ?? null,
          Altura: produto?.altura ?? null,
          Largura: produto?.largura ?? null,
          Comprimento: produto?.comprimento ?? null,
          OD: od || null,
          ...camposComposicao,
        };

        if (!payload.ID) {
          alert("ID inválido para salvar.");
          return;
        }

        const { data: existente, error: errSel } = await supabase
          .from(tabela)
          .select("ID")
          .eq("ID", payload.ID)
          .eq("Loja", lojaCodigo)
          .maybeSingle();

        if (errSel) throw errSel;

        let erroOperacao: any = null;

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
  // 🗑️ Excluir produto
  // ===========================================================
  const handleDelete = useCallback(
    async (produto: any) => {
      const idProduto = String(produto?.id ?? produto?.ID ?? "").trim();
      if (!idProduto) {
        alert("Produto inválido para exclusão.");
        return;
      }

      try {
        setDeleting(true);

        const lojaCodigo = lojaAnyToCodigo(produto?.loja);
        if (!lojaCodigo) {
          alert('Loja inválida. Selecione "PK" ou "SB".');
          return;
        }

        const tabela = tabelaFromCodigo(lojaCodigo);

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
  // 🧭 Carrega produto existente (se vier id na URL)
  // ===========================================================
  useEffect(() => {
    const fetchProduto = async () => {
      if (!idParam) return;

      const lojaCodigo = lojaNomeToCodigo(lojaParam) ?? lojaCodigoInicial;
      const tabela = tabelaFromCodigo(lojaCodigo);

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from(tabela)
          .select("*")
          .eq("ID", String(idParam).trim())
          .eq("Loja", lojaCodigo)
          .maybeSingle();

        if (error) throw error;

        if (!data) return;

        // Mapeia row do Supabase -> contrato do front
        setProduto({
          id: data["ID"],
          loja: lojaCodigo,
          id_bling: data["ID Bling"] ?? "",
          id_tray: data["ID Tray"] ?? "",
          id_var: data["ID Var"] ?? "",
          referencia: data["Referência"] ?? "",
          nome: data["Nome"] ?? "",
          marca: data["Marca"] ?? "",
          categoria: data["Categoria"] ?? "",
          peso: data["Peso"] ?? "",
          altura: data["Altura"] ?? "",
          largura: data["Largura"] ?? "",
          comprimento: data["Comprimento"] ?? "",
          od: data["OD"] ?? inferirOD(data["Referência"]),
        });

        // monta composição a partir de Código/Quantidade 1..10
        const comp: any[] = [];
        for (let i = 1; i <= 10; i++) {
          const codigo = data[`Código ${i}`];
          const quantidade = data[`Quantidade ${i}`];
          if (codigo) {
            comp.push({
              codigo: String(codigo).trim(),
              quantidade: quantidade == null ? "1" : String(quantidade).replace(".", ","),
              custo: 0,
            });
          }
        }
        setComposicao(comp);
      } catch (err: any) {
        alert("Erro ao carregar anúncio: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchProduto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam, lojaParam]);

  // ===========================================================
  // ✅ Retorno completo (compatível com ProductDetails)
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
    loading,
    toInternal: (v: any) => v,
    toDisplay: (v: any) => v,
  };
}
