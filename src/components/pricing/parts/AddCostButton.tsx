import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type AddCostButtonProps = {
  onClick: () => void;
};

export const AddCostButton: React.FC<AddCostButtonProps> = ({ onClick }) => (
  <Button
    onClick={onClick}
    variant="outline"
    className="w-full border-white/10 text-white text-xs hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all mt-2"
  >
    <Plus className="w-3 h-3 mr-2" /> Incluir Custos
  </Button>
);
