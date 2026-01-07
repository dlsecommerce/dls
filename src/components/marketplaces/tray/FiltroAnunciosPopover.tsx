"use client";

import React, { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  selectedLoja: string[];
  setSelectedLoja: (v: string[]) => void;

  selectedBrands: string[];
  setSelectedBrands: (v: string[]) => void;

  open: boolean;
  onOpenChange: (v: boolean) => void;
};

// Mapas corretos
const lojaMap: Record<string, string> = {
  PK: "Pikot Shop",
  SB: "Sóbaquetas",
};
const reverseLojaMap: Record<string, string> = {
  "Pikot Shop": "PK",
  "Sóbaquetas": "SB",
};

// Lojas disponíveis (fixas)
const sources = [
  { code: "PK", displayName: "Pikot Shop" },
  { code: "SB", displayName: "Sóbaquetas" },
];

export default function FiltroAnunciosPopover({
  selectedLoja,
  setSelectedLoja,
  selectedBrands,
  setSelectedBrands,
  open,
  onOpenChange,
}: Props) {
  const [allLojas, setAllLojas] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Lojas mostradas no UI
  useEffect(() => {
    setAllLojas(sources.map((s) => s.displayName));
  }, []);

  // ✅ AJUSTE: Carrega TODAS as marcas com paginação (evita limite do Supabase)
  // ✅ E quando selectedLoja estiver selecionada, filtra no banco com .in("Loja", selectedLoja)
  useEffect(() => {
    const loadBrands = async () => {
      setLoading(true);
      try {
        const pageSize = 1000;
        let from = 0;

        const setBrands = new Set<string>();

        while (true) {
          const to = from + pageSize - 1;

          let q = supabase
            .from("marketplace_tray_all")
            .select("Loja, Marca")
            .range(from, to);

          if (selectedLoja.length) {
            q = q.in("Loja", selectedLoja);
          }

          const { data, error } = await q;

          if (error) {
            console.error("Erro ao buscar marcas:", error.message);
            break;
          }

          (data || []).forEach((r: any) => {
            if (r?.Marca) setBrands.add(String(r.Marca).trim());
          });

          if (!data || data.length < pageSize) break;
          from += pageSize;
        }

        setAllBrands(Array.from(setBrands).sort((a, b) => a.localeCompare(b)));
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, [selectedLoja]);

  // 🔥 Toggle corrigido — sempre salva PK / SB no estado principal
  const toggleLoja = (lojaDisplay: string) => {
    const code = reverseLojaMap[lojaDisplay]; // Pikot Shop → PK
    if (!code) return;

    if (selectedLoja.includes(code)) {
      setSelectedLoja(selectedLoja.filter((x) => x !== code));
    } else {
      setSelectedLoja([...selectedLoja, code]);
    }
  };

  const limparTudo = () => {
    setSelectedLoja([]);
    setSelectedBrands([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="cursor-pointer border-neutral-700 hover:scale-105 transition-all text-white rounded-xl"
          >
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="relative w-[380px] border border-neutral-700 rounded-2xl p-4 bg-white/10 backdrop-blur-md shadow-xl space-y-4"
          side="bottom"
          align="start"
        >
          <button
            className="absolute right-4 top-4 text-green-500 hover:text-transparent bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-lg font-bold cursor-pointer transition-all hover:scale-110"
            title="Fechar"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              {/* 🏬 Loja */}
              <div>
                <Label className="text-white text-sm mb-1 block">Loja</Label>
                <div className="max-h-28 overflow-auto pr-1 space-y-1 pl-1">
                  {allLojas.map((loja, idx) => {
                    const code = reverseLojaMap[loja]; // Pikot Shop → PK
                    const isChecked = selectedLoja.includes(code);

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-neutral-200 text-sm px-2 py-[4px] rounded-md transition-all ${
                          isChecked
                            ? "bg-white/10 border border-green-500/40"
                            : "hover:bg-white/5"
                        } cursor-pointer hover:scale-[1.02]`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLoja(loja);
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleLoja(loja)}
                          className="border-neutral-600 cursor-pointer data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                        />
                        <span>{loja}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🏷️ Marca */}
              <div>
                <Label className="text-white text-sm mb-1 block">Marca</Label>
                <div className="max-h-28 overflow-auto pr-1 space-y-1">
                  {allBrands.length === 0 ? (
                    <p className="text-neutral-400 text-xs px-2">
                      Nenhum registro encontrado
                    </p>
                  ) : (
                    allBrands.map((m, idx) => {
                      const isChecked = selectedBrands.includes(m);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-neutral-200 text-sm px-2 py-[4px] rounded-md transition-all ${
                            isChecked
                              ? "bg-white/10 border border-green-500/40"
                              : "hover:bg-white/5"
                          } cursor-pointer hover:scale-[1.02]`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isChecked)
                              setSelectedBrands(
                                selectedBrands.filter((x) => x !== m)
                              );
                            else setSelectedBrands([...selectedBrands, m]);
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              isChecked
                                ? setSelectedBrands(
                                    selectedBrands.filter((x) => x !== m)
                                  )
                                : setSelectedBrands([...selectedBrands, m])
                            }
                            className="border-neutral-600 cursor-pointer data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                          />
                          <span className="truncate" title={m}>
                            {m}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 🔘 Botões */}
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="ghost"
                  className="text-neutral-300 hover:text-white hover:scale-105 cursor-pointer"
                  onClick={limparTudo}
                >
                  Limpar
                </Button>

                <Button
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 cursor-pointer rounded-xl"
                  onClick={() => onOpenChange(false)}
                >
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* 🟢 Filtros ativos na Topbar */}
      <AnimatePresence>
        {(selectedLoja.length > 0 || selectedBrands.length > 0) && (
          <motion.div
            className="flex flex-wrap items-center gap-2 ml-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {[...selectedLoja.map((c) => lojaMap[c]), ...selectedBrands].map(
              (item) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-1 bg-white/10 border border-green-500/50 text-white px-2 py-[3px] rounded-md text-xs cursor-pointer hover:bg-green-600/20 transition-all"
                  onClick={() => {
                    const code = reverseLojaMap[item];
                    if (code)
                      setSelectedLoja(selectedLoja.filter((l) => l !== code));
                    setSelectedBrands(selectedBrands.filter((b) => b !== item));
                  }}
                >
                  <span className="truncate max-w-[100px]">{item}</span>
                  <span className="text-[11px] font-bold ml-1 text-green-500">
                    ✕
                  </span>
                </motion.div>
              )
            )}

            <Button
              variant="ghost"
              className="text-neutral-300 hover:text-white text-xs px-2 py-[3px] rounded-lg cursor-pointer hover:scale-105"
              onClick={limparTudo}
            >
              Limpar tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
