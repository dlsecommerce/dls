"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type BrandPopoverProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  brands?: string[];
  supabaseTable?: string;
  supabaseColumn?: string;

  // quantos itens mostrar (e também aceitar atalhos 1..N)
  maxVisible?: number;
};

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function BrandPopover({
  value,
  onChange,
  placeholder = "Buscar marca...",
  disabled,
  brands,
  supabaseTable = "custos",
  supabaseColumn = "Marca",
  maxVisible = 9,
}: BrandPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [allBrands, setAllBrands] = React.useState<string[]>(brands ?? []);
  const [query, setQuery] = React.useState("");

  // Carrega marcas do Supabase (distinct) quando abrir (1x)
  React.useEffect(() => {
    if (!open) return;
    if (brands && brands.length) return;
    if (allBrands.length) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from(supabaseTable)
          .select(`${supabaseColumn}`);

        if (error) throw error;

        const uniq = Array.from(
          new Set(
            (data ?? [])
              .map((r: any) => String(r?.[supabaseColumn] ?? "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));

        if (!cancelled) setAllBrands(uniq);
      } catch (e) {
        console.error("Erro ao carregar marcas:", e);
        if (!cancelled) setAllBrands([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, brands, allBrands.length, supabaseTable, supabaseColumn]);

  const filtered = React.useMemo(() => {
    const q = normalize(query);
    if (!q) return allBrands;
    return allBrands.filter((b) => normalize(b).includes(q));
  }, [allBrands, query]);

  const visible = React.useMemo(
    () => filtered.slice(0, Math.max(1, maxVisible)),
    [filtered, maxVisible]
  );

  const selectBrand = React.useCallback(
    (brand?: string) => {
      if (!brand) return;
      onChange(brand);
      setOpen(false);
    },
    [onChange]
  );

  // fallback: Enter/Tab quando não tem item ativo (ou você quer autoselecionar)
  const commitFromQueryOrFirst = React.useCallback(() => {
    const q = query.trim();
    if (visible.length > 0) {
      selectBrand(visible[0]);
      return;
    }
    if (q) selectBrand(q); // permite marca nova digitada
  }, [query, selectBrand, visible]);

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-xl bg-white/5 border-neutral-700 text-white hover:bg-white/10",
            !value && "text-neutral-400"
          )}
        >
          <span className="truncate">{value || "Selecione uma marca..."}</span>
          <span className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 bg-[#0f0f0f] border border-neutral-700 rounded-2xl"
      >
        <Command
          onKeyDown={(e) => {
            // TAB => seleciona o 1º resultado e fecha
            if (e.key === "Tab") {
              // evita ir pro próximo campo antes de selecionar
              e.preventDefault();
              commitFromQueryOrFirst();
              return;
            }

            // 1..9 => seleciona item correspondente (1=primeiro)
            // (sem Ctrl/Alt/Meta, pra não atrapalhar atalhos do browser)
            if (
              e.key >= "1" &&
              e.key <= "9" &&
              !e.ctrlKey &&
              !e.altKey &&
              !e.metaKey
            ) {
              const idx = Number(e.key) - 1;
              if (visible[idx]) {
                e.preventDefault();
                selectBrand(visible[idx]);
              }
              return;
            }

            // ENTER => se nada for selecionado pelo Command, pega 1º match / texto
            if (e.key === "Enter") {
              // evita submit do form
              e.preventDefault();
              commitFromQueryOrFirst();
              return;
            }
          }}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
            className="text-white"
          />

          <CommandList>
            <CommandEmpty className="text-neutral-400 px-3 py-2">
              Nenhuma marca encontrada. Pressione Enter/Tab para usar “{query}”.
            </CommandEmpty>

            <CommandGroup heading="Marcas" className="text-neutral-400">
              {visible.map((brand, i) => (
                <CommandItem
                  key={brand}
                  value={brand}
                  className="text-white aria-selected:bg-white/10"
                  onSelect={() => selectBrand(brand)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === brand ? "opacity-100" : "opacity-0"
                    )}
                  />

                  {/* label com atalho 1..9 */}
                  <span className="mr-2 text-xs text-neutral-400 w-4 text-right">
                    {i + 1 <= 9 ? i + 1 : ""}
                  </span>

                  <span className="truncate">{brand}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
