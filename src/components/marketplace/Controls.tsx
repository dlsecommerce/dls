"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface ControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  selectedCount?: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function clampPage(page: number, totalPages: number) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  if (!Number.isFinite(page)) return 1;
  if (page < 1) return 1;
  if (page > safeTotalPages) return safeTotalPages;
  return page;
}

export function Controls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  selectedCount = 0,
}: ControlsProps) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeItemsPerPage =
    Number.isFinite(itemsPerPage) && itemsPerPage > 0 ? itemsPerPage : PAGE_SIZE_OPTIONS[0];
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safeCurrentPage = clampPage(Number(currentPage) || 1, safeTotalPages);

  const [pageInput, setPageInput] = React.useState(String(safeCurrentPage));

  React.useEffect(() => {
    setPageInput(String(safeCurrentPage));
  }, [safeCurrentPage]);

  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * safeItemsPerPage, safeTotalItems);

  const applyPageChange = (page: number) => {
    const next = clampPage(page, safeTotalPages);
    setPageInput(String(next));
    onPageChange(next);
  };

  const handleItemsPerPageChange = (value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    onItemsPerPageChange(next);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value.replace(/\D/g, ""));
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyPageChange(Number(pageInput));
  };

  const handlePageInputBlur = () => {
    if (pageInput.trim() === "") {
      setPageInput(String(safeCurrentPage));
      return;
    }
    applyPageChange(Number(pageInput));
  };

  const isFirstPage = safeCurrentPage === 1 || safeTotalPages <= 1;
  const isLastPage = safeCurrentPage === safeTotalPages || safeTotalPages <= 1;

  const navBtnClass = `
    flex h-8 w-8 cursor-pointer items-center justify-center border border-neutral-800
    text-neutral-400 transition-colors
    hover:border-[#1a8ceb]/40 hover:text-white
    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a8ceb]
    disabled:cursor-not-allowed disabled:opacity-30
  `;

  return (
    <div className="w-full bg-transparent px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-neutral-500">
            <span className="font-medium text-white">{startItem}</span>–
            <span className="font-medium text-white">{endItem}</span> de{" "}
            <span className="font-medium text-white">{safeTotalItems}</span>
          </p>

          {selectedCount > 0 && (
            <span className="border border-[#1a8ceb]/30 bg-[#1a8ceb]/10 px-2 py-0.5 text-xs font-medium text-[#1a8ceb]">
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] text-neutral-500 sm:inline">Por página</span>

            <Select value={String(safeItemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger
                aria-label="Itens por página"
                className="h-8 w-[64px] cursor-pointer rounded-none border border-neutral-800 bg-[#050505] text-sm text-white focus:border-[#1a8ceb]/50 focus:ring-0 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent
                position="popper"
                sideOffset={4}
                className="min-w-[80px] rounded-none border border-neutral-800 bg-[#0d0d0d] p-1 shadow-2xl"
              >
                {PAGE_SIZE_OPTIONS.map((num) => {
                  const isActive = safeItemsPerPage === num;

                  return (
                    <SelectItem
                      key={num}
                      value={String(num)}
                      className={`
                        relative cursor-pointer rounded-none py-2 pl-3 pr-3 text-sm
                        transition-colors
                        focus:bg-neutral-900
                        data-[state=checked]:font-medium
                        [&_svg]:hidden
                        ${
                          isActive
                            ? "text-[#1a8ceb] data-[state=checked]:text-[#1a8ceb]"
                            : "text-[#ffffff]/70 hover:text-[#1a8ceb]"
                        }
                      `}
                    >
                      {num}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => applyPageChange(1)} disabled={isFirstPage} aria-label="Primeira página" className={navBtnClass}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>

            <button type="button" onClick={() => applyPageChange(safeCurrentPage - 1)} disabled={isFirstPage} aria-label="Página anterior" className={navBtnClass}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputBlur}
                aria-label="Número da página"
                className="h-8 w-11 border border-neutral-800 bg-[#050505] text-center text-sm text-white outline-none focus:border-[#ffffff]/50 focus-visible:ring-1 focus-visible:ring-[#1a8ceb]"
              />
              <span className="text-[13px] text-neutral-500">/ {safeTotalPages}</span>
            </div>

            <button type="button" onClick={() => applyPageChange(safeCurrentPage + 1)} disabled={isLastPage} aria-label="Próxima página" className={navBtnClass}>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button type="button" onClick={() => applyPageChange(safeTotalPages)} disabled={isLastPage} aria-label="Última página" className={navBtnClass}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
