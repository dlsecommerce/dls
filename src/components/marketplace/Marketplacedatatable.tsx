"use client";

import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CopyIcon,
  Pencil as EditIcon,
  PackageSearch,
  GripVertical,
} from "lucide-react";
import {
  Marketplace,
  CompInfo,
  CompStatus,
} from "@/components/marketplace/hooks/types";
import MarketplaceHeaderBar from "@/components/marketplace/Marketplaceheader";

const COLUMN_COUNT = 8;

// checkbox, id_bling, loja, canal, referência, produto (flex), marca, ações
const COL_WIDTHS = [48, 130, 130, 120, 130, 0, 120, 140];

const EMPTY_COMPOSITION_MAP: Record<string, CompInfo> = {};

function ColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w, i) =>
        w === 0 ? <col key={i} /> : <col key={i} style={{ width: `${w}px` }} />
      )}
    </colgroup>
  );
}

type Props = {
  rows: Marketplace[];
  loading: boolean;
  selectedRows: Marketplace[];
  setSelectedRows: React.Dispatch<React.SetStateAction<Marketplace[]>>;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  openEdit: (row: Marketplace) => void;
  openProductRules: (row: Marketplace) => void;

  // Status de composição vindo de useCompositionMap (opcional enquanto carrega)
  compositionMap?: Record<string, CompInfo>;

  // Props do header (repassadas para MarketplaceHeaderBar)
  allSelected: boolean;
  situacao: string;
  appliedSituacao: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onToggleSelectAll: (checked: boolean) => void;
  onSituacaoChange: (value: string) => void;
  onSort: (column: string) => void;
  onClearSelection: () => void;
  onSelectAllTable: () => void;
  selectingAll?: boolean;
};

const getRowKey = (row: any) => String(row?.id ?? "").trim();

/* ─────────────────────────────────────────────
 * HELPER — detecta itens recentes ("Novos")
 * ───────────────────────────────────────────── */
const NEW_THRESHOLD_HOURS = 24 * 5; // 5 dias

function isRecent(createdAt?: string | null, hours = NEW_THRESHOLD_HOURS) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= hours * 60 * 60 * 1000;
}

function NewBadge() {
  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center rounded-none border border-[#1a8ceb]/40 bg-[#1a8ceb]/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-[#1a8ceb]"
      title="Adicionado recentemente"
    >
      Novo
    </span>
  );
}

const isMercadoLivre = (channel?: string) =>
  (channel ?? "").trim().toLocaleLowerCase("pt-BR").includes("mercado livre");

/* ─────────────────────────────────────────────
 * COMPOSIÇÃO — dropdown de leitura no hover
 * ───────────────────────────────────────────── */
const STATUS_STYLE: Record<
  CompStatus,
  { dot: string; text: string; label: string }
> = {
  red: {
    dot: "bg-red-500",
    text: "text-red-400",
    label: "Sem composição e sem quantidade",
  },
  orange: {
    dot: "bg-orange-500",
    text: "text-orange-400",
    label: "Composição incompleta ou quantidade divergente",
  },
  green: {
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    label: "Composição correta",
  },
};

const POPOVER_WIDTH = 272; // w-68 aprox., em px

function CompositionHover({
  info,
  children,
}: {
  info?: CompInfo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  // Fecha ao rolar, porque o dropdown é fixo na tela
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open]);

  const handleEnter = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const maxLeft = window.innerWidth - POPOVER_WIDTH - 8;
      setPos({
        top: r.bottom + 6,
        left: Math.max(8, Math.min(r.left, maxLeft)),
      });
    }
    setOpen(true);
  };

  const status: CompStatus = info?.status ?? "red";
  const s = STATUS_STYLE[status];
  const items = info?.items ?? [];
  const alerts = info?.alerts ?? [];

  return (
    <div
      ref={ref}
      className="inline-flex max-w-full min-w-0 items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 50,
              width: POPOVER_WIDTH,
            }}
            className="pointer-events-none border border-neutral-800 bg-[#0a0a0a] p-3 shadow-xl"
          >
            {!info ? (
              <p className="text-xs text-neutral-500">Carregando composição...</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className={`text-[11px] font-semibold ${s.text}`}>
                    {s.label}
                  </span>
                </div>

                {items.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-neutral-800 pt-2">
                    {items.map((it) => (
                      <li
                        key={it.cost_id}
                        className="flex justify-between gap-2 text-xs text-neutral-300"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-neutral-200">
                            {it.code ?? it.cost_id}
                          </span>
                          {it.product && (
                            <span className="ml-1.5 truncate text-neutral-500">
                              {it.product}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-neutral-400">
                          x{Number(it.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 border-t border-neutral-800 pt-2 text-xs text-neutral-500">
                    Nenhum item cadastrado.
                  </p>
                )}

                {status === "orange" && alerts.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-neutral-800 pt-2">
                    {alerts.map((a, idx) => (
                      <li key={`${a.reason}-${idx}`} className="text-[11px] leading-snug text-orange-300/90">
                        {a.reason}
                        {a.code && (
                          <span className="ml-1 font-mono text-neutral-400">
                            [{a.code}]
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="
        flex h-8 w-8 items-center justify-center
        border border-transparent
        text-neutral-500
        transition-colors
        hover:border-neutral-800 hover:bg-neutral-900 hover:text-[#1a8ceb]
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
      "
    >
      {children}
    </button>
  );
}

function CopyBtn({
  value,
  copyKey,
  copiedId,
  handleCopy,
  label,
}: {
  value: string;
  copyKey: string;
  copiedId: string | null;
  handleCopy: (text: string, key: string) => void;
  label: string;
}) {
  if (!value) return null;

  const isCopied = copiedId === copyKey;

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => handleCopy(value, copyKey)}
        aria-label={`Copiar ${label}`}
        title={`Copiar ${label}`}
        className="
          cursor-pointer opacity-0 transition-opacity
          group-hover:opacity-100
          focus-visible:opacity-100 focus-visible:outline-none
          focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
        "
      >
        <CopyIcon
          className={`h-3 w-3 ${
            isCopied ? "text-[#1a8ceb]" : "text-neutral-500 hover:text-[#1a8ceb]"
          }`}
        />
      </button>

      {isCopied && (
        <span
          role="status"
          className="
            absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap
            border border-[#1a8ceb]/40 bg-[#0d0d0d] px-2 py-0.5
            text-[10px] font-medium text-[#1a8ceb]
            shadow-lg
          "
        >
          Copiado!
        </span>
      )}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`} className="border-b border-neutral-900">
          <TableCell colSpan={COLUMN_COUNT} className="py-2.5">
            <div className="h-4 w-full animate-pulse bg-neutral-900" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <PackageSearch className="h-8 w-8 text-neutral-700" aria-hidden="true" />
          <p className="text-sm text-neutral-400">Nenhum registro encontrado</p>
          <p className="text-xs text-neutral-500">
            Tente ajustar os filtros ou limpar a busca.
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

const MarketplaceTableRow = React.memo(
  function MarketplaceTableRow({
    row,
    index,
    isSelected,
    copiedId,
    handleCopy,
    openEdit,
    openProductRules,
    onToggle,
    compInfo,
  }: {
    row: Marketplace;
    index: number;
    isSelected: boolean;
    copiedId: string | null;
    handleCopy: (text: string, key: string) => void;
    openEdit: (row: Marketplace) => void;
    openProductRules: (row: Marketplace) => void;
    onToggle: (row: Marketplace, checked: boolean) => void;
    compInfo?: CompInfo;
  }) {
    const showNewBadge = isRecent((row as any)?.created_at);
    const showProductRuleBtn = isMercadoLivre(row.channel);

    return (
      <TableRow
        className={`group border-b border-neutral-900 transition-colors ${
          isSelected ? "bg-[#1a8ceb]/[0.06] hover:bg-[#1a8ceb]/[0.09]" : "hover:bg-neutral-900/40"
        }`}
      >
        {/* Checkbox */}
        <TableCell className="text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggle(row, e.target.checked)}
            aria-label={`Selecionar marketplace ${(row as any).id_bling ?? row.id}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
          />
        </TableCell>

        {/* ID Bling */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{(row as any).id_bling || "-"}</span>
            <CopyBtn
              value={String((row as any).id_bling || "")}
              copyKey={`bling-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="ID Bling"
            />
          </div>
        </TableCell>

        {/* Loja */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{row.store || "-"}</span>
        </TableCell>

        {/* Canal */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{row.channel || "-"}</span>
        </TableCell>

        {/* Referência (com dropdown de composição) */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <CompositionHover info={compInfo}>
              <span className="truncate">{(row as any).reference || "-"}</span>
            </CompositionHover>
            <CopyBtn
              value={String((row as any).reference || "")}
              copyKey={`reference-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="referência"
            />
          </div>
        </TableCell>

        {/* Produto */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <div className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{row.product || "-"}</span>
            {showNewBadge && <NewBadge />}
            <CopyBtn
              value={row.product || ""}
              copyKey={`produto-${index}`}
              copiedId={copiedId}
              handleCopy={handleCopy}
              label="produto"
            />
          </div>
        </TableCell>

        {/* Marca */}
        <TableCell className="text-left text-[13px] text-neutral-300">
          <span className="truncate">{(row as any).mark || "-"}</span>
        </TableCell>

        {/* Ações */}
        <TableCell>
          <div className="flex justify-center gap-1">
            <IconBtn label={`Editar ${row.product}`} onClick={() => openEdit(row)}>
              <EditIcon className="h-3.5 w-3.5" />
            </IconBtn>
            {showProductRuleBtn && (
              <IconBtn
                label={`Regra específica de ${row.product}`}
                onClick={() => openProductRules(row)}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </IconBtn>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.isSelected === next.isSelected &&
    prev.copiedId === next.copiedId &&
    prev.compInfo === next.compInfo
);

export default function MarketplaceDataTable({
  rows,
  loading,
  selectedRows,
  setSelectedRows,
  copiedId,
  handleCopy,
  openEdit,
  openProductRules,
  compositionMap = EMPTY_COMPOSITION_MAP,
  allSelected,
  situacao,
  appliedSituacao,
  sortColumn,
  sortDirection,
  onToggleSelectAll,
  onSituacaoChange,
  onSort,
  onClearSelection,
  onSelectAllTable,
  selectingAll,
}: Props) {
  const selectedKeys = React.useMemo(
    () => new Set(selectedRows.map((r) => getRowKey(r))),
    [selectedRows]
  );

  const toggleSelectedRow = useCallback(
    (row: Marketplace, checked: boolean) => {
      const rowKey = getRowKey(row);
      if (!rowKey) return;

      setSelectedRows((prev) => {
        if (checked) {
          const already = prev.some((r) => getRowKey(r) === rowKey);
          if (already) return prev;
          return [...prev, row];
        }

        return prev.filter((r) => getRowKey(r) !== rowKey);
      });
    },
    [setSelectedRows]
  );

  return (
    <>
      {/* MOBILE */}
      <div className="md:hidden space-y-2 px-2 pb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`mskel-${i}`} className="h-28 animate-pulse border border-neutral-900 bg-neutral-950" />
          ))
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <PackageSearch className="h-8 w-8 text-neutral-700" aria-hidden="true" />
            <p className="text-sm text-neutral-400">Nenhum registro encontrado</p>
            <p className="text-xs text-neutral-500">Tente ajustar os filtros.</p>
          </div>
        ) : (
          rows.map((m, i) => {
            const isSelected = selectedKeys.has(getRowKey(m));
            const showNewBadge = isRecent((m as any)?.created_at);
            const showProductRuleBtn = isMercadoLivre(m.channel);

            return (
              <div
                key={`${m.id}-${i}`}
                className={`border p-3 transition-colors ${
                  isSelected ? "border-[#1a8ceb]/40 bg-[#1a8ceb]/[0.05]" : "border-neutral-800 bg-[#0a0a0a]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      {m.store || "-"}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white">
                      <span className="truncate">{m.product || "-"}</span>
                      {showNewBadge && <NewBadge />}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectedRow(m, e.target.checked)}
                    aria-label={`Selecionar marketplace ${(m as any).id_bling ?? m.id}`}
                    className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#1a8ceb] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-neutral-400">
                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">ID Bling</div>
                    <div className="mt-1 truncate text-white">{(m as any).id_bling || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Canal</div>
                    <div className="mt-1 truncate text-white">{m.channel || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Referência</div>
                    <div className="mt-1 truncate text-white">{(m as any).reference || "-"}</div>
                  </div>

                  <div className="min-w-0 border border-neutral-800 bg-[#080808] p-2">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Marca</div>
                    <div className="mt-1 truncate text-white">{(m as any).mark || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <IconBtn label={`Editar ${m.product}`} onClick={() => openEdit(m)}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </IconBtn>
                  {showProductRuleBtn && (
                    <IconBtn
                      label={`Regra específica de ${m.product}`}
                      onClick={() => openProductRules(m)}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="w-full overflow-x-auto lg:overflow-visible">
          <Table className="min-w-[1188px] table-fixed">
            <ColGroup />

            <MarketplaceHeaderBar
              allSelected={allSelected}
              hasRows={rows.length > 0}
              situacao={situacao}
              appliedSituacao={appliedSituacao}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              selectedCount={selectedRows.length}
              onToggleSelectAll={onToggleSelectAll}
              onSituacaoChange={onSituacaoChange}
              onSort={onSort}
              onClearSelection={onClearSelection}
              onSelectAllTable={onSelectAllTable}
              selectingAll={selectingAll}
            />

            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : rows.length === 0 ? (
                <EmptyState />
              ) : (
                rows.map((m, i) => (
                  <MarketplaceTableRow
                    key={`${m.id}-${i}`}
                    row={m}
                    index={i}
                    isSelected={selectedKeys.has(getRowKey(m))}
                    copiedId={copiedId}
                    handleCopy={handleCopy}
                    openEdit={openEdit}
                    openProductRules={openProductRules}
                    onToggle={toggleSelectedRow}
                    compInfo={compositionMap[String(m.id)]}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
