"use client";

import React, { useEffect, useRef, useState } from "react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Upload as UploadIcon, Image as ImageIcon, Plus, ChevronDown, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

// ======================
// Tipagens
// ======================
interface ProdutoState {
  id_geral: string;
  id_bling: string;
  referencia: string;
  id_tray: string;
  id_var: string;
  od: string;
  nome: string;
  marca: string;
  categoria: string;
  peso: number;
  altura: number;
  largura: number;
  comp: number;
  codigo_1: string;
  quant_1: number;
  codigo_2: string;
  quant_2: number;
  codigo_3: string;
  quant_3: number;
  codigo_4: string;
  quant_4: number;
  codigo_5: string;
  quant_5: number;
  codigo_6: string;
  quant_6: number;
  codigo_7: string;
  quant_7: number;
  codigo_8: string;
  quant_8: number;
  codigo_9: string;
  quant_9: number;
  codigo_10: string;
  quant_10: number;
  marketplace: string;
  imagem_url?: string | null;
  status: "ativo" | "inativo" | string;
  descricao: string;
  tipo_anuncio: "simples" | "variacoes";
}

interface CustoItem {
  codigo: string;
  quantidade: number;
  custo: number;
}

// ======================
// Component principal
// ======================
export default function DetalhesProduto() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [produto, setProduto] = useState<ProdutoState>({
    id_geral: "",
    id_bling: "",
    referencia: "",
    id_tray: "",
    id_var: "",
    od: "",
    nome: "",
    marca: "",
    categoria: "",
    peso: 0,
    altura: 0,
    largura: 0,
    comp: 0,
    codigo_1: "",
    quant_1: 1,
    codigo_2: "",
    quant_2: 1,
    codigo_3: "",
    quant_3: 1,
    codigo_4: "",
    quant_4: 1,
    codigo_5: "",
    quant_5: 1,
    codigo_6: "",
    quant_6: 1,
    codigo_7: "",
    quant_7: 1,
    codigo_8: "",
    quant_8: 1,
    codigo_9: "",
    quant_9: 1,
    codigo_10: "",
    quant_10: 1,
    marketplace: "todos",
    imagem_url: null,
    status: "ativo",
    descricao: "",
    tipo_anuncio: "simples",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [composicao, setComposicao] = useState<CustoItem[]>([{ codigo: "", quantidade: 1, custo: 0 }]);
  const [loading, setLoading] = useState(false);
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [openDropdownRow, setOpenDropdownRow] = useState<number | null>(null);
  const [sugestoes, setSugestoes] = useState<{ codigo: string; valor: number }[]>([]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setProdutoId(id);
      loadCustos(id);
    }
  }, [searchParams]);

  // ======================
  // Supabase - Carregar custos
  // ======================
  const loadCustos = async (id: string) => {
    const { data, error } = await supabase.from("custos").select('"Código", "Custo Atual"').eq("produto_id", id);
    if (error) {
      console.error("Erro ao buscar custos:", error);
      return;
    }
    if (data && data.length > 0) {
      const custos = data.map((c: any) => ({
        codigo: c["Código"],
        quantidade: 1,
        custo: Number(c["Custo Atual"]) || 0,
      }));
      setComposicao(custos);
    }
  };

  // ======================
  // Manipulação dos custos
  // ======================
  const adicionarCusto = () => setComposicao([...composicao, { codigo: "", quantidade: 1, custo: 0 }]);
  const removerCusto = (i: number) => setComposicao(composicao.filter((_, idx) => idx !== i));
  const atualizarCusto = (i: number, campo: keyof CustoItem, valor: string | number) => {
    const novo = [...composicao];
    novo[i] = { ...novo[i], [campo]: valor };
    setComposicao(novo);
  };

  // ======================
  // Salvar produto e custos
  // ======================
  const handleSave = async () => {
    try {
      setLoading(true);

      const pid = produtoId || crypto.randomUUID();

      // Salvar custos no Supabase
      await supabase.from("custos").delete().eq("produto_id", pid);
      for (const item of composicao) {
        if (!item.codigo) continue;
        await supabase.from("custos").insert({
          produto_id: pid,
          Código: item.codigo,
          Quantidade: item.quantidade,
          "Custo Atual": item.custo,
        });
      }

      console.log("Produto salvo com sucesso (mock). ID:", pid);
      router.push("/dashboard/anuncios");
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Render
  // ======================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] p-6 md:p-8">
      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/anuncios")}
          className="text-gray-400 hover:text-white hover:bg-white/5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        {/* Grid principal */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* IMAGEM */}
          <GlassmorphicCard className="p-6 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 rounded-xl overflow-hidden bg-black/30 border border-white/10 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Prévia" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-60" />
                  <span className="text-sm">Imagem</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="border-white/10 bg-black/40 hover:bg-white/10"
                >
                  <UploadIcon className="w-4 h-4 mr-2" /> Upload
                </Button>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImagePreview(URL.createObjectURL(f));
                }} />
              </div>
            </div>
          </GlassmorphicCard>

          {/* INFORMAÇÕES GERAIS */}
          <GlassmorphicCard className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#2699fe]" /> Informações Gerais
            </h3>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: "ID Geral", key: "id_geral" },
                { label: "ID Bling", key: "id_bling" },
                { label: "Referência", key: "referencia" },
                { label: "ID Tray", key: "id_tray" },
                { label: "ID Var", key: "id_var" },
                { label: "OD", key: "od" },
              ].map((f) => (
                <div key={f.key}>
                  <Label className="text-gray-400 mb-1 block">{f.label}</Label>
                  <Input
                    value={(produto as any)[f.key] ?? ""}
                    onChange={(e) => setProduto((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white rounded-xl"
                  />
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: "Nome", key: "nome" },
                { label: "Marca", key: "marca" },
                { label: "Categoria", key: "categoria" },
              ].map((f) => (
                <div key={f.key}>
                  <Label className="text-gray-400 mb-1 block">{f.label}</Label>
                  <Input
                    value={(produto as any)[f.key] ?? ""}
                    onChange={(e) => setProduto((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white rounded-xl"
                  />
                </div>
              ))}
            </div>

            {/* Tipo de anúncio */}
            <div>
              <Label className="text-gray-400 mb-2 block">Opção</Label>
              <Select
                value={produto.tipo_anuncio}
                onValueChange={(v) => setProduto((p) => ({ ...p, tipo_anuncio: v as "simples" | "variacoes" }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="simples">Simples</SelectItem>
                  <SelectItem value="variacoes">Com Variações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlassmorphicCard>
        </div>

        {/* Segunda linha */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* COMPOSIÇÃO */}
          <GlassmorphicCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Composição</h3>
            <div className="space-y-3">
              {composicao.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>
                    <Label className="text-gray-400 text-sm">Código</Label>
                    <Input
                      value={item.codigo}
                      onChange={(e) => atualizarCusto(i, "codigo", e.target.value)}
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Quantidade</Label>
                    <Input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => atualizarCusto(i, "quantidade", Number(e.target.value))}
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Custo (R$)</Label>
                    <Input
                      type="number"
                      value={item.custo}
                      onChange={(e) => atualizarCusto(i, "custo", Number(e.target.value))}
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={adicionarCusto}
              size="sm"
              className="mt-4 bg-[#2699fe]/20 hover:bg-[#2699fe]/30 text-[#2699fe] border border-[#2699fe]/30 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Incluir Custos
            </Button>
          </GlassmorphicCard>

          {/* PESO E MEDIDAS */}
          <GlassmorphicCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Peso e Medidas</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { label: "Peso (kg)", key: "peso" },
                { label: "Altura (cm)", key: "altura" },
                { label: "Largura (cm)", key: "largura" },
                { label: "Comprimento (cm)", key: "comp" },
              ].map((f) => (
                <div key={f.key}>
                  <Label className="text-gray-400 mb-1 block">{f.label}</Label>
                  <Input
                    type="number"
                    value={(produto as any)[f.key] ?? 0}
                    onChange={(e) =>
                      setProduto((p) => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="bg-white/5 border-white/10 text-white rounded-xl"
                  />
                </div>
              ))}
            </div>
          </GlassmorphicCard>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] hover:from-[#1a7dd9] hover:to-[#2699fe] py-6 text-lg font-bold rounded-2xl shadow-lg hover:shadow-[#2699fe]/50 transition-all duration-300"
        >
          <Save className="w-5 h-5 mr-2" />
          {loading ? "Salvando..." : "Salvar Produto"}
        </Button>
      </div>
    </div>
  );
}
