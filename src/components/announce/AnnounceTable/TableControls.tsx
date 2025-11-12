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
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-neutral-400">
            Mostrando{" "}
            <span className="font-medium text-white">{startItem}</span> a{" "}
            <span className="font-medium text-white">{endItem}</span> de{" "}
            <span className="font-medium text-white">{totalItems}</span> anúncios
          </p>

          {selectedCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 bg-[#1e1e1e] border border-[#1A8CEB] text-white"
            >
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-neutral-400">Linhas por página:</p>

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[70px] h-8 bg-[#0f0f0f]/90 border border-neutral-700 text-white rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border border-neutral-700 text-white rounded-xl shadow-lg">
              {[10, 20, 50].map((num) => (
                <SelectItem
                  key={num}
                  value={num.toString()}
                  className="hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 border-neutral-700 text-white hover:bg-white/10 transition-all"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 border-neutral-700 text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = Number(e.target.value);
                if (page >= 1 && page <= totalPages) onPageChange(page);
              }}
              className="w-12 h-8 text-center text-sm bg-[#0f0f0f]/80 border border-neutral-700 rounded-lg px-1 text-white focus:ring-1 focus:ring-neutral-600 focus:outline-none"
            />
            <span className="text-sm text-neutral-400">de {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 border-neutral-700 text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 border-neutral-700 text-white hover:bg-white/10 transition-all"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
