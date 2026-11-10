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
  Settings2,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchDistinctChannels } from "@/components/marketplace/hooks/usemarketplace";
import ChannelPricingRulesModal from "@/components/marketplace/Channelpricingrulesmodal";
import { invalidateAndRefetchDbRules } from "@/components/costs/hooks/usechannelpricing";

// Lojas base cujos anúncios serão duplicados para o novo canal.
const SOURCE_STORES = ["Pikot Shop", "Sóbaquetas"] as const;

type CreateChannelModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

// ---------------------------------------------------------------------
// Tipos e formatação das regras do canal
// ---------------------------------------------------------------------
type Modo = "fixed" | "percent";
type PricingMode = "flat" | "tiered" | "brand";

type RegraListing = {
  commission_rate?: number;
  fixed_fee?: number;
  frete?: number | null;
  frete_mode?: Modo | null;
};

type RegraCanal = {
  pricing_mode: PricingMode | null;
  // flat: percentual (12 = 12%)
  comissao: number | null;
  // frete geral: percentual se frete_mode = percent, senão R$
  frete: number | null;
  frete_mode: Modo | null;
  commission_tiers: Array<{
    min: number;
    max: number | null;
    rate: number; // fração (0.12 = 12%)
    fixedFee: number; // R$
  }> | null;
  default_rule: { commission_rate: number; fixed_fee: number } | null;
  brand_rules: Array<{
    brand: string;
    commission_rate: number; // fração
    fixed_fee: number; // R$
    classico?: { rate: number; fixedFee: number };
    premium?: { rate: number; fixedFee: number };
  }> | null;
  listing_type_rules: Record<string, unknown> | null;
};

const MODO_LABEL: Record<string, string> = {
  flat: "Fixo",
  tiered: "Por Preço",
  brand: "Por Marca",
};

const LISTING_LABEL: Record<string, string> = {
  classico: "Clássico",
  premium: "Premium",
};

const nf = (n: number, casas = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });

// Valor já em percentual (ex.: 12 -> "12%")
const fmtPctDireto = (p: number | null | undefined) => (p == null ? "—" : `${nf(p)}%`);

// Valor em fração (ex.: 0.12 -> "12%")
const fmtPctFracao = (f: number | null | undefined) => (f == null ? "—" : `${nf(f * 100)}%`);

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtFrete = (valor: number | null | undefined, modo: Modo | null | undefined) =>
  valor == null ? "—" : modo === "percent" ? fmtPctDireto(valor) : fmtBRL(valor);

// Achata listing_type_rules. O import grava em dois níveis (modo -> listing),
// mas aceita também o formato sem modo, para que o resumo mostre o que estiver gravado.
type LinhaListing = { modo: string; listing: string; regra: RegraListing };

function linhasListing(lt: Record<string, unknown> | null): LinhaListing[] {
  if (!lt) return [];
  const out: LinhaListing[] = [];

  for (const [chave, valor] of Object.entries(lt)) {
    if (!valor || typeof valor !== "object") continue;

    if ("commission_rate" in (valor as object)) {
      out.push({ modo: "", listing: chave, regra: valor as RegraListing });
      continue;
    }

    for (const [listing, regra] of Object.entries(valor as Record<string, unknown>)) {
      if (regra && typeof regra === "object") {
        out.push({ modo: chave, listing, regra: regra as RegraListing });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------
// Resumo visual da regra do canal selecionado
// ---------------------------------------------------------------------
function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11.5px] text-neutral-500">{rotulo}</span>
      <span className="text-right text-[12px] font-medium text-neutral-200">{valor}</span>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-900 pt-2.5 first:border-t-0 first:pt-0">
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function RegraCanalResumo({
  regra,
  produtos,
  carregando,
  erro,
}: {
  regra: RegraCanal | null;
  produtos: number | null;
  carregando: boolean;
  erro: string | null;
}) {
  if (carregando) {
    return (
      <div className="mt-3 flex items-center gap-2 border border-neutral-900 px-3 py-2.5 text-[11.5px] text-neutral-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando regras do canal...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mt-3 flex items-center gap-1.5 border border-red-500/30 px-3 py-2.5 text-[11.5px] text-red-400">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {erro}
      </div>
    );
  }

  if (!regra || !regra.pricing_mode) {
    return (
      <div className="mt-3 border border-neutral-900 bg-neutral-950/50 px-3 py-2.5 text-[11.5px] text-neutral-500">
        Nenhuma regra de precificação configurada para este canal.
      </div>
    );
  }

  const listings = linhasListing(regra.listing_type_rules);

  return (
    <div className="mt-3 space-y-3 border border-neutral-900 bg-neutral-950/50 px-3 py-3">
      <Bloco titulo="Geral">
        <Campo rotulo="Modo" valor={MODO_LABEL[regra.pricing_mode] ?? regra.pricing_mode} />
        {regra.pricing_mode === "flat" && (
          <Campo rotulo="Comissão" valor={fmtPctDireto(regra.comissao)} />
        )}
        <Campo rotulo="Frete geral" valor={fmtFrete(regra.frete, regra.frete_mode)} />
        <Campo
          rotulo="Regras por produto"
          valor={produtos == null ? "—" : `${produtos} produto(s)`}
        />
      </Bloco>

      {listings.length > 0 && (
        <Bloco titulo="Clássico / Premium (prioridade sobre o modo)">
          {listings.map(({ modo, listing, regra: r }) => (
            <div key={`${modo}-${listing}`} className="py-1">
              <p className="text-[12px] font-medium text-neutral-200">
                {LISTING_LABEL[listing] ?? listing}
                {modo && (
                  <span className="font-normal text-neutral-500">
                    {" "}
                    · {MODO_LABEL[modo] ?? modo}
                  </span>
                )}
              </p>
              <p className="text-[11.5px] text-neutral-400">
                Comissão {fmtPctFracao(r.commission_rate)} · Taxa fixa {fmtBRL(r.fixed_fee)} · Frete{" "}
                {fmtFrete(r.frete, r.frete_mode)}
              </p>
            </div>
          ))}
        </Bloco>
      )}

      {regra.pricing_mode === "tiered" && (
        <Bloco titulo="Faixas de preço">
          {regra.commission_tiers && regra.commission_tiers.length > 0 ? (
            regra.commission_tiers.map((t, i) => (
              <div key={i} className="py-1">
                <p className="text-[12px] font-medium text-neutral-200">
                  {fmtBRL(t.min)} até {t.max == null ? "sem limite" : fmtBRL(t.max)}
                </p>
                <p className="text-[11.5px] text-neutral-400">
                  Comissão {fmtPctFracao(t.rate)} · Taxa fixa {fmtBRL(t.fixedFee)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[11.5px] text-neutral-500">Nenhuma faixa cadastrada.</p>
          )}
        </Bloco>
      )}

      {regra.pricing_mode === "brand" && (
        <Bloco titulo="Por marca">
          {regra.default_rule && (
            <div className="py-1">
              <p className="text-[12px] font-medium text-neutral-200">Padrão (demais marcas)</p>
              <p className="text-[11.5px] text-neutral-400">
                Comissão {fmtPctFracao(regra.default_rule.commission_rate)} · Taxa fixa{" "}
                {fmtBRL(regra.default_rule.fixed_fee)}
              </p>
            </div>
          )}
          {regra.brand_rules && regra.brand_rules.length > 0 ? (
            regra.brand_rules.map((b, i) => (
              <div key={`${b.brand}-${i}`} className="py-1">
                <p className="text-[12px] font-medium text-neutral-200">{b.brand}</p>
                <p className="text-[11.5px] text-neutral-400">
                  Comissão {fmtPctFracao(b.commission_rate)} · Taxa fixa {fmtBRL(b.fixed_fee)}
                </p>
                {b.classico && (
                  <p className="text-[11.5px] text-neutral-500">
                    Clássico {fmtPctFracao(b.classico.rate)} + {fmtBRL(b.classico.fixedFee)}
                  </p>
                )}
                {b.premium && (
                  <p className="text-[11.5px] text-neutral-500">
                    Premium {fmtPctFracao(b.premium.rate)} + {fmtBRL(b.premium.fixedFee)}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-[11.5px] text-neutral-500">Nenhuma marca cadastrada.</p>
          )}
        </Bloco>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------
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

  // ✅ NOVO: opção de criar canal sem duplicar anúncios
  const [createEmpty, setCreateEmpty] = useState(false);

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
  // Configurar regras de precificação de um canal existente
  // ---------------------------------------------------------------------
  const [rulesQuery, setRulesQuery] = useState("");
  const [rulesSugestoes, setRulesSugestoes] = useState<string[]>([]);
  const [rulesDropdownOpen, setRulesDropdownOpen] = useState(false);
  const [selectedChannelForRules, setSelectedChannelForRules] = useState<string | null>(
    null
  );
  const [openPricingRulesModal, setOpenPricingRulesModal] = useState(false);

  // Resumo da regra do canal selecionado
  const [regraCanal, setRegraCanal] = useState<RegraCanal | null>(null);
  const [produtosCanal, setProdutosCanal] = useState<number | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState<string | null>(null);
  // Incrementa após aplicar regras, para recarregar o resumo
  const [reloadKey, setReloadKey] = useState(0);

  const rulesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setChannelsLoading(true);
    fetchDistinctChannels()
      .then((channels) => setAllChannels(channels))
      .catch(() => setAllChannels([]))
      .finally(() => setChannelsLoading(false));
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (deleteDropdownRef.current?.contains(e.target as Node)) return;
      setDeleteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rulesDropdownRef.current?.contains(e.target as Node)) return;
      setRulesDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Carrega a regra e a contagem de produtos do canal selecionado.
  // O flag "cancelado" descarta respostas antigas quando o usuário troca de canal.
  useEffect(() => {
    if (!selectedChannelForRules) {
      setRegraCanal(null);
      setProdutosCanal(null);
      setErroResumo(null);
      setCarregandoResumo(false);
      return;
    }

    let cancelado = false;
    setCarregandoResumo(true);
    setErroResumo(null);

    (async () => {
      try {
        const [regraRes, prodRes] = await Promise.all([
          supabase
            .schema("newsystem")
            .from("marketplace_channel_rules")
            .select(
              "pricing_mode, comissao, frete, frete_mode, commission_tiers, default_rule, brand_rules, listing_type_rules"
            )
            .eq("channel", selectedChannelForRules)
            .maybeSingle(),
          supabase
            .schema("newsystem")
            .from("marketplace_product_rules")
            .select("channel", { count: "exact", head: true })
            .eq("channel", selectedChannelForRules)
            .is("deleted_at", null),
        ]);

        if (cancelado) return;
        if (regraRes.error) throw regraRes.error;
        if (prodRes.error) throw prodRes.error;

        setRegraCanal((regraRes.data as RegraCanal | null) ?? null);
        setProdutosCanal(prodRes.count ?? 0);
      } catch (err: any) {
        if (cancelado) return;
        console.error("[CreateChannelModal] carregar regras do canal:", err);
        setRegraCanal(null);
        setProdutosCanal(null);
        setErroResumo(err?.message ?? "Erro ao carregar as regras do canal.");
      } finally {
        if (!cancelado) setCarregandoResumo(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [selectedChannelForRules, reloadKey]);

  const resetState = () => {
    setChannelName("");
    setErro(null);
    setCreateEmpty(false);

    setDeleteQuery("");
    setDeleteSugestoes([]);
    setDeleteDropdownOpen(false);
    setSelectedChannelToDelete(null);
    setErroDelete(null);
    setConfirmandoExclusao(false);
    setAnunciosParaExcluir(null);

    setRulesQuery("");
    setRulesSugestoes([]);
    setRulesDropdownOpen(false);
    setSelectedChannelForRules(null);
  };

  const handleClose = () => {
    if (creating || deleting) return;
    resetState();
    onClose();
  };

  // ---------------------------------------------------------------------
  // ✅ Criar canal — agora com UMA ÚNICA chamada RPC (super rápido)
  // Se createEmpty=true, apenas registra o canal, sem duplicar anúncios.
  // ---------------------------------------------------------------------
  const handleCreateChannel = async () => {
    const nome = normalizeChannelName(channelName);

    if (!nome) {
      setErro("Informe um nome para o novo canal.");
      return;
    }

    setErro(null);
    setCreating(true);

    try {
      const jaExiste = allChannels.some(
        (c) => c.toLowerCase() === nome.toLowerCase()
      );

      if (jaExiste) {
        setErro(`Já existe um canal chamado "${nome}".`);
        setCreating(false);
        return;
      }

      if (createEmpty) {
        // ✅ Canal vazio — apenas registra o nome, sem tocar em `marketplace`
        const { error: erroEmpty } = await supabase
          .schema("newsystem")
          .rpc("create_channel_empty", { p_channel: nome });

        if (erroEmpty) throw erroEmpty;

        toast.success(`Canal "${nome}" criado sem anúncios.`);
        onSuccess?.();
        resetState();
        onClose();
        return;
      }

      // ✅ Canal com duplicação de anúncios — 1 chamada, insert em lote no banco
      const { data: totalCriados, error: erroBulk } = await supabase
        .schema("newsystem")
        .rpc("create_channel_bulk", {
          p_channel: nome,
          p_stores: SOURCE_STORES as unknown as string[],
        });

      if (erroBulk) throw erroBulk;

      if (!totalCriados || totalCriados === 0) {
        setErro("Nenhum anúncio encontrado nas lojas Pikot Shop e Sóbaquetas.");
        setCreating(false);
        return;
      }

      toast.success(`Canal "${nome}" criado com ${totalCriados} anúncio(s).`);
      onSuccess?.();
      resetState();
      onClose();
    } catch (err: any) {
      console.error("[CreateChannelModal] handleCreateChannel:", err);
      setErro(err?.message ?? "Erro ao criar o novo canal.");
    } finally {
      setCreating(false);
    }
  };

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

  // ✅ Ao excluir, remove também o registro em `channels` (caso exista canal vazio)
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

      await supabase
        .schema("newsystem")
        .from("channels")
        .delete()
        .eq("name", selectedChannelToDelete);

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
  // Configurar regras de precificação
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

              {/* ✅ NOVO: toggle "criar sem anúncios" */}
              <button
                type="button"
                onClick={() => setCreateEmpty((v) => !v)}
                disabled={creating || deleting}
                className="
                  flex w-full items-center justify-between border border-neutral-800
                  bg-neutral-950/50 px-3 py-2.5 text-left
                  transition-colors hover:bg-neutral-900/60
                  disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                <div>
                  <p className="text-[12px] font-medium text-neutral-200">
                    Criar canal sem anúncios
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Cria apenas o canal vazio, sem duplicar anúncios de Pikot Shop / Sóbaquetas.
                  </p>
                </div>
                <div
                  className={`
                    flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors
                    ${createEmpty ? "border-[#1a8ceb] bg-[#1a8ceb]/20" : "border-neutral-700 bg-neutral-900"}
                  `}
                >
                  <div
                    className={`
                      h-3.5 w-3.5 rounded-full transition-transform
                      ${createEmpty ? "translate-x-4 bg-[#1a8ceb]" : "translate-x-1 bg-neutral-600"}
                    `}
                  />
                </div>
              </button>

              {!createEmpty && (
                <div className="border border-neutral-900 bg-neutral-950/50 px-3 py-2.5">
                  <p className="text-[11.5px] leading-relaxed text-neutral-500">
                    Todos os anúncios ativos das lojas{" "}
                    <span className="font-medium text-neutral-300">Pikot Shop</span> e{" "}
                    <span className="font-medium text-neutral-300">Sóbaquetas</span> serão
                    duplicados automaticamente para este novo canal.
                  </p>
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
                    {createEmpty ? "Criar canal vazio" : "Criar canal"}
                  </>
                )}
              </button>
            </div>

            {/* ─────────────────── Configurar regras de precificação ─────────────────── */}
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
                <>
                  <div className="mt-3 border border-[#1a8ceb]/30 bg-[#1a8ceb]/[0.04] px-3 py-2.5">
                    <p className="text-[12px] text-neutral-300">
                      Canal selecionado:{" "}
                      <span className="font-semibold text-white">
                        {selectedChannelForRules}
                      </span>
                    </p>
                  </div>

                  <RegraCanalResumo
                    regra={regraCanal}
                    produtos={produtosCanal}
                    carregando={carregandoResumo}
                    erro={erroResumo}
                  />
                </>
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

      <ChannelPricingRulesModal
        open={openPricingRulesModal}
        onOpenChange={setOpenPricingRulesModal}
        channel={selectedChannelForRules ?? ""}
        onApplied={() => {
          // Invalida o cache global de dbRules e notifica qualquer instância
          // de useChannelPricing já montada (ex: a calculadora aberta em outra tela),
          // para que a nova regra (flat/tiered/brand) surta efeito sem reload.
          invalidateAndRefetchDbRules();
          // Recarrega o resumo exibido neste modal
          setReloadKey((k) => k + 1);
          onSuccess?.();
        }}
      />
    </>
  );
}
