"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Loader2,
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  X,
  Check,
} from "lucide-react";

import { ChannelSelector } from "@/components/announce/edit/Channelselector";

export type Tipo = "inclusao" | "alteracao";

type PreviewRow = Record<string, unknown>;

type Channel = {
  id: string;
  name: string;
};

/** Erro estruturado: associado a uma linha (e opcionalmente a uma coluna específica) */
export type RowError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportResult = {
  total: number;
  importados: number;
  rejeitados: number;
};

type InlineMessage = {
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
} | null;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void;
  loading: boolean;
  preview?: PreviewRow[];
  warnings?: string[];
  errors?: string[];
  rowErrors?: RowError[];
  tipo: Tipo;
  customTitle?: string;
  customText?: string;
  duplicatesCount?: number;
  result?: ImportResult | null;
  availableChannels?: Channel[];
  selectedChannels?: string[];
  onChannelsChange?: (channels: string[]) => void;
  /**
   * Mapa: nome do canal -> índices das linhas do `preview` que serão
   * enviadas para aquele canal. Se omitido para um canal selecionado,
   * assume-se TODAS as linhas.
   */
  channelRowAssignments?: Record<string, number[]>;
  onChannelRowAssignmentsChange?: (assignments: Record<string, number[]>) => void;
};

const GREEN = "#22c55e";
const GREEN_HOVER = "#34d365";
const RED = "#ef4444";
const ORANGE = "#f97316";

const CHANNEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Shopee: { bg: "#EE4D2D", text: "#FFFFFF", border: "#EE4D2D" },
  Magalu: { bg: "#0086FF", text: "#FFFFFF", border: "#0086FF" },
  "Mercado Livre": { bg: "#FFE600", text: "#1A1A1A", border: "#FFE600" },
  Tray: { bg: "#FF6B00", text: "#FFFFFF", border: "#FF6B00" },
  Olist: { bg: "#1A6CE8", text: "#FFFFFF", border: "#1A6CE8" },
  "TikTok Shop": { bg: "#FFFFFF", text: "#000000", border: "#FFFFFF" },
};
const DEFAULT_CHANNEL_STYLE = { bg: "#FFFFFF", text: "#000000", border: "#FFFFFF" };

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center border border-neutral-800 text-neutral-500">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-300">{title}</p>
        <p className="text-[10px] text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

const COLUMN_PRIORITY = ["code_id"];

const COLUMN_LABELS: Record<string, string> = {
  code_id: "Código",
  store: "Loja",
  id_bling: "ID Bling",
  reference: "Referência",
  product: "Produto",
  mark: "Marca",
  category: "Categoria",
  price: "Preço",
  cost: "Custo",
  current_cost: "Custo Atual",
  previous_cost: "Custo Anterior",
  packaging_cost: "Custo de Embalagem",
  stock: "Estoque",
  sku: "SKU",
  ean: "EAN",
  status: "Status",
  description: "Descrição",
  brand: "Marca",
  quantity: "Quantidade",
  discount: "Desconto",
  margin: "Margem",
  tax: "Imposto",
  weight: "Peso",
  height: "Altura",
  width: "Largura",
  length: "Comprimento",
  created_at: "Criado em",
  updated_at: "Atualizado em",
};

function translateColumn(key: string): string {
  return COLUMN_LABELS[key] ?? key;
}

function sortPreviewKeys(keys: string[]): string[] {
  const priority = COLUMN_PRIORITY.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !COLUMN_PRIORITY.includes(k));
  return [...priority, ...rest];
}

function isNumericValue(value: unknown): boolean {
  return (
    typeof value === "number" ||
    (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()))
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function AlertBox({
  variant,
  title,
  messages,
  footer,
}: {
  variant: "error" | "warning";
  title: string;
  messages: string[];
  footer?: string;
}) {
  const isError = variant === "error";
  const color = isError ? RED : ORANGE;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className="border border-neutral-800 p-3"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-neutral-800"
          style={{ color }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div>
          <strong className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
            {title} ({messages.length})
          </strong>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-[11px] text-neutral-400">
            {messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          {footer && (
            <p className="mt-1 text-[11px] font-medium" style={{ color: RED }}>
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, description }: { title: string; description: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-neutral-800 p-3"
      style={{ borderLeft: `2px solid ${ORANGE}` }}
    >
      <div className="flex gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-neutral-800"
          style={{ color: ORANGE }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div>
          <strong
            className="text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: ORANGE }}
          >
            {title}
          </strong>
          <p className="mt-1 text-[11px] text-neutral-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

type RowErrorMap = Map<number, { rowMessage?: string; fields: Map<string, string> }>;

function buildRowErrorMap(rowErrors: RowError[]): RowErrorMap {
  const map: RowErrorMap = new Map();
  for (const err of rowErrors) {
    if (!map.has(err.row)) {
      map.set(err.row, { fields: new Map() });
    }
    const entry = map.get(err.row)!;
    if (err.field) {
      entry.fields.set(err.field, err.message);
    } else {
      entry.rowMessage = err.message;
    }
  }
  return map;
}

/**
 * Tabela de pré-visualização.
 * Quando `activeChannel` é informado, ganha uma coluna extra de checkbox
 * para marcar quais linhas serão enviadas para aquele canal.
 */
function PreviewTable({
  preview,
  keys,
  rowErrorMap,
  activeChannel,
  channelStyle,
  selectedRows,
  onToggleRow,
  onToggleAllRows,
}: {
  preview: PreviewRow[];
  keys: string[];
  rowErrorMap: RowErrorMap;
  activeChannel?: string | null;
  channelStyle?: { bg: string; text: string; border: string };
  selectedRows?: Set<number>;
  onToggleRow?: (rowIndex: number) => void;
  onToggleAllRows?: () => void;
}) {
  const showAssignColumn = Boolean(activeChannel && onToggleRow && selectedRows);

  if (keys.length === 0) {
    return (
      <div className="w-full border border-neutral-800 p-4 text-center text-[11px] text-neutral-600">
        Nenhuma coluna detectada no arquivo.
      </div>
    );
  }

  const allChecked = showAssignColumn && selectedRows!.size === preview.length && preview.length > 0;
  const someChecked = showAssignColumn && selectedRows!.size > 0 && !allChecked;

  return (
    <div className="w-full border border-neutral-800 overflow-hidden">
      <div className="h-56 overflow-auto">
        <table className="w-full min-w-full text-[11.5px] text-neutral-400">
          <caption className="sr-only">Pré-visualização dos registros a serem importados</caption>
          <thead className="sticky top-0 z-10 bg-neutral-900">
            <tr>
              {showAssignColumn && (
                <th scope="col" className="w-9 whitespace-nowrap p-2">
                  <button
                    type="button"
                    onClick={onToggleAllRows}
                    className={[
                      "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors",
                      allChecked
                        ? "border-white bg-white"
                        : someChecked
                        ? "border-white/50 bg-white/20"
                        : "border-neutral-600 bg-transparent",
                    ].join(" ")}
                    title={allChecked ? "Desmarcar todas" : "Marcar todas"}
                  >
                    {allChecked && <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />}
                    {someChecked && <span className="h-[1.5px] w-2 rounded-full bg-white/80" />}
                  </button>
                </th>
              )}
              {keys.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="whitespace-nowrap p-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500"
                  title={k}
                >
                  {translateColumn(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => {
              const rowErr = rowErrorMap.get(i);
              const hasRowError = Boolean(rowErr);
              const isRowChecked = showAssignColumn && selectedRows!.has(i);

              return (
                <tr
                  key={i}
                  className={`border-t border-neutral-900 transition-colors ${
                    hasRowError
                      ? "bg-red-950/30"
                      : isRowChecked
                      ? "bg-white/[0.04]"
                      : "hover:bg-neutral-900/60"
                  }`}
                  title={rowErr?.rowMessage}
                >
                  {showAssignColumn && (
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => onToggleRow!(i)}
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors cursor-pointer",
                          isRowChecked
                            ? "border-white bg-white"
                            : "border-neutral-600 bg-transparent hover:border-neutral-400",
                        ].join(" ")}
                      >
                        {isRowChecked && <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />}
                      </button>
                    </td>
                  )}
                  {keys.map((k) => {
                    const raw = row?.[k];
                    const value = formatCellValue(raw);
                    const fieldError = rowErr?.fields.get(k);
                    const isRowLevelOnly = hasRowError && !fieldError && rowErr?.fields.size === 0;
                    const isFlagged = Boolean(fieldError) || isRowLevelOnly;

                    return (
                      <td
                        key={k}
                        className={`relative max-w-[220px] overflow-hidden whitespace-nowrap p-2 text-ellipsis ${
                          isNumericValue(raw) ? "text-right tabular-nums" : "text-left"
                        } ${isFlagged ? "bg-red-500/10" : ""}`}
                        style={
                          isFlagged
                            ? { boxShadow: `inset 0 0 0 1px ${RED}66` }
                            : undefined
                        }
                        title={fieldError ?? (isRowLevelOnly ? rowErr?.rowMessage : value)}
                      >
                        <span className={isFlagged ? "text-red-400" : ""}>{value}</span>
                        {fieldError && (
                          <AlertTriangle
                            className="ml-1 inline-block h-3 w-3 shrink-0 align-middle"
                            style={{ color: RED }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda do canal ativo */}
      {activeChannel && channelStyle && (
        <div className="flex items-center justify-between border-t border-neutral-900 bg-neutral-950 px-3 py-1.5">
          <span className="text-[10px] text-neutral-500">
            Marcando anúncios para{" "}
            <span
              className="rounded px-1.5 py-0.5 font-semibold"
              style={{
                backgroundColor: `${channelStyle.bg}22`,
                color: channelStyle.bg === "#FFFFFF" ? "#ffffff" : channelStyle.bg,
              }}
            >
              {activeChannel}
            </span>
          </span>
          <span className="text-[10px] tabular-nums text-neutral-500">
            {selectedRows?.size ?? 0}/{preview.length} selecionados
          </span>
        </div>
      )}
    </div>
  );
}

function InlineToast({ message, onClose }: { message: InlineMessage; onClose: () => void }) {
  if (!message) return null;

  const color =
    message.type === "success"
      ? GREEN
      : message.type === "error"
      ? RED
      : message.type === "warning"
      ? ORANGE
      : "#a3a3a3";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-3 border border-neutral-800 p-3"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div>
        <strong className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
          {message.title}
        </strong>
        {message.description && (
          <span className="text-[10.5px] text-neutral-500">{message.description}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar mensagem"
        className="shrink-0 text-neutral-600 hover:text-neutral-300 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ConfirmImportModal({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  preview = [],
  warnings = [],
  errors = [],
  rowErrors = [],
  tipo,
  customTitle,
  customText,
  duplicatesCount = 0,
  result = null,
  availableChannels = [],
  selectedChannels = [],
  onChannelsChange,
  channelRowAssignments = {},
  onChannelRowAssignmentsChange,
}: Props) {
  const hasErrors = errors.length > 0 || rowErrors.length > 0;
  const hasWarnings = warnings.length > 0 && !hasErrors;
  const hasDuplicates = duplicatesCount > 0;
  const isInclusao = tipo === "inclusao";

  const confirmClickLock = useRef(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const [inlineMessage, setInlineMessage] = useState<InlineMessage>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const keys = useMemo(
    () => (preview.length > 0 ? sortPreviewKeys(Object.keys(preview[0])) : []),
    [preview]
  );

  const rowErrorMap = useMemo(() => buildRowErrorMap(rowErrors), [rowErrors]);

  const titulo =
    customTitle ?? (isInclusao ? "Confirmar Inclusão de Anúncios" : "Confirmar Alteração de Anúncios");

  const texto =
    customText ??
    (isInclusao
      ? "Você está prestes a INCLUIR novos anúncios no sistema."
      : "Você está prestes a ALTERAR anúncios existentes.");

  const targetLabel = `${count} ${count === 1 ? "registro" : "registros"} detectado(s)`;

  const willInsertCount = isInclusao ? Math.max(count - duplicatesCount, 0) : count;

  const ACCENT = hasErrors ? RED : GREEN;
  const ACCENT_HOVER = GREEN_HOVER;

  const showChannelSelector = Boolean(onChannelsChange) && availableChannels.length > 0;
  const canAssignRows = Boolean(onChannelRowAssignmentsChange) && preview.length > 0;

  // Ativa automaticamente o primeiro canal selecionado como "canal ativo" de atribuição
  useEffect(() => {
    if (!canAssignRows) return;
    if (activeChannel && selectedChannels.includes(activeChannel)) return;
    setActiveChannel(selectedChannels[0] ?? null);
  }, [selectedChannels, activeChannel, canAssignRows]);

  const activeChannelStyle = activeChannel
    ? CHANNEL_STYLES[activeChannel] ?? DEFAULT_CHANNEL_STYLE
    : undefined;

  const activeRowSelection = useMemo(() => {
    if (!activeChannel) return new Set<number>();
    const assigned = channelRowAssignments[activeChannel];
    // Se nunca foi customizado, assume TODAS as linhas selecionadas por padrão
    if (assigned === undefined) {
      return new Set(preview.map((_, i) => i));
    }
    return new Set(assigned);
  }, [activeChannel, channelRowAssignments, preview]);

  function toggleRowForActiveChannel(rowIndex: number) {
    if (!activeChannel || !onChannelRowAssignmentsChange) return;
    const current = new Set(activeRowSelection);
    if (current.has(rowIndex)) current.delete(rowIndex);
    else current.add(rowIndex);
    onChannelRowAssignmentsChange({
      ...channelRowAssignments,
      [activeChannel]: Array.from(current),
    });
  }

  function toggleAllRowsForActiveChannel() {
    if (!activeChannel || !onChannelRowAssignmentsChange) return;
    const allSelected = activeRowSelection.size === preview.length;
    onChannelRowAssignmentsChange({
      ...channelRowAssignments,
      [activeChannel]: allSelected ? [] : preview.map((_, i) => i),
    });
  }

  useEffect(() => {
    if (open && !loading) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, loading]);

  useEffect(() => {
    if (!loading) confirmClickLock.current = false;
  }, [loading]);

  useEffect(() => {
    if (!open) setInlineMessage(null);
  }, [open]);

  useEffect(() => {
    if (result) {
      setInlineMessage({
        type: result.rejeitados > 0 ? "warning" : "success",
        title: "Importação concluída",
        description:
          result.rejeitados > 0
            ? `${result.importados} incluído(s) com sucesso. ${result.rejeitados} ignorado(s) (já existente(s) ou inválido(s)).`
            : `${result.importados} registro(s) incluído(s) com sucesso.`,
      });
    }
  }, [result]);

  const resetState = useCallback(() => {
    setInlineMessage(null);
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && loading) return;
      if (!v && hasWarnings) {
        setInlineMessage({
          type: "info",
          title: "Importação cancelada",
          description: "Nenhum dado foi processado.",
        });
      }
      if (!v) resetState();
      onOpenChange(v);
    },
    [loading, hasWarnings, onOpenChange, resetState]
  );

  const handleConfirm = useCallback(async () => {
    if (confirmClickLock.current || loading) return;

    if (hasErrors) {
      setInlineMessage({
        type: "error",
        title: "Importação bloqueada",
        description: "Corrija os erros para continuar.",
      });
      return;
    }

    confirmClickLock.current = true;

    if (hasWarnings) {
      setInlineMessage({
        type: "warning",
        title: "Atenção",
        description: "Existem avisos na importação.",
      });
    }

    setInlineMessage({
      type: "info",
      title: "Importação iniciada",
      description: "Processando arquivo...",
    });

    void onConfirm();
  }, [hasErrors, hasWarnings, loading, onConfirm]);

  const canConfirm = !hasErrors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
        onInteractOutside={(e) => loading && e.preventDefault()}
        className="bg-[#0a0a0a] border border-neutral-800 shadow-2xl w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] sm:max-w-2xl sm:w-[90%] flex flex-col overflow-hidden p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <DialogHeader className="shrink-0 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: ACCENT }} />
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">{titulo}</DialogTitle>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{targetLabel}</p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 mt-4">
          {/* Resumo do arquivo */}
          <div>
            <SectionHeader
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              title="Resumo da importação"
              description={texto}
            />
            <div className="flex flex-wrap items-center gap-2 border border-neutral-800 px-3 py-2">
              <span className="text-[11px] text-neutral-500">O arquivo contém</span>
              <span
                className="border px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: "#1a8ceb40", color: "#1a8ceb", backgroundColor: "#1a8ceb14" }}
              >
                {count} {count === 1 ? "registro" : "registros"}
              </span>

              {isInclusao && hasDuplicates && (
                <>
                  <span
                    className="border px-2 py-0.5 text-[11px] font-semibold"
                    style={{ borderColor: `${GREEN}40`, color: GREEN, backgroundColor: `${GREEN}14` }}
                  >
                    {willInsertCount} {willInsertCount === 1 ? "será incluído" : "serão incluídos"}
                  </span>
                  <span
                    className="border px-2 py-0.5 text-[11px] font-semibold"
                    style={{ borderColor: `${ORANGE}40`, color: ORANGE, backgroundColor: `${ORANGE}14` }}
                  >
                    {duplicatesCount} já {duplicatesCount === 1 ? "existe" : "existem"} (será
                    {duplicatesCount === 1 ? "" : "ão"} ignorado{duplicatesCount === 1 ? "" : "s"})
                  </span>
                </>
              )}

              {preview.length > 0 && preview.length < count && (
                <span className="text-[10px] text-neutral-600">(amostra de {preview.length})</span>
              )}
            </div>
          </div>

          {/* Seletor de canais de marketplace */}
          {showChannelSelector && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div>
                <SectionHeader
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  title="Canais de marketplace"
                  description={
                    isInclusao
                      ? "Os anúncios incluídos serão vinculados a estes canais."
                      : "Garante o vínculo destes canais para os anúncios alterados."
                  }
                />
                <div className="border border-neutral-800 p-3">
                  <ChannelSelector
                    availableChannels={availableChannels}
                    selectedChannels={selectedChannels}
                    onChange={onChannelsChange!}
                    disabled={loading}
                  />
                </div>

                {/* Tabs para escolher qual canal está sendo editado na tabela abaixo */}
                {canAssignRows && selectedChannels.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-600">Editar anúncios de:</span>
                    {selectedChannels.map((ch) => {
                      const style = CHANNEL_STYLES[ch] ?? DEFAULT_CHANNEL_STYLE;
                      const isActive = activeChannel === ch;
                      const assignedCount =
                        channelRowAssignments[ch]?.length ?? preview.length;
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setActiveChannel(ch)}
                          disabled={loading}
                          style={
                            isActive
                              ? {
                                  backgroundColor: style.bg,
                                  color: style.text,
                                  borderColor: style.border,
                                }
                              : undefined
                          }
                          className={[
                            "rounded border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            loading ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                            !isActive &&
                              "border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-600 hover:text-neutral-300",
                          ].join(" ")}
                        >
                          {ch}{" "}
                          <span className="tabular-nums opacity-70">
                            ({assignedCount}/{preview.length})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Aviso de duplicatas (não bloqueante) */}
          {isInclusao && hasDuplicates && !hasErrors && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <InfoBox
                title="Registros já existentes"
                description={`${duplicatesCount} ${
                  duplicatesCount === 1 ? "registro já existe" : "registros já existem"
                } no sistema e ${
                  duplicatesCount === 1 ? "será ignorado" : "serão ignorados"
                } durante a inclusão. Use o modo "Alteração" se desejar atualizá-los.`}
              />
            </>
          )}

          {/* Alertas */}
          {(errors.length > 0 || hasWarnings) && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div aria-live="polite" className="space-y-2">
                {errors.length > 0 && (
                  <AlertBox
                    variant="error"
                    title="Erros encontrados"
                    messages={errors}
                    footer="A importação foi bloqueada."
                  />
                )}
                {hasWarnings && <AlertBox variant="warning" title="Avisos" messages={warnings} />}
              </div>
            </>
          )}

          {/* Preview (agora com seleção por anúncio, se houver canal ativo) */}
          {preview.length > 0 && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <div>
                <SectionHeader
                  icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                  title="Pré-visualização"
                  description={
                    canAssignRows && activeChannel
                      ? "Marque quais anúncios serão enviados para o canal selecionado acima"
                      : rowErrors.length > 0
                      ? "Amostra dos dados — células em vermelho indicam erro"
                      : "Amostra dos dados que serão processados"
                  }
                />
                <PreviewTable
                  preview={preview}
                  keys={keys}
                  rowErrorMap={rowErrorMap}
                  activeChannel={canAssignRows ? activeChannel : null}
                  channelStyle={activeChannelStyle}
                  selectedRows={canAssignRows ? activeRowSelection : undefined}
                  onToggleRow={canAssignRows ? toggleRowForActiveChannel : undefined}
                  onToggleAllRows={canAssignRows ? toggleAllRowsForActiveChannel : undefined}
                />
              </div>
            </>
          )}

          {inlineMessage && (
            <>
              <div className="my-5 h-px bg-neutral-900" />
              <InlineToast message={inlineMessage} onClose={() => setInlineMessage(null)} />
            </>
          )}
        </div>

        <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(false);
            }}
            className="flex h-11 w-full items-center justify-center border border-neutral-800 text-sm text-white transition-colors hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:px-6"
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={!canConfirm || loading}
            onClick={(e) => {
              e.stopPropagation();
              void handleConfirm();
            }}
            title={hasErrors ? "Corrija os erros para continuar" : undefined}
            className={`
              flex h-11 w-full items-center justify-center gap-2 border text-sm font-medium
              transition-colors sm:h-10 sm:w-auto sm:px-6
              disabled:cursor-not-allowed disabled:opacity-50
              ${canConfirm ? "cursor-pointer" : ""}
            `}
            style={canConfirm ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}
            onMouseEnter={(e) => {
              if (canConfirm) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT_HOVER;
            }}
            onMouseLeave={(e) => {
              if (canConfirm) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ACCENT;
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : hasErrors ? (
              "Corrija os erros"
            ) : isInclusao ? (
              "Confirmar Inclusão"
            ) : (
              "Confirmar Alteração"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
