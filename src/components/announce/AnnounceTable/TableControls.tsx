"use client";

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

export function TableControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  selectedCount = 0,
}: TableControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

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
            <span className="font-medium text-white">{totalItems}</span>{" "}
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
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
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
                {[10, 20, 50].map((num) => (
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
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
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
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
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
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
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
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
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
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = Number(e.target.value);
                  if (page >= 1 && page <= totalPages) onPageChange(page);
                }}
                className="
                  h-10 w-16
                  rounded-lg border border-neutral-700
                  bg-[#0f0f0f]/80
                  px-1 text-center text-sm text-white
                  focus:outline-none focus:ring-1 focus:ring-neutral-600
                  sm:h-8 sm:w-12
                "
              />

              <span className="text-sm text-neutral-400">de {totalPages}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}