"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

// Mapas de conversão
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
  { table: "marketplace_tray_all", code: "PK", displayName: "Pikot Shop" },
  { table: "marketplace_tray_all", code: "SB", displayName: "Sóbaquetas" },
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

  // Cache de marcas por loja (displayName)
  const cacheRef = useRef<Record<string, string[]>>({});

  // Normaliza o que vier de cima: aceita "PK"/"SB" OU nomes amigáveis
  const selectedLojaDisplay = useMemo(
    () => selectedLoja.map((v) => lojaMap[v] || v),
    [selectedLoja]
  );
  const selectedLojaCodes = useMemo(
    () => selectedLoja.map((v) => reverseLojaMap[v] || v), // devolve "PK"/"SB" se vier nome amigável
    [selectedLoja]
  );

  // Lojas fixas (o que aparece no UI)
  useEffect(() => {
    setAllLojas(sources.map((s) => s.displayName));
  }, []);

  // Carrega marcas conforme seleção de loja
  useEffect(() => {
    const loadBrands = async () => {
      setLoading(true);
      try {
        // Determina códigos ativos (PK / SB)
        const activeCodes =
          selectedLojaCodes.length > 0 ? new Set(selectedLojaCodes) : null;

        // Cache total, caso precise reaproveitar
        let allMarcas: string[] = [];

        // Busca sempre na tabela unificada
        const { data, error } = await supabase
          .from("marketplace_tray_all")
          .select("Loja, Marca");

        if (error) {
          console.error("Erro ao buscar marcas:", error.message);
          setAllBrands([]);
          return;
        }

        if (data && data.length > 0) {
          // Filtra em memória conforme loja selecionada (PK / SB)
          const filteredRows =
            activeCodes && activeCodes.size > 0
              ? data.filter((r: any) => activeCodes.has(r?.Loja))
              : data;

          // Extrai e ordena as marcas únicas
          allMarcas = Array.from(
            new Set(filteredRows.map((r: any) => r?.Marca).filter(Boolean))
          ).sort();
        }

        setAllBrands(allMarcas);
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, [selectedLojaDisplay, selectedLojaCodes]);

  const toggle = (
    set: (v: string[]) => void,
    current: string[],
    value: string
  ) => {
    // Sempre armazene no estado o DISPLAY NAME para manter o UI consistente
    const display = lojaMap[value] || value; // se vier "PK", vira "Pikot Shop"
    if (current.includes(display)) set(current.filter((x) => x !== display));
    else set([...current, display]);
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
                    const isChecked = selectedLojaDisplay.includes(loja);
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
                          toggle(setSelectedLoja, selectedLojaDisplay, loja);
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            toggle(setSelectedLoja, selectedLojaDisplay, loja)
                          }
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
                            onCheckedChange={() => {
                              if (isChecked)
                                setSelectedBrands(
                                  selectedBrands.filter((x) => x !== m)
                                );
                              else setSelectedBrands([...selectedBrands, m]);
                            }}
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
        {(selectedLojaDisplay.length > 0 || selectedBrands.length > 0) && (
          <motion.div
            className="flex flex-wrap items-center gap-2 ml-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {[...selectedLojaDisplay, ...selectedBrands].map((item) => (
              <motion.div
                key={item}
                className="flex items-center gap-1 bg-white/10 border border-green-500/50 text-white px-2 py-[3px] rounded-md text-xs cursor-pointer hover:bg-green-600/20 transition-all"
                onClick={() => {
                  setSelectedLoja(selectedLojaDisplay.filter((l) => l !== item));
                  setSelectedBrands(selectedBrands.filter((b) => b !== item));
                }}
              >
                <span className="truncate max-w-[100px]">{item}</span>
                <span className="text-[11px] font-bold ml-1 text-green-500">
                  ✕
                </span>
              </motion.div>
            ))}

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
