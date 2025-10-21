"use client";
import { Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const parseValorBR = (v: string) => {
  if (!v) return "";
  return v.replace(/\./g, "").replace(",", ".");
};

export const DimensionsSection = ({ produto, setProduto, HelpTooltip }: any) => {
  const handleChange = (key: string, value: string) => {
    // permite vazio sem forçar 0
    setProduto((p: any) => ({ ...p, [key]: value }));
  };

  const handleBlur = (key: string, value: string) => {
    const parsed = parseValorBR(value);
    setProduto((p: any) => ({ ...p, [key]: parsed }));
  };

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
          { label: "Peso (g)", key: "peso" },
          { label: "Altura (cm)", key: "altura" },
          { label: "Largura (cm)", key: "largura" },
          { label: "Comprimento (cm)", key: "comprimento" },
        ].map((f) => (
          <div key={f.key}>
            <Label className="text-neutral-400 text-[10px] block mb-1">
              {f.label}
            </Label>
            <Input
              type="text"
              placeholder="0,00"
              // mostra o valor exatamente como o usuário digitou
              value={produto?.[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              onBlur={(e) => handleBlur(f.key, e.target.value)}
              className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb] focus:ring-2 focus:ring-[#1a8ceb]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
