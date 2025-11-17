"use client";

import ComposicaoItem from "./ComposicaoItem";
import { Button } from "@/components/ui/button";

const ComposicaoList = ({
  composicao,
  adicionarItem,
  removerItem,
  campoAtivo,
  sugestoes,
  indiceSelecionado,
  inputRefs,
  listaRef,
  setComposicao,
  buscarSugestoes,
  handleSugestoesKeys,
  selecionarSugestao,
}: any) => {
  return (
    <div>
      <div className="space-y-2">
        {composicao.map((item: any, idx: number) => (
          <ComposicaoItem
            key={idx}
            item={item}
            idx={idx}
            composicao={composicao}
            campoAtivo={campoAtivo}
            sugestoes={sugestoes}
            indiceSelecionado={indiceSelecionado}
            inputRefs={inputRefs}
            listaRef={listaRef}
            removerItem={removerItem}
            setComposicao={setComposicao}
            buscarSugestoes={buscarSugestoes}
            handleSugestoesKeys={handleSugestoesKeys}
            selecionarSugestao={selecionarSugestao}
          />
        ))}
      </div>

      <Button
        onClick={adicionarItem}
        variant="outline"
        className="w-full border-white/10 text-white text-xs hover:bg-white/5 hover:border-[#1a8ceb]/50 rounded-xl transition-all mt-2"
      >
        + Incluir Custos
      </Button>
    </div>
  );
};

export default ComposicaoList;
