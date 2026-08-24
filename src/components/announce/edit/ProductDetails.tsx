"use client";

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/announce/edit/AnimatedNumber";
import { LoadingBar } from "@/components/ui/loading-bar";
import CompositionModal from "@/components/announce/edit/Compositionmodal";
import ActionsMenu from "@/components/announce/edit/Actionsmenu";
import ProductInfoSection from "@/components/announce/edit/ProductInfosection";

import { useKeyboardShortcuts } from "@/components/announce/hooks/useKeyboardShortcuts";
import {
  useAnnounceEdit,
  toStoreName,
  lojaNomeToCodigo,
  type Announce,
  type ComposicaoItem,
} from "@/components/announce/hooks/useannounceedit";

const getField = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return "";
};

type Props = {
  id?: string;
  loja?: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

export default function ProductDetails({ id, loja, onSaved, onCancel }: Props) {
  const isEditing = Boolean(id);

  const lojaCodigo = useMemo(() => {
    return lojaNomeToCodigo(loja) ?? "PK";
  }, [loja]);

  const storeInicial = useMemo(() => {
    return toStoreName(loja) ?? toStoreName(lojaCodigo);
  }, [loja, lojaCodigo]);

  const loadingBarRef = useRef<any>(null);
  const variacoesLoadedKeyRef = useRef<string>("");

  const {
    produto,
    setProduto,
    composicao,
    setComposicao,
    custoTotal,
    loading,
    saving,
    carregarAnuncio,
    salvarAnuncio,
    variacoes,
    carregarVariacoes,
    loadingVariacoes,
  } = useAnnounceEdit(id, loja);

  // ---------------------------------------------------------
  // Inicializa produto novo (quando não está editando).
  // ✅ Sem criação de rascunho no banco — o registro só existe
  // de fato após o usuário clicar em "Salvar".
  // ---------------------------------------------------------
  useEffect(() => {
    if (isEditing) return;
    if (produto) return;

    setProduto({
      id: "",
      code_id: null,
      store: storeInicial ?? "Pikot Shop",
      id_bling: null,
      reference: "",
      product: "",
      mark: "",
      parent_id: null,
      active: true,
      total_variacoes: 0,
      variacoes: [],
    } as Announce);
  }, [isEditing, produto, storeInicial, setProduto]);

  const produtoTela = produto ?? ({} as Announce);

  const produtoId = produtoTela?.id || "";

  const storeAtual = useMemo(() => {
    return toStoreName(produtoTela?.store) ?? storeInicial ?? "Pikot Shop";
  }, [produtoTela?.store, storeInicial]);

  const tituloPagina = String(produtoTela?.product ?? "").trim() || "Novo anúncio";

  // -----------------------------------------------------------------
  // Carregar variações quando o anúncio já existir e for possível pai
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isEditing) return;
    if (loading) return;
    if (!produtoId) return;

    if (variacoesLoadedKeyRef.current === produtoId) return;
    variacoesLoadedKeyRef.current = produtoId;

    carregarVariacoes(produtoId);
  }, [isEditing, loading, produtoId, carregarVariacoes]);

  // -----------------------------------------------------------------
  // Modal de composição de custo
  // ✅ Pode abrir mesmo sem `id` — os itens ficam em memória (via
  // setComposicao) e só são persistidos de fato quando o usuário
  // clicar em "Salvar" no formulário principal.
  // -----------------------------------------------------------------
  const [showCompositionModal, setShowCompositionModal] = useState(false);

  const handleOpenComposition = useCallback(() => {
    setShowCompositionModal(true);
  }, []);

  // -----------------------------------------------------------------
  // ESC fecha a tela de edição (chama onCancel)
  // ✅ Ignora ESC se o modal de composição estiver aberto —
  // nesse caso o próprio Dialog do modal já trata o ESC.
  // -----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showCompositionModal) return;
      onCancel?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showCompositionModal, onCancel]);

  // -----------------------------------------------------------------
  // Validação do nome do produto (product) — checa duplicidade na mesma loja
  // -----------------------------------------------------------------
  const [nomeValido, setNomeValido] = useState(true);

  const checkNomeDuplicado = useCallback(
    async (nome: string, signal: AbortSignal) => {
      if (!nome?.trim() || !storeAtual) return false;

      const { data, error } = await supabase
        .schema("newsystem")
        .from("announce")
        .select("id, product")
        .eq("store", storeAtual)
        .ilike("product", nome)
        .is("deleted_at", null)
        .abortSignal(signal)
        .limit(2);

      if (error) {
        console.error("Erro ao verificar duplicidade de nome:", error);
        return false;
      }

      const encontrados = Array.isArray(data) ? data : [];

      return encontrados.some((row: any) => String(row?.id) !== String(produtoId));
    },
    [storeAtual, produtoId]
  );

  // -----------------------------------------------------------------
  // Validação de referência duplicada
  // -----------------------------------------------------------------
  const checkReferenciaDuplicada = useCallback(
    async (referencia: string, signal: AbortSignal) => {
      if (!referencia?.trim() || !storeAtual) return false;

      const { data, error } = await supabase
        .schema("newsystem")
        .from("announce")
        .select("id, reference")
        .eq("store", storeAtual)
        .ilike("reference", referencia)
        .is("deleted_at", null)
        .abortSignal(signal)
        .limit(2);

      if (error) {
        console.error("Erro ao verificar duplicidade de referência:", error);
        return false;
      }

      const encontrados = Array.isArray(data) ? data : [];

      return encontrados.some((row: any) => String(row?.id) !== String(produtoId));
    },
    [storeAtual, produtoId]
  );

  // -----------------------------------------------------------------
  // Salvar (pai + variações + composição) — 1 única RPC combinada
  // no hook (upsert_announce_with_variations), sem loop de rede aqui.
  // -----------------------------------------------------------------
  const handleSaveAtual = useCallback(async () => {
    if (!nomeValido) return;
    if (!produto) return;

    const resultado = await salvarAnuncio(produto, composicao);

    if (!resultado?.success) {
      console.error("Falha ao salvar anúncio:", resultado?.error);
      toast.error("Erro ao salvar anúncio", {
        description: resultado?.error ?? "Tente novamente.",
      });
      return;
    }

    const announceId = resultado.announceId;

    setProduto((prev) => (prev ? { ...prev, id: announceId } : prev));

    toast.success(isEditing ? "Anúncio editado com sucesso!" : "Anúncio criado com sucesso!");

    onSaved?.();
  }, [nomeValido, produto, composicao, salvarAnuncio, setProduto, onSaved, isEditing]);

  useKeyboardShortcuts({
    saving,
    handleSave: handleSaveAtual,
    campoAtivo: null,
    sugestoesLength: 0,
  });

  useEffect(() => {
    if (loading) loadingBarRef.current?.start?.();
    else loadingBarRef.current?.finish?.();
  }, [loading]);

  const salvarDesabilitado = saving || loading || !nomeValido;

  return (
    <>
      <LoadingBar ref={loadingBarRef} />

      <div className="overflow-x-clip bg-gradient-to-br from-[#070707] via-[#0b0b0b] to-[#070707] pb-6 text-white">
        <div className="px-4 py-5 lg:px-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="max-w-[1180px] truncate text-2xl font-bold tracking-tight text-white md:text-3xl">
                {tituloPagina}
              </h1>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
              <ActionsMenu onOpenComposition={handleOpenComposition} />

              <button
                type="button"
                onClick={() => onCancel?.()}
                className="
                  inline-flex h-9 cursor-pointer items-center justify-center border
                  border-white/10 bg-white/[0.04] px-6
                  text-xs font-semibold text-white/75
                  transition-all duration-200
                  hover:border-white/20 hover:bg-white/[0.08] hover:text-white
                  active:scale-[0.98]
                "
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveAtual}
                disabled={salvarDesabilitado}
                title={!nomeValido ? "Corrija o nome do produto antes de salvar" : undefined}
                className="
                  inline-flex h-9 cursor-pointer items-center justify-center border
                  border-[#1a8ceb]/60 bg-[#1a8ceb] px-7
                  text-xs font-bold text-white
                  transition-all duration-200
                  hover:border-[#2d99ee] hover:bg-[#2d99ee]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-70
                "
              >
                {saving ? "Salvando..." : loading ? "Carregando..." : "Salvar"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <main className="min-w-0">
              <ProductInfoSection
                ativo={produtoTela?.active ?? true}
                onAtivoChange={(value) =>
                  setProduto((prev) => (prev ? { ...prev, active: value, ativo: value } : prev))
                }
                codigoAnuncio={produtoTela?.code_id}
                criadoEm={produtoTela?.created_at}
                nome={produtoTela?.product ?? ""}
                onNomeChange={(value) =>
                  setProduto((prev) => (prev ? { ...prev, product: value } : prev))
                }
                checkNomeDuplicado={checkNomeDuplicado}
                onNomeValidityChange={setNomeValido}
                draftKeyNome={`produto-nome-draft-${id ?? "novo"}-${lojaCodigo}`}
                idBling={produtoTela?.id_bling ?? ""}
                onIdBlingChange={(value) =>
                  setProduto((prev) => (prev ? { ...prev, id_bling: value } : prev))
                }
                idBlingEditavel={!isEditing}
                loja={lojaNomeToCodigo(storeAtual) ?? lojaCodigo}
                onLojaChange={(value) =>
                  setProduto((prev) =>
                    prev ? { ...prev, store: toStoreName(value) ?? prev.store } : prev
                  )
                }
                referencia={produtoTela?.reference ?? ""}
                onReferenciaChange={(value) =>
                  setProduto((prev) => (prev ? { ...prev, reference: value } : prev))
                }
                marca={produtoTela?.mark ?? ""}
                onMarcaChange={(value) =>
                  setProduto((prev) => (prev ? { ...prev, mark: value } : prev))
                }
                checkReferenciaDuplicada={checkReferenciaDuplicada}
                draftKeyMeta={`produto-meta-draft-${id ?? "novo"}-${lojaCodigo}`}
                loading={loading}
              />
            </main>
          </div>
        </div>
      </div>

      <CompositionModal
        open={showCompositionModal}
        onClose={() => setShowCompositionModal(false)}
        announceId={produtoId}
        composicao={composicao}
        setComposicao={setComposicao}
        custoTotal={custoTotal}
        AnimatedNumber={AnimatedNumber}
      />
    </>
  );
}
