"use client";

import {
  BadgeInfo,
  ChevronUp,
  ClipboardList,
  FileText,
  Hash,
  Layers,
  Package,
  ShieldCheck,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";

function normalizeStoreValue(v: any): "PK" | "SB" | "" {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (!s) return "";
  if (s === "pk") return "PK";
  if (s === "sb") return "SB";
  if (s.includes("pikot")) return "PK";
  if (s.includes("sobaquetas")) return "SB";

  return "";
}

const inputClass = `
  h-10 rounded-lg border-white/10 bg-[#101010]
  px-3 text-sm font-semibold text-white shadow-none outline-none
  placeholder:text-white/20
  focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
  focus-visible:ring-0 focus-visible:ring-offset-0
  disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-[#0b0b0b] disabled:text-white/35 disabled:opacity-100
`;

const selectTriggerClass = `
  h-10 rounded-lg border-white/10 bg-[#101010]
  px-3 text-sm font-semibold text-white shadow-none outline-none
  focus:border-[#1a8ceb]/70 focus:ring-1 focus:ring-[#1a8ceb]/30
  disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-[#0b0b0b] disabled:text-white/35 disabled:opacity-100
`;

const FieldLabel = ({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: any;
}) => (
  <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
    {Icon && <Icon className="h-3.5 w-3.5 text-[#1a8ceb]/75" />}
    {children}
  </Label>
);

const FormBlock = ({
  number,
  title,
  description,
  defaultOpen = true,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 text-left transition-colors duration-300 hover:text-white"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1a8ceb] text-xs font-bold text-white">
              {number}.
            </span>

            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>

          {description && (
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              {description}
            </p>
          )}
        </div>

        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-1 shrink-0"
        >
          <ChevronUp className="h-4 w-4 text-white/45" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={`form-block-content-${number}`}
            initial={{
              height: 0,
              opacity: 0,
              y: -6,
            }}
            animate={{
              height: "auto",
              opacity: 1,
              y: 0,
            }}
            exit={{
              height: 0,
              opacity: 0,
              y: -6,
            }}
            transition={{
              height: {
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: 0.45,
                ease: "easeOut",
              },
              y: {
                duration: 0.45,
                ease: "easeOut",
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const TextField = ({
  label,
  fieldKey,
  produto,
  setProduto,
  icon,
  placeholder,
  className = "",
  maxLength,
  disabled,
}: {
  label: string;
  fieldKey: string;
  produto: any;
  setProduto: any;
  icon?: any;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}) => {
  const value = produto?.[fieldKey] ?? "";

  return (
    <div className={className}>
      <FieldLabel icon={icon}>{label}</FieldLabel>

      <div className="relative">
        <Input
          type="text"
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          title={disabled ? "Campo bloqueado para edição" : undefined}
          onChange={(e) =>
            !disabled &&
            setProduto((p: any) => ({
              ...p,
              [fieldKey]: e.target.value,
            }))
          }
          className={inputClass}
        />

        {maxLength && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/35">
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

const InfoGeraisBox = ({
  produto,
  setProduto,
  loading,
  bloquearEdicao = false,
}: any) => {
  const disabled = Boolean(loading || bloquearEdicao);
  const isEditing = Boolean(produto?.id);

  const lojaSelectValue = useMemo(() => {
    return normalizeStoreValue(produto?.loja);
  }, [produto?.loja]);

  useEffect(() => {
    const normalized = normalizeStoreValue(produto?.loja);

    if (!normalized) return;

    if (produto?.loja !== normalized) {
      setProduto((p: any) => ({ ...p, loja: normalized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.loja]);

  useEffect(() => {
    if (!isEditing) return;

    const idVar = produto?.id_var?.trim()?.toLowerCase() || "";
    const tipo = idVar === "simples" || idVar === "" ? "simples" : "variacoes";

    if (produto.tipo_anuncio !== tipo) {
      setProduto((p: any) => ({ ...p, tipo_anuncio: tipo }));
    }
  }, [produto?.id_var, isEditing, setProduto, produto?.tipo_anuncio]);

  return (
    <div className="space-y-4">
      <FormBlock
        number={1}
        title="Identificação"
        description="Informações principais do anúncio."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel icon={Store}>Loja</FieldLabel>

            <Select
              disabled={disabled}
              value={lojaSelectValue}
              onValueChange={(v) =>
                !disabled &&
                setProduto((p: any) => ({
                  ...p,
                  loja: v as "PK" | "SB",
                }))
              }
            >
              <SelectTrigger
                className={selectTriggerClass}
                title={disabled ? "Campo bloqueado para edição" : undefined}
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>

              <SelectContent className="border-white/10 bg-[#0f0f0f] text-white">
                <SelectItem value="PK">PK</SelectItem>
                <SelectItem value="SB">SB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel icon={Layers}>Tipo de anúncio</FieldLabel>

            <Select
              disabled={disabled}
              value={produto?.tipo_anuncio ?? ""}
              onValueChange={(v) =>
                !disabled &&
                setProduto((p: any) => ({
                  ...p,
                  tipo_anuncio: v as "simples" | "variacoes",
                }))
              }
            >
              <SelectTrigger
                className={selectTriggerClass}
                title={disabled ? "Campo bloqueado para edição" : undefined}
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>

              <SelectContent className="border-white/10 bg-[#0f0f0f] text-white">
                <SelectItem value="simples">Simples</SelectItem>
                <SelectItem value="variacoes">Com variações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TextField
            label="Título"
            fieldKey="nome"
            produto={produto}
            setProduto={setProduto}
            icon={FileText}
            placeholder="Ex: Triturador Forrageiro Trapp a Gasolina 15 HP TRF 750G"
            className="md:col-span-2"
            maxLength={240}
            disabled={disabled}
          />

          <TextField
            label="Referência"
            fieldKey="referencia"
            produto={produto}
            setProduto={setProduto}
            icon={ClipboardList}
            placeholder="Ex: PAI - 2935418-T"
            disabled={disabled}
          />

          <TextField
            label="ID variação"
            fieldKey="id_var"
            produto={produto}
            setProduto={setProduto}
            icon={Hash}
            placeholder="Ex: 17475"
            disabled={disabled}
          />
        </div>
      </FormBlock>

      <FormBlock
        number={2}
        title="Códigos externos"
        description="Códigos do produto em outras plataformas."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField
            label="ID Bling"
            fieldKey="id_bling"
            produto={produto}
            setProduto={setProduto}
            icon={BadgeInfo}
            placeholder="Ex: 16631563671"
            disabled={disabled}
          />

          <TextField
            label="ID Tray"
            fieldKey="id_tray"
            produto={produto}
            setProduto={setProduto}
            icon={Hash}
            placeholder="Ex: 2940857"
            disabled={disabled}
          />

          <TextField
            label="Ordem"
            fieldKey="od"
            produto={produto}
            setProduto={setProduto}
            icon={Hash}
            placeholder="Ex: 2"
            disabled={disabled}
          />
        </div>
      </FormBlock>

      <FormBlock
        number={3}
        title="Classificação"
        description="Informações de categoria e marca."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Categoria"
            fieldKey="categoria"
            produto={produto}
            setProduto={setProduto}
            icon={Package}
            placeholder="Ex: Trituradores"
            disabled={disabled}
          />

          <TextField
            label="Marca"
            fieldKey="marca"
            produto={produto}
            setProduto={setProduto}
            icon={ShieldCheck}
            placeholder="Ex: Trapp"
            disabled={disabled}
          />
        </div>
      </FormBlock>
    </div>
  );
};

export default InfoGeraisBox;