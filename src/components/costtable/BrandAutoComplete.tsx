"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader, Check } from "lucide-react";

import { Popover, PopoverContent } from "@/components/ui/popover";

import {
  Command,
  CommandList,
  CommandEmpty,
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

  minChars?: number; // default 1
  debounceMs?: number; // default 250
};

export default function BrandAutoComplete({
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
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [contentWidth, setContentWidth] = useState<number>(0);

  // ✅ abre SOMENTE quando usuário digitou
  const shouldOpen = useMemo(() => {
    return !disabled && normText(value).length >= minChars;
  }, [disabled, value, minChars]);

  // mede a largura do input (âncora)
  const measure = () => {
    const w = anchorRef.current?.offsetWidth ?? 0;
    if (w) setContentWidth(w);
  };

  useEffect(() => {
    measure();
    // atualiza ao resize
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // sincroniza abrir/fechar pelo texto
  useEffect(() => {
    if (!shouldOpen) {
      setOpen(false);
      return;
    }
    // só abre se tiver texto (digitando)
    setOpen(true);
    // garante largura certa quando abre
    requestAnimationFrame(measure);
  }, [shouldOpen]);

  // busca conforme digita (debounce)
  useEffect(() => {
    const qRaw = value ?? "";

    if (!shouldOpen) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLoading(true);

        const safe = escapeLike(qRaw.trim());
        const pattern = `%${safe}%`;

        const { data, error } = await supabase
          .from(tableName)
          // @ts-ignore
          .select(columnName)
          // @ts-ignore
          .not(columnName, "is", null)
          // @ts-ignore
          .neq(columnName, "")
          // @ts-ignore
          .ilike(columnName, pattern)
          .limit(500);

        if (error) throw error;

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
    <Popover
      open={open}
      onOpenChange={(next) => {
        // ✅ permite fechar (clique fora / ESC)
        // ✅ bloqueia abrir por clique/foco
        if (next === false) setOpen(false);
      }}
    >
      {/* ✅ âncora manual (sem PopoverTrigger, então clicar NÃO abre) */}
      <div ref={anchorRef}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // open é controlado por shouldOpen
          }}
          onFocus={() => {
            // ✅ não abre ao clicar/focar
            if (!shouldOpen) setOpen(false);
          }}
          onClick={() => {
            // ✅ não abre ao clicar
            if (!shouldOpen) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder} // ✅ Ex: Liverpool (igual os outros)
          disabled={disabled}
          autoComplete="off"
          className="bg-white/5 border-neutral-700 text-white rounded-xl"
        />
      </div>

      <PopoverContent
        align="start"
        sideOffset={6}
        style={{ width: contentWidth ? `${contentWidth}px` : undefined }}
        className="p-0 bg-[#0f0f0f] border border-neutral-700 text-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent text-white">
          <CommandList className="max-h-56 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-neutral-400 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Carregando marcas...
              </div>
            ) : (
              <>
                <CommandEmpty className="p-3 text-sm text-neutral-400">
                  Nenhuma marca encontrada.
                </CommandEmpty>

                {/* ✅ sem título "Marcas" */}
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
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
