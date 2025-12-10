"use client";

import { Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const InfoGeraisBox = ({ produto, setProduto, loading }: any) => {
  const disabled = loading;

  return (
    <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-5 h-5 text-[#1a8ceb]" />
        <h3 className="text-base font-bold text-white">Informações Gerais</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {[
          { label: "Loja", key: "loja", ph: "Pikot Shop" },
          { label: "ID Bling", key: "id_bling", ph: "16564189746" },
          { label: "Referência", key: "referencia", ph: "TN 5AM" },
          { label: "ID Tray", key: "id_tray", ph: "2932555" },
          { label: "ID Var", key: "id_var", ph: "Simples" },
          { label: "OD", key: "od", ph: "1" },
          { label: "Nome", key: "nome", ph: "Baqueta Liverpool" },
          { label: "Marca", key: "marca", ph: "Liverpool" },
          { label: "Categoria", key: "categoria", ph: "Baqueta" },
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
              className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
            />
          </div>
        ))}

        {/* Select Tipo de Anúncio */}
        <div>
          <Label className="text-neutral-400 text-[10px] block mb-1">
            Tipo de Anúncio
          </Label>

          <Select
            disabled={disabled}
            value={produto?.tipo_anuncio ?? ""}
            onValueChange={(v) =>
              !disabled && setProduto((p: any) => ({ ...p, tipo_anuncio: v }))
            }
          >
            <SelectTrigger className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>

            <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
              <SelectItem value="Simples">Simples</SelectItem>
              <SelectItem value="Com variações">Com Variações</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default InfoGeraisBox;
