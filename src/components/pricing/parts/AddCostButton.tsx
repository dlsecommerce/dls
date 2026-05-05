import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type AddCostButtonProps = {
  onClick: () => void;
};

export const AddCostButton: React.FC<AddCostButtonProps> = ({ onClick }) => (
  <Button
    type="button"
    onClick={onClick}
    variant="outline"
    className="
      mt-3 flex h-10 w-full items-center justify-center rounded-xl
      border border-white/10 bg-transparent
      px-4 text-xs font-semibold text-white/85
      shadow-none transition-all duration-200

      hover:border-white/20 hover:bg-white/[0.03] hover:text-white
      active:scale-[0.99]

      focus-visible:ring-1 focus-visible:ring-[#1a8ceb]/50
      focus-visible:ring-offset-0

      sm:h-9 sm:text-xs
    "
  >
    <Plus className="mr-2 h-3.5 w-3.5 text-white/70" />
    Incluir Custos
  </Button>
);