"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Hash, Copy, Check, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusToggle from "@/components/announce/edit/Statustoggle";

// ---------------------------------------------------------------------------
// Tipagem
// ---------------------------------------------------------------------------
type Props = {
  ativo: boolean;
  onAtivoChange: (value: boolean) => void;

  codigoAnuncio?: string | number;
  criadoEm?: string;

  nome: string;
  onNomeChange: (value: string) => void;
  checkNomeDuplicado?: (nome: string, signal: AbortSignal) => Promise<boolean>;
  onNomeValidityChange?: (isValid: boolean) => void;
  draftKeyNome?: string;

  idBling?: string | number;
  onIdBlingChange?: (value: string) => void;
  idBlingEditavel?: boolean;
  loja?: string;
  onLojaChange?: (value: string) => void;
  referencia?: string;
  onReferenciaChange?: (value: string) => void;
  marca?: string;
  onMarcaChange?: (value: string) => void;
  checkReferenciaDuplicada?: (referencia: string, signal: AbortSignal) => Promise<boolean>;
  draftKeyMeta?: string;

  loading?: boolean;
  disabled?: boolean;
};

const sanitize = (value: string) =>
  value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s{2,}/g, " ");

const inputClass = `
  h-10 w-full border bg-[#070707] px-3
  text-[13px] font-medium text-neutral-200 outline-none
  placeholder:text-[13px] placeholder:font-normal placeholder:text-neutral-600
  transition-colors
  disabled:cursor-not-allowed disabled:opacity-50
  focus-visible:ring-1
`;

const labelClass =
  "mb-1.5 flex min-h-[18px] items-center block text-[11px] font-semibold uppercase tracking-wide text-neutral-500";

const errorBorder = "border-red-500/60 focus-visible:border-red-500 focus-visible:ring-red-500/30";
const normalBorder = "border-neutral-800 focus-visible:border-[#1a8ceb]/60 focus-visible:ring-[#1a8ceb]/30";

const LOJAS = [
  { value: "PK", label: "Pikot Shop" },
  { value: "SB", label: "Sóbaquetas" },
];

const DEBOUNCE_MS = 400;

function hasCodigo(value?: string | number) {
  return value !== undefined && value !== null && value !== "";
}

function formatDate(date?: string) {
  if (!date) return "Data não disponível";
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Data não disponível";
    return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "Data não disponível";
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function ProductInfoSection({
  ativo,
  onAtivoChange,
  codigoAnuncio,
  criadoEm,
  nome,
  onNomeChange,
  checkNomeDuplicado,
  onNomeValidityChange,
  draftKeyNome,
  idBling,
  onIdBlingChange,
  idBlingEditavel = false,
  loja = "",
  onLojaChange,
  referencia = "",
  onReferenciaChange,
  marca = "",
  onMarcaChange,
  checkReferenciaDuplicada,
  draftKeyMeta,
  loading = false,
  disabled = false,
}: Props) {
  if (loading) return <ProductInfoSkeleton />;

  return (
    <section className="border border-neutral-800 bg-[#0a0a0a] p-6">
      {/* Header: título + status */}
      <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Informações do produto
        </h2>
        <StatusToggle checked={ativo} onChange={onAtivoChange} disabled={disabled} />
      </div>

      {/* Nome — full width */}
      <div className="mb-5">
        <NomeField
          nome={nome}
          onNomeChange={onNomeChange}
          checkDuplicate={checkNomeDuplicado}
          onValidityChange={onNomeValidityChange}
          draftKey={draftKeyNome}
          disabled={disabled}
        />
      </div>

      {/* Linha 1: Código do produto | Loja | ID Bling */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <CodigoField codigoAnuncio={codigoAnuncio} criadoEm={criadoEm} />
        <LojaField loja={loja} onLojaChange={onLojaChange} disabled={disabled} />
        <div>
          <label className={labelClass}>ID Bling</label>
          <input
            type="text"
            value={idBling ?? ""}
            disabled={disabled || !idBlingEditavel}
            onChange={(e) => onIdBlingChange?.(e.target.value)}
            placeholder="Ex: 16883421093"
            title={
              idBlingEditavel
                ? "Informe o ID Bling do produto"
                : "Gerenciado automaticamente pela integração com o Bling"
            }
            className={`${inputClass} ${normalBorder}`}
          />
        </div>
      </div>

      {/* Linha 2: Referência | Marca */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <ReferenciaField
          referencia={referencia}
          onReferenciaChange={onReferenciaChange}
          checkReferenciaDuplicada={checkReferenciaDuplicada}
          disabled={disabled}
        />
        <div>
          <label className={labelClass}>Marca</label>
          <input
            type="text"
            value={marca}
            maxLength={60}
            placeholder="Ex: Liverpool, SKP"
            onChange={(e) => onMarcaChange?.(e.target.value)}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== marca) onMarcaChange?.(trimmed);
            }}
            disabled={disabled}
            className={`${inputClass} ${normalBorder}`}
          />
        </div>
      </div>

      <DraftPersistence draftKey={draftKeyMeta} referencia={referencia} marca={marca} onReferenciaChange={onReferenciaChange} onMarcaChange={onMarcaChange} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Campo: Nome
// ---------------------------------------------------------------------------
function NomeField({
  nome,
  onNomeChange,
  checkDuplicate,
  onValidityChange,
  draftKey,
  disabled,
}: {
  nome: string;
  onNomeChange: (value: string) => void;
  checkDuplicate?: (nome: string, signal: AbortSignal) => Promise<boolean>;
  onValidityChange?: (isValid: boolean) => void;
  draftKey?: string;
  disabled?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checking, setChecking] = useState(false);

  const originalRef = useRef(nome);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const maxLength = 200;
  const minLength = 3;
  const trimmed = nome.trim();
  const isEmpty = trimmed.length === 0;
  const isTooShort = !isEmpty && trimmed.length < minLength;
  const nearLimit = nome.length >= maxLength * 0.9;
  const hasError = touched && (isEmpty || isTooShort || isDuplicate);
  const isValid = !hasError && !checking;

  useEffect(() => {
    onValidityChange?.(isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  useEffect(() => {
    if (!draftKey) return;
    if (nome.trim() !== "") return;
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) onNomeChange(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      if (nome.trim()) sessionStorage.setItem(draftKey, nome);
      else sessionStorage.removeItem(draftKey);
    } catch {}
  }, [draftKey, nome]);

  useEffect(() => {
    if (!checkDuplicate || isEmpty) {
      setIsDuplicate(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setChecking(true);
      try {
        const dup = await checkDuplicate(trimmed, controller.signal);
        if (!controller.signal.aborted) setIsDuplicate(dup);
      } catch {
        if (!controller.signal.aborted) setIsDuplicate(false);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = sanitize(e.target.value).slice(0, maxLength);
      setIsDirty(value !== originalRef.current);
      onNomeChange(value);
    },
    [onNomeChange]
  );

  const handleRevert = useCallback(() => {
    onNomeChange(originalRef.current);
    setIsDirty(false);
  }, [onNomeChange]);

  const helperText = hasError
    ? isDuplicate
      ? "Já existe um produto com esse nome."
      : isTooShort
      ? `O nome deve ter pelo menos ${minLength} caracteres.`
      : "O nome do produto é obrigatório."
    : "Dê ao seu produto um nome curto e claro.";

  return (
    <div>
      <div className="mb-1.5 flex min-h-[18px] items-center justify-between">
        <label className={labelClass}>Nome do produto</label>
        {isDirty && (
          <button
            type="button"
            onClick={handleRevert}
            className="cursor-pointer text-[11px] font-medium text-neutral-500 transition-colors hover:text-[#1a8ceb]"
          >
            Desfazer
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={nome}
          disabled={disabled}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            const cleaned = sanitize(nome).trim();
            if (cleaned !== nome) onNomeChange(cleaned);
          }}
          maxLength={maxLength}
          placeholder="Ex: Baqueta Liverpool Ponta de Madeira"
          aria-invalid={hasError}
          className={`${inputClass} ${hasError ? errorBorder : normalBorder}`}
        />
        {checking && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-neutral-500">
            verificando
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className={hasError ? "text-red-500" : "text-neutral-500"}>{helperText}</span>
        <span className={nearLimit ? "text-red-500" : "text-neutral-600"}>
          {nome.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campo: Código do produto (read-only, com tooltip de data)
// ---------------------------------------------------------------------------
function CodigoField({ codigoAnuncio, criadoEm }: { codigoAnuncio?: string | number; criadoEm?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const codigoValido = hasCodigo(codigoAnuncio);
  const codigoExibido = codigoValido ? String(codigoAnuncio) : "Não informado";

  useEffect(() => {
    if (!showTooltip) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowTooltip(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTooltip]);

  async function handleCopy() {
    if (!codigoValido) return;
    try {
      await navigator.clipboard.writeText(codigoExibido);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div ref={ref} className="relative">
      <div className="mb-1.5 flex min-h-[18px] items-center gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Código do produto
        </label>
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip((v) => !v)}
          className="cursor-pointer text-neutral-600 transition-colors hover:text-[#1a8ceb]"
        >
          <Info className="h-3 w-3" />
        </button>

        {showTooltip && (
          <div className="absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap border border-neutral-800 bg-[#0a0a0a] px-2.5 py-1.5 text-[11px] text-neutral-300 shadow-lg">
            Data de criação: {formatDate(criadoEm)}
          </div>
        )}
      </div>

      <div className={`flex h-10 items-center gap-2 border ${normalBorder.split(" ")[0]} bg-[#070707] px-3`}>
        <Hash className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
        <p
          title={codigoExibido}
          className={`flex-1 truncate text-[13px] font-medium ${codigoValido ? "text-[#1a8ceb]" : "text-neutral-600"}`}
        >
          {codigoExibido}
        </p>
        {codigoValido && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 cursor-pointer text-neutral-600 transition-colors hover:text-[#1a8ceb]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#1a8ceb]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campo: Loja (select com confirmação de troca)
// ---------------------------------------------------------------------------
function LojaField({
  loja,
  onLojaChange,
  disabled,
}: {
  loja: string;
  onLojaChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const lojaLabel = LOJAS.find((l) => l.value === loja)?.label;

  function handleSelect(novaLoja: string) {
    if (!loja || novaLoja === loja) {
      onLojaChange?.(novaLoja);
      return;
    }
    setPending(novaLoja);
  }

  return (
    <div>
      <label className={labelClass}>Loja</label>
      <Select value={loja} onValueChange={handleSelect} open={open} onOpenChange={setOpen}>
        <SelectTrigger
          disabled={disabled}
          className={`h-10 w-full cursor-pointer rounded-none border bg-[#070707] px-3 text-left text-[13px] font-medium text-neutral-200 outline-none transition-colors focus:ring-0 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/30 border-neutral-800 focus:border-[#1a8ceb]/60`}
        >
          <SelectValue placeholder="Selecione">{lojaLabel}</SelectValue>
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={4}
          className="min-w-[200px] rounded-none border border-neutral-800 bg-[#0a0a0a] p-1 shadow-2xl"
        >
          {LOJAS.map((l) => {
            const isActive = loja === l.value;
            return (
              <SelectItem
                key={l.value}
                value={l.value}
                className={`relative cursor-pointer rounded-none py-2 pl-3 pr-3 text-[13px] transition-colors focus:bg-neutral-900 data-[state=checked]:font-semibold [&_svg]:hidden ${
                  isActive ? "text-[#1a8ceb] data-[state=checked]:text-[#1a8ceb]" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {l.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {pending !== null && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="mt-2 flex flex-wrap items-center justify-between gap-3 border border-[#1a8ceb]/30 bg-[#1a8ceb]/[0.06] p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1a8ceb]" />
            <p className="text-[12px] text-neutral-300">
              Trocar de <strong className="text-white">{loja}</strong> para{" "}
              <strong className="text-white">{pending}</strong> pode desvincular variações e IDs.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-8 cursor-pointer border border-neutral-800 bg-transparent px-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onLojaChange?.(pending);
                setPending(null);
              }}
              className="h-8 cursor-pointer border border-[#1a8ceb]/50 bg-[#1a8ceb]/15 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#1a8ceb] hover:bg-[#1a8ceb]/25"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campo: Referência (com checagem de duplicidade)
// ---------------------------------------------------------------------------
function ReferenciaField({
  referencia,
  onReferenciaChange,
  checkReferenciaDuplicada,
  disabled,
}: {
  referencia: string;
  onReferenciaChange?: (value: string) => void;
  checkReferenciaDuplicada?: (referencia: string, signal: AbortSignal) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [duplicada, setDuplicada] = useState(false);
  const [checando, setChecando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!checkReferenciaDuplicada) return;
    const valor = referencia.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!valor) {
      setDuplicada(false);
      setChecando(false);
      return;
    }

    setChecando(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const dup = await checkReferenciaDuplicada(valor, controller.signal);
        if (!controller.signal.aborted) setDuplicada(dup);
      } catch {
      } finally {
        if (!controller.signal.aborted) setChecando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [referencia, checkReferenciaDuplicada]);

  return (
    <div>
      <label className={labelClass}>Referência</label>
      <input
        type="text"
        value={referencia}
        maxLength={80}
        placeholder="Ex: PAI-LIV-5A"
        onChange={(e) => onReferenciaChange?.(e.target.value)}
        onBlur={(e) => {
          const trimmed = e.target.value.trim();
          if (trimmed !== referencia) onReferenciaChange?.(trimmed);
        }}
        disabled={disabled}
        aria-invalid={duplicada}
        className={`${inputClass} ${duplicada ? errorBorder : normalBorder}`}
      />
      {checando && <p className="mt-1 text-[11px] text-neutral-500">Verificando...</p>}
      {!checando && duplicada && (
        <p className="mt-1 text-[11px] text-red-500">Já existe outro produto com essa referência.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persistência de rascunho (referência + marca)
// ---------------------------------------------------------------------------
function DraftPersistence({
  draftKey,
  referencia,
  marca,
  onReferenciaChange,
  onMarcaChange,
}: {
  draftKey?: string;
  referencia: string;
  marca: string;
  onReferenciaChange?: (value: string) => void;
  onMarcaChange?: (value: string) => void;
}) {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!draftKey || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!referencia && draft?.referencia) onReferenciaChange?.(draft.referencia);
      if (!marca && draft?.marca) onMarcaChange?.(draft.marca);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ referencia, marca }));
    } catch {}
  }, [draftKey, referencia, marca]);

  return null;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ProductInfoSkeleton() {
  return (
    <section className="border border-neutral-800 bg-[#0a0a0a] p-6">
      <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="h-2.5 w-40 animate-pulse bg-neutral-800" />
        <div className="h-7 w-20 animate-pulse bg-neutral-800" />
      </div>
      <div className="mb-5 space-y-2">
        <div className="h-2.5 w-24 animate-pulse bg-neutral-800" />
        <div className="h-10 w-full animate-pulse bg-neutral-800/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 animate-pulse bg-neutral-800" />
            <div className="h-10 w-full animate-pulse bg-neutral-800/70" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 animate-pulse bg-neutral-800" />
            <div className="h-10 w-full animate-pulse bg-neutral-800/70" />
          </div>
        ))}
      </div>
    </section>
  );
}
