"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader,
  Search,
  ShoppingCart,
  Clipboard,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function BuscarMLBModal({ open, onOpenChange }: Props) {
  const [ref, setRef] = useState("");
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [historico, setHistorico] = useState<string[]>([]);
  const [exportando, setExportando] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 🔹 Carrega histórico salvo
  useEffect(() => {
    const saved = localStorage.getItem("mlb_historico");
    if (saved) setHistorico(JSON.parse(saved));
  }, []);

  // 🔹 Atualiza histórico
  const salvarHistorico = (novo: string) => {
    const atualizado = [novo, ...historico.filter((i) => i !== novo)].slice(0, 5);
    setHistorico(atualizado);
    localStorage.setItem("mlb_historico", JSON.stringify(atualizado));
  };

  // 🔹 Copiar MLB
  const copiarMLB = (texto: string) => {
    navigator.clipboard.writeText(texto);
  };

  // 🔹 Busca automática com debounce
  useEffect(() => {
    if (!ref.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscarMLB();
    }, 800);
  }, [ref]);

  async function buscarMLB() {
    if (!ref.trim()) return;
    setLoading(true);
    setErro("");
    setDados(null);

    try {
      // ⚠️ Substitua com seu próprio SELLER_ID e TOKEN válidos
      const seller_id = "SEU_SELLER_ID";
      const token = "SEU_TOKEN";

      const busca = await fetch(
        `https://api.mercadolibre.com/users/${seller_id}/items/search?seller_custom_field=${ref}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await busca.json();

      if (!data.results?.length) {
        setErro("Nenhum produto encontrado com essa referência.");
      } else {
        const mlb = data.results[0];
        const info = await fetch(`https://api.mercadolibre.com/items/${mlb}`);
        const item = await info.json();
        setDados(item);
        salvarHistorico(ref);
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao buscar código MLB.");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Exportar todos os códigos MLB (com XLSX)
  async function exportarCodigos() {
    setExportando(true);
    try {
      const seller_id = "SEU_SELLER_ID";
      const token = "SEU_TOKEN";

      let offset = 0;
      const allItems: any[] = [];

      while (true) {
        const resp = await fetch(
          `https://api.mercadolibre.com/users/${seller_id}/items/search?limit=50&offset=${offset}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await resp.json();
        if (!data.results?.length) break;

        for (const id of data.results) {
          const detail = await fetch(`https://api.mercadolibre.com/items/${id}`);
          const item = await detail.json();

          allItems.push({
            Título: item.title,
            "MLB Principal": item.id,
            "Referência Principal": item.seller_custom_field || "",
            "Variações (MLB - Ref)": item.variations
              ?.map(
                (v: any) =>
                  `${v.id} (${v.seller_custom_field || "Sem referência"})`
              )
              .join(", ") || "",
          });
        }

        offset += 50;
      }

      // 🔹 Gera planilha e download
      const ws = XLSX.utils.json_to_sheet(allItems);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Codigos_MLB");
      XLSX.writeFile(wb, "codigos_MLB.xlsx");
    } catch (err) {
      console.error("Erro ao exportar:", err);
      setErro("Erro ao exportar códigos MLB.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        className="
        bg-gradient-to-br from-[#0a0a0a]/95 to-[#1a1a1a]/90 
        backdrop-blur-2xl border border-white/10 
        rounded-2xl text-white max-w-4xl shadow-[0_0_25px_rgba(0,0,0,0.6)]
      "
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5 text-[#1a8ceb]" />
            Buscar Códigos MLB
          </DialogTitle>
        </DialogHeader>

        {/* 🔹 Layout dividido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
          {/* 🧭 Coluna Esquerda — Busca e histórico */}
          <div className="flex flex-col border border-white/5 rounded-xl p-4 bg-[#111]/40 shadow-inner shadow-black/30">
            <label className="block text-sm text-neutral-400 mb-2">
              Digite a referência (SKU)
            </label>

            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-neutral-500" />
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Ex: 34493-95482"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#1a8ceb] transition-all"
              />
            </div>

            {erro && (
              <p className="text-red-400 text-xs mt-2 text-center">{erro}</p>
            )}

            {/* Histórico de buscas */}
            {historico.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-neutral-400 mb-1">Recentes:</p>
                <div className="flex flex-wrap gap-2">
                  {historico.map((h) => (
                    <button
                      key={h}
                      onClick={() => setRef(h)}
                      className="px-2 py-1 text-xs rounded-md bg-[#1a1a1a]/80 hover:bg-[#1a8ceb]/20 border border-white/10 text-neutral-300 hover:text-white transition-all"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 mt-auto italic text-center pt-3">
              A busca é automática. Digite e aguarde os resultados.
            </p>
          </div>

          {/* 📊 Coluna Direita — Resultados */}
          <div className="border border-white/5 rounded-xl p-4 bg-[#111]/40 overflow-y-auto max-h-[420px] shadow-inner shadow-black/30">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full text-neutral-400"
                >
                  <Loader className="w-6 h-6 animate-spin mb-2 text-[#1a8ceb]" />
                  <p className="animate-pulse text-sm">
                    Buscando no servidor...
                  </p>
                </motion.div>
              ) : !dados ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-neutral-400 text-center mt-20 text-sm"
                >
                  Digite uma referência à esquerda para iniciar.
                </motion.p>
              ) : (
                <motion.div
                  key="dados"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm space-y-3"
                >
                  <div>
                    <p>
                      <strong>Título:</strong> {dados.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>MLB principal:</strong>
                      <span className="text-[#1a8ceb]">{dados.id}</span>
                      <button
                        onClick={() => copiarMLB(dados.id)}
                        className="hover:text-[#2699fe] transition-colors"
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {dados.variations?.length > 0 ? (
                    <div className="mt-2">
                      <strong>Variações:</strong>
                      <ul className="mt-1 space-y-1">
                        {dados.variations.map((v: any) => (
                          <li
                            key={v.id}
                            className="text-neutral-300 border-b border-white/5 pb-1 flex items-center justify-between"
                          >
                            <span>
                              •{" "}
                              <span className="text-[#1a8ceb] font-medium">
                                {v.id}
                              </span>{" "}
                              — {v.seller_custom_field || "Sem referência"}
                            </span>
                            <button
                              onClick={() => copiarMLB(v.id)}
                              className="hover:text-[#2699fe]"
                            >
                              <Clipboard className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-neutral-400 mt-3 text-sm">
                      Nenhuma variação cadastrada para este produto.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 🔹 Rodapé — Ações */}
        <DialogFooter className="mt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <Button
            onClick={exportarCodigos}
            disabled={exportando}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 text-white flex items-center gap-2 cursor-pointer"
          >
            {exportando ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Exportar Todos os Códigos
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="border-white/10 text-white hover:scale-105 transition-all cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
