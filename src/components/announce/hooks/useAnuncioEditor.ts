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
  referencia: string | null;
  id_var: string | null;
  od?: number | null;
  nome: string | null;
  marca: string | null;
  categoria: string | null;
  peso: number | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
  [key: string]: any;
}

interface CustoRow {
  Código?: string;
  Codigo?: string;
  "Custo Atual"?: number | string;
  "Custo_Atual"?: number | string;
  custo?: number | string;
}

// =========================
// helpers de número BR
// =========================
const parseValorBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;

  // ✅ Aceita "0,5", "0.5", "R$ 0,50", "1.000,25"
  const clean = String(v)
    .trim()
    .replace(/[^\d.,-]/g, "") // remove letras, espaços e símbolos (R$, etc)
    .replace(/\.(?=\d{3}(,|$))/g, "") // remove pontos de milhar
    .replace(",", "."); // troca vírgula por ponto decimal

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const formatValorBR = (v: number | string): string => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0,00";
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// =========================
// inferir OD pela referência
// =========================
const inferirOD = (referencia?: string | null): number => {
  const ref = (referencia || "").trim().toUpperCase();
  if (ref.startsWith("PAI")) return 1; // PAI -
  if (ref.startsWith("VAR")) return 2; // VAR -
  return 3; // SIMPLES
};

// =========================
// ler custos e mapear por código
// =========================
async function fetchCustosMap(codigos: string[]): Promise<Record<string, number>> {
  if (codigos.length === 0) return {};
  const { data, error } = await supabase
    .from("custos")
    .select("*")
    .in("Código", codigos);

  let rows: CustoRow[] = data || [];
  if (error || rows.length === 0) {
    const alt = await supabase.from("custos").select("*").in("Codigo", codigos);
    if (!alt.error && alt.data) rows = alt.data as any;
  }

  const map: Record<string, number> = {};
  for (const r of rows) {
    const codigo = (r.Código || r.Codigo || "").toString().trim();
    const custoRaw = r["Custo Atual"] ?? r["Custo_Atual"] ?? r.custo ?? 0;
    const custoNum = parseValorBR(custoRaw as any);
    if (codigo) map[codigo] = isNaN(custoNum) ? 0 : custoNum;
  }
  return map;
}

/**
 * 🔧 Hook responsável por carregar, editar e salvar anúncios conforme a loja.
 * Fonte: anuncios_all (filtra por ID + Loja)
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
  // 🔹 CARREGAR ANÚNCIO (anuncios_all)
  // ===========================================================
  const carregarAnuncio = useCallback(async () => {
    if (!id || !loja) {
      console.warn("⚠️ Nenhum ID ou loja fornecido.");
      return;
    }

    setLoading(true);

    try {
      const lojaCodigo =
        loja === "Pikot Shop"
          ? "Pikot Shop"
          : loja === "Sóbaquetas" || loja === "Sobaquetas"
          ? "Sóbaquetas"
          : null;

      if (!lojaCodigo) {
        console.warn(`⚠️ Loja inválida: ${loja}`);
        return;
      }

      const idFiltro = String(id).trim();
      console.log("🔍 Buscando anúncio com:", { idFiltro, lojaCodigo });

      const { data, error } = await supabase
        .from("anuncios_all")
        .select("*")
        .eq("ID", idFiltro)
        .eq("Loja", lojaCodigo)
        .limit(1);

      if (error) {
        console.error("❌ Erro Supabase:", error);
        setProduto(null);
        return;
      }
      if (!data || data.length === 0) {
        console.warn(`⚠️ Nenhum anúncio encontrado com ID ${idFiltro} e Loja ${lojaCodigo}`);
        setProduto(null);
        return;
      }

      const row = data[0];
      const odInferido = inferirOD(row["Referência"]);

      setProduto({
        id: row["ID"],
        loja,
        od: odInferido,
        id_bling: row["ID Bling"] ?? null,
        id_tray: row["ID Tray"] ?? null,
        id_var: row["ID Var"] ?? null,
        referencia: row["Referência"] ?? null,
        nome: row["Nome"] ?? null,
        marca: row["Marca"] ?? null,
        categoria: row["Categoria"] ?? null,
        peso: parseValorBR(row["Peso"]),
        altura: parseValorBR(row["Altura"]),
        largura: parseValorBR(row["Largura"]),
        comprimento: parseValorBR(row["Comprimento"]),
      });

      // Monta composição inicial (custo será preenchido via tabela de custos)
      const compTmp: Array<{ codigo: string; quantidade: string; custo: string }> = [];
      for (let i = 1; i <= 10; i++) {
        const codigo = row[`Código ${i}`];
        const quantidade = row[`Quantidade ${i}`];
        if (codigo) {
          compTmp.push({
            codigo: String(codigo).trim(),
            quantidade: formatValorBR(
              quantidade === null || quantidade === undefined || quantidade === ""
                ? 1
                : quantidade
            ),
            custo: "0,00",
          });
        }
      }

      // 🔹 Busca custos por código e calcula custo total
      const codigos = compTmp.map((c) => c.codigo);
      const custosMap = await fetchCustosMap(codigos);
      const compFinal = compTmp.map((c) => {
        const custo = custosMap[c.codigo] ?? 0;
        return { ...c, custo: formatValorBR(custo) };
      });

      setComposicao(compFinal);
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));

      const total = compFinal.reduce((sum, item) => {
        const q = parseValorBR(item.quantidade); // aceita "0,5" e "0.5"
        const cu = parseValorBR(item.custo);
        return sum + q * cu;
      }, 0);

      setCalculo((prev: any) => ({ ...prev, custo: String(total), frete: prev?.frete ?? "0" }));
      console.log("🧮 Custo total calculado:", formatValorBR(total));
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
      const lojaCodigo =
        produto.loja === "Pikot Shop"
          ? "Pikot Shop"
          : produto.loja === "Sóbaquetas"
          ? "Sóbaquetas"
          : null;

      if (!lojaCodigo) throw new Error("Loja inválida.");

      const camposComposicaoDb: Record<string, any> = {};
      composicao.forEach((c: any, i: number) => {
        const idx = i + 1;
        const qtdNum = parseValorBR(c.quantidade);
        camposComposicaoDb[`Código ${idx}`] = c.codigo || null;
        camposComposicaoDb[`Quantidade ${idx}`] = isNaN(qtdNum) ? null : qtdNum;
      });

      const odFinal = inferirOD(produto.referencia);

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
        OD: odFinal,
        ...camposComposicaoDb,
      };

      const { error } = await supabase
        .from("anuncios_all")
        .update(payloadDb)
        .eq("ID", String(produto.id).trim())
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
            ? "Pikot Shop"
            : produto.loja === "Sóbaquetas"
            ? "Sóbaquetas"
            : null;
        if (!lojaCodigo) return;

        const odFinal = inferirOD(produto.referencia);

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
            OD: odFinal,
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
          ? "Pikot Shop"
          : produto.loja === "Sóbaquetas"
          ? "Sóbaquetas"
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
