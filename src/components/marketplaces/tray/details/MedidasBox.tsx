"use client";

import { Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const MedidasBox = ({ produto, setProduto, loading }: any) => {
  const disabled = loading; // impede sobrescrita antes dos dados chegarem

  return (
    <div className="p-3 rounded-xl bg-black/30 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Ruler className="w-5 h-5 text-[#1a8ceb]" />
        <h3 className="text-base font-bold text-white">Peso e Medidas</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {[
          { label: "Peso (g)", key: "peso", ph: "1000" },
          { label: "Altura (cm)", key: "altura", ph: "10" },
          { label: "Largura (cm)", key: "largura", ph: "20" },
          { label: "Comprimento (cm)", key: "comprimento", ph: "30" },
        ].map((f) => (
          <div key={f.key}>
            <Label className="text-neutral-400 text-[10px] block mb-1">
              {f.label}
            </Label>

            <Input
              type="text"
              placeholder={f.ph}
              value={produto?.[f.key] ?? ""}
              disabled={disabled}
              onChange={(e) =>
                !disabled &&
                setProduto((p: any) => ({
                  ...p,
                  [f.key]: e.target.value,
                }))
              }
              className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedidasBox;
