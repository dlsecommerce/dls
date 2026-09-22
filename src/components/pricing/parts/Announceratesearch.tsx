"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import {
  buscarAnunciosML,
  buscarTaxasDoAnuncio,
  type AnnounceRateSuggestion,
} from "@/components/marketplace/hooks/useannouncerates";
import type { ChannelKey } from "@/components/costs/hooks/channelsconfig";
import { toast } from "sonner";
import { AnnounceSuggestionDropdown } from "./Announcesuggestiondropdown";

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
  const [indiceSelecionado, setIndiceSelecionado] = React.useState(-1);

  const abortRef = React.useRef<AbortController | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const listaRef = React.useRef<HTMLDivElement>(null);

  const buscar = React.useCallback(
    async (raw: string) => {
      if (raw.trim().length < 2) {
        setSugestoes([]);
        setAberto(false);
        setIndiceSelecionado(-1);
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
      setIndiceSelecionado(-1);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || sugestoes.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado((prev) => (prev + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado((prev) =>
        prev <= 0 ? sugestoes.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indiceSelecionado >= 0) {
        aplicarAnuncio(sugestoes[indiceSelecionado]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        ref={inputWrapperRef}
        className="flex items-center overflow-hidden rounded border border-white/10 bg-[#070707] focus-within:border-[#1a8ceb]/70 focus-within:ring-1 focus-within:ring-[#1a8ceb]/30"
      >
        <input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            buscarDebounced(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar"
          className="h-10 flex-1 border-0 bg-transparent px-3 text-sm font-medium text-white outline-none placeholder:text-white/20 focus:outline-none focus:ring-0"
        />

        {buscando && (
          <div className="flex h-10 w-9 shrink-0 items-center justify-center text-white/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      <AnnounceSuggestionDropdown
        isActive={aberto}
        sugestoes={sugestoes}
        listaRef={listaRef}
        indiceSelecionado={indiceSelecionado}
        onSelect={aplicarAnuncio}
        termoBusca={termo}
        isLoading={buscando}
        aplicandoId={aplicando}
        onHoverIndex={setIndiceSelecionado}
        onClose={() => setAberto(false)}
        anchorRef={inputWrapperRef}
      />
    </div>
  );
};
