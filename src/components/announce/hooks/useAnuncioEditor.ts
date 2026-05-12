"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { useSearchParams } from "next/navigation";

export interface Anuncio {
  /**
   * ✅ ID do anúncio no banco (coluna "ID").
   * Mantemos como string para evitar NaN / inconsistências (IDs às vezes vêm como texto).
   */
  id: string;

  /**
   * ✅ CONTRATO DO FRONT:
   * - UI e estado React trabalham com "PK" | "SB"
   */
  loja: "PK" | "SB";

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

  /**
   * ✅ NOVO PADRÃO DE VARIAÇÕES
   */
  total_variacoes?: number;
  variacoes?: any[];

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
export const parseValorBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;

  let str = String(v).trim();
  str = str.replace(/[^\d.,-]/g, "");

  const temVirgula = str.includes(",");
  const temPonto = str.includes(".");

  if (temVirgula && temPonto) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "");
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (temVirgula) {
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export const formatValorBR = (v: number | string): string => {
  if (v === null || v === undefined || isNaN(Number(v))) return "0,00";
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// =========================
// inferir OD pela referência
// =========================
export const inferirOD = (referencia?: string | null): number => {
  const ref = (referencia || "").trim().toUpperCase();
  if (ref.startsWith("PAI")) return 1;
  if (ref.startsWith("VAR")) return 2;
  return 3;
};

export const isProdutoPai = (referencia?: string | null): boolean => {
  return String(referencia || "")
    .trim()
    .toUpperCase()
    .startsWith("PAI");
};

export const isProdutoVariacao = (referencia?: string | null): boolean => {
  return String(referencia || "")
    .trim()
    .toUpperCase()
    .startsWith("VAR");
};

// =========================
// ler e adicionar custos
// =========================
async function fetchOrAddCustos(
  codigos: string[]
): Promise<Record<string, number>> {
  if (codigos.length === 0) return {};

  // 🔹 Busca custos existentes
  const { data, error } = await supabase
    .from("custos")
    .select("*")
    .in("Código", codigos);

  let rows: CustoRow[] = data || [];

  // 🔁 Se não achar na coluna "Código", tenta "Codigo"
  if (error || rows.length === 0) {
    const alt = await supabase.from("custos").select("*").in("Codigo", codigos);
    if (!alt.error && alt.data) rows = alt.data as any;
  }

  // 🔹 Mapeia os custos encontrados
  const map: Record<string, number> = {};
  const codigosEncontrados = new Set<string>();

  for (const r of rows) {
    const codigo = (r.Código || r.Codigo || "").toString().trim();
    const custoRaw = r["Custo Atual"] ?? r["Custo_Atual"] ?? r.custo ?? 0;
    const custoNum = parseValorBR(custoRaw as any);

    if (codigo) {
      map[codigo] = isNaN(custoNum) ? 0 : custoNum;
      codigosEncontrados.add(codigo);
    }
  }

  // 🔹 Identifica códigos que não existem na tabela "custos"
  const novosCodigos = codigos.filter((c) => !codigosEncontrados.has(c));

  if (novosCodigos.length > 0) {
    const novos = novosCodigos.map((c) => ({
      Código: c,
      "Custo Atual": 0,
    }));

    // 🔹 Insere novos custos no Supabase
    const { error: insertError } = await supabase.from("custos").insert(novos);
    if (insertError)
      console.warn("⚠️ Erro ao inserir novos custos:", insertError);
    else
      console.info(
        `✅ Custos criados para códigos: ${novosCodigos.join(", ")}`
      );

    // Adiciona os novos ao map (com custo 0)
    novosCodigos.forEach((c) => (map[c] = 0));
  }

  return map;
}

// ===========================================================
// ✅ NORMALIZAÇÃO DE LOJA (CENTRALIZADA)
// - Aceita: "PK"/"SB" OU "Pikot Shop"/"Sóbaquetas"/"Sobaquetas" (com/sem acento)
// - Retorna: "PK" | "SB" | null
// ===========================================================
export function lojaNomeToCodigo(
  value: string | null | undefined
): "PK" | "SB" | null {
  if (!value) return null;

  const norm = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (norm === "pk" || norm.includes("pikot")) return "PK";
  if (norm === "sb" || norm.includes("sobaquetas")) return "SB";

  return null;
}

// ===========================================================
// ✅ CONVERSÃO PARA O NOME (apenas se algum ponto do app precisar exibir)
// - Recebe: "PK" | "SB"
// - Retorna: "Pikot Shop" | "Sóbaquetas" | null
// ===========================================================
export function lojaCodigoToNome(
  codigo: "PK" | "SB" | null | undefined
): "Pikot Shop" | "Sóbaquetas" | null {
  if (codigo === "PK") return "Pikot Shop";
  if (codigo === "SB") return "Sóbaquetas";
  return null;
}

// ===========================================================
// ✅ NOVO PADRÃO: buscar variações de um anúncio pai
// - Usa a função SQL public.get_variacoes_anuncio(p_loja, p_id)
// - Retorna [] se não for PAI ou se der erro
// ===========================================================
async function fetchVariacoesDoPai(
  lojaCodigo: "PK" | "SB",
  idPai: string | number,
  referencia?: string | null
): Promise<any[]> {
  if (!isProdutoPai(referencia)) return [];

  const idNumber = Number(idPai);
  if (!Number.isFinite(idNumber) || idNumber <= 0) return [];

  const { data, error } = await supabase.rpc("get_variacoes_anuncio", {
    p_loja: lojaCodigo,
    p_id: idNumber,
  });

  if (error) {
    console.error("❌ Erro ao buscar variações do anúncio:", error);
    return [];
  }

  if (Array.isArray(data)) return data;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 🔧 Hook responsável por carregar e editar anúncios conforme a loja.
 * - Aceita lojaParam em vários formatos (?loja=PK, ?loja=Pikot%20Shop, etc.)
 * - Mantém produto.loja sempre como "PK" | "SB" (consistente com a UI)
 * - NOVO PADRÃO:
 *   - Se o anúncio for PAI -, carrega suas variações via get_variacoes_anuncio
 */
export function useAnuncioEditor(id?: string) {
  const [produto, setProduto] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(false);

  const [variacoes, setVariacoes] = useState<any[]>([]);
  const [loadingVariacoes, setLoadingVariacoes] = useState(false);

  const params = useSearchParams();
  const lojaParam = params.get("loja");

  const { composicao, setComposicao, custoTotal, setCalculo, setAcrescimos } =
    usePrecificacao();

  const carregarVariacoes = useCallback(
    async (
      lojaCodigoParam?: "PK" | "SB",
      idParam?: string | number,
      referenciaParam?: string | null
    ) => {
      const lojaCodigo = lojaCodigoParam ?? lojaNomeToCodigo(lojaParam);
      const idFinal = idParam ?? id;

      if (!lojaCodigo || !idFinal) {
        setVariacoes([]);
        return [];
      }

      setLoadingVariacoes(true);

      try {
        const lista = await fetchVariacoesDoPai(
          lojaCodigo,
          idFinal,
          referenciaParam ?? produto?.referencia
        );

        setVariacoes(lista);

        setProduto((prev) =>
          prev
            ? {
                ...prev,
                total_variacoes: lista.length,
                variacoes: lista,
              }
            : prev
        );

        return lista;
      } finally {
        setLoadingVariacoes(false);
      }
    },
    [id, lojaParam, produto?.referencia]
  );

  // ===========================================================
  // 🔹 CARREGAR ANÚNCIO
  // ===========================================================
  const carregarAnuncio = useCallback(async () => {
    if (!id || !lojaParam) return;
    setLoading(true);

    try {
      const lojaCodigo = lojaNomeToCodigo(lojaParam);
      if (!lojaCodigo) return;

      const tabela = lojaCodigo === "PK" ? "anuncios_pk" : "anuncios_sb";

      // 🔹 Busca o anúncio
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .eq("ID", String(id).trim())
        .eq("Loja", lojaCodigo)
        .limit(1);

      if (error) {
        console.error("❌ Erro ao buscar anúncio:", error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn(
          "⚠️ Nenhum dado encontrado para ID:",
          id,
          "Loja:",
          lojaCodigo
        );
        setProduto(null);
        setVariacoes([]);
        return;
      }

      const row = data[0];
      const odInferido = inferirOD(row["Referência"]);

      const listaVariacoes = await fetchVariacoesDoPai(
        lojaCodigo,
        row["ID"],
        row["Referência"]
      );

      setVariacoes(listaVariacoes);

      setProduto({
        // ✅ FIX: sempre string (coluna "ID" no banco)
        id: String(row["ID"] ?? "").trim(),
        loja: lojaCodigo, // ✅ sempre PK/SB no estado
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

        // ✅ NOVO PADRÃO
        total_variacoes: listaVariacoes.length,
        variacoes: listaVariacoes,
      });

      // 🔹 Monta composição (custo como number puro)
      const compTmp: Array<{
        codigo: string;
        quantidade: string;
        custo: number;
      }> = [];

      for (let i = 1; i <= 10; i++) {
        const codigo = row[`Código ${i}`];
        const quantidade = row[`Quantidade ${i}`];

        if (codigo) {
          compTmp.push({
            codigo: String(codigo).trim(),
            quantidade:
              !quantidade || quantidade === ""
                ? "1"
                : String(quantidade).replace(".", ","),
            custo: 0,
          });
        }
      }

      // 🔹 Busca custos e adiciona novos se não existirem
      const codigos = compTmp.map((c) => c.codigo);
      const custosMap = await fetchOrAddCustos(codigos);

      const compFinal = compTmp.map((c) => ({
        ...c,
        custo: custosMap[c.codigo] ?? 0,
      }));

      setComposicao(compFinal as any);
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));

      // 🔹 Calcula custo total
      const total = compFinal.reduce(
        (sum, item) => sum + parseValorBR(item.quantidade) * Number(item.custo),
        0
      );

      setCalculo((prev: any) => ({
        ...prev,
        custo: String(total),
        frete: prev?.frete ?? "0",
      }));
    } finally {
      setLoading(false);
    }
  }, [id, lojaParam, setComposicao, setAcrescimos, setCalculo]);

  useEffect(() => {
    if (id && lojaParam) carregarAnuncio();
  }, [id, lojaParam, carregarAnuncio]);

  // ===========================================================
  // 🔁 RETORNO
  // ===========================================================
  return {
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    loading,
    carregarAnuncio,
    lojaCodigoToNome,
    lojaNomeToCodigo,

    // ✅ NOVO PADRÃO DE VARIAÇÕES
    variacoes,
    setVariacoes,
    totalVariacoes: variacoes.length,
    loadingVariacoes,
    carregarVariacoes,
    isProdutoPai,
    isProdutoVariacao,
  };
}