// components/announce/edit/ChannelSelector.tsx
"use client";

import { useMemo, useRef, useEffect } from "react";
import { Check, AlertCircle, LayoutGrid } from "lucide-react";

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
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-full bg-white/10"
              style={{ width: `${64 + (i % 3) * 20}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (availableChannels.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-center text-xs text-white/40">
        Nenhum canal disponível.
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-xl border bg-white/[0.015] backdrop-blur-sm transition-colors",
        showRequiredWarning ? "border-red-500/25" : "border-white/[0.06]",
      ].join(" ")}
    >
      {/* Header: Select all + counter */}
      <div className="flex items-center justify-between px-4 py-3">
        <label
          className={`flex items-center gap-2.5 text-sm font-medium text-white/85 select-none ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          <span
            className={[
              "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
              allSelected || someSelected
                ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/10 text-[#1a8ceb]"
                : "border-white/10 bg-white/[0.03] text-white/40",
            ].join(" ")}
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
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
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors ${
            showRequiredWarning
              ? "border-red-500/25 bg-red-500/[0.06] text-red-400"
              : "border-[#1a8ceb]/25 bg-[#1a8ceb]/[0.06] text-[#1a8ceb]"
          }`}
        >
          {selectedCount}/{availableChannels.length}
        </span>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* Chips grid */}
      <div className="flex flex-wrap gap-2 px-4 py-4">
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
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a8ceb]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer active:scale-[0.97]",
                isSelected
                  ? "border-[#1a8ceb]/50 bg-[#1a8ceb]/[0.12] font-medium text-[#4fa8f0] shadow-[0_0_14px_-2px_rgba(26,140,235,0.35)]"
                  : "border-white/[0.08] bg-white/[0.02] font-normal text-white/60 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/85",
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
