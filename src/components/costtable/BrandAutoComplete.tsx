"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader, Check } from "lucide-react";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

function normText(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

// escapa % e _ (wildcards do LIKE)
function escapeLike(v: string) {
  return v.replace(/[%_]/g, (m) => `\\${m}`);
}

type Props = {
  value: string;
  onChange: (next: string) => void;

  placeholder?: string;
  disabled?: boolean;

  tableName?: string; // default "custos"
  columnName?: string; // default "Marca"
  limit?: number; // default 20

  /**
   * Com quantos chars começa a buscar
   * (1 já funciona, mas 2+ costuma reduzir ruído)
   */
  minChars?: number; // default 1

  /**
   * debounce em ms
   */
  debounceMs?: number; // default 250
};

export default function MarcaAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Liverpool",
  disabled = false,
  tableName = "custos",
  columnName = "Marca",
  limit = 20,
  minChars = 1,
  debounceMs = 250,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  // abre/fecha baseado no texto
  const shouldOpen = useMemo(() => {
    return !disabled && normText(value).length >= minChars;
  }, [disabled, value, minChars]);

  // mantém estado open sincronizado com shouldOpen
  useEffect(() => {
    if (!shouldOpen) setOpen(false);
    else setOpen(true);
  }, [shouldOpen]);

  // busca conforme digita (com debounce)
  useEffect(() => {
    const qRaw = value ?? "";
    const q = normText(qRaw);

    if (!shouldOpen) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLoading(true);

        // usa o texto original (sem normalizar) no ilike
        // mas escapa wildcards
        const safe = escapeLike(qRaw.trim());
        const pattern = `%${safe}%`;

        const { data, error } = await supabase
          .from(tableName)
          // @ts-ignore
          .select(columnName)
          // não nulo e não vazio
          // @ts-ignore
          .not(columnName, "is", null)
          // @ts-ignore
          .neq(columnName, "")
          // busca parcial case-insensitive
          // @ts-ignore
          .ilike(columnName, pattern)
          // importante: escape do LIKE (Postgres)
          // supabase-js aceita via options? nem sempre.
          // se seu backend não respeitar, ainda funciona sem o escape.
          .limit(500);

        if (error) throw error;

        // dedup + ordena + corta
        const set = new Set<string>();
        (data || []).forEach((r: any) => {
          const v = String(r?.[columnName] ?? "").trim();
          if (v) set.add(v);
        });

        const list = Array.from(set)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, limit);

        if (!cancelled) setOptions(list);
      } catch (e) {
        console.warn("⚠️ Falha ao buscar marcas:", e);
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, shouldOpen, debounceMs, tableName, columnName, limit]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // não força open aqui; o useEffect decide baseado no texto
          }}
          onFocus={() => {
            // se já tem texto suficiente, abre ao focar
            if (shouldOpen) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="bg-white/5 border-neutral-700 text-white rounded-xl"
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 w-[var(--radix-popover-trigger-width)] bg-[#0f0f0f] border border-neutral-700 text-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent text-white">
          {/* opcional: dá pra ocultar esse CommandInput se você não quiser 2 inputs.
              Se quiser remover, me fala que eu adapto pra filtrar só pelo Input principal. */}
          <CommandInput
            placeholder="Buscar marca..."
            value={value}
            onValueChange={(v) => onChange(v)}
            className="text-white"
          />

          <CommandList className="max-h-56 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-neutral-400 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Buscando marcas...
              </div>
            ) : (
              <>
                <CommandEmpty className="p-3 text-sm text-neutral-400">
                  Nenhuma marca encontrada.
                </CommandEmpty>

                <CommandGroup heading="Marcas" className="text-neutral-300">
                  {options.map((m) => {
                    const selected = normText(m) === normText(value);
                    return (
                      <CommandItem
                        key={m}
                        value={m}
                        onSelect={() => pick(m)}
                        className="cursor-pointer aria-selected:bg-white/10"
                      >
                        <span className="flex-1">{m}</span>
                        {selected ? <Check className="w-4 h-4 opacity-80" /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
