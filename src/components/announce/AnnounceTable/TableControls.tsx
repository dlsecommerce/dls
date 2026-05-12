"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TableControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  selectedCount?: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function clampPage(page: number, totalPages: number) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);

  if (!Number.isFinite(page)) return 1;
  if (page < 1) return 1;
  if (page > safeTotalPages) return safeTotalPages;

  return page;
}

function getSafeItemsPerPage(itemsPerPage: number) {
  if (!Number.isFinite(itemsPerPage) || itemsPerPage <= 0) {
    return PAGE_SIZE_OPTIONS[0];
  }

  return itemsPerPage;
}

export function TableControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  selectedCount = 0,
}: TableControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeItemsPerPage = getSafeItemsPerPage(itemsPerPage);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safeCurrentPage = clampPage(Number(currentPage) || 1, safeTotalPages);

  const [pageInput, setPageInput] = React.useState(
    safeCurrentPage.toString()
  );

  const startItem =
    safeTotalItems === 0
      ? 0
      : (safeCurrentPage - 1) * safeItemsPerPage + 1;

  const endItem = Math.min(
    safeCurrentPage * safeItemsPerPage,
    safeTotalItems
  );

  const updatePaginationUrl = React.useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams(searchParams.toString());

      params.set("page", String(page));
      params.set("limit", String(limit));

      router.replace(`${pathname}?${params.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const applyPageChange = React.useCallback(
    (page: number) => {
      const nextPage = clampPage(page, safeTotalPages);

      setPageInput(nextPage.toString());
      onPageChange(nextPage);
      updatePaginationUrl(nextPage, safeItemsPerPage);
    },
    [onPageChange, safeItemsPerPage, safeTotalPages, updatePaginationUrl]
  );

  const handleItemsPerPageChange = React.useCallback(
    (value: string) => {
      const nextItemsPerPage = Number(value);

      if (!Number.isFinite(nextItemsPerPage) || nextItemsPerPage <= 0) {
        return;
      }

      setPageInput("1");
      onItemsPerPageChange(nextItemsPerPage);
      onPageChange(1);
      updatePaginationUrl(1, nextItemsPerPage);
    },
    [onItemsPerPageChange, onPageChange, updatePaginationUrl]
  );

  const handlePageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    if (value === "") {
      setPageInput("");
      return;
    }

    const onlyNumbers = value.replace(/\D/g, "");
    setPageInput(onlyNumbers);
  };

  const handlePageInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const typedPage = Number(pageInput);
    const nextPage = clampPage(typedPage, safeTotalPages);

    applyPageChange(nextPage);
  };

  const handlePageInputBlur = () => {
    if (pageInput.trim() === "") {
      setPageInput(safeCurrentPage.toString());
      return;
    }

    const typedPage = Number(pageInput);
    const nextPage = clampPage(typedPage, safeTotalPages);

    setPageInput(nextPage.toString());
  };

  React.useEffect(() => {
    setPageInput(safeCurrentPage.toString());
  }, [safeCurrentPage]);

  React.useEffect(() => {
    const urlPage = Number(searchParams.get("page"));
    const urlLimit = Number(searchParams.get("limit"));

    const hasValidUrlPage =
      Number.isFinite(urlPage) && urlPage >= 1 && urlPage <= safeTotalPages;

    const hasValidUrlLimit = Number.isFinite(urlLimit) && urlLimit > 0;

    if (!hasValidUrlPage || !hasValidUrlLimit) {
      updatePaginationUrl(safeCurrentPage, safeItemsPerPage);
    }
  }, [
    safeCurrentPage,
    safeItemsPerPage,
    safeTotalPages,
    searchParams,
    updatePaginationUrl,
  ]);

  return (
    <div
      className="
        w-full
        rounded-2xl border border-neutral-800
        bg-[#0f0f0f]/70
        p-3
        sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0
      "
    >
      <div className="flex flex-col gap-4 px-0 sm:flex-row sm:items-center sm:justify-between sm:px-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm leading-relaxed text-neutral-400">
            Mostrando{" "}
            <span className="font-medium text-white">{startItem}</span> a{" "}
            <span className="font-medium text-white">{endItem}</span> de{" "}
            <span className="font-medium text-white">{safeTotalItems}</span>{" "}
            anúncios
          </p>

          {selectedCount > 0 && (
            <Badge
              variant="default"
              className="
                w-fit
                border border-[#1A8CEB]
                bg-[#1e1e1e]
                text-white
              "
            >
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-2">
            <p className="text-sm text-neutral-400 sm:whitespace-nowrap">
              Linhas por página:
            </p>

            <Select
              value={safeItemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger
                className="
                  h-10 w-[82px]
                  rounded-lg border border-neutral-700
                  bg-[#0f0f0f]/90
                  text-white
                  transition-all
                  focus:ring-1 focus:ring-neutral-600
                  sm:h-8 sm:w-[70px]
                "
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="rounded-xl border border-neutral-700 bg-[#111111] text-white shadow-lg">
                {PAGE_SIZE_OPTIONS.map((num) => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    className="cursor-pointer transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
            <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPageChange(1)}
                disabled={safeCurrentPage === 1 || safeTotalPages <= 1}
                className="
                  h-10 w-full p-0
                  border-neutral-700
                  text-white
                  transition-all
                  hover:bg-white/10
                  active:scale-[0.98]
                  sm:h-8 sm:w-8
                "
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1 || safeTotalPages <= 1}
                className="
                  h-10 w-full p-0
                  border-neutral-700
                  text-white
                  transition-all
                  hover:bg-white/10
                  active:scale-[0.98]
                  sm:h-8 sm:w-8
                "
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPageChange(safeCurrentPage + 1)}
                disabled={
                  safeCurrentPage === safeTotalPages || safeTotalPages <= 1
                }
                className="
                  h-10 w-full p-0
                  border-neutral-700
                  text-white
                  transition-all
                  hover:bg-white/10
                  active:scale-[0.98]
                  sm:h-8 sm:w-8
                "
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPageChange(safeTotalPages)}
                disabled={
                  safeCurrentPage === safeTotalPages || safeTotalPages <= 1
                }
                className="
                  h-10 w-full p-0
                  border-neutral-700
                  text-white
                  transition-all
                  hover:bg-white/10
                  active:scale-[0.98]
                  sm:h-8 sm:w-8
                "
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 sm:mx-2">
              <span className="text-sm text-neutral-400">Página</span>

              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputBlur}
                aria-label="Número da página"
                className="
                  h-10 w-16
                  rounded-lg border border-neutral-700
                  bg-[#0f0f0f]/80
                  px-1 text-center text-sm text-white
                  focus:outline-none focus:ring-1 focus:ring-neutral-600
                  sm:h-8 sm:w-12
                "
              />

              <span className="text-sm text-neutral-400">
                de {safeTotalPages}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}