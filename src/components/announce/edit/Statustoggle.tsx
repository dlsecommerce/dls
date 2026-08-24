"use client";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  infoText?: string;
};

export default function StatusToggle({
  checked,
  onChange,
  disabled = false,
  infoText = "Quando desativado, o produto some de todos os canais de venda imediatamente.",
}: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <InfoIcon text={infoText} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid="produto-ativo-toggle"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`h-7 shrink-0 border px-3.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/50
          disabled:cursor-not-allowed disabled:opacity-40
          ${!disabled && "cursor-pointer"}
          ${
            checked
              ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/10 text-[#1a8ceb] hover:bg-[#1a8ceb]/15"
              : "border-neutral-800 bg-neutral-900/60 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
          }
        `}
      >
        {checked ? "Ativo" : "Inativo"}
      </button>
    </div>
  );
}

function InfoIcon({ text }: { text: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      role="img"
      aria-label={text}
      className="h-3.5 w-3.5 shrink-0 cursor-help text-neutral-600 transition-colors hover:text-[#1a8ceb]"
    >
      <title>{text}</title>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
