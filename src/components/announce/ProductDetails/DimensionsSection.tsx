"use client";
import { Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const DimensionsSection = ({ produto, setProduto, HelpTooltip }: any) => {
  return (
    <div className="p-3 rounded-xl bg-black/30 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Ruler className="w-5 h-5 text-[#1a8ceb]" />
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Peso e Medidas <HelpTooltip text="Dimensões do Anúncio." />
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {[
          { label: "Peso (kg)", key: "peso" },
          { label: "Altura (cm)", key: "altura" },
          { label: "Largura (cm)", key: "largura" },
          { label: "Comprimento (cm)", key: "comprimento" },
        ].map((f) => (
          <div key={f.key}>
            <Label className="text-neutral-400 text-[10px] block mb-1">{f.label}</Label>
            <Input
              type="text"
              value={produto[f.key] || ""}
              onChange={(e) => setProduto((p: any) => ({ ...p, [f.key]: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
