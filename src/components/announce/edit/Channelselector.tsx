// components/announce/edit/ChannelSelector.tsx
"use client";

type Channel = {
  id: string;
  name: string;
};

type Props = {
  availableChannels: Channel[];
  selectedChannels: string[];
  onChange: (channels: string[]) => void;
  disabled?: boolean;
};

export function ChannelSelector({
  availableChannels,
  selectedChannels,
  onChange,
  disabled,
}: Props) {
  const allSelected =
    availableChannels.length > 0 &&
    availableChannels.every((c) => selectedChannels.includes(c.name));

  function toggleAll() {
    if (disabled) return;
    onChange(allSelected ? [] : availableChannels.map((c) => c.name));
  }

  function toggleChannel(name: string) {
    if (disabled) return;
    onChange(
      selectedChannels.includes(name)
        ? selectedChannels.filter((c) => c !== name)
        : [...selectedChannels, name]
    );
  }

  if (availableChannels.length === 0) {
    return (
      <p className="text-xs text-white/40">
        Nenhum canal disponível.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        className={`flex items-center gap-2 text-sm font-medium text-white/80 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          disabled={disabled}
          className="h-4 w-4 accent-[#1a8ceb]"
        />
        Todos os canais
      </label>

      <div className="flex flex-wrap gap-4 pl-1">
        {availableChannels.map((c) => (
          <label
            key={c.id}
            className={`flex items-center gap-2 text-sm text-white/70 ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedChannels.includes(c.name)}
              onChange={() => toggleChannel(c.name)}
              disabled={disabled}
              className="h-4 w-4 accent-[#1a8ceb]"
            />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}
