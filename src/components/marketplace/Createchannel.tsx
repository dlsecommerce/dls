// marketplace/Createchannelmodal.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Search,
  Trash2,
  Settings2, // ✅ novo ícone
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchDistinctChannels } from "@/components/marketplace/hooks/usemarketplace";
import ChannelPricingRulesModal from "@/components/marketplace/Channelpricingrulesmodal"; // ✅ novo import

// Lojas base cujos anúncios serão duplicados para o novo canal.
const SOURCE_STORES = ["Pikot Shop", "Sóbaquetas"] as const;

type CreateChannelModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void; // chamado após criar/excluir o canal com sucesso (ex.: refetch da tabela)
};

type BaseRow = {
  store: string;
  id_bling: string | null;
  reference: string;
  product: string;
  mark: string | null;
  code_id: string | null;
};

function normalizeChannelName(v: string): string {
  return String(v ?? "").trim();
}

export default function CreateChannelModal({
  open,
  onClose,
  onSuccess,
}: CreateChannelModalProps) {
  // ---------------------------------------------------------------------
  // Criar canal
  // ---------------------------------------------------------------------
  const [channelName, setChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // ---------------------------------------------------------------------
  // Excluir canal (HARD DELETE — remove permanentemente do banco)
  // ---------------------------------------------------------------------
  const [allChannels, setAllChannels] = useState<string[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [deleteQuery, setDeleteQuery] = useState("");
  const [deleteSugestoes, setDeleteSugestoes] = useState<string[]>([]);
  const [deleteDropdownOpen, setDeleteDropdownOpen] = useState(false);
  const [selectedChannelToDelete, setSelectedChannelToDelete] = useState<string | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [erroDelete, setErroDelete] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [contandoAnuncios, setContandoAnuncios] = useState(false);
  const [anunciosParaExcluir, setAnunciosParaExcluir] = useState<number | null>(null);

  const deleteDropdownRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------
  // ✅ Configurar regras de precificação de um canal existente
  // ---------------------------------------------------------------------
  const [rulesQuery, setRulesQuery] = useState("");
  const [rulesSugestoes, setRulesSugestoes] = useState<string[]>([]);
  const [rulesDropdownOpen, setRulesDropdownOpen] = useState(false);
  const [selectedChannelForRules, setSelectedChannelForRules] = useState<string | null>(
    null
  );
  const [openPricingRulesModal, setOpenPricingRulesModal] = useState(false);

  const rulesDropdownRef = useRef<HTMLDivElement>(null);

  // Carrega a lista de canais existentes ao abrir o modal
  useEffect(() => {
    if (!open) return;

    setChannelsLoading(true);
    fetchDistinctChannels()
      .then((channels) => setAllChannels(channels))
      .catch(() => setAllChannels([]))
      .finally(() => setChannelsLoading(false));
  }, [open]);

  // Fecha o dropdown de exclusão ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (deleteDropdownRef.current?.contains(e.target as Node)) return;
      setDeleteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ✅ Fecha o dropdown de regras ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rulesDropdownRef.current?.contains(e.target as Node)) return;
      setRulesDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const resetState = () => {
    setChannelName("");
    setErro(null);
    setProgressCount(0);
    setProgressTotal(0);

    setDeleteQuery("");
    setDeleteSugestoes([]);
    setDeleteDropdownOpen(false);
    setSelectedChannelToDelete(null);
    setErroDelete(null);
    setConfirmandoExclusao(false);
    setAnunciosParaExcluir(null);

    // ✅ reset da seção de regras
    setRulesQuery("");
    setRulesSugestoes([]);
    setRulesDropdownOpen(false);
    setSelectedChannelForRules(null);
  };

  const handleClose = () => {
    if (creating || deleting) return; // impede fechar durante operações em curso
    resetState();
    onClose();
  };

  // ---------------------------------------------------------------------
  // Criar canal
  // ---------------------------------------------------------------------
  const handleCreateChannel = async () => {
    const nome = normalizeChannelName(channelName);

    if (!nome) {
      setErro("Informe um nome para o novo canal.");
      return;
    }

    setErro(null);
    setCreating(true);
    setProgressCount(0);
    setProgressTotal(0);

    try {
      const { data: existente, error: erroExistente } = await supabase
        .schema("newsystem")
        .from("marketplace")
        .select("id")
        .eq("channel", nome)
        .is("deleted_at", null)
        .limit(1);

      if (erroExistente) throw erroExistente;

      if (existente && existente.length > 0) {
        setErro(`Já existe um canal chamado "${nome}".`);
        setCreating(false);
        return;
      }

      const { data: baseRows, error: erroBase } = await supabase
        .schema("newsystem")
        .from("marketplace")
        .select("store, id_bling, reference, product, mark, code_id")
        .in("store", SOURCE_STORES as unknown as string[])
        .is("deleted_at", null);

      if (erroBase) throw erroBase;

      const rows = (baseRows ?? []) as BaseRow[];

      if (rows.length === 0) {
        setErro("Nenhum anúncio encontrado nas lojas Pikot Shop e Sóbaquetas.");
        setCreating(false);
        return;
      }

      setProgressTotal(rows.length);

      let sucesso = 0;
      let falhas = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const { error: erroUpsert } = await supabase
          .schema("newsystem")
          .rpc("upsert_marketplace", {
            p_store: row.store,
            p_channel: nome,
            p_id_bling: row.id_bling,
            p_reference: row.reference,
            p_product: row.product,
            p_mark: row.mark,
            p_code_id: row.code_id,
            p_ativo: true,
            p_id: null,
          });

        if (erroUpsert) {
          console.error("Erro ao duplicar anúncio para novo canal:", erroUpsert, row);
          falhas++;
        } else {
          sucesso++;
        }

        setProgressCount(i + 1);
      }

      if (sucesso > 0) {
        toast.success(
          `Canal "${nome}" criado com ${sucesso} anúncio(s)${
            falhas > 0 ? ` (${falhas} falharam)` : ""
          }.`
        );
        onSuccess?.();
        resetState();
        onClose();
      } else {
        setErro("Nenhum anúncio pôde ser criado no novo canal.");
      }
    } catch (err: any) {
      console.error("[CreateChannelModal] handleCreateChannel:", err);
      setErro(err?.message ?? "Erro ao criar o novo canal.");
    } finally {
      setCreating(false);
    }
  };

  const progressPercent =
    progressTotal > 0 ? Math.round((progressCount / progressTotal) * 100) : 0;

  // ---------------------------------------------------------------------
  // Excluir canal
  // ---------------------------------------------------------------------
  const handleDeleteQueryChange = (value: string) => {
    setDeleteQuery(value);
    setErroDelete(null);
    setSelectedChannelToDelete(null);
    setAnunciosParaExcluir(null);
    setConfirmandoExclusao(false);

    const termo = value.trim().toLowerCase();

    if (!termo) {
      setDeleteSugestoes([]);
      setDeleteDropdownOpen(false);
      return;
    }

    const filtrados = allChannels.filter((c) => c.toLowerCase().includes(termo));
    setDeleteSugestoes(filtrados);
    setDeleteDropdownOpen(true);
  };

  const handleSelectChannelToDelete = async (canal: string) => {
    setSelectedChannelToDelete(canal);
    setDeleteQuery(canal);
    setDeleteDropdownOpen(false);
    setErroDelete(null);
    setConfirmandoExclusao(false);

    setContandoAnuncios(true);
    try {
      const { count, error } = await supabase
        .schema("newsystem")
        .from("marketplace")
        .select("id", { count: "exact", head: true })
        .eq("channel", canal);

      if (error) throw error;
      setAnunciosParaExcluir(count ?? 0);
    } catch (err: any) {
      console.error("[CreateChannelModal] contar anúncios do canal:", err);
      setAnunciosParaExcluir(null);
    } finally {
      setContandoAnuncios(false);
    }
  };

  const handleClearSelectedChannel = () => {
    setSelectedChannelToDelete(null);
    setDeleteQuery("");
    setAnunciosParaExcluir(null);
    setConfirmandoExclusao(false);
    setErroDelete(null);
  };

  const handleRequestDeleteChannel = () => {
    if (!selectedChannelToDelete) {
      setErroDelete("Selecione um canal existente para excluir.");
      return;
    }
    setConfirmandoExclusao(true);
  };

  const handleConfirmDeleteChannel = async () => {
    if (!selectedChannelToDelete) return;

    setDeleting(true);
    setErroDelete(null);

    try {
      const { error, count } = await supabase
        .schema("newsystem")
        .from("marketplace")
        .delete({ count: "exact" })
        .eq("channel", selectedChannelToDelete);

      if (error) throw error;

      toast.success(
        `Canal "${selectedChannelToDelete}" excluído permanentemente (${
          count ?? 0
        } anúncio(s) removido(s)).`
      );

      onSuccess?.();
      resetState();
      onClose();
    } catch (err: any) {
      console.error("[CreateChannelModal] handleConfirmDeleteChannel:", err);
      setErroDelete(err?.message ?? "Erro ao excluir o canal.");
      setConfirmandoExclusao(false);
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------
  // ✅ Configurar regras de precificação
  // ---------------------------------------------------------------------
  const handleRulesQueryChange = (value: string) => {
    setRulesQuery(value);
    setSelectedChannelForRules(null);

    const termo = value.trim().toLowerCase();

    if (!termo) {
      setRulesSugestoes([]);
      setRulesDropdownOpen(false);
      return;
    }

    const filtrados = allChannels.filter((c) => c.toLowerCase().includes(termo));
    setRulesSugestoes(filtrados);
    setRulesDropdownOpen(true);
  };

  const handleSelectChannelForRules = (canal: string) => {
    setSelectedChannelForRules(canal);
    setRulesQuery(canal);
    setRulesDropdownOpen(false);
  };

  const handleClearSelectedChannelForRules = () => {
    setSelectedChannelForRules(null);
    setRulesQuery("");
  };

  const handleOpenPricingRules = () => {
    if (!selectedChannelForRules) return;
    setOpenPricingRulesModal(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          onEscapeKeyDown={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="
            !rounded-none bg-[#0a0a0a] border border-neutral-800 shadow-2xl
            w-[calc(100vw-16px)] max-w-[calc(100vw-16px)]
            sm:w-[95%] sm:max-w-lg
            flex flex-col overflow-hidden p-0
          "
        >
          <DialogHeader className="shrink-0 border-b border-neutral-900 px-4 pt-4 pb-3 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-300">
              <Layers className="h-4 w-4 text-[#1a8ceb]" />
              Canais de Marketplace
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {/* ───────────────────────── Criar canal ───────────────────────── */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-channel-name"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                >
                  Nome do canal
                </label>
                <Input
                  id="new-channel-name"
                  type="text"
                  placeholder="Ex.: Amazon, AliExpress, Casas Bahia..."
                  value={channelName}
                  onChange={(e) => {
                    setChannelName(e.target.value);
                    if (erro) setErro(null);
                  }}
                  disabled={creating || deleting}
                  className="
                    !h-10 !rounded-none !border !border-neutral-800 !bg-[#050505]
                    !px-3 !text-[13px] !text-white !shadow-none
                    placeholder:!text-neutral-600
                    focus-visible:!ring-1 focus-visible:!ring-[#1a8ceb]
                  "
                />
              </div>

              <div className="border border-neutral-900 bg-neutral-950/50 px-3 py-2.5">
                <p className="text-[11.5px] leading-relaxed text-neutral-500">
                  Todos os anúncios ativos das lojas{" "}
                  <span className="font-medium text-neutral-300">Pikot Shop</span> e{" "}
                  <span className="font-medium text-neutral-300">Sóbaquetas</span> serão
                  duplicados automaticamente para este novo canal.
                </p>
              </div>

              {creating && progressTotal > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Criando anúncios...</span>
                    <span>
                      {progressCount}/{progressTotal} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-neutral-900">
                    <div
                      className="h-full bg-[#1a8ceb] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {erro && (
                <p className="flex items-center gap-1.5 text-[12px] text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {erro}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateChannel}
                disabled={creating || deleting || !channelName.trim()}
                className="
                  flex h-9 w-full items-center justify-center gap-2
                  bg-[#1a8ceb] text-[12px] font-medium uppercase tracking-wide text-white
                  transition-colors hover:bg-[#1579d1]
                  disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Criar canal
                  </>
                )}
              </button>
            </div>

            {/* ─────────────────── ✅ Configurar regras de precificação ─────────────────── */}
            <div className="mt-6 border-t border-neutral-900 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" style={{ color: "#1a8ceb" }} />
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Configurar regras de um canal
                </h3>
              </div>

              <div ref={rulesDropdownRef} className="relative">
                <label
                  htmlFor="rules-channel-search"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                >
                  Buscar canal
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input
                    id="rules-channel-search"
                    type="text"
                    placeholder="Digite o nome do canal..."
                    value={rulesQuery}
                    onChange={(e) => handleRulesQueryChange(e.target.value)}
                    onFocus={() => {
                      if (rulesSugestoes.length > 0) setRulesDropdownOpen(true);
                    }}
                    disabled={creating || deleting || channelsLoading}
                    className="
                      !h-10 !rounded-none !border !border-neutral-800 !bg-[#050505]
                      !pl-9 !pr-9 !text-[13px] !text-white !shadow-none
                      placeholder:!text-neutral-600
                      focus-visible:!ring-1 focus-visible:!ring-[#1a8ceb]
                    "
                  />

                  {rulesQuery && (
                    <button
                      type="button"
                      onClick={handleClearSelectedChannelForRules}
                      className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-neutral-600 hover:text-white"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {rulesDropdownOpen && rulesSugestoes.length > 0 && (
                    <div
                      className="
                        absolute left-0 top-full z-[60] mt-1 max-h-48 w-full
                        overflow-y-auto border border-neutral-800 bg-[#0a0a0a]
                        shadow-[0_12px_32px_rgba(0,0,0,0.6)]
                      "
                    >
                      {rulesSugestoes.map((canal) => (
                        <button
                          key={canal}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectChannelForRules(canal);
                          }}
                          className="
                            flex w-full items-center justify-between border-b
                            border-neutral-900 px-3 py-2.5 text-left text-[13px]
                            text-neutral-300 transition-colors last:border-b-0
                            hover:bg-neutral-900/60
                          "
                        >
                          {canal}
                        </button>
                      ))}
                    </div>
                  )}

                  {rulesDropdownOpen &&
                    rulesQuery.trim() &&
                    rulesSugestoes.length === 0 &&
                    !channelsLoading && (
                      <div
                        className="
                          absolute left-0 top-full z-[60] mt-1 w-full
                          border border-neutral-800 bg-[#0a0a0a] px-3 py-2.5
                          text-[12px] text-neutral-500
                        "
                      >
                        Nenhum canal encontrado.
                      </div>
                    )}
                </div>
              </div>

              {selectedChannelForRules && (
                <div className="mt-3 border border-[#1a8ceb]/30 bg-[#1a8ceb]/[0.04] px-3 py-2.5">
                  <p className="text-[12px] text-neutral-300">
                    Canal selecionado:{" "}
                    <span className="font-semibold text-white">
                      {selectedChannelForRules}
                    </span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenPricingRules}
                disabled={creating || deleting || !selectedChannelForRules}
                className="
                  mt-3 flex h-9 w-full items-center justify-center gap-2
                  border border-[#1a8ceb]/40 bg-transparent text-[12px] font-medium
                  uppercase tracking-wide text-[#1a8ceb]
                  transition-colors hover:bg-[#1a8ceb]/10
                  disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configurar regras deste canal
              </button>
            </div>

            {/* ───────────────────────── Excluir canal ───────────────────────── */}
            <div className="mt-6 border-t border-neutral-900 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Excluir canal existente (permanente)
                </h3>
              </div>

              <div ref={deleteDropdownRef} className="relative">
                <label
                  htmlFor="delete-channel-search"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                >
                  Buscar canal
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input
                    id="delete-channel-search"
                    type="text"
                    placeholder="Digite o nome do canal..."
                    value={deleteQuery}
                    onChange={(e) => handleDeleteQueryChange(e.target.value)}
                    onFocus={() => {
                      if (deleteSugestoes.length > 0) setDeleteDropdownOpen(true);
                    }}
                    disabled={creating || deleting || channelsLoading}
                    className="
                      !h-10 !rounded-none !border !border-neutral-800 !bg-[#050505]
                      !pl-9 !pr-9 !text-[13px] !text-white !shadow-none
                      placeholder:!text-neutral-600
                      focus-visible:!ring-1 focus-visible:!ring-red-500/60
                    "
                  />

                  {deleteQuery && (
                    <button
                      type="button"
                      onClick={handleClearSelectedChannel}
                      className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-neutral-600 hover:text-white"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {deleteDropdownOpen && deleteSugestoes.length > 0 && (
                    <div
                      className="
                        absolute left-0 top-full z-[60] mt-1 max-h-48 w-full
                        overflow-y-auto border border-neutral-800 bg-[#0a0a0a]
                        shadow-[0_12px_32px_rgba(0,0,0,0.6)]
                      "
                    >
                      {deleteSugestoes.map((canal) => (
                        <button
                          key={canal}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectChannelToDelete(canal);
                          }}
                          className="
                            flex w-full items-center justify-between border-b
                            border-neutral-900 px-3 py-2.5 text-left text-[13px]
                            text-neutral-300 transition-colors last:border-b-0
                            hover:bg-neutral-900/60
                          "
                        >
                          {canal}
                        </button>
                      ))}
                    </div>
                  )}

                  {deleteDropdownOpen &&
                    deleteQuery.trim() &&
                    deleteSugestoes.length === 0 &&
                    !channelsLoading && (
                      <div
                        className="
                          absolute left-0 top-full z-[60] mt-1 w-full
                          border border-neutral-800 bg-[#0a0a0a] px-3 py-2.5
                          text-[12px] text-neutral-500
                        "
                      >
                        Nenhum canal encontrado.
                      </div>
                    )}
                </div>
              </div>

              {selectedChannelToDelete && (
                <div className="mt-3 border border-red-500/30 bg-red-500/[0.04] px-3 py-2.5">
                  <p className="text-[12px] text-neutral-300">
                    Canal selecionado:{" "}
                    <span className="font-semibold text-white">
                      {selectedChannelToDelete}
                    </span>
                  </p>
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    {contandoAnuncios ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Contando anúncios...
                      </span>
                    ) : anunciosParaExcluir !== null ? (
                      <>
                        <span className="font-medium text-red-400">
                          {anunciosParaExcluir}
                        </span>{" "}
                        anúncio(s) serão excluídos <strong>permanentemente</strong> (sem
                        possibilidade de recuperação).
                      </>
                    ) : null}
                  </p>
                </div>
              )}

              {erroDelete && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {erroDelete}
                </p>
              )}

              {!confirmandoExclusao ? (
                <button
                  type="button"
                  onClick={handleRequestDeleteChannel}
                  disabled={
                    creating || deleting || !selectedChannelToDelete || contandoAnuncios
                  }
                  className="
                    mt-3 flex h-9 w-full items-center justify-center gap-2
                    border border-red-500/40 bg-transparent text-[12px] font-medium
                    uppercase tracking-wide text-red-400
                    transition-colors hover:bg-red-500/10
                    disabled:cursor-not-allowed disabled:opacity-40
                  "
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir canal
                </button>
              ) : (
                <div className="mt-3 space-y-2 border border-red-500/40 bg-red-500/[0.06] px-3 py-3">
                  <p className="text-[12px] font-medium text-white">
                    Excluir permanentemente? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmandoExclusao(false)}
                      disabled={deleting}
                      className="
                        flex h-8 flex-1 items-center justify-center gap-2
                        border border-neutral-800 bg-transparent text-[11.5px] font-medium
                        uppercase tracking-wide text-neutral-400
                        transition-colors hover:bg-neutral-900 hover:text-white
                        disabled:cursor-not-allowed disabled:opacity-40
                      "
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteChannel}
                      disabled={deleting}
                      className="
                        flex h-8 flex-1 items-center justify-center gap-2
                        bg-red-500 text-[11.5px] font-medium uppercase tracking-wide text-white
                        transition-colors hover:bg-red-600
                        disabled:cursor-not-allowed disabled:opacity-40
                      "
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5" />
                          Confirmar exclusão
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-neutral-900 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating || deleting}
              className="
                flex h-9 w-full items-center justify-center gap-2
                border border-neutral-800 bg-transparent text-[12px] font-medium
                uppercase tracking-wide text-neutral-400
                transition-colors hover:bg-neutral-900 hover:text-white
                disabled:cursor-not-allowed disabled:opacity-40
              "
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal de regras de precificação do canal selecionado */}
      <ChannelPricingRulesModal
        open={openPricingRulesModal}
        onOpenChange={setOpenPricingRulesModal}
        channel={selectedChannelForRules ?? ""}
        onApplied={() => {
          onSuccess?.();
        }}
      />
    </>
  );
}
