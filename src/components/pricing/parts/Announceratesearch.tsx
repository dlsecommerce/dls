"use client";

import React from "react";
import { Search, Loader2 } from "lucide-react";
import {
  buscarAnunciosML,
  buscarTaxasDoAnuncio,
  type AnnounceRateSuggestion,
} from "@/components/marketplace/hooks/useannouncerates";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import { toast } from "sonner";

type Props = {
  store: string; // "Pikot Shop" | "Sóbaquetas"
  setCalculo: (key: ChannelKey, updater: (prev: any) => any) => void;
  setManualFlag: (key: ChannelKey, field: string, value: boolean) => void;
};

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced as T & { cancel: () => void };
}

export const AnnounceRateSearch: React.FC<Props> = ({
  store,
  setCalculo,
  setManualFlag,
}) => {
  const [termo, setTermo] = React.useState("");
  const [sugestoes, setSugestoes] = React.useState<AnnounceRateSuggestion[]>([]);
  const [aberto, setAberto] = React.useState(false);
  const [buscando, setBuscando] = React.useState(false);
  const [aplicando, setAplicando] = React.useState<string | null>(null);
  const [selecionado, setSelecionado] = React.useState<AnnounceRateSuggestion | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const buscar = React.useCallback(
    async (raw: string) => {
      if (raw.trim().length < 2) {
        setSugestoes([]);
        setAberto(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBuscando(true);
      const result = await buscarAnunciosML(raw, store, controller.signal);
      setBuscando(false);

      setSugestoes(result);
      setAberto(result.length > 0);
    },
    [store]
  );

  const buscarDebounced = React.useRef(debounce(buscar, 250)).current;

  React.useEffect(() => {
    return () => {
      buscarDebounced.cancel();
      abortRef.current?.abort();
    };
  }, [buscarDebounced]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const aplicarAnuncio = async (item: AnnounceRateSuggestion) => {
    setAplicando(item.announceId);
    setAberto(false);

    try {
      const rates = await buscarTaxasDoAnuncio(item.announceId, store);

      let aplicouAlgo = false;

      if (rates.classico) {
        setCalculo("mlClassico", (prev: any) => ({
          ...prev,
          comissao: String(rates.classico!.commissionRate),
          frete: String(rates.classico!.freight),
        }));
        setManualFlag("mlClassico", "comissao", true);
        setManualFlag("mlClassico", "frete", true);
        aplicouAlgo = true;
      }

      if (rates.premium) {
        setCalculo("mlPremium", (prev: any) => ({
          ...prev,
          comissao: String(rates.premium!.commissionRate),
          frete: String(rates.premium!.freight),
        }));
        setManualFlag("mlPremium", "comissao", true);
        setManualFlag("mlPremium", "frete", true);
        aplicouAlgo = true;
      }

      if (aplicouAlgo) {
        setSelecionado(item);
        setTermo("");
        toast.success(`Taxas de "${item.reference}" aplicadas ao Mercado Livre.`);
      } else {
        toast.warning("Nenhuma taxa encontrada para este anúncio.");
      }
    } catch {
      toast.error("Erro ao buscar taxas do anúncio.");
    } finally {
      setAplicando(null);
    }
  };

  const limparSelecao = () => {
    setSelecionado(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center overflow-hidden rounded border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30">
        <div className="flex h-10 w-9 shrink-0 items-center justify-center text-white/30">
          {buscando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        <input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            buscarDebounced(e.target.value);
          }}
          placeholder="Buscar por referência, produto ou ID Bling..."
          className="h-10 flex-1 border-0 bg-transparent px-1 text-sm font-medium text-white outline-none placeholder:text-white/20 focus:outline-none focus:ring-0"
        />
      </div>

      {selecionado && (
        <div className="mt-1.5 flex items-center justify-between rounded border border-[#1a8ceb]/30 bg-[#1a8ceb]/10 px-2.5 py-1.5 text-[11px] text-white/70">
          <span className="truncate">
            Taxas aplicadas de: <strong className="text-white">{selecionado.reference}</strong>
          </span>
          <button
            type="button"
            onClick={limparSelecao}
            className="ml-2 shrink-0 text-white/40 hover:text-white"
          >
            ok
          </button>
        </div>
      )}

      {aberto && sugestoes.length > 0 && (
        <div className="absolute left-0 top-full z-[100] mt-1 max-h-64 w-full overflow-y-auto rounded border border-white/10 bg-[#1c1c1c] shadow-2xl">
          {sugestoes.map((item) => (
            <button
              key={item.announceId}
              type="button"
              disabled={aplicando === item.announceId}
              onClick={() => aplicarAnuncio(item)}
              className="flex w-full items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5 text-left text-xs text-white/80 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">
                  {item.reference}
                </div>
                <div className="truncate text-white/45">
                  {item.product}
                  {item.mark ? ` · ${item.mark}` : ""}
                </div>
              </div>

              {aplicando === item.announceId && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
