// components/announce/edit/ChannelSelector.tsx
"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Check, AlertCircle, ChevronDown } from "lucide-react";

type Channel = {
  id: string;
  name: string;
};

type Announcement = {
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
  /** Lista de anúncios disponíveis para atribuição por canal (opcional) */
  announcements?: Announcement[];
  /** Mapa: nome do canal -> ids dos anúncios atribuídos a ele (opcional) */
  assignments?: Record<string, string[]>;
  onAssignmentsChange?: (assignments: Record<string, string[]>) => void;
};

// Cores de marca por canal (aplicadas no chip quando selecionado)
const CHANNEL_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Shopee: { bg: "#EE4D2D", text: "#FFFFFF", border: "#EE4D2D" },
  Magalu: { bg: "#0086FF", text: "#FFFFFF", border: "#0086FF" },
  "Mercado Livre": { bg: "#FFE600", text: "#1A1A1A", border: "#FFE600" },
  Tray: { bg: "#FF6B00", text: "#FFFFFF", border: "#FF6B00" },
  Olist: { bg: "#1A6CE8", text: "#FFFFFF", border: "#1A6CE8" },
  "TikTok Shop": { bg: "#FFFFFF", text: "#000000", border: "#FFFFFF" },
};

const DEFAULT_STYLE = { bg: "#FFFFFF", text: "#000000", border: "#FFFFFF" };

export function ChannelSelector({
  availableChannels,
  selectedChannels,
  onChange,
  disabled,
  isLoading = false,
  required = false,
  announcements,
  assignments = {},
  onAssignmentsChange,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const hasAssignmentFeature =
    !!announcements && announcements.length > 0 && !!onAssignmentsChange;

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
    const isCurrentlySelected = selectedSet.has(name);
    onChange(
      isCurrentlySelected
        ? selectedChannels.filter((c) => c !== name)
        : [...selectedChannels, name]
    );

    // Se desmarcar o canal, fecha o painel de atribuição e limpa dados dele
    if (isCurrentlySelected) {
      if (expandedChannel === name) setExpandedChannel(null);
      if (hasAssignmentFeature) {
        const next = { ...assignments };
        delete next[name];
        onAssignmentsChange?.(next);
      }
    }
  }

  function toggleExpand(name: string) {
    setExpandedChannel((prev) => (prev === name ? null : name));
  }

  function toggleAnnouncementForChannel(channelName: string, announcementId: string) {
    if (!hasAssignmentFeature) return;
    const current = assignments[channelName] ?? [];
    const next = current.includes(announcementId)
      ? current.filter((id) => id !== announcementId)
      : [...current, announcementId];
    onAssignmentsChange?.({ ...assignments, [channelName]: next });
  }

  // --- Skeleton de loading ---
  if (isLoading) {
    return (
      <div className="rounded border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded bg-white/[0.06]"
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
      <div className="rounded border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-center text-xs text-white/40">
        Nenhum canal disponível.
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded border bg-white/[0.02] transition-colors",
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
      <div className="flex flex-col gap-2 px-4 py-3.5">
        <div className="flex flex-wrap gap-2">
          {orderedChannels.map((c) => {
            const isSelected = selectedSet.has(c.name);
            const style = CHANNEL_STYLES[c.name] ?? DEFAULT_STYLE;
            const isExpanded = expandedChannel === c.name;
            const assignedCount = assignments[c.name]?.length ?? 0;

            return (
              <div key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleChannel(c.name)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  title={c.name}
                  style={
                    isSelected
                      ? {
                          backgroundColor: style.bg,
                          color: style.text,
                          borderColor: style.border,
                        }
                      : undefined
                  }
                  className={[
                    "flex items-center gap-1.5 rounded border px-3 py-1.5 text-[13px] transition-all duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer active:scale-[0.97]",
                    !isSelected &&
                      "border-white/[0.08] bg-transparent font-normal text-white/55 hover:border-white/20 hover:bg-white/[0.04] hover:text-white/85",
                    isSelected && "font-medium",
                  ].join(" ")}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  <span className="max-w-[160px] truncate">{c.name}</span>
                </button>

                {/* Botão de atribuir anúncios — só aparece se selecionado e feature ativa */}
                {isSelected && hasAssignmentFeature && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.name)}
                    disabled={disabled}
                    className={[
                      "flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/50 transition-colors",
                      "hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80",
                      disabled && "cursor-not-allowed opacity-50",
                    ].join(" ")}
                    title="Escolher anúncios para este canal"
                  >
                    <span className="tabular-nums">{assignedCount}</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Painel de atribuição de anúncios por canal */}
        {hasAssignmentFeature &&
          expandedChannel &&
          selectedSet.has(expandedChannel) && (
            <div className="mt-1 rounded-lg border border-white/[0.08] bg-white/[0.015] p-3">
              <p className="mb-2 text-[11px] font-medium text-white/40">
                Anúncios vinculados a{" "}
                <span className="text-white/70">{expandedChannel}</span>
              </p>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {announcements!.map((a) => {
                  const checked =
                    assignments[expandedChannel]?.includes(a.id) ?? false;
                  return (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] text-white/70 hover:bg-white/[0.04] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleAnnouncementForChannel(expandedChannel, a.id)
                        }
                        disabled={disabled}
                        className="h-3.5 w-3.5 rounded accent-white cursor-pointer"
                      />
                      <span className="truncate">{a.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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
