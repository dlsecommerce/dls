"use client";

type Props = {
  ativo: boolean;
  onAtivoChange: (value: boolean) => void;
  exibirNaLoja: boolean;
  onExibirNaLojaChange: (value: boolean) => void;
};

export default function Productstatussection({
  ativo,
  onAtivoChange,
  exibirNaLoja,
  onExibirNaLojaChange,
}: Props) {
  return (
    <section className="border border-neutral-800 bg-[#161616] p-5">
      <StatusRow
        title="Produto ativo"
        description="Disponibilizar seu produto para ser vendido em todos os canais."
        checked={ativo}
        onChange={onAtivoChange}
      />

      <div className="my-4 border-t border-neutral-800" />

      <StatusRow
        title="Exibir produto na loja virtual"
        description="Seu produto estará disponível para compra em sua loja virtual."
        checked={exibirNaLoja}
        onChange={onExibirNaLojaChange}
      />
    </section>
  );
}

function StatusRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-white">{title}</span>
          <InfoIcon />
        </div>
        <p className="mt-1 text-[13px] text-neutral-400">{description}</p>
      </div>

      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 text-neutral-500"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 border border-neutral-800 transition-colors ${
        checked ? "bg-[#1a8ceb]" : "bg-neutral-800"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
