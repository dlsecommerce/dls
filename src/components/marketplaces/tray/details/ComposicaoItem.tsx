"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SugestoesDropdown from "./SugestoesDropdown";
import React from "react";

const ComposicaoItem = ({
  item,
  idx,
  composicao,
  campoAtivo,
  sugestoes,
  indiceSelecionado,
  inputRefs,
  removerItem,
  setComposicao,
  buscarSugestoes,
  handleSugestoesKeys,
  selecionarSugestao,
  listaRef,
}: any) => {
  return (
    <div
      className="grid grid-cols-3 gap-2 mb-1 p-1.5 rounded-lg bg-black/30 border border-white/10 relative"
    >
      {/* Código */}
      <div className="relative">
        <Label className="text-neutral-400 text-[10px] mb-1 block">
          Código
        </Label>

        <Input
          ref={(el) => {
            inputRefs.current[idx] = el; // <-- AJUSTE FINAL E CORRETO
          }}
          type="text"
          placeholder="SKU"
          value={item.codigo}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].codigo = e.target.value;
            setComposicao(novo);
            buscarSugestoes(e.target.value, idx); // mock funcionando
          }}
          onKeyDown={(e) => handleSugestoesKeys(e, idx)}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
        />

        {campoAtivo === idx && sugestoes.length > 0 && (
          <div ref={listaRef}>
            <SugestoesDropdown
              sugestoes={sugestoes}
              indiceSelecionado={indiceSelecionado}
              selecionarSugestao={selecionarSugestao}
              idx={idx}
            />
          </div>
        )}
      </div>

      {/* Quantidade */}
      <div>
        <Label className="text-neutral-400 text-[10px] mb-1 block">
          Quantidade
        </Label>

        <Input
          type="text"
          placeholder="1"
          value={item.quantidade}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].quantidade = e.target.value;
            setComposicao(novo);
          }}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
        />
      </div>

      {/* Custo */}
      <div>
        <Label className="text-neutral-400 text-[10px] mb-1 block">
          Custo (R$)
        </Label>

        <Input
          type="text"
          placeholder="100,00"
          value={item.custo}
          onChange={(e) => {
            const novo = [...composicao];
            novo[idx].custo = e.target.value;
            setComposicao(novo);
          }}
          className="bg-black/50 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
        />
      </div>

      {idx >= 1 && (
        <Button
          onClick={() => removerItem(idx)}
          size="sm"
          variant="ghost"
          className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2
                     w-5 h-5 p-0 flex items-center justify-center 
                     bg-red-500/20 hover:bg-red-500/40 text-red-400 
                     border border-red-500/30 rounded-full shadow-sm 
                     transition-all cursor-pointer"
        >
          ×
        </Button>
      )}
    </div>
  );
};

export default ComposicaoItem;
