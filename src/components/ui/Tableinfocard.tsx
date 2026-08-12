// components/ui/TableInfoCard.tsx
"use client";

type Props = {
  title?: string;
  label: string;
  value: number;
  accentColor?: string;
};

export default function TableInfoCard({
  title = "Informações",
  label,
  value,
  accentColor = "#1a8ceb",
}: Props) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <div className="px-2.5">
      <p className="text-sm font-semibold text-white">{title}</p>

      <p className="mt-2 text-xs text-neutral-500">{label}</p>

      <p
        className="mt-1 text-lg font-bold tabular-nums"
        style={{ color: accentColor }}
      >
        {safeValue.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
