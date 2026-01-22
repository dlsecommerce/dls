"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Loader, Package, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";

// 🧩 Modal de confirmação de salvamento
import ConfirmSaveModal from "@/components/announce/ProductDetails/ConfirmSaveModal";

/** ✅ Normaliza/aceita: "PK", "SB", "Pikot Shop", "Sóbaquetas" (com/sem acento) */
function normalizeStoreValue(v: any): "PK" | "SB" | "" {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (!s) return "";
  if (s === "pk") return "PK";
  if (s === "sb") return "SB";
  if (s.includes("pikot")) return "PK";
  if (s.includes("sobaquetas")) return "SB";

  return "";
}

export const ProductInfoSection = ({
  produto,
  setProduto,
  router,
  saving,
  handleSave,
  HelpTooltip,
  setComposicao,
  setCustoTotal,
}: any) => {
  const isEditing = Boolean(produto?.id);
  const [isClearing, setIsClearing] = useState(false);
  const [openConfirmSave, setOpenConfirmSave] = useState(false);

  // ✅ Valor "seguro" pro Select: aceita PK/SB e também nomes vindos do banco
  const lojaSelectValue = useMemo(() => {
    return normalizeStoreValue(produto?.loja);
  }, [produto?.loja]);

  // 🔹 Detecta automaticamente o tipo de anúncio conforme o id_var
  useEffect(() => {
    if (!isEditing) return;

    const idVar = produto?.id_var?.trim()?.toLowerCase() || "";
    const tipo = idVar === "simples" || idVar === "" ? "simples" : "variacoes";

    if (produto.tipo_anuncio !== tipo) {
      setProduto((p: any) => ({ ...p, tipo_anuncio: tipo }));
    }
  }, [produto?.id_var, isEditing, setProduto, produto?.tipo_anuncio]);

  // ✅ Se o produto vier com "Pikot Shop" / "Sóbaquetas" (ou qualquer variação),
  // normaliza e salva no estado como "PK"/"SB" pra não quebrar em nenhum lugar.
  useEffect(() => {
    const normalized = normalizeStoreValue(produto?.loja);
    if (!normalized) return;

    // só atualiza se estiver diferente do que já está (evita loop)
    if (produto?.loja !== normalized) {
      setProduto((p: any) => ({ ...p, loja: normalized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.loja]);

  // 🔸 Limpar apenas na interface (sem Supabase)
  const handleClearLocal = () => {
    if (
      window.confirm(
        "Tem certeza que deseja limpar todos os campos? Essa ação não pode ser desfeita."
      )
    ) {
      setIsClearing(true);
      setProduto((prev: any) => ({
        id: prev.id || "",
        loja: "",
        id_bling: "",
        referencia: "",
        id_tray: "",
        id_var: "",
        od: "",
        nome: "",
        marca: "",
        categoria: "",
        tipo_anuncio: isEditing ? prev.tipo_anuncio : "",
      }));

      if (setComposicao)
        setComposicao([{ codigo: "", quantidade: "", custo: "" }]);
      if (setCustoTotal) setCustoTotal(0);

      setTimeout(() => setIsClearing(false), 600);
    }
  };

  return (
    <>
      {/* 💾 Modal de confirmação de salvamento */}
      <ConfirmSaveModal
        open={openConfirmSave}
        onOpenChange={setOpenConfirmSave}
        onConfirm={handleSave}
        saving={saving}
      />

      {/* 🔹 Conteúdo principal */}
      <div className="p-3 rounded-xl bg-black/30 border border-white/10">
        {/* 🔹 Cabeçalho */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1a8ceb]" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Informações Gerais
              <HelpTooltip text="Identificação do Anúncio." />
            </h3>
          </div>

          {/* 🔹 Botões de ação */}
          <div className="flex items-center gap-2">
            {/* Voltar */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push("/dashboard/anuncios")}
              title="Voltar"
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
            </motion.button>

            {/* Limpar local */}
            <motion.button
              whileTap={{ scale: 0.9, rotate: -15 }}
              onClick={handleClearLocal}
              disabled={isClearing}
              title="Limpar todos os dados (somente interface)"
              className={`p-2 rounded-full transition-all ${
                isClearing
                  ? "bg-red-500/20 text-red-300 cursor-not-allowed"
                  : "hover:bg-red-500/10 text-red-400 hover:text-red-500"
              }`}
            >
              <Trash2
                className={`w-4 h-4 transition-transform ${
                  isClearing ? "animate-pulse" : ""
                }`}
              />
            </motion.button>

            {/* Salvar */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setOpenConfirmSave(true)}
              disabled={saving}
              title="Salvar alterações"
              className={`p-2 rounded-full transition-all ${
                saving ? "bg-white/10 cursor-wait" : "hover:bg-white/10"
              }`}
            >
              {saving ? (
                <Loader className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
              )}
            </motion.button>
          </div>
        </div>

        {/* 🔸 Campos de formulário */}
        <div className="grid md:grid-cols-2 gap-2">
          {/* ✅ Loja como Select (PK / SB) */}
          <div>
            <Label className="text-neutral-400 text-[10px] block mb-1">
              Loja
            </Label>

            <Select
              value={lojaSelectValue}
              onValueChange={(v) =>
                setProduto((p: any) => ({
                  ...p,
                  loja: v as "PK" | "SB",
                }))
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>

              <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
                <SelectItem value="PK">PK</SelectItem>
                <SelectItem value="SB">SB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inputs restantes (sem Loja) */}
          {[
            { label: "ID Bling", key: "id_bling" },
            { label: "Referência", key: "referencia" },
            { label: "ID Tray", key: "id_tray" },
            { label: "ID Var", key: "id_var" },
            { label: "OD", key: "od" },
            { label: "Nome", key: "nome" },
            { label: "Marca", key: "marca" },
            { label: "Categoria", key: "categoria" },
          ].map((f) => (
            <div key={f.key}>
              <Label className="text-neutral-400 text-[10px] block mb-1">
                {f.label}
              </Label>
              <Input
                type="text"
                value={produto?.[f.key] ?? ""}
                onChange={(e) =>
                  setProduto((p: any) => ({ ...p, [f.key]: e.target.value }))
                }
                className="bg-white/5 border-white/10 text-white text-xs rounded-md focus:border-[#1a8ceb]"
              />
            </div>
          ))}

          {isEditing && (
            <div>
              <Label className="text-neutral-400 text-[10px] block mb-1">
                Tipo de Anúncio
              </Label>
              <Select
                value={produto?.tipo_anuncio ?? ""}
                onValueChange={(v) =>
                  setProduto((p: any) => ({
                    ...p,
                    tipo_anuncio: v as "simples" | "variacoes",
                  }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs rounded-md">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
                  <SelectItem value="simples">Simples</SelectItem>
                  <SelectItem value="variacoes">Com Variações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
