// components/announce/edit/ChannelSelector.tsx
"use client";

import { useMemo, useRef, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";

type Channel = {
  id: string;
  name: string;
};

type Props = {
  availableChannels: Channel[];
  selectedChannels: string[];
  onChange: (channels: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  required?: boolean;
};

export function ChannelSelector({
  availableChannels,
  selectedChannels,
  onChange,
  disabled,
  isLoading = false,
  required = false,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(
    () => new Set(selectedChannels),
    [selectedChannels]
  );

  const orderedChannels = useMemo(() => {
    const selected: Channel[] = [];
    const unselected: Channel[] = [];
    for (const c of availableChannels) {
      (selectedSet.has(c.name) ? selected : unselected).push(c);
    }
    return [...selected, ...unselected];
  }, [availableChannels, selectedSet]);

  const selectedCount = selectedSet.size;
  const allSelected =
    availableChannels.length > 0 && selectedCount === availableChannels.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const showRequiredWarning = required && selectedCount === 0 && !isLoading;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll() {
    if (disabled) return;
    onChange(allSelected ? [] : availableChannels.map((c) => c.name));
  }

  function toggleChannel(name: string) {
    if (disabled) return;
    onChange(
      selectedSet.has(name)
        ? selectedChannels.filter((c) => c !== name)
        : [...selectedChannels, name]
    );
  }

  // --- Skeleton de loading ---
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-lg bg-white/[0.06]"
              style={{ width: `${72 + (i % 3) * 18}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (availableChannels.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-center text-xs text-white/40">
        Nenhum canal disponível.
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-xl border bg-white/[0.02] transition-colors",
        showRequiredWarning ? "border-red-500/30" : "border-white/[0.08]",
      ].join(" ")}
    >
      {/* Header: Select all + counter */}
      <div className="flex items-center justify-between px-4 py-3">
        <label
          className={`flex items-center gap-2 text-sm font-medium select-none ${
            allSelected ? "text-white" : "text-white/70"
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={[
              "flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors",
              allSelected
                ? "border-[#1a8ceb] bg-[#1a8ceb]"
                : someSelected
                ? "border-white/40 bg-white/10"
                : "border-white/15 bg-transparent",
            ].join(" ")}
          >
            {allSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            {someSelected && (
              <span className="h-[2px] w-2 rounded-full bg-white/70" />
            )}
          </span>
          Todos os canais
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={disabled}
            className="sr-only"
          />
        </label>

        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ${
            showRequiredWarning
              ? "bg-red-500/10 text-red-400"
              : "bg-white/[0.06] text-white/50"
          }`}
        >
          {selectedCount}/{availableChannels.length}
        </span>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* Chips grid */}
      <div className="flex flex-wrap gap-2 px-4 py-3.5">
        {orderedChannels.map((c) => {
          const isSelected = selectedSet.has(c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleChannel(c.name)}
              disabled={disabled}
              aria-pressed={isSelected}
              title={c.name}
              className={[
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer active:scale-[0.97]",
                isSelected
                  ? "border-white/20 bg-white text-black font-medium"
                  : "border-white/[0.08] bg-transparent font-normal text-white/55 hover:border-white/20 hover:bg-white/[0.04] hover:text-white/85",
              ].join(" ")}
            >
              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              <span className="max-w-[160px] truncate">{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Aviso de obrigatoriedade */}
      {showRequiredWarning && (
        <div className="flex items-center gap-1.5 border-t border-red-500/15 px-4 py-2.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Selecione ao menos um canal.
        </div>
      )}
    </div>
  );
}
