  "use client";

  import { useState, useCallback, useRef } from "react";
  import { toast } from "sonner";
  import { supabase } from "@/integrations/supabase/client";
  import { useRouter } from "next/navigation";
  import { createNotification } from "@/lib/createNotification";
  import type { Announce, StoreName } from "@/components/announce/hooks/types";

  type ProdutoInput = Partial<Announce> & Record<string, any>;

  /* ─────────────────────────────────────────────
  * NORMALIZAÇÃO
  * ───────────────────────────────────────────── */

  function anyToStoreName(v: any): StoreName | null {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return null;
    if (s === "pk" || s === "pikot shop" || s === "pikot") return "Pikot Shop";
    if (s === "sb" || s === "sóbaquetas" || s === "sobaquetas") return "Sóbaquetas";
    return null;
  }

  /** Usar em colunas nullable (mark, id_bling). */
  function normalizeNullable(v: any): string | null {
    const s = String(v ?? "").trim();
    return s ? s : null;
  }

  /** Usar em colunas NOT NULL (reference, product). Nunca retorna null. */
  function normalizeRequired(v: any): string {
    return String(v ?? "").trim();
  }

  /**
   * id_bling não participa da unicidade (chave é store + reference).
   * Aqui só filtramos valores "placeholder" que indicam ausência real do dado.
   */
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

  function getField(obj: any, ...keys: string[]) {
    for (const key of keys) {
      if (obj?.[key] !== undefined && obj?.[key] !== null) {
        return obj[key];
      }
    }
    return "";
  }

  function getProdutoLabel(produto: ProdutoInput, fallback: string) {
    return (
      produto?.product ||
      produto?.nome ||
      produto?.Nome ||
      produto?.reference ||
      produto?.referencia ||
      produto?.id_bling ||
      fallback
    );
  }

  function buildAnnouncementLink(id: string, store: StoreName) {
    return `/dashboard/anuncios/edit?id=${encodeURIComponent(id)}&loja=${encodeURIComponent(store)}`;
  }

  /* ─────────────────────────────────────────────
  * MENSAGENS DE ERRO AMIGÁVEIS
  * ───────────────────────────────────────────── */

  function mapErrorMessage(err: any): string {
    const msg = String(err?.message || err || "");

    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return "Já existe um anúncio com essa referência nessa loja.";
    }
    if (msg.includes("violates not-null constraint")) {
      return "Faltam campos obrigatórios para salvar o anúncio.";
    }
    if (msg.includes("Failed to fetch") || msg.includes("network")) {
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    }
    return msg || "Erro desconhecido.";
  }

  /* ─────────────────────────────────────────────
  * LOG ESTRUTURADO (stub — plugue Sentry/LogRocket aqui)
  * ───────────────────────────────────────────── */

  function logError(context: string, err: any, extra?: Record<string, any>) {
    // eslint-disable-next-line no-console
    console.error(`[useAnuncioActions] ${context}:`, err, extra);
    // Sentry.captureException(err, { extra: { context, ...extra } });
  }

  /**
   * Notificação isolada: falhas aqui nunca devem afetar o feedback
   * da operação principal (save/delete) já concluída com sucesso.
   */
  async function safeNotify(
    context: string,
    payload: Parameters<typeof createNotification>[0]
  ) {
    try {
      await createNotification(payload);
    } catch (notifErr) {
      logError(`${context}:notification`, notifErr, { entityId: payload.entityId });
    }
  }

  /* ─────────────────────────────────────────────
  * RETRY COM BACKOFF (apenas para falhas de rede)
  * ───────────────────────────────────────────── */

  async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");
        const isNetworkError = msg.includes("Failed to fetch") || msg.includes("network");
        if (!isNetworkError || attempt === retries) break;
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }

    throw lastError;
  }

  /**
   * Soft delete compartilhado entre exclusão única e em lote.
   */
  async function softDeleteByIds(ids: string[]) {
    const { error } = await withRetry(() =>
      supabase
        .schema("newsystem")
        .from("announce")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids)
    );

    if (error) throw error;
  }

  /* ─────────────────────────────────────────────
  * LOCKS (evita duplo submit no client)
  * ───────────────────────────────────────────── */

  const savingLocks = new Set<string>();
  const deletingLocks = new Set<string>();

  /* ─────────────────────────────────────────────
  * HOOK
  * ───────────────────────────────────────────── */

  export function useAnuncioActions() {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Lock global: impede saves paralelos de QUALQUER anúncio enquanto um está
    // em andamento. Mantido além do lock por chave (store:reference), que
    // impede apenas duplo submit do MESMO anúncio.
    const savingRef = useRef(false);

    const router = useRouter();

    const handleSave = useCallback(
      async (produto: ProdutoInput, onAfterSave?: () => void) => {
        const store = anyToStoreName(produto?.store ?? produto?.loja ?? produto?.Loja);

        if (!store) {
          toast.error("Selecione uma loja válida antes de salvar.");
          return;
        }

        const reference = normalizeRequired(
          getField(produto, "reference", "referencia", "Referência", "Referencia", "sku")
        );

        if (!reference) {
          toast.error("Informe uma referência válida para o anúncio.");
          return;
        }

        const lockKey = `${store}:${reference}`;

        if (savingLocks.has(lockKey) || savingRef.current) {
          return;
        }

        savingLocks.add(lockKey);
        savingRef.current = true;
        setSaving(true);

        const idBling = normalizeIdBling(
          getField(produto, "id_bling", "ID Bling", "idBling", "ID_Bling")
        );

        const product = normalizeRequired(getField(produto, "product", "nome", "Nome"));
        const mark = normalizeNullable(getField(produto, "mark", "marca", "Marca"));

        if (!product) {
          toast.error("Informe o nome do produto para salvar o anúncio.");
          savingLocks.delete(lockKey);
          savingRef.current = false;
          setSaving(false);
          return;
        }

        const isUpdate = Boolean(produto?.id);
        let idFinal = "";

        try {
          const { data, error } = await withRetry(() =>
            supabase.schema("newsystem").rpc("upsert_announce", {
              p_store: store,
              p_id_bling: idBling,
              p_reference: reference,
              p_product: product,
              p_mark: mark,
            })
          );

          if (error) throw error;

          idFinal = String(data ?? "");

          toast.success(isUpdate ? "Anúncio atualizado." : "Anúncio criado.");

          if (onAfterSave) onAfterSave();
          else router.push("/dashboard/anuncios");
        } catch (err: any) {
          logError("handleSave", err, { store, reference });
          toast.error("Erro ao salvar anúncio: " + mapErrorMessage(err));
          return;
        } finally {
          savingLocks.delete(lockKey);
          savingRef.current = false;
          setSaving(false);
        }

        await safeNotify("handleSave", {
          title: isUpdate ? "Anúncio atualizado" : "Anúncio criado",
          message: `O anúncio "${getProdutoLabel(produto, idFinal)}" foi ${isUpdate ? "atualizado" : "criado"}.`,
          action: isUpdate ? "update" : "create",
          entityType: "announcement",
          entityId: idFinal,
          link: buildAnnouncementLink(idFinal, store),
        });
      },
      [router]
    );

    const handleDelete = useCallback(
      async (produto: ProdutoInput, onAfterDelete?: () => void) => {
        const idProduto = String(produto?.id ?? "").trim();

        if (!idProduto) {
          toast.error("Anúncio inválido para exclusão.");
          return;
        }

        if (deletingLocks.has(idProduto)) return;
        deletingLocks.add(idProduto);
        setDeleting(true);

        try {
          await softDeleteByIds([idProduto]);

          toast.success("Anúncio excluído.");

          if (onAfterDelete) onAfterDelete();
          else router.push("/dashboard/anuncios");
        } catch (err: any) {
          logError("handleDelete", err, { idProduto });
          toast.error("Erro ao excluir anúncio: " + mapErrorMessage(err));
          return;
        } finally {
          deletingLocks.delete(idProduto);
          setDeleting(false);
        }

        await safeNotify("handleDelete", {
          title: "Anúncio excluído",
          message: `O anúncio "${getProdutoLabel(produto, idProduto)}" foi excluído do sistema.`,
          action: "delete",
          entityType: "announcement",
          entityId: idProduto,
          link: "/dashboard/anuncios",
        });
      },
      [router]
    );

    const handleDeleteSelected = useCallback(
      async (selectedRows: ProdutoInput[], onAfterDelete?: () => void) => {
        if (!selectedRows?.length) {
          toast.error("Nenhum anúncio selecionado para exclusão.");
          return;
        }

        const selectedRowsSnapshot = [...selectedRows];

        const ids = selectedRowsSnapshot
          .map((row) => String(row?.id ?? "").trim())
          .filter(Boolean);

        if (!ids.length) {
          toast.error("Nenhum ID válido encontrado na seleção.");
          return;
        }

        const lockKey = ids.sort().join(",");
        if (deletingLocks.has(lockKey)) return;
        deletingLocks.add(lockKey);
        setDeleting(true);

        try {
          await softDeleteByIds(ids);

          toast.success(
            selectedRowsSnapshot.length === 1
              ? "Anúncio excluído."
              : `${selectedRowsSnapshot.length} anúncios excluídos.`
          );

          if (onAfterDelete) onAfterDelete();
        } catch (err: any) {
          logError("handleDeleteSelected", err, { ids });
          toast.error("Erro ao excluir anúncios: " + mapErrorMessage(err));
          return;
        } finally {
          deletingLocks.delete(lockKey);
          setDeleting(false);
        }

        const labels = selectedRowsSnapshot
          .slice(0, 3)
          .map((row) => `"${getProdutoLabel(row, row?.id ?? "anúncio")}"`);

        const message =
          selectedRowsSnapshot.length === 1
            ? `O anúncio ${labels[0]} foi excluído do sistema.`
            : selectedRowsSnapshot.length <= 3
            ? `Os anúncios ${labels.join(", ")} foram excluídos do sistema.`
            : `Os anúncios ${labels.join(", ")} e mais ${selectedRowsSnapshot.length - 3} foram excluídos do sistema.`;

        await safeNotify("handleDeleteSelected", {
          title: selectedRowsSnapshot.length === 1 ? "Anúncio excluído" : "Anúncios excluídos",
          message,
          action: "delete",
          entityType: "announcement",
          entityId: ids[0],
          link: "/dashboard/anuncios",
        });
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
