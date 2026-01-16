"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CampoPercentual = ({ label, keyName, calculoLoja, setCalculoLoja, loading }: any) => {
  const disabled = loading;

  return (
    <div className="mb-2">
      <Label className="text-neutral-400 text-[10px] block mb-1">
        {label}
      </Label>

      <Input
        type="text"
        placeholder="0,00"
        value={calculoLoja[keyName] ?? ""}
        disabled={disabled}
        onChange={(e) =>
          !disabled &&
          setCalculoLoja({ ...calculoLoja, [keyName]: e.target.value })
        }
        className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
      />

      {keyName === "desconto" && (
        <div className="mt-1">
          <Label className="text-neutral-400 text-[10px] block mb-1">
            Embalagem (R$)
          </Label>

          <Input
            type="text"
            placeholder="0,00"
            value={calculoLoja.embalagem ?? ""}
            disabled={disabled}
            onChange={(e) =>
              !disabled &&
              setCalculoLoja({ ...calculoLoja, embalagem: e.target.value })
            }
            className="bg-black/50 border border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
          />
        </div>
      )}
    </div>
  );
};

export default CampoPercentual;
