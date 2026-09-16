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

  // Selecionados primeiro, depois o restante em ordem original
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
      <div className="flex flex-col gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="flex flex-wrap gap-2">
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
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs text-white/40">
        Nenhum canal disponível.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header: Select all + counter */}
      <div className="flex items-center justify-between">
        <label
          className={`flex items-center gap-2 text-sm font-medium text-white/80 select-none ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={disabled}
            className="h-4 w-4 rounded accent-[#1a8ceb] cursor-pointer"
          />
          Todos os canais
        </label>

        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            showRequiredWarning
              ? "bg-red-500/10 text-red-400"
              : "bg-[#1a8ceb]/10 text-[#1a8ceb]"
          }`}
        >
          {selectedCount}/{availableChannels.length}
        </span>
      </div>

      {/* Chips grid */}
      <div
        className={`flex flex-wrap gap-2 rounded-lg p-1 transition-colors ${
          showRequiredWarning ? "ring-1 ring-red-500/30" : ""
        }`}
      >
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
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a8ceb]/50",
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer active:scale-[0.97]",
                isSelected
                  ? "border-[#1a8ceb] bg-[#1a8ceb]/15 text-[#1a8ceb]"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/90",
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
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Selecione ao menos um canal.
        </div>
      )}
    </div>
  );
}
