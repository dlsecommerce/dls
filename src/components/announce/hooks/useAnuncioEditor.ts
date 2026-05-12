"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrecificacao } from "@/hooks/usePrecificacao";
import { useSearchParams } from "next/navigation";

export interface Anuncio {
  /**
   * ✅ ID do anúncio no banco (coluna "ID").
   * Mantemos como string para evitar NaN / inconsistências.
   */
  id: string;

  /**
   * ✅ CONTRATO DO FRONT:
   * UI e estado React trabalham com "PK" | "SB".
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

const ANUNCIO_SELECT = `
  "ID",
  "Loja",
  "ID Bling",
  "ID Tray",
  "ID Var",
  "Referência",
  "Nome",
  "Marca",
  "Categoria",
  "Peso",
  "Altura",
  "Largura",
  "Comprimento",
  "Código 1",
  "Quantidade 1",
  "Código 2",
  "Quantidade 2",
  "Código 3",
  "Quantidade 3",
  "Código 4",
  "Quantidade 4",
  "Código 5",
  "Quantidade 5",
  "Código 6",
  "Quantidade 6",
  "Código 7",
  "Quantidade 7",
  "Código 8",
  "Quantidade 8",
  "Código 9",
  "Quantidade 9",
  "Código 10",
  "Quantidade 10"
`;

// =========================
// helpers de número BR
// =========================
export const parseValorBR = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

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
  return Number.isFinite(num) ? num : 0;
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

const uniqueCleanCodes = (codigos: string[]) => {
  return Array.from(
    new Set(
      codigos
        .map((c) => String(c || "").trim())
        .filter(Boolean)
    )
  );
};

// =========================
// ler e adicionar custos
// =========================
async function fetchOrAddCustos(
  codigosInput: string[]
): Promise<Record<string, number>> {
  const codigos = uniqueCleanCodes(codigosInput);

  if (codigos.length === 0) return {};

  const map: Record<string, number> = {};
  const codigosEncontrados = new Set<string>();

  /**
   * ✅ Mais rápido que select("*"):
   * buscamos só as colunas necessárias.
   */
  const { data, error } = await supabase
    .from("custos")
    .select('"Código", "Custo Atual", "Produto"')
    .in("Código", codigos);

  let rows: CustoRow[] = Array.isArray(data) ? (data as any) : [];

  /**
   * Fallback para bases antigas que possam ter "Codigo".
   */
  if (error || rows.length === 0) {
    const alt = await supabase
      .from("custos")
      .select('"Codigo", "Custo_Atual"')
      .in("Codigo", codigos);

    if (!alt.error && Array.isArray(alt.data)) {
      rows = alt.data as any;
    }
  }

  for (const r of rows) {
    const codigo = (r.Código || r.Codigo || "").toString().trim();
    const custoRaw = r["Custo Atual"] ?? r["Custo_Atual"] ?? r.custo ?? 0;
    const custoNum = parseValorBR(custoRaw as any);

    if (codigo) {
      map[codigo] = Number.isFinite(custoNum) ? custoNum : 0;
      codigosEncontrados.add(codigo);
    }
  }

  const novosCodigos = codigos.filter((c) => !codigosEncontrados.has(c));

  if (novosCodigos.length > 0) {
    const novos = novosCodigos.map((c) => ({
      Código: c,
      "Custo Atual": 0,
    }));

    /**
     * ✅ upsert evita erro se outro processo criou o custo ao mesmo tempo.
     */
    const { error: insertError } = await supabase
      .from("custos")
      .upsert(novos, {
        onConflict: "Código",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.warn("⚠️ Erro ao inserir novos custos:", insertError);
    }

    novosCodigos.forEach((c) => {
      if (map[c] === undefined) map[c] = 0;
    });
  }

  return map;
}

// ===========================================================
// ✅ NORMALIZAÇÃO DE LOJA
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

export function lojaCodigoToNome(
  codigo: "PK" | "SB" | null | undefined
): "Pikot Shop" | "Sóbaquetas" | null {
  if (codigo === "PK") return "Pikot Shop";
  if (codigo === "SB") return "Sóbaquetas";

  return null;
}

// ===========================================================
// ✅ Buscar variações manualmente quando necessário
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

  return [];
}

const montarComposicaoInicial = (row: any) => {
  const compTmp: Array<{
    codigo: string;
    quantidade: string;
    custo: number;
  }> = [];

  for (let i = 1; i <= 10; i++) {
    const codigo = row[`Código ${i}`];
    const quantidade = row[`Quantidade ${i}`];

    if (String(codigo || "").trim()) {
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

  return compTmp;
};

const montarProdutoFromRow = (
  row: any,
  lojaCodigo: "PK" | "SB"
): Anuncio => {
  const referencia = row["Referência"] ?? null;
  const odInferido = inferirOD(referencia);

  return {
    id: String(row["ID"] ?? "").trim(),

    loja: lojaCodigo,
    Loja: lojaCodigo,

    od: odInferido,
    OD: odInferido,

    id_bling: row["ID Bling"] ?? null,
    "ID Bling": row["ID Bling"] ?? null,

    id_tray: row["ID Tray"] ?? null,
    "ID Tray": row["ID Tray"] ?? null,

    id_var: row["ID Var"] ?? null,
    "ID Var": row["ID Var"] ?? null,

    referencia,
    Referencia: referencia,
    "Referência": referencia,
    sku: referencia,

    nome: row["Nome"] ?? null,
    Nome: row["Nome"] ?? null,

    marca: row["Marca"] ?? null,
    Marca: row["Marca"] ?? null,

    categoria: row["Categoria"] ?? null,
    Categoria: row["Categoria"] ?? null,

    peso: parseValorBR(row["Peso"]),
    Peso: parseValorBR(row["Peso"]),

    altura: parseValorBR(row["Altura"]),
    Altura: parseValorBR(row["Altura"]),

    largura: parseValorBR(row["Largura"]),
    Largura: parseValorBR(row["Largura"]),

    comprimento: parseValorBR(row["Comprimento"]),
    Comprimento: parseValorBR(row["Comprimento"]),

    /**
     * ✅ Não carregamos variações automaticamente aqui.
     * O ProductDetails já faz isso de forma otimizada para evitar busca duplicada.
     */
    total_variacoes: 0,
    variacoes: [],
  };
};

/**
 * 🔧 Hook responsável por carregar e editar anúncios conforme a loja.
 *
 * Otimizações:
 * - Não usa select("*").
 * - Não busca variações automaticamente aqui para evitar duplicidade.
 * - Mostra o produto assim que o anúncio chega.
 * - Busca custos depois e atualiza a composição.
 * - Deduplica códigos antes de consultar a tabela custos.
 * - Evita execução duplicada no Strict Mode/React.
 */
export function useAnuncioEditor(id?: string) {
  const [produto, setProduto] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(false);

  const [variacoes, setVariacoes] = useState<any[]>([]);
  const [loadingVariacoes, setLoadingVariacoes] = useState(false);

  const params = useSearchParams();
  const lojaParam = params.get("loja");

  const lojaCodigo = useMemo(() => {
    return lojaNomeToCodigo(lojaParam);
  }, [lojaParam]);

  const loadingKeyRef = useRef<string>("");
  const mountedRef = useRef(true);

  const { composicao, setComposicao, custoTotal, setCalculo, setAcrescimos } =
    usePrecificacao();

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const carregarVariacoes = useCallback(
    async (
      lojaCodigoParam?: "PK" | "SB",
      idParam?: string | number,
      referenciaParam?: string | null
    ) => {
      const lojaFinal = lojaCodigoParam ?? lojaCodigo;
      const idFinal = idParam ?? id;
      const referenciaFinal = referenciaParam ?? produto?.referencia;

      if (!lojaFinal || !idFinal) {
        setVariacoes([]);
        return [];
      }

      setLoadingVariacoes(true);

      try {
        const lista = await fetchVariacoesDoPai(
          lojaFinal,
          idFinal,
          referenciaFinal
        );

        if (!mountedRef.current) return [];

        setVariacoes(lista);

        setProduto((prev) =>
          prev
            ? {
                ...prev,
                total_variacoes: lista.length,
                variacoes: lista,
                tipo_anuncio:
                  lista.length > 0 ? "variacoes" : prev?.tipo_anuncio,
              }
            : prev
        );

        return lista;
      } finally {
        if (mountedRef.current) {
          setLoadingVariacoes(false);
        }
      }
    },
    [id, lojaCodigo, produto?.referencia]
  );

  // ===========================================================
  // 🔹 CARREGAR ANÚNCIO
  // ===========================================================
  const carregarAnuncio = useCallback(async () => {
    if (!id || !lojaCodigo) return;

    const idLimpo = String(id).trim();
    const loadKey = `${lojaCodigo}-${idLimpo}`;

    /**
     * ✅ Evita chamadas duplicadas em renderizações próximas/Strict Mode.
     */
    if (loadingKeyRef.current === loadKey) return;

    loadingKeyRef.current = loadKey;
    setLoading(true);

    try {
      const tabela = lojaCodigo === "PK" ? "anuncios_pk" : "anuncios_sb";

      const { data: row, error } = await supabase
        .from(tabela)
        .select(ANUNCIO_SELECT)
        .eq("ID", idLimpo)
        .eq("Loja", lojaCodigo)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.error("❌ Erro ao buscar anúncio:", error);
        setProduto(null);
        setVariacoes([]);
        return;
      }

      if (!row) {
        console.warn(
          "⚠️ Nenhum dado encontrado para ID:",
          idLimpo,
          "Loja:",
          lojaCodigo
        );

        setProduto(null);
        setVariacoes([]);
        setComposicao([]);
        return;
      }

      /**
       * ✅ Produto aparece na tela assim que o anúncio é encontrado.
       * Os custos entram logo em seguida.
       */
      const produtoBase = montarProdutoFromRow(row, lojaCodigo);

      setProduto(produtoBase);
      setVariacoes([]);

      const compTmp = montarComposicaoInicial(row);

      setComposicao(compTmp as any);
      setAcrescimos((prev) => ({ ...prev, acrescimo: 0 }));

      const codigos = compTmp.map((c) => c.codigo);
      const custosMap = await fetchOrAddCustos(codigos);

      if (!mountedRef.current) return;

      const compFinal = compTmp.map((c) => ({
        ...c,
        custo: custosMap[c.codigo] ?? 0,
      }));

      setComposicao(compFinal as any);

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
      if (mountedRef.current) {
        setLoading(false);
      }

      /**
       * Permite recarregar manualmente o mesmo anúncio se necessário.
       */
      loadingKeyRef.current = "";
    }
  }, [
    id,
    lojaCodigo,
    setComposicao,
    setAcrescimos,
    setCalculo,
  ]);

  useEffect(() => {
    if (id && lojaCodigo) {
      carregarAnuncio();
    }
  }, [id, lojaCodigo, carregarAnuncio]);

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

    variacoes,
    setVariacoes,
    totalVariacoes: variacoes.length,
    loadingVariacoes,
    carregarVariacoes,

    isProdutoPai,
    isProdutoVariacao,
  };
}