"use client";

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { createNotification } from "@/lib/createNotification";
import {
  parseValorBR,
  inferirOD,
  lojaNomeToCodigo,
} from "@/components/announce/hooks/useAnuncioEditor";

type LojaCodigo = "PK" | "SB";

type AnunciosTabela = "anuncios_pk" | "anuncios_sb";

function lojaAnyToCodigo(v: any): LojaCodigo | null {
  if (v === "PK" || v === "SB") return v;
  if (typeof v === "string") return (lojaNomeToCodigo(v) as LojaCodigo) ?? null;
  return null;
}

function tabelaFromCodigo(c: LojaCodigo): AnunciosTabela {
  return c === "PK" ? "anuncios_pk" : "anuncios_sb";
}

function lojaCodigoToNome(c: LojaCodigo) {
  return c === "PK" ? "Pikot Shop" : "Sóbaquetas";
}

function normalizeStr(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

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

function getProdutoLabel(produto: any, fallback: string) {
  return (
    produto?.nome ||
    produto?.Nome ||
    produto?.referencia ||
    produto?.["Referência"] ||
    produto?.id_bling ||
    produto?.["ID Bling"] ||
    fallback
  );
}

function buildAnnouncementLink(id: string | number, lojaCodigo: LojaCodigo) {
  return `/dashboard/anuncios/edit?id=${encodeURIComponent(
    String(id)
  )}&loja=${encodeURIComponent(lojaCodigoToNome(lojaCodigo))}`;
}

function getField(obj: any, ...keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return "";
}

function removerAcentos(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizarReferenciaBaseUniversal(raw: any): string {
  let ref = removerAcentos(String(raw ?? ""))
    .trim()
    .toUpperCase();

  if (!ref) return "";

  ref = ref
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  while (/^\s*(PAI|VAR)\s*[-_\s]*/i.test(ref)) {
    ref = ref.replace(/^\s*(PAI|VAR)\s*[-_\s]*/i, "").trim();
  }

  ref = ref
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*_\s*/g, "_")
    .trim();

  /**
   * Se já está sem espaço e com separadores válidos, mantém.
   * Exemplos:
   * VDR-6001800020_6001800010
   * FIS-45634-INOX
   * LIV-TN_5AM
   */
  if (/^[A-Z0-9]{2,5}-[A-Z0-9]+([-_][A-Z0-9]+)*$/.test(ref)) {
    return ref;
  }

  const partes = ref
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length === 0) return "";

  const marca = partes[0];

  if (partes.length === 1) {
    return marca;
  }

  if (partes.length === 2) {
    return `${marca}-${partes[1]}`;
  }

  const codigoPrincipal = partes[1];
  const extras = partes.slice(2);

  /**
   * Heurística:
   * - Se os extras forem códigos numéricos, usa underline:
   *   VDR 6001800020 6001800010 -> VDR-6001800020_6001800010
   *
   * - Se tiver texto/material, usa hífen:
   *   FIS 45634 INOX -> FIS-45634-INOX
   */
  const extrasSaoNumericos = extras.every((p) => /^[0-9]+$/.test(p));
  const separador = extrasSaoNumericos ? "_" : "-";

  return `${marca}-${codigoPrincipal}${separador}${extras.join(separador)}`;
}

function criarReferenciaUniversal(
  raw: any,
  tipo: "PAI" | "VAR"
): string | null {
  const base = normalizarReferenciaBaseUniversal(raw);
  if (!base) return null;

  return `${tipo}-${base}`;
}

function normalizarQuantidadeComposicao(value: any, temCodigo: boolean) {
  const qtdNum = parseValorBR(value);

  if (!isNaN(qtdNum) && qtdNum > 0) return qtdNum;

  /**
   * IMPORTANTE:
   * Se existe código, mas quantidade veio vazia, salva 1.
   * Isso evita a variação calcular custo como 0 ao carregar novamente.
   */
  return temCodigo ? 1 : null;
}

function montarCamposComposicao(composicao: any[], isInsert: boolean) {
  const camposComposicao: Record<string, any> = {};

  /**
   * IMPORTANTE:
   * O banco tem somente Código 1 / Quantidade 1 ... Código 10 / Quantidade 10.
   * Não adiciona Custo 1, porque essa coluna não existe.
   *
   * Também limpamos os 10 pares sempre, inclusive em update.
   * Assim, se remover um item da composição da variação, o item antigo não fica preso no banco.
   */
  for (let i = 1; i <= 10; i++) {
    camposComposicao[`Código ${i}`] = null;
    camposComposicao[`Quantidade ${i}`] = null;
  }

  const itens = Array.isArray(composicao) ? composicao.slice(0, 10) : [];

  itens.forEach((c: any, i: number) => {
    const idx = i + 1;

    const codigo = normalizeStr(
      c?.codigo ??
        c?.["Código"] ??
        c?.Codigo ??
        c?.cod ??
        ""
    );

    const quantidade = normalizarQuantidadeComposicao(
      c?.quantidade ??
        c?.Quantidade ??
        c?.qtd ??
        "",
      Boolean(codigo)
    );

    camposComposicao[`Código ${idx}`] = codigo;
    camposComposicao[`Quantidade ${idx}`] = quantidade;
  });

  return camposComposicao;
}

function montarPayloadAnuncio(params: {
  item: any;
  lojaCodigo: LojaCodigo;
  composicao: any[];
  isInsert: boolean;
  referenciaForcada: string | null;
}) {
  const { item, lojaCodigo, composicao, isInsert, referenciaForcada } = params;

  const referencia =
    referenciaForcada ??
    normalizeStr(getField(item, "referencia", "Referência", "sku"));

  const od = inferirOD(referencia);

  return {
    Loja: lojaCodigo,

    "ID Bling": normalizeIdBling(getField(item, "id_bling", "ID Bling")),
    "ID Tray": normalizeStr(getField(item, "id_tray", "ID Tray")),
    "ID Var": normalizeStr(getField(item, "id_var", "ID Var", "valor")),

    Referência: referencia,

    Nome: getField(item, "nome", "Nome") || null,
    Marca: getField(item, "marca", "Marca") || null,
    Categoria: getField(item, "categoria", "Categoria") || null,

    Peso: getField(item, "peso", "Peso") || null,
    Altura: getField(item, "altura", "Altura") || null,
    Largura: getField(item, "largura", "Largura") || null,
    Comprimento: getField(item, "comprimento", "Comprimento") || null,

    OD: od || getField(item, "OD", "od") || null,

    ...montarCamposComposicao(composicao, isInsert),
  };
}

async function buscarProximoId(tabela: AnunciosTabela) {
  const { data: maxData, error: maxError } = await supabase
    .from(tabela)
    .select("ID")
    .order("ID", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) throw maxError;

  const ultimoId = maxData?.ID ? Number(maxData.ID) : 0;
  return ultimoId + 1;
}

async function buscarAnuncioExistenteParaNovoCadastro(params: {
  tabela: AnunciosTabela;
  lojaCodigo: LojaCodigo;
  referencia: string;
  idBling: string | null;
}) {
  const { tabela, lojaCodigo, referencia, idBling } = params;

  if (idBling) {
    const { data, error } = await supabase
      .from(tabela)
      .select("ID")
      .eq("Loja", lojaCodigo)
      .eq("ID Bling", idBling)
      .maybeSingle();

    if (error) throw error;
    if (data?.ID) return String(data.ID);
  }

  if (referencia) {
    const { data, error } = await supabase
      .from(tabela)
      .select("ID")
      .eq("Loja", lojaCodigo)
      .eq("Referência", referencia)
      .maybeSingle();

    if (error) throw error;
    if (data?.ID) return String(data.ID);
  }

  return null;
}

function montarItemVariacao(params: {
  produto: any;
  variacao: any;
  lojaCodigo: LojaCodigo;
  referenciaVariacao: string;
  isNovaVariacao: boolean;
}) {
  const { produto, variacao, lojaCodigo, referenciaVariacao, isNovaVariacao } =
    params;

  const idBlingVariacao = getField(variacao, "id_bling", "ID Bling");
  const idTrayVariacao = getField(variacao, "id_tray", "ID Tray");
  const idVarVariacao = getField(variacao, "id_var", "ID Var", "valor");

  return {
    ...produto,
    ...variacao,

    loja: lojaCodigo,
    Loja: lojaCodigo,

    /**
     * Nova variação não herda ID Bling do pai.
     * Em edição, mantém o ID Bling próprio da variação se existir.
     */
    id_bling: isNovaVariacao ? "" : idBlingVariacao || "",
    "ID Bling": isNovaVariacao ? "" : idBlingVariacao || "",

    id_tray: idTrayVariacao || "",
    "ID Tray": idTrayVariacao || "",

    id_var: idVarVariacao || "",
    "ID Var": idVarVariacao || "",

    referencia: referenciaVariacao,
    Referencia: referenciaVariacao,
    "Referência": referenciaVariacao,
    sku: referenciaVariacao,

    tipo_anuncio: "variacoes",
  };
}

export function useAnuncioActions() {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savingRef = useRef(false);

  const router = useRouter();

  const handleSave = useCallback(
    async (produto: any, composicao: any[], onAfterSave?: () => void) => {
      /**
       * Trava real contra duplo clique / duplo submit.
       * O estado saving pode demorar 1 render para atualizar,
       * então usamos ref síncrono.
       */
      if (savingRef.current) return;

      const lojaCodigo = lojaAnyToCodigo(produto?.loja ?? produto?.Loja);

      if (!lojaCodigo) {
        alert('Selecione uma loja antes de salvar ("PK" ou "SB").');
        return;
      }

      savingRef.current = true;
      setSaving(true);

      try {
        const tabela = tabelaFromCodigo(lojaCodigo);

        const idAtualStr = String(produto?.id ?? produto?.ID ?? "").trim();

        const referenciaOriginalPai =
          getField(produto, "referencia", "Referência", "sku") || "";

        const referenciaPai = criarReferenciaUniversal(
          referenciaOriginalPai,
          "PAI"
        );

        if (!referenciaPai) {
          alert("Informe uma referência válida para o anúncio pai.");
          return;
        }

        let idPaiFinal = idAtualStr;

        const payloadPai = montarPayloadAnuncio({
          item: {
            ...produto,
            referencia: referenciaPai,
            Referencia: referenciaPai,
            "Referência": referenciaPai,
            sku: referenciaPai,
          },
          lojaCodigo,
          composicao,
          isInsert: !idAtualStr,
          referenciaForcada: referenciaPai,
        });

        /**
         * 1. Salva / atualiza PAI
         */
        if (idAtualStr) {
          const { error } = await supabase
            .from(tabela)
            .update(payloadPai)
            .eq("ID", idAtualStr)
            .eq("Loja", lojaCodigo);

          if (error) throw error;
        } else {
          const idBlingPai = normalizeIdBling(
            getField(produto, "id_bling", "ID Bling")
          );

          const idExistente = await buscarAnuncioExistenteParaNovoCadastro({
            tabela,
            lojaCodigo,
            referencia: referenciaPai,
            idBling: idBlingPai,
          });

          if (idExistente) {
            idPaiFinal = idExistente;

            const { error } = await supabase
              .from(tabela)
              .update(payloadPai)
              .eq("ID", idExistente)
              .eq("Loja", lojaCodigo);

            if (error) throw error;
          } else {
            const novoId = await buscarProximoId(tabela);
            idPaiFinal = String(novoId);

            const payloadNovoPai = {
              ...payloadPai,
              ID: idPaiFinal,
            };

            const { error: insertError } = await supabase
              .from(tabela)
              .insert([payloadNovoPai] as any);

            if (insertError) throw insertError;
          }
        }

        /**
         * 2. Salva cada VAR como linha real
         */
        const variacoes = Array.isArray(produto?.variacoes)
          ? produto.variacoes
          : [];

        let proximoId = await buscarProximoId(tabela);

        for (const variacao of variacoes) {
          const idVariacaoStr = String(
            variacao?.id ?? variacao?.ID ?? ""
          ).trim();

          const referenciaRawVariacao =
            getField(variacao, "referencia", "Referência", "sku") || "";

          const referenciaVariacao = criarReferenciaUniversal(
            referenciaRawVariacao || referenciaPai,
            "VAR"
          );

          if (!referenciaVariacao) continue;

          const isNovaVariacao = !idVariacaoStr;

          /**
           * IMPORTANTE:
           * Para variação, salva a composição própria da variação.
           * Se ela não tiver composição, cai para a composição do pai.
           *
           * O custo não é salvo aqui porque não existe coluna Custo 1.
           * O custo deve ser recuperado depois pela tabela custos usando Código 1, Código 2...
           */
          const composicaoVariacao = Array.isArray(variacao?.composicao)
            ? variacao.composicao
            : composicao;

          const itemVariacao = montarItemVariacao({
            produto,
            variacao,
            lojaCodigo,
            referenciaVariacao,
            isNovaVariacao,
          });

          const payloadVariacao = montarPayloadAnuncio({
            item: itemVariacao,
            lojaCodigo,
            composicao: composicaoVariacao,
            isInsert: isNovaVariacao,
            referenciaForcada: referenciaVariacao,
          });

          if (idVariacaoStr) {
            const { error } = await supabase
              .from(tabela)
              .update(payloadVariacao)
              .eq("ID", idVariacaoStr)
              .eq("Loja", lojaCodigo);

            if (error) throw error;
          } else {
            const payloadNovaVariacao = {
              ...payloadVariacao,
              "ID Bling": null,
              ID: String(proximoId),
            };

            proximoId += 1;

            const { error } = await supabase
              .from(tabela)
              .insert([payloadNovaVariacao] as any);

            if (error) throw error;
          }
        }

        /**
         * 3. Não chama refresh pelo front.
         * A contagem do badge precisa ser feita pelos triggers/view do banco.
         */

        await createNotification({
          title: idAtualStr ? "Anúncio atualizado" : "Anúncio criado",
          message: `O anúncio "${getProdutoLabel(
            produto,
            idPaiFinal
          )}" foi ${idAtualStr ? "atualizado" : "criado"} com ${
            variacoes.length
          } ${variacoes.length === 1 ? "variação" : "variações"}.`,
          action: idAtualStr ? "update" : "create",
          entityType: "announcement",
          entityId: idPaiFinal,
          link: buildAnnouncementLink(idPaiFinal, lojaCodigo),
        });

        if (onAfterSave) onAfterSave();
        else router.push("/dashboard/anuncios");
      } catch (err: any) {
        alert("Erro ao salvar anúncio: " + (err?.message || err));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [router]
  );

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

        await createNotification({
          title: "Anúncio excluído",
          message: `O anúncio "${getProdutoLabel(
            produto,
            idProduto
          )}" foi excluído do sistema.`,
          action: "delete",
          entityType: "announcement",
          entityId: idProduto,
          link: "/dashboard/anuncios",
        });

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

  const handleDeleteSelected = useCallback(
    async (selectedRows: any[], onAfterDelete?: () => void) => {
      if (!selectedRows?.length) {
        alert("Nenhum anúncio selecionado para exclusão.");
        return;
      }

      setDeleting(true);

      try {
        const selectedRowsSnapshot = [...selectedRows];

        const grouped = selectedRowsSnapshot.reduce<Record<string, string[]>>(
          (acc, row) => {
            const lojaCodigo = lojaAnyToCodigo(row?.loja ?? row?.Loja);
            if (!lojaCodigo) return acc;

            const id = String(row?.id ?? row?.ID ?? "").trim();
            if (!id) return acc;

            const tabela = tabelaFromCodigo(lojaCodigo);
            acc[tabela] = acc[tabela] || [];
            acc[tabela].push(id);

            return acc;
          },
          {}
        );

        const promises = Object.entries(grouped).map(async ([tabela, ids]) => {
          const { error } = await supabase
            .from(tabela as AnunciosTabela)
            .delete()
            .in("ID", ids);

          if (error) throw error;
        });

        await Promise.all(promises);

        const labels = selectedRowsSnapshot
          .slice(0, 3)
          .map(
            (row) =>
              `"${getProdutoLabel(row, row?.id ?? row?.ID ?? "anúncio")}"`
          );

        const message =
          selectedRowsSnapshot.length === 1
            ? `O anúncio ${labels[0]} foi excluído do sistema.`
            : selectedRowsSnapshot.length <= 3
            ? `Os anúncios ${labels.join(", ")} foram excluídos do sistema.`
            : `Os anúncios ${labels.join(", ")} e mais ${
                selectedRowsSnapshot.length - 3
              } foram excluídos do sistema.`;

        await createNotification({
          title:
            selectedRowsSnapshot.length === 1
              ? "Anúncio excluído"
              : "Anúncios excluídos",
          message,
          action: "delete",
          entityType: "announcement",
          entityId:
            selectedRowsSnapshot.length === 1
              ? String(
                  selectedRowsSnapshot[0]?.id ??
                    selectedRowsSnapshot[0]?.ID ??
                    ""
                )
              : undefined,
          link: "/dashboard/anuncios",
        });

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